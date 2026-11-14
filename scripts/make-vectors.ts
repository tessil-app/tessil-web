// Freezes what today's code writes into src/lib/crypto/vectors.json, so
// later code, here or in another program, can be held to opening it.
//
// Run once per new format: `bun run scripts/make-vectors.ts`. Never
// regenerate entries that already exist. They stand for data that people
// have stored; if new code cannot open them, the code is wrong.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { bytesToBase64Url } from "../src/lib/crypto/base64url";
import { encryptFilename, encryptString } from "../src/lib/crypto/encrypt";
import { sealTo } from "../src/lib/crypto/seal";
import { streamingEncrypt } from "../src/lib/crypto/streaming";
import { protectTransferKey } from "../src/lib/crypto/transferPassword";
import {
  encodeDepositFileName,
  encodeDepositNote,
  depositKeyContext,
} from "../src/lib/portal/deposit";
import {
  accessTokenFor,
  createPortalKeys,
  depositTokenFor,
  handPortalKeys,
  openPortalBundle,
  sealPortalBundle,
} from "../src/lib/portal/keys";
import { depositReference } from "../src/lib/portal/receipt";
import { importVaultDerivationKey, publicKeyFingerprint } from "../src/lib/vault/keypair";

const PATH = new URL("../src/lib/crypto/vectors.json", import.meta.url).pathname;
const ECDH = { name: "ECDH", namedCurve: "P-256" } as const;
const b64 = bytesToBase64Url;
const text = (s: string) => new TextEncoder().encode(s);
const random = (n: number) => crypto.getRandomValues(new Uint8Array(n));

async function aesKey(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", raw.buffer as ArrayBuffer, { name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
}

async function collect(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function person(userId: string) {
  const pair = await crypto.subtle.generateKey(ECDH, true, ["deriveBits"]);
  const pkcs8 = new Uint8Array(await crypto.subtle.exportKey("pkcs8", pair.privateKey));
  const publicKey = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
  const vaultKey = random(32);
  return {
    stored: { userId, vaultKey: b64(vaultKey), privateKeyPkcs8: b64(pkcs8), publicKey: b64(publicKey) },
    live: {
      userId,
      derivationKey: await importVaultDerivationKey(vaultKey),
      keypair: { privateKey: pair.privateKey, publicKey },
    },
  };
}

type Vectors = Record<string, unknown>;
const vectors: Vectors = existsSync(PATH) ? (JSON.parse(readFileSync(PATH, "utf8")) as Vectors) : {};

/** Adds a section only when the file does not have it yet. */
async function once(name: string, make: () => Promise<unknown>) {
  if (name in vectors) return;
  vectors[name] = await make();
  console.log("added", name);
}

await once("stream", async () => {
  const cases = [];
  for (const [chunkSize, length] of [
    [64, 0],
    [64, 1],
    [64, 64],
    [64, 65],
    [64, 200],
    [1024 * 1024, 100],
  ] as const) {
    const key = random(32);
    const plaintext = random(length);
    const source = new Blob([plaintext.buffer as ArrayBuffer]).stream();
    const ciphertext = await collect(streamingEncrypt(source, length, await aesKey(key), chunkSize));
    cases.push({ chunkSize, key: b64(key), plaintext: b64(plaintext), ciphertext: b64(ciphertext) });
  }
  return cases;
});

await once("strings", async () => {
  const cases = [];
  for (const value of ["Tax return 2025", "", "Jaaropgave één 文 \u{1F4C4}", "x".repeat(300)]) {
    const key = random(32);
    const sealed = await encryptString(value, await aesKey(key));
    cases.push({ key: b64(key), plaintext: value, ciphertext: sealed.ciphertext, iv: sealed.iv });
  }
  return cases;
});

await once("filenames", async () => {
  const cases = [];
  for (const value of ["contract-signed.pdf", "foto van paspoort (1).jpeg", encodeDepositFileName("id.jpg", "ab12cd")]) {
    const key = random(32);
    const sealed = await encryptFilename(value, await aesKey(key));
    cases.push({ key: b64(key), plaintext: value, encryptedName: sealed.encryptedName, iv: sealed.iv });
  }
  return cases;
});

await once("transferPassword", async () => {
  const key = random(32);
  const password = "correct horse battery staple";
  const made = await protectTransferKey(await aesKey(key), password);
  return { key: b64(key), password, fragment: made.fragment, salt: made.salt, verifier: made.verifier };
});

await once("derived", async () => {
  const linkKey = random(32);
  const portalId = "V1StGXR8_Z5jdHi6B-myT";
  const transferId = "Uakgb_J5m9g-0JDMbcJqL";
  const pair = await crypto.subtle.generateKey(ECDH, true, ["deriveBits"]);
  const publicKey = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
  return {
    linkKey: b64(linkKey),
    portalId,
    transferId,
    password: "tulips-2025",
    depositToken: b64(await depositTokenFor(linkKey)),
    accessToken: b64(await accessTokenFor(portalId, linkKey, "tulips-2025")),
    reference: await depositReference(transferId),
    depositKeyContext: depositKeyContext(portalId, transferId),
    publicKey: b64(publicKey),
    fingerprint: await publicKeyFingerprint(publicKey),
    fileName: { name: "id.jpg", itemId: "ab12cd", stored: encodeDepositFileName("id.jpg", "ab12cd") },
    note: {
      note: "Tax 2025",
      answer: { label: "Client number", value: "2024-118" },
      stored: encodeDepositNote("Tax 2025", { label: "Client number", value: "2024-118" }),
    },
  };
});

await once("portal", async () => {
  const owner = await person("owner-user-id-0000001");
  const guest = await person("guest-user-id-0000002");
  const made = await createPortalKeys("Jansen Administratie", owner.live, "nl");
  const info = (await openPortalBundle(made.id, made.linkKey, made.publicBundle))!;
  // A bundle with every option a portal can carry today.
  const full = {
    title: "Jansen Administratie",
    lang: "nl" as const,
    checklist: [
      { id: "ab12cd", label: "Kopie van je ID" },
      { id: "ef34gh", label: "Jaaropgave 2025" },
    ],
    message: "Stuur alles voor 1 april.\nFoto's zijn prima.",
    thanks: "Dank je. Je hoort binnen vijf werkdagen van ons.",
    fieldLabel: "Klantnummer",
    logo: { type: "image/png" as const, data: btoa("not really a png") },
    twoWay: true,
    returns: [{ id: "Uakgb_J5m9g-0JDMbcJqL", key: b64(random(32)) }],
  };
  const bundle = await sealPortalBundle(made.id, made.linkKey, {
    publicKey: info.publicKey,
    keyVersion: info.keyVersion,
    ...full,
  });
  // A delivery's key, sealed by a visitor.
  const depositKey = random(32);
  const transferId = "Uakgb_J5m9g-0JDMbcJqL";
  const sealedDepositKey = await sealTo(info.publicKey, depositKey, depositKeyContext(made.id, transferId));
  const handed = (await handPortalKeys(owner.live, { userId: guest.stored.userId, publicKey: guest.live.keypair.publicKey }, made.id, 1, made.sealedKeys))!;
  return {
    owner: owner.stored,
    guest: guest.stored,
    portalId: made.id,
    keyVersion: 1,
    linkKey: b64(made.linkKey),
    firstBundle: b64(made.publicBundle),
    fullBundle: b64(bundle),
    full,
    publicKey: b64(info.publicKey),
    keptKeys: b64(made.sealedKeys),
    handedKeys: b64(handed),
    deposit: { transferId, key: b64(depositKey), sealedKey: b64(sealedDepositKey) },
  };
});

await once("sealed", async () => {
  const to = await person("recipient");
  const from = await person("sender");
  const plaintext = text("a small secret");
  return {
    recipient: to.stored,
    sender: from.stored,
    context: "test|context",
    plaintext: b64(plaintext),
    anonymous: b64(await sealTo(to.live.keypair.publicKey, plaintext, "test|context")),
    authenticated: b64(await sealTo(to.live.keypair.publicKey, plaintext, "test|context", from.live.keypair)),
  };
});

writeFileSync(PATH, JSON.stringify(vectors, null, 1) + "\n");
