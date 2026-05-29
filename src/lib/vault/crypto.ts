// Vault primitives. Argon2id(m=64MiB,t=3,p=1,len=32) → AES-256 KEK. Phrase is BIP39-12 (English).
// Wrap format: iv(12) || ct(32) || tag(16) = 60 bytes.

import { argon2id } from "hash-wasm";
import { entropyToMnemonic, mnemonicToEntropy, generateMnemonic, validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";

export const KDF_VERSION = 1;
export const SALT_BYTES = 16;
export const WRAP_BYTES = 60;
export const K_VAULT_BYTES = 32;
export const WRAP_IV_BYTES = 12;
export const PHRASE_WORD_COUNT = 12;
export const PHRASE_ENTROPY_BITS = 128;

const ARGON2_PARAMS_V1 = {
  parallelism: 1,
  iterations: 3,
  memorySize: 64 * 1024, // KiB → 64 MiB
  hashLength: 32,
};

// ─── base64url ──────────────────────────────────────────────────────────────

export function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function base64UrlToBytes(s: string): Uint8Array {
  let b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// ─── Argon2id KDF ───────────────────────────────────────────────────────────

function argonParamsFor(kdfVersion: number) {
  if (kdfVersion === 1) return ARGON2_PARAMS_V1;
  throw new Error(`Unsupported kdfVersion: ${kdfVersion}`);
}

export async function deriveKekFromPassword(
  password: string,
  salt: Uint8Array,
  kdfVersion: number,
): Promise<Uint8Array> {
  const params = argonParamsFor(kdfVersion);
  const out = await argon2id({
    password,
    salt,
    parallelism: params.parallelism,
    iterations: params.iterations,
    memorySize: params.memorySize,
    hashLength: params.hashLength,
    outputType: "binary",
  });
  return out as Uint8Array;
}

/** Derives from raw entropy (not the words) — independent of wordlist edits, locale, whitespace. */
export async function deriveKekFromPhrase(
  mnemonic: string,
  salt: Uint8Array,
  kdfVersion: number,
): Promise<Uint8Array> {
  const entropy = phraseToEntropy(mnemonic);
  const params = argonParamsFor(kdfVersion);
  const out = await argon2id({
    password: entropy,
    salt,
    parallelism: params.parallelism,
    iterations: params.iterations,
    memorySize: params.memorySize,
    hashLength: params.hashLength,
    outputType: "binary",
  });
  return out as Uint8Array;
}

// ─── BIP39 phrase ───────────────────────────────────────────────────────────

/**
 * Generate a fresh 12-word BIP39 recovery phrase (128-bit entropy, English
 * wordlist). Wraps `@scure/bip39` so callers don't see the wordlist directly.
 */
export function generateRecoveryPhrase(): string {
  return generateMnemonic(wordlist, PHRASE_ENTROPY_BITS);
}

export function normaliseRecoveryPhrase(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, " ");
}

export function isValidRecoveryPhrase(input: string): boolean {
  const normalised = normaliseRecoveryPhrase(input);
  if (normalised.split(" ").length !== PHRASE_WORD_COUNT) return false;
  return validateMnemonic(normalised, wordlist);
}

function phraseToEntropy(mnemonic: string): Uint8Array {
  return mnemonicToEntropy(normaliseRecoveryPhrase(mnemonic), wordlist);
}

/** Test/debug helper. */
export function _entropyToPhrase(entropy: Uint8Array): string {
  return entropyToMnemonic(entropy, wordlist);
}

// ─── AES-GCM envelope ───────────────────────────────────────────────────────

/** Non-extractable; caller may zero the raw bytes afterwards. */
export async function importKek(kek: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    kek.buffer.slice(kek.byteOffset, kek.byteOffset + kek.byteLength) as ArrayBuffer,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** Non-extractable to harden against memory scrape. */
export async function importKVault(rawKVault: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    rawKVault.buffer.slice(rawKVault.byteOffset, rawKVault.byteOffset + rawKVault.byteLength) as ArrayBuffer,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** Returns iv(12)||ct(32)||tag(16) = 60 bytes. */
export async function wrapSecret(
  kek: CryptoKey,
  secret: Uint8Array,
): Promise<Uint8Array> {
  if (secret.byteLength !== K_VAULT_BYTES) {
    throw new Error(`secret must be ${K_VAULT_BYTES} bytes`);
  }
  const iv = crypto.getRandomValues(new Uint8Array(WRAP_IV_BYTES));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv.buffer.slice(0) as ArrayBuffer },
    kek,
    secret.buffer.slice(secret.byteOffset, secret.byteOffset + secret.byteLength) as ArrayBuffer,
  );
  const out = new Uint8Array(WRAP_BYTES);
  out.set(iv, 0);
  out.set(new Uint8Array(ct), WRAP_IV_BYTES);
  return out;
}

/** Returns null on malformed wire or tag failure. */
export async function unwrapSecret(
  kek: CryptoKey,
  wire: Uint8Array,
): Promise<Uint8Array | null> {
  if (wire.byteLength !== WRAP_BYTES) return null;
  const iv = wire.subarray(0, WRAP_IV_BYTES);
  const ctAndTag = wire.subarray(WRAP_IV_BYTES);
  try {
    const pt = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv.buffer.slice(iv.byteOffset, iv.byteOffset + iv.byteLength) as ArrayBuffer },
      kek,
      ctAndTag.buffer.slice(ctAndTag.byteOffset, ctAndTag.byteOffset + ctAndTag.byteLength) as ArrayBuffer,
    );
    return new Uint8Array(pt);
  } catch {
    return null;
  }
}

// ─── randomness ─────────────────────────────────────────────────────────────

export function randomBytes(n: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(n));
}

export function randomKVault(): Uint8Array {
  return randomBytes(K_VAULT_BYTES);
}

export function randomSalt(): Uint8Array {
  return randomBytes(SALT_BYTES);
}
