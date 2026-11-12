// Encrypting to a public key, so the recipient need not be present.
// HPKE (RFC 9180) base mode: DHKEM(P-256, HKDF-SHA256), HKDF-SHA256,
// AES-256-GCM. See docs/adr/0014-portal-keys-and-vault-items.md.
//
// Wire format: version(1) || encapsulated key(65) || ciphertext+tag.
//
// `context` says what the sealed bytes are and who they are for, for
// example "portal-key|{portalId}|{userId}|{keyVersion}". It is mixed into
// the key schedule, so bytes sealed for one purpose do not open as another.

import { Aes256Gcm, CipherSuite, DhkemP256HkdfSha256, HkdfSha256 } from "@hpke/core";

const SEAL_VERSION = 1;
const ENC_BYTES = 65; // uncompressed P-256 point
const TAG_BYTES = 16;
const INFO_PREFIX = "tessil/seal/v1|";
const ECDH = { name: "ECDH", namedCurve: "P-256" } as const;

const suite = new CipherSuite({
  kem: new DhkemP256HkdfSha256(),
  kdf: new HkdfSha256(),
  aead: new Aes256Gcm(),
});

const encoder = new TextEncoder();

function buffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function info(context: string): ArrayBuffer {
  return buffer(encoder.encode(INFO_PREFIX + context));
}

/** Seals `plaintext` so only the holder of the matching private key can open it. */
export async function sealTo(
  recipientPublicKey: Uint8Array,
  plaintext: Uint8Array,
  context: string,
): Promise<Uint8Array> {
  const publicKey = await crypto.subtle.importKey("raw", buffer(recipientPublicKey), ECDH, true, []);
  const { ct, enc } = await suite.seal(
    { recipientPublicKey: publicKey, info: info(context) },
    buffer(plaintext),
  );
  const out = new Uint8Array(1 + ENC_BYTES + ct.byteLength);
  out[0] = SEAL_VERSION;
  out.set(new Uint8Array(enc), 1);
  out.set(new Uint8Array(ct), 1 + ENC_BYTES);
  return out;
}

export interface RecipientKeypair {
  /** ECDH P-256 with "deriveBits"; may be non-extractable. */
  privateKey: CryptoKey;
  /** Raw uncompressed point matching `privateKey`. */
  publicKey: Uint8Array;
}

/** Returns null on an unknown version, the wrong key or context, or tampering. */
export async function openSealed(
  recipient: RecipientKeypair,
  wire: Uint8Array,
  context: string,
): Promise<Uint8Array | null> {
  if (wire.byteLength < 1 + ENC_BYTES + TAG_BYTES || wire[0] !== SEAL_VERSION) return null;
  try {
    const publicKey = await crypto.subtle.importKey("raw", buffer(recipient.publicKey), ECDH, true, []);
    const plaintext = await suite.open(
      {
        recipientKey: { privateKey: recipient.privateKey, publicKey },
        enc: buffer(wire.subarray(1, 1 + ENC_BYTES)),
        info: info(context),
      },
      buffer(wire.subarray(1 + ENC_BYTES)),
    );
    return new Uint8Array(plaintext);
  } catch {
    return null;
  }
}
