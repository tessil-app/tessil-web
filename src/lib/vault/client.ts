// High-level vault client. See docs/adr/0004-vault-redesign-password-and-recovery-phrase.md.
//
// Flow at first sign-in:
//   1. setupVault(password) — generates K_vault + recovery phrase, wraps
//      K_vault under Argon2id(password) and Argon2id(phrase), POSTs the
//      blobs to /api/me/vault/setup, caches K_vault in IDB. Returns the
//      phrase for the UI to display once.
//
// Flow on every subsequent visit:
//   - If the IDB cache has a non-expired entry for the current user,
//     `isUnlocked()` is true and `getKVault()` returns the cached key.
//   - Otherwise the UI must prompt for the password or recovery phrase
//     and call `unlockWithPassword(...)` or `unlockWithPhrase(...)`.
//
// All wrap blobs are 60 bytes (iv|ct|tag) and round-trip the server as
// base64url. The server is blind — every KDF and AES-GCM call happens
// in the browser.

import { api, type VaultStatus } from "$lib/api/client";
import {
  KDF_VERSION,
  WRAP_BYTES,
  base64UrlToBytes,
  bytesToBase64Url,
  deriveKekFromPassword,
  deriveKekFromPhrase,
  generateRecoveryPhrase,
  importKVault,
  importKek,
  isValidRecoveryPhrase,
  normaliseRecoveryPhrase,
  randomKVault,
  randomSalt,
  unwrapSecret,
  wrapSecret,
} from "./crypto";
import {
  clearVaultKey,
  readVaultKey,
  storeVaultKey,
  subscribeToVaultState,
} from "./session";

// ─── shared state ───────────────────────────────────────────────────────────

// Cached server-side vault status so multiple consumers (dashboard, upload
// page, settings) don't re-fetch on every navigation. Invalidated after any
// write that changes salts/wraps.
let statusCache: VaultStatus | null = null;
let statusInflight: Promise<VaultStatus> | null = null;

function invalidateStatusCache(): void {
  statusCache = null;
  statusInflight = null;
}

export async function getVaultStatus(force = false): Promise<VaultStatus> {
  if (!force && statusCache) return statusCache;
  if (statusInflight) return statusInflight;
  statusInflight = api.getVault().then((s) => {
    statusCache = s;
    return s;
  }).finally(() => {
    statusInflight = null;
  });
  return statusInflight;
}

// ─── unlock state ───────────────────────────────────────────────────────────

/**
 * Resolve the cached K_vault for the signed-in user, or null when the
 * session has expired / never been unlocked. Reads IDB; the result lives
 * in a non-extractable CryptoKey so callers can wrap/unwrap but not export
 * the raw bytes.
 */
export async function getKVault(userId: string): Promise<CryptoKey | null> {
  return readVaultKey(userId);
}

export async function isUnlocked(userId: string): Promise<boolean> {
  return (await readVaultKey(userId)) !== null;
}

/** Drop the cached K_vault. Idempotent. Called on sign-out and on Lock. */
export async function lock(): Promise<void> {
  await clearVaultKey();
}

export { subscribeToVaultState };

// ─── setup (first-time) ─────────────────────────────────────────────────────

export interface VaultSetupResult {
  recoveryPhrase: string;
}

/**
 * One-shot vault setup. Generates a fresh K_vault and recovery phrase,
 * wraps K_vault under both KEKs, persists the blobs server-side, and
 * caches K_vault locally. The returned phrase MUST be shown to the user
 * exactly once — the server never sees the plaintext, so it cannot be
 * recovered afterwards.
 *
 * Idempotency: re-running setup against an already-initialised vault is
 * rejected server-side (409). Callers should branch on `getVaultStatus()`
 * before calling.
 */
export async function setupVault(
  userId: string,
  password: string,
): Promise<VaultSetupResult> {
  const phrase = generateRecoveryPhrase();
  const kVault = randomKVault();
  const saltPassword = randomSalt();
  const saltPhrase = randomSalt();

  const [kekPassword, kekPhrase] = await Promise.all([
    deriveKekFromPassword(password, saltPassword, KDF_VERSION),
    deriveKekFromPhrase(phrase, saltPhrase, KDF_VERSION),
  ]);
  const [kekPasswordKey, kekPhraseKey] = await Promise.all([
    importKek(kekPassword),
    importKek(kekPhrase),
  ]);

  const [wrapPassword, wrapPhrase] = await Promise.all([
    wrapSecret(kekPasswordKey, kVault),
    wrapSecret(kekPhraseKey, kVault),
  ]);

  await api.setupVault({
    kdfVersion: KDF_VERSION,
    saltPassword: bytesToBase64Url(saltPassword),
    saltPhrase: bytesToBase64Url(saltPhrase),
    wrapPassword: bytesToBase64Url(wrapPassword),
    wrapPhrase: bytesToBase64Url(wrapPhrase),
  });

  const kVaultKey = await importKVault(kVault);
  await storeVaultKey(userId, kVaultKey);

  // Zero the raw KEK + K_vault bytes once the AES-GCM CryptoKeys exist.
  // WebCrypto holds its own copy; the original Uint8Arrays are now redundant
  // and could survive in GC memory longer than needed.
  kekPassword.fill(0);
  kekPhrase.fill(0);
  kVault.fill(0);

  invalidateStatusCache();
  return { recoveryPhrase: phrase };
}

// ─── unlock ─────────────────────────────────────────────────────────────────

export type UnlockResult =
  | { ok: true }
  | { ok: false; reason: "not_setup" | "wrong_password" | "wrong_phrase" | "malformed" };

export async function unlockWithPassword(
  userId: string,
  password: string,
): Promise<UnlockResult> {
  const status = await getVaultStatus(true);
  if (!status.isSetup) return { ok: false, reason: "not_setup" };

  const saltPassword = base64UrlToBytes(status.saltPassword);
  const wrapPassword = base64UrlToBytes(status.wrapPassword);
  if (wrapPassword.byteLength !== WRAP_BYTES) {
    return { ok: false, reason: "malformed" };
  }

  const kek = await deriveKekFromPassword(password, saltPassword, status.kdfVersion);
  const kekKey = await importKek(kek);
  const kVaultBytes = await unwrapSecret(kekKey, wrapPassword);
  kek.fill(0);
  if (!kVaultBytes) return { ok: false, reason: "wrong_password" };

  const kVaultKey = await importKVault(kVaultBytes);
  await storeVaultKey(userId, kVaultKey);
  kVaultBytes.fill(0);
  return { ok: true };
}

export async function unlockWithPhrase(
  userId: string,
  rawPhrase: string,
): Promise<UnlockResult> {
  if (!isValidRecoveryPhrase(rawPhrase)) {
    return { ok: false, reason: "wrong_phrase" };
  }
  const phrase = normaliseRecoveryPhrase(rawPhrase);

  const status = await getVaultStatus(true);
  if (!status.isSetup) return { ok: false, reason: "not_setup" };

  const saltPhrase = base64UrlToBytes(status.saltPhrase);
  const wrapPhrase = base64UrlToBytes(status.wrapPhrase);
  if (wrapPhrase.byteLength !== WRAP_BYTES) {
    return { ok: false, reason: "malformed" };
  }

  const kek = await deriveKekFromPhrase(phrase, saltPhrase, status.kdfVersion);
  const kekKey = await importKek(kek);
  const kVaultBytes = await unwrapSecret(kekKey, wrapPhrase);
  kek.fill(0);
  if (!kVaultBytes) return { ok: false, reason: "wrong_phrase" };

  const kVaultKey = await importKVault(kVaultBytes);
  await storeVaultKey(userId, kVaultKey);
  kVaultBytes.fill(0);
  return { ok: true };
}

// ─── change password / regenerate phrase ────────────────────────────────────

export type ChangePasswordResult =
  | { ok: true }
  | { ok: false; reason: "not_setup" | "wrong_password" | "malformed" };

/**
 * Change the vault password. The recovery phrase wrap is untouched, so
 * phrase recovery continues to work afterwards. Server-side this updates
 * only the password salt + wrap.
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<ChangePasswordResult> {
  const status = await getVaultStatus(true);
  if (!status.isSetup) return { ok: false, reason: "not_setup" };

  const oldSalt = base64UrlToBytes(status.saltPassword);
  const oldWrap = base64UrlToBytes(status.wrapPassword);
  if (oldWrap.byteLength !== WRAP_BYTES) return { ok: false, reason: "malformed" };

  const oldKek = await deriveKekFromPassword(currentPassword, oldSalt, status.kdfVersion);
  const oldKekKey = await importKek(oldKek);
  const kVaultBytes = await unwrapSecret(oldKekKey, oldWrap);
  oldKek.fill(0);
  if (!kVaultBytes) return { ok: false, reason: "wrong_password" };

  const newSalt = randomSalt();
  const newKek = await deriveKekFromPassword(newPassword, newSalt, KDF_VERSION);
  const newKekKey = await importKek(newKek);
  const newWrap = await wrapSecret(newKekKey, kVaultBytes);
  newKek.fill(0);

  await api.changeVaultPassword({
    kdfVersion: KDF_VERSION,
    saltPassword: bytesToBase64Url(newSalt),
    wrapPassword: bytesToBase64Url(newWrap),
  });

  // Re-prime IDB so the user stays unlocked through the password change.
  const kVaultKey = await importKVault(kVaultBytes);
  await storeVaultKey(userId, kVaultKey);
  kVaultBytes.fill(0);

  invalidateStatusCache();
  return { ok: true };
}

export type RegeneratePhraseResult =
  | { ok: true; recoveryPhrase: string }
  | { ok: false; reason: "not_setup" | "wrong_password" | "malformed" };

/**
 * Generate a fresh recovery phrase and rewrap K_vault under it. Requires
 * the current password — the old phrase becomes invalid the moment this
 * succeeds, so we never accept the old phrase as authorisation. Returns
 * the new phrase for one-time display.
 */
export async function regeneratePhrase(
  userId: string,
  currentPassword: string,
): Promise<RegeneratePhraseResult> {
  const status = await getVaultStatus(true);
  if (!status.isSetup) return { ok: false, reason: "not_setup" };

  const saltPassword = base64UrlToBytes(status.saltPassword);
  const wrapPassword = base64UrlToBytes(status.wrapPassword);
  if (wrapPassword.byteLength !== WRAP_BYTES) return { ok: false, reason: "malformed" };

  const kekPassword = await deriveKekFromPassword(currentPassword, saltPassword, status.kdfVersion);
  const kekPasswordKey = await importKek(kekPassword);
  const kVaultBytes = await unwrapSecret(kekPasswordKey, wrapPassword);
  kekPassword.fill(0);
  if (!kVaultBytes) return { ok: false, reason: "wrong_password" };

  const newPhrase = generateRecoveryPhrase();
  const newSalt = randomSalt();
  const newKek = await deriveKekFromPhrase(newPhrase, newSalt, KDF_VERSION);
  const newKekKey = await importKek(newKek);
  const newWrap = await wrapSecret(newKekKey, kVaultBytes);
  newKek.fill(0);

  await api.regenerateVaultPhrase({
    kdfVersion: KDF_VERSION,
    saltPhrase: bytesToBase64Url(newSalt),
    wrapPhrase: bytesToBase64Url(newWrap),
  });

  // Re-prime IDB. The K_vault itself did not change but the unlock state
  // should persist through the regen UI.
  const kVaultKey = await importKVault(kVaultBytes);
  await storeVaultKey(userId, kVaultKey);
  kVaultBytes.fill(0);

  invalidateStatusCache();
  return { ok: true, recoveryPhrase: newPhrase };
}

// ─── per-transfer wrap/unwrap ───────────────────────────────────────────────

const K_TRANSFER_BYTES = 32;

/**
 * Wrap a raw 32-byte K_transfer under the cached K_vault. Throws when the
 * vault is locked — callers must call `unlockWith*` first. Returns the
 * 60-byte wire format as base64url, suitable for the upload-complete body.
 */
export async function wrapTransferKey(
  userId: string,
  rawTransferKey: ArrayBuffer,
): Promise<string> {
  if (rawTransferKey.byteLength !== K_TRANSFER_BYTES) {
    throw new Error("K_transfer must be exactly 32 bytes.");
  }
  const kVault = await readVaultKey(userId);
  if (!kVault) throw new Error("Vault is locked.");

  const wrap = await wrapSecret(kVault, new Uint8Array(rawTransferKey));
  return bytesToBase64Url(wrap);
}

/**
 * Unwrap a base64url-encoded `wrappedKey` into raw K_transfer bytes. Returns
 * null when the vault is locked or the blob fails authentication (typically
 * "different K_vault than the one that wrapped this transfer"). The
 * dashboard treats null as "filename unavailable" and falls back to
 * showing the row in blind mode.
 */
export async function unwrapTransferKey(
  userId: string,
  wrappedKeyB64Url: string,
): Promise<ArrayBuffer | null> {
  const kVault = await readVaultKey(userId);
  if (!kVault) return null;

  let wire: Uint8Array;
  try {
    wire = base64UrlToBytes(wrappedKeyB64Url);
  } catch {
    return null;
  }
  const pt = await unwrapSecret(kVault, wire);
  if (!pt) return null;
  return pt.buffer.slice(pt.byteOffset, pt.byteOffset + pt.byteLength) as ArrayBuffer;
}

/**
 * Import raw K_transfer bytes as an extractable AES-GCM CryptoKey suitable
 * for decrypting filenames and file payloads. Extractable so the dashboard
 * can hand the raw bytes back as a URL-fragment in the "Get share link"
 * recovery flow.
 */
export async function importTransferKey(rawKey: ArrayBuffer): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
}

export function transferKeyToFragment(rawKey: ArrayBuffer): string {
  return bytesToBase64Url(new Uint8Array(rawKey));
}

// ─── back-compat shim ───────────────────────────────────────────────────────

/** Drop in-memory caches. Called by the auth store on sign-out. */
export async function clearVaultCache(): Promise<void> {
  invalidateStatusCache();
  await clearVaultKey();
}
