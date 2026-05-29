// High-level vault client. Server is blind: all KDF + AES-GCM happens in-browser.
// Wrap blobs are 60 bytes (iv|ct|tag), base64url over the wire.

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

// Cached so dashboard/upload/settings don't re-fetch on every navigation.
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

/** Cached K_vault for the signed-in user, or null when unlocked session expired. */
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

/** One-shot setup. Returned phrase MUST be shown to the user exactly once. */
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

  // Zero raw KEK + K_vault bytes; WebCrypto already holds its own copies.
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

/** Phrase wrap is untouched, so phrase recovery still works after a password change. */
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

  // Stay unlocked across the password change.
  const kVaultKey = await importKVault(kVaultBytes);
  await storeVaultKey(userId, kVaultKey);
  kVaultBytes.fill(0);

  invalidateStatusCache();
  return { ok: true };
}

export type RegeneratePhraseResult =
  | { ok: true; recoveryPhrase: string }
  | { ok: false; reason: "not_setup" | "wrong_password" | "malformed" };

/** Requires current password (the old phrase is about to become invalid). */
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

  // K_vault unchanged; stay unlocked through the regen UI.
  const kVaultKey = await importKVault(kVaultBytes);
  await storeVaultKey(userId, kVaultKey);
  kVaultBytes.fill(0);

  invalidateStatusCache();
  return { ok: true, recoveryPhrase: newPhrase };
}

// ─── per-transfer wrap/unwrap ───────────────────────────────────────────────

const K_TRANSFER_BYTES = 32;

/** Wraps a raw 32-byte K_transfer under K_vault; throws when locked. */
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

/** Returns null when the vault is locked or auth fails (caller falls back to blind mode). */
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

/** Extractable so the dashboard can re-emit raw bytes as a URL fragment for share-link recovery. */
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
