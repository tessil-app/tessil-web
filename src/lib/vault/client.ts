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
  USER_PRIVATE_KEY_KIND,
  generateUserKeypair,
  importUserPrivateKey,
  importVaultDerivationKey,
  openVaultItem,
  sealVaultItem,
} from "./keypair";
import {
  clearVaultKey,
  readVaultDerivationKey,
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

// Caches both forms of K_vault, then makes sure the user has a keypair.
// Every unlock path ends here, while the raw bytes are still in hand.
async function rememberVault(userId: string, kVaultBytes: Uint8Array): Promise<void> {
  const [key, derivationKey] = await Promise.all([
    importKVault(kVaultBytes),
    importVaultDerivationKey(kVaultBytes),
  ]);
  await storeVaultKey(userId, key, derivationKey);
  try {
    await ensureUserKeypair(userId);
  } catch (err) {
    // The vault is open either way; the next unlock tries again.
    console.warn("[vault] could not create the user keypair:", err);
  }
}

// ─── user keypair ───────────────────────────────────────────────────────────

/** Generates and stores the keypair once. No-op when one exists or the vault is locked. */
export async function ensureUserKeypair(userId: string): Promise<void> {
  const status = await getVaultStatus();
  if (!status.isSetup || status.publicKey) return;
  const derivationKey = await readVaultDerivationKey(userId);
  if (!derivationKey) return;

  const pair = await generateUserKeypair();
  const sealed = await sealVaultItem(derivationKey, userId, USER_PRIVATE_KEY_KIND, pair.privateKey);
  pair.privateKey.fill(0);
  try {
    await api.createVaultKeypair({
      publicKey: bytesToBase64Url(pair.publicKey),
      wrappedPrivateKey: bytesToBase64Url(sealed),
    });
  } finally {
    // Also on a 409 from another tab winning the race: re-read what was stored.
    invalidateStatusCache();
  }
}

/** The user's private key, usable for key agreement only. Null when locked or absent. */
export async function getUserPrivateKey(userId: string): Promise<CryptoKey | null> {
  const status = await getVaultStatus();
  if (!status.isSetup || !status.wrappedPrivateKey) return null;
  const derivationKey = await readVaultDerivationKey(userId);
  if (!derivationKey) return null;

  const pkcs8 = await openVaultItem(
    derivationKey,
    userId,
    USER_PRIVATE_KEY_KIND,
    base64UrlToBytes(status.wrappedPrivateKey),
  );
  if (!pkcs8) return null;
  const key = await importUserPrivateKey(pkcs8);
  pkcs8.fill(0);
  return key;
}

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

  // The cached status still says "not set up"; the keypair step reads it.
  invalidateStatusCache();
  await rememberVault(userId, kVault);

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

  await rememberVault(userId, kVaultBytes);
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

  await rememberVault(userId, kVaultBytes);
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
  await rememberVault(userId, kVaultBytes);
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
  await rememberVault(userId, kVaultBytes);
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
