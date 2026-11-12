// Transfer password handling. The password never leaves the browser:
// Argon2id stretches it once, and HKDF splits the result into a verifier
// for the server and a key that wraps the transfer key in the share link.
// The server can check the verifier but cannot turn it into the wrap key.
//
// Share-link fragment for a protected transfer: "w2.{salt}.{wrappedKey}".

import { argon2id } from "hash-wasm";
import { base64UrlToBytes, bytesToBase64Url } from "$lib/vault/crypto";

const SALT_BYTES = 16;
const FRAGMENT_PREFIX = "w2.";
const VERIFIER_INFO = "tessil/transfer-password/v2/verifier";
const WRAP_INFO = "tessil/transfer-password/v2/wrap";

// Matches the vault KDF, so one set of parameters is tuned and audited.
const ARGON2_PARAMS = { parallelism: 1, iterations: 3, memorySize: 64 * 1024, hashLength: 32 };

export interface DerivedTransferPassword {
  /** Sent to the server in place of the password. */
  verifier: string;
  wrappingKey: CryptoKey;
}

function buffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export async function deriveTransferPassword(
  password: string,
  salt: string,
): Promise<DerivedTransferPassword> {
  const stretched = (await argon2id({
    password: password.normalize("NFKC"),
    salt: base64UrlToBytes(salt),
    ...ARGON2_PARAMS,
    outputType: "binary",
  })) as Uint8Array;

  const master = await crypto.subtle.importKey("raw", buffer(stretched), "HKDF", false, [
    "deriveBits",
    "deriveKey",
  ]);
  stretched.fill(0);

  const hkdf = (info: string) => ({
    name: "HKDF",
    hash: "SHA-256",
    salt: new Uint8Array(0),
    info: new TextEncoder().encode(info),
  });

  const verifierBits = await crypto.subtle.deriveBits(hkdf(VERIFIER_INFO), master, 256);
  const wrappingKey = await crypto.subtle.deriveKey(
    hkdf(WRAP_INFO),
    master,
    { name: "AES-KW", length: 256 },
    false,
    ["wrapKey", "unwrapKey"],
  );

  return { verifier: bytesToBase64Url(new Uint8Array(verifierBits)), wrappingKey };
}

export interface ProtectedTransferKey {
  fragment: string;
  salt: string;
  verifier: string;
}

export async function protectTransferKey(
  key: CryptoKey,
  password: string,
): Promise<ProtectedTransferKey> {
  const salt = bytesToBase64Url(crypto.getRandomValues(new Uint8Array(SALT_BYTES)));
  const { verifier, wrappingKey } = await deriveTransferPassword(password, salt);
  const wrapped = await crypto.subtle.wrapKey("raw", key, wrappingKey, "AES-KW");
  return {
    fragment: `${FRAGMENT_PREFIX}${salt}.${bytesToBase64Url(new Uint8Array(wrapped))}`,
    salt,
    verifier,
  };
}

export function isProtectedFragment(fragment: string): boolean {
  return fragment.startsWith(FRAGMENT_PREFIX);
}

export function saltFromFragment(fragment: string): string {
  const parts = fragment.split(".");
  if (parts.length !== 3 || !isProtectedFragment(fragment)) {
    throw new Error("Invalid wrapped key format");
  }
  return parts[1];
}

/** Throws when the password is wrong: AES-KW fails its integrity check. */
export async function unwrapTransferKey(
  fragment: string,
  wrappingKey: CryptoKey,
): Promise<CryptoKey> {
  const parts = fragment.split(".");
  if (parts.length !== 3 || !isProtectedFragment(fragment)) {
    throw new Error("Invalid wrapped key format");
  }
  return crypto.subtle.unwrapKey(
    "raw",
    buffer(base64UrlToBytes(parts[2])),
    wrappingKey,
    "AES-KW",
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
}
