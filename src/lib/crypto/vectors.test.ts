// Data written by an earlier version of this code must stay readable by
// every later one, here and in any other program built on it. The fixture
// holds real output frozen at one point in time; these tests open it.
//
// A failure here means the code changed a format, not that the fixture is
// stale. Do not regenerate existing entries (see scripts/make-vectors.ts).

import { describe, expect, it } from "bun:test";
import { base64UrlToBytes, bytesToBase64Url } from "./base64url";
import { decryptFilename, decryptString } from "./decrypt";
import { openSealed } from "./seal";
import { framedSize, streamingDecrypt } from "./streaming";
import { deriveTransferPassword, saltFromFragment, unwrapTransferKey } from "./transferPassword";
import {
  decodeDepositFileName,
  decodeDepositNote,
  depositKeyContext,
  encodeDepositFileName,
  encodeDepositNote,
} from "$lib/portal/deposit";
import {
  accessTokenFor,
  acceptPortalKeys,
  depositTokenFor,
  openPortalBundle,
  openPortalKeys,
} from "$lib/portal/keys";
import { depositReference } from "$lib/portal/receipt";
import { importVaultDerivationKey, publicKeyFingerprint } from "$lib/vault/keypair";
import vectors from "./vectors.json";

const ECDH = { name: "ECDH", namedCurve: "P-256" } as const;
const bytes = base64UrlToBytes;
const buf = (b: Uint8Array) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;

function aesKey(raw: string, extractable = false): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", buf(bytes(raw)), { name: "AES-GCM", length: 256 }, extractable, [
    "decrypt",
  ]);
}

interface StoredPerson {
  userId: string;
  vaultKey: string;
  privateKeyPkcs8: string;
  publicKey: string;
}

async function person(p: StoredPerson) {
  return {
    userId: p.userId,
    derivationKey: await importVaultDerivationKey(bytes(p.vaultKey)),
    keypair: {
      privateKey: await crypto.subtle.importKey("pkcs8", buf(bytes(p.privateKeyPkcs8)), ECDH, false, [
        "deriveBits",
      ]),
      publicKey: bytes(p.publicKey),
    },
  };
}

describe("files", () => {
  for (const v of vectors.stream) {
    const plain = bytes(v.plaintext);
    it(`opens a ${plain.length}-byte file stored in ${v.chunkSize}-byte chunks`, async () => {
      const ciphertext = bytes(v.ciphertext);
      expect(ciphertext.length).toBe(framedSize(plain.length, v.chunkSize));
      const source = new Blob([buf(ciphertext)]).stream();
      const out = new Uint8Array(
        await new Response(streamingDecrypt(source, ciphertext.length, await aesKey(v.key))).arrayBuffer(),
      );
      expect(out).toEqual(plain);
    });
  }

  it("refuses a file with one byte changed", async () => {
    const v = vectors.stream[4];
    const ciphertext = bytes(v.ciphertext);
    ciphertext[ciphertext.length - 1] ^= 1;
    const source = new Blob([buf(ciphertext)]).stream();
    await expect(
      new Response(streamingDecrypt(source, ciphertext.length, await aesKey(v.key))).arrayBuffer(),
    ).rejects.toThrow();
  });
});

describe("names, titles and notes", () => {
  it("opens stored titles and notes", async () => {
    for (const v of vectors.strings) {
      expect(await decryptString(v.ciphertext, v.iv, await aesKey(v.key))).toBe(v.plaintext);
    }
  });

  it("opens stored file names", async () => {
    for (const v of vectors.filenames) {
      expect(await decryptFilename(v.encryptedName, v.iv, await aesKey(v.key))).toBe(v.plaintext);
    }
  });

  it("reads and writes the item tag and the extra field the same way", () => {
    const d = vectors.derived;
    expect(encodeDepositFileName(d.fileName.name, d.fileName.itemId)).toBe(d.fileName.stored);
    expect(decodeDepositFileName(d.fileName.stored)).toEqual({ name: d.fileName.name, itemId: d.fileName.itemId });
    expect(encodeDepositNote(d.note.note, d.note.answer)).toBe(d.note.stored);
    expect(decodeDepositNote(d.note.stored)).toEqual({ note: d.note.note, answer: d.note.answer });
  });
});

describe("a transfer's password", () => {
  it("derives the same verifier and unlocks the key in the link", async () => {
    const v = vectors.transferPassword;
    expect(saltFromFragment(v.fragment)).toBe(v.salt);
    const derived = await deriveTransferPassword(v.password, v.salt);
    expect(derived.verifier).toBe(v.verifier);
    const key = await unwrapTransferKey(v.fragment, derived.wrappingKey);
    expect(key.algorithm.name).toBe("AES-GCM");
    const wrong = await deriveTransferPassword("not the password", v.salt);
    await expect(unwrapTransferKey(v.fragment, wrong.wrappingKey)).rejects.toThrow();
  });
});

describe("values derived from a portal's link", () => {
  const d = vectors.derived;

  it("derives the same deposit token, password token and reference", async () => {
    expect(bytesToBase64Url(await depositTokenFor(bytes(d.linkKey)))).toBe(d.depositToken);
    expect(bytesToBase64Url(await accessTokenFor(d.portalId, bytes(d.linkKey), d.password))).toBe(d.accessToken);
    expect(await depositReference(d.transferId)).toBe(d.reference);
    expect(depositKeyContext(d.portalId, d.transferId)).toBe(d.depositKeyContext);
    expect(await publicKeyFingerprint(bytes(d.publicKey))).toBe(d.fingerprint);
  });
});

describe("a portal", () => {
  const p = vectors.portal;

  it("opens its first bundle and one carrying every option", async () => {
    const first = await openPortalBundle(p.portalId, bytes(p.linkKey), bytes(p.firstBundle));
    expect(first?.title).toBe(p.full.title);
    expect(bytesToBase64Url(first!.publicKey)).toBe(p.publicKey);

    const full = await openPortalBundle(p.portalId, bytes(p.linkKey), bytes(p.fullBundle));
    expect(full).toMatchObject({ ...p.full, keyVersion: p.keyVersion });
  });

  it("gives the owner keys that open a delivery sealed by a visitor", async () => {
    const owner = await person(p.owner);
    const keys = await openPortalKeys(owner, p.portalId, p.keyVersion, bytes(p.keptKeys));
    expect(bytesToBase64Url(keys!.linkKey)).toBe(p.linkKey);
    const opened = await openSealed(
      { privateKey: keys!.privateKey, publicKey: bytes(p.publicKey) },
      bytes(p.deposit.sealedKey),
      depositKeyContext(p.portalId, p.deposit.transferId),
    );
    expect(bytesToBase64Url(opened!)).toBe(p.deposit.key);
  });

  it("lets the invited account accept keys handed by the owner, and nobody else's", async () => {
    const guest = await person(p.guest);
    const from = { userId: p.owner.userId, publicKey: bytes(p.owner.publicKey) };
    const accepted = await acceptPortalKeys(guest, from, p.portalId, p.keyVersion, bytes(p.handedKeys));
    expect(bytesToBase64Url(accepted!.keys.linkKey)).toBe(p.linkKey);
    // The copy the guest keeps opens with the guest's own vault.
    const kept = await openPortalKeys(guest, p.portalId, p.keyVersion, accepted!.kept);
    expect(bytesToBase64Url(kept!.linkKey)).toBe(p.linkKey);

    const impostor = { userId: p.owner.userId, publicKey: bytes(p.guest.publicKey) };
    expect(await acceptPortalKeys(guest, impostor, p.portalId, p.keyVersion, bytes(p.handedKeys))).toBeNull();
  });
});

describe("sealing to a public key", () => {
  const s = vectors.sealed;

  it("opens an anonymous and a signed seal, and checks the signer", async () => {
    const recipient = (await person(s.recipient)).keypair;
    const sender = bytes(s.sender.publicKey);
    expect(bytesToBase64Url((await openSealed(recipient, bytes(s.anonymous), s.context))!)).toBe(s.plaintext);
    expect(bytesToBase64Url((await openSealed(recipient, bytes(s.authenticated), s.context, sender))!)).toBe(
      s.plaintext,
    );
    // A signed seal is not accepted as anonymous, nor from another signer, nor in another context.
    expect(await openSealed(recipient, bytes(s.authenticated), s.context)).toBeNull();
    expect(await openSealed(recipient, bytes(s.authenticated), s.context, recipient.publicKey)).toBeNull();
    expect(await openSealed(recipient, bytes(s.anonymous), "other|context")).toBeNull();
  });
});
