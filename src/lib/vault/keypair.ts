// Vault items and the user keypair. An item is a secret encrypted under a
// key derived from K_vault for that item's kind, and bound to its owner and
// kind so the server cannot swap one item for another.
// See docs/adr/0014-portal-keys-and-vault-items.md.
//
// Item wire format: version(1) || iv(12) || AES-256-GCM ciphertext+tag.

const ITEM_VERSION = 1;
const IV_BYTES = 12;
const CONTEXT = "tessil/vault-item/v1";

export const USER_PRIVATE_KEY_KIND = "user_private_key";
export const PUBLIC_KEY_BYTES = 65; // uncompressed P-256 point

const encoder = new TextEncoder();

function buffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

/** K_vault as HKDF input. Non-extractable; only ever yields per-kind keys. */
export function importVaultDerivationKey(rawKVault: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", buffer(rawKVault), "HKDF", false, ["deriveKey"]);
}

function itemKey(derivationKey: CryptoKey, kind: string): Promise<CryptoKey> {
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array(0),
      info: encoder.encode(`${CONTEXT}/${kind}`),
    },
    derivationKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

function itemAad(userId: string, kind: string): ArrayBuffer {
  return buffer(encoder.encode(`${CONTEXT}|${userId}|${kind}`));
}

export async function sealVaultItem(
  derivationKey: CryptoKey,
  userId: string,
  kind: string,
  plaintext: Uint8Array,
): Promise<Uint8Array> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: buffer(iv), additionalData: itemAad(userId, kind) },
    await itemKey(derivationKey, kind),
    buffer(plaintext),
  );
  const out = new Uint8Array(1 + IV_BYTES + ciphertext.byteLength);
  out[0] = ITEM_VERSION;
  out.set(iv, 1);
  out.set(new Uint8Array(ciphertext), 1 + IV_BYTES);
  return out;
}

/** Returns null on an unknown version, the wrong owner or kind, or tampering. */
export async function openVaultItem(
  derivationKey: CryptoKey,
  userId: string,
  kind: string,
  wire: Uint8Array,
): Promise<Uint8Array | null> {
  if (wire.byteLength <= 1 + IV_BYTES || wire[0] !== ITEM_VERSION) return null;
  try {
    const plaintext = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: buffer(wire.subarray(1, 1 + IV_BYTES)),
        additionalData: itemAad(userId, kind),
      },
      await itemKey(derivationKey, kind),
      buffer(wire.subarray(1 + IV_BYTES)),
    );
    return new Uint8Array(plaintext);
  } catch {
    return null;
  }
}

// ─── user keypair (ECDH P-256) ──────────────────────────────────────────────

const ECDH = { name: "ECDH", namedCurve: "P-256" } as const;

export interface GeneratedKeypair {
  publicKey: Uint8Array;
  /** PKCS#8. Seal it and zero it; never store or send it as is. */
  privateKey: Uint8Array;
}

export async function generateUserKeypair(): Promise<GeneratedKeypair> {
  const pair = await crypto.subtle.generateKey(ECDH, true, ["deriveBits"]);
  const [publicKey, privateKey] = await Promise.all([
    crypto.subtle.exportKey("raw", pair.publicKey),
    crypto.subtle.exportKey("pkcs8", pair.privateKey),
  ]);
  return { publicKey: new Uint8Array(publicKey), privateKey: new Uint8Array(privateKey) };
}

/** Non-extractable: usable for key agreement, not readable by page script. */
export function importUserPrivateKey(pkcs8: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey("pkcs8", buffer(pkcs8), ECDH, false, ["deriveBits"]);
}

export function importUserPublicKey(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", buffer(raw), ECDH, true, []);
}

/** Short, comparable form of a public key: 16 bytes of its SHA-256, in hex groups. */
export async function publicKeyFingerprint(publicKey: Uint8Array): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", buffer(publicKey)));
  const hex = Array.from(digest.subarray(0, 16), (b) => b.toString(16).padStart(2, "0")).join("");
  return hex.match(/.{4}/g)!.join(" ");
}
