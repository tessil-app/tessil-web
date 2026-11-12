// High-level vault client. Server is blind: all KDF + AES-GCM happens in-browser.
// Wrap blobs are 60 bytes (iv|ct|tag), base64url over the wire.

import { api, type VaultPasskeyWrap, type VaultStatus } from "$lib/api/client";
import {
  evaluatePrf,
  newPrfSalt,
  passkeyUnlockPossible,
  unwrapVaultKeyWithPasskey,
  wrapVaultKeyForPasskey,
} from "./passkeyUnlock";
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

export interface PreparedVaultSetup {
  recoveryPhrase: string;
  /** Saves the vault. Until this is called nothing exists on the server. */
  commit: () => Promise<void>;
}

export type VaultSetupMethod =
  | { kind: "password"; password: string }
  /** Passkeys the account has; whichever one answers is used. */
  | { kind: "passkey"; passkeys: { id: string; credentialId: string }[] };

export type PrepareVaultSetupResult =
  | { ok: true; prepared: PreparedVaultSetup }
  | { ok: false; reason: "cancelled" | "no_prf" | "unsupported" };

/** True when this browser and this API can create a vault without a password. */
export async function canSetUpWithPasskey(): Promise<boolean> {
  if (!passkeyUnlockPossible()) return false;
  const status = await getVaultStatus(true);
  return !status.isSetup && status.passkeyOnlySetup === true;
}

/**
 * Builds a new vault in the browser without saving it. The caller shows
 * the recovery phrase and calls `commit` once the user has it, so a vault
 * never exists whose phrase nobody saw: leaving before then just means
 * starting again.
 */
export async function prepareVaultSetupWith(
  userId: string,
  method: VaultSetupMethod,
): Promise<PrepareVaultSetupResult> {
  const kVault = randomKVault();

  let passwordPart: { saltPassword: string; wrapPassword: string } | undefined;
  let passkeyPart: { authenticatorId: string; prfSalt: string; wrap: string } | undefined;

  if (method.kind === "password") {
    const salt = randomSalt();
    const kek = await deriveKekFromPassword(method.password, salt, KDF_VERSION);
    const wrap = await wrapSecret(await importKek(kek), kVault);
    kek.fill(0);
    passwordPart = { saltPassword: bytesToBase64Url(salt), wrapPassword: bytesToBase64Url(wrap) };
  } else {
    const prfSalt = newPrfSalt();
    const evaluated = await evaluatePrf(
      method.passkeys.map((p) => ({
        credentialId: p.credentialId,
        prfSalt: bytesToBase64Url(prfSalt),
      })),
    );
    const used = evaluated.ok
      ? method.passkeys.find((p) => p.credentialId === evaluated.result.credentialId)
      : undefined;
    if (!evaluated.ok || !used) {
      kVault.fill(0);
      return { ok: false, reason: evaluated.ok ? "no_prf" : evaluated.reason };
    }
    const wrap = await wrapVaultKeyForPasskey(evaluated.result.output, userId, used.id, kVault);
    evaluated.result.output.fill(0);
    passkeyPart = {
      authenticatorId: used.id,
      prfSalt: bytesToBase64Url(prfSalt),
      wrap: bytesToBase64Url(wrap),
    };
  }

  const phrase = generateRecoveryPhrase();
  const saltPhrase = randomSalt();
  const kekPhrase = await deriveKekFromPhrase(phrase, saltPhrase, KDF_VERSION);
  const wrapPhrase = await wrapSecret(await importKek(kekPhrase), kVault);
  kekPhrase.fill(0);

  let committed = false;
  return {
    ok: true,
    prepared: {
      recoveryPhrase: phrase,
      commit: async () => {
        if (committed) return;
        await api.setupVault({
          kdfVersion: KDF_VERSION,
          saltPhrase: bytesToBase64Url(saltPhrase),
          wrapPhrase: bytesToBase64Url(wrapPhrase),
          ...passwordPart,
          ...(passkeyPart ? { passkey: passkeyPart } : {}),
        });
        committed = true;
        // The cached status still says "not set up"; the keypair step reads it.
        invalidateStatusCache();
        await rememberVault(userId, kVault);
        kVault.fill(0);
        invalidateStatusCache();
      },
    },
  };
}

export async function prepareVaultSetup(
  userId: string,
  password: string,
): Promise<PreparedVaultSetup> {
  const result = await prepareVaultSetupWith(userId, { kind: "password", password });
  if (!result.ok) throw new Error("Couldn't prepare the vault.");
  return result.prepared;
}

/** Creates and saves a vault in one go. Returned phrase MUST be shown to the user. */
export async function setupVault(
  userId: string,
  password: string,
): Promise<VaultSetupResult> {
  const prepared = await prepareVaultSetup(userId, password);
  await prepared.commit();
  return { recoveryPhrase: prepared.recoveryPhrase };
}

// ─── opening the vault ──────────────────────────────────────────────────────
//
// Three things can open a vault: its password (if it has one), its recovery
// phrase, and any passkey set up for it. Each wraps the same K_vault.

export type VaultAccess =
  | { kind: "password"; password: string }
  | { kind: "phrase"; phrase: string }
  | { kind: "passkey" };

export type VaultAccessFailure =
  | "not_setup"
  | "no_password"
  | "wrong_password"
  | "wrong_phrase"
  | "malformed"
  | "none_enrolled"
  | "cancelled"
  | "no_prf"
  | "unsupported"
  | "wrong_passkey";

type SetUpStatus = Extract<VaultStatus, { isSetup: true }>;

/** The raw vault key, opened with whichever proof was given. Caller zeroes it. */
async function openKVault(
  userId: string,
  status: SetUpStatus,
  via: VaultAccess,
): Promise<{ ok: true; kVault: Uint8Array } | { ok: false; reason: VaultAccessFailure }> {
  if (via.kind === "password") {
    if (!status.saltPassword || !status.wrapPassword) return { ok: false, reason: "no_password" };
    const wrap = base64UrlToBytes(status.wrapPassword);
    if (wrap.byteLength !== WRAP_BYTES) return { ok: false, reason: "malformed" };
    const kek = await deriveKekFromPassword(
      via.password,
      base64UrlToBytes(status.saltPassword),
      status.kdfVersion,
    );
    const kVault = await unwrapSecret(await importKek(kek), wrap);
    kek.fill(0);
    return kVault ? { ok: true, kVault } : { ok: false, reason: "wrong_password" };
  }

  if (via.kind === "phrase") {
    if (!isValidRecoveryPhrase(via.phrase)) return { ok: false, reason: "wrong_phrase" };
    const wrap = base64UrlToBytes(status.wrapPhrase);
    if (wrap.byteLength !== WRAP_BYTES) return { ok: false, reason: "malformed" };
    const kek = await deriveKekFromPhrase(
      normaliseRecoveryPhrase(via.phrase),
      base64UrlToBytes(status.saltPhrase),
      status.kdfVersion,
    );
    const kVault = await unwrapSecret(await importKek(kek), wrap);
    kek.fill(0);
    return kVault ? { ok: true, kVault } : { ok: false, reason: "wrong_phrase" };
  }

  const wraps = status.passkeyWraps ?? [];
  if (wraps.length === 0) return { ok: false, reason: "none_enrolled" };
  const evaluated = await evaluatePrf(wraps);
  if (!evaluated.ok) return { ok: false, reason: evaluated.reason };
  const used = wraps.find((w) => w.credentialId === evaluated.result.credentialId);
  const kVault = used
    ? await unwrapVaultKeyWithPasskey(
        evaluated.result.output,
        userId,
        used.authenticatorId,
        base64UrlToBytes(used.wrap),
      )
    : null;
  evaluated.result.output.fill(0);
  return kVault ? { ok: true, kVault } : { ok: false, reason: "wrong_passkey" };
}

async function openWith(
  userId: string,
  via: VaultAccess,
): Promise<{ ok: true; kVault: Uint8Array } | { ok: false; reason: VaultAccessFailure }> {
  const status = await getVaultStatus(true);
  if (!status.isSetup) return { ok: false, reason: "not_setup" };
  return openKVault(userId, status, via);
}

export type VaultResult = { ok: true } | { ok: false; reason: VaultAccessFailure };

/** Unlocks the vault for this browser session. */
export async function unlockVault(userId: string, via: VaultAccess): Promise<VaultResult> {
  const opened = await openWith(userId, via);
  if (!opened.ok) return opened;
  await rememberVault(userId, opened.kVault);
  opened.kVault.fill(0);
  return { ok: true };
}

export type UnlockResult = VaultResult;
export type PasskeyUnlockResult = VaultResult;

export function unlockWithPassword(userId: string, password: string): Promise<VaultResult> {
  return unlockVault(userId, { kind: "password", password });
}

export function unlockWithPhrase(userId: string, phrase: string): Promise<VaultResult> {
  return unlockVault(userId, { kind: "phrase", phrase });
}

/** Unlocks with any passkey set up for the vault that is on this device. */
export function unlockWithPasskey(userId: string): Promise<VaultResult> {
  return unlockVault(userId, { kind: "passkey" });
}

// ─── what opens this vault ──────────────────────────────────────────────────

/** Passkeys that can unlock this account's vault. Empty when there are none or the vault is not set up. */
export async function passkeysThatUnlock(force = false): Promise<VaultPasskeyWrap[]> {
  const status = await getVaultStatus(force);
  return status.isSetup ? (status.passkeyWraps ?? []) : [];
}

/** False for a vault opened by passkey and recovery phrase only. */
export async function vaultHasPassword(force = false): Promise<boolean> {
  const status = await getVaultStatus(force);
  return status.isSetup && status.wrapPassword !== null;
}

// ─── changing what opens it ─────────────────────────────────────────────────
//
// Each of these needs the raw vault key, so each asks for a proof again
// even in an unlocked session, which deliberately cannot give the key back.

/** Lets one of the user's passkeys unlock the vault. */
export async function enablePasskeyUnlock(
  userId: string,
  passkey: { id: string; credentialId: string },
  via: VaultAccess,
): Promise<VaultResult> {
  const opened = await openWith(userId, via);
  if (!opened.ok) return opened;
  try {
    const prfSalt = newPrfSalt();
    const evaluated = await evaluatePrf([
      { credentialId: passkey.credentialId, prfSalt: bytesToBase64Url(prfSalt) },
    ]);
    if (!evaluated.ok) return { ok: false, reason: evaluated.reason };

    const wrap = await wrapVaultKeyForPasskey(evaluated.result.output, userId, passkey.id, opened.kVault);
    evaluated.result.output.fill(0);
    await api.setVaultPasskeyWrap(passkey.id, {
      prfSalt: bytesToBase64Url(prfSalt),
      wrap: bytesToBase64Url(wrap),
    });
    // The proof was good, so this is also an unlock.
    await rememberVault(userId, opened.kVault);
    invalidateStatusCache();
    return { ok: true };
  } finally {
    opened.kVault.fill(0);
  }
}

export async function disablePasskeyUnlock(authenticatorId: string): Promise<void> {
  await api.deleteVaultPasskeyWrap(authenticatorId);
  invalidateStatusCache();
}

/**
 * Sets the vault password: changing it (proof: the old password), resetting
 * a forgotten one (proof: the recovery phrase), or adding one to a vault
 * that has none (proof: a passkey or the phrase). The other ways in are
 * untouched.
 */
export async function setVaultPassword(
  userId: string,
  newPassword: string,
  via: VaultAccess,
): Promise<VaultResult> {
  const opened = await openWith(userId, via);
  if (!opened.ok) return opened;
  try {
    const salt = randomSalt();
    const kek = await deriveKekFromPassword(newPassword, salt, KDF_VERSION);
    const wrap = await wrapSecret(await importKek(kek), opened.kVault);
    kek.fill(0);
    await api.changeVaultPassword({
      kdfVersion: KDF_VERSION,
      saltPassword: bytesToBase64Url(salt),
      wrapPassword: bytesToBase64Url(wrap),
    });
    await rememberVault(userId, opened.kVault);
    invalidateStatusCache();
    return { ok: true };
  } finally {
    opened.kVault.fill(0);
  }
}

export type ChangePasswordResult = VaultResult;

export function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<VaultResult> {
  return setVaultPassword(userId, newPassword, { kind: "password", password: currentPassword });
}

export type RegeneratePhraseResult =
  | { ok: true; recoveryPhrase: string }
  | { ok: false; reason: VaultAccessFailure };

/** Replaces the recovery phrase. The old one stops working. */
export async function regeneratePhrase(
  userId: string,
  via: VaultAccess | string,
): Promise<RegeneratePhraseResult> {
  const proof: VaultAccess = typeof via === "string" ? { kind: "password", password: via } : via;
  const opened = await openWith(userId, proof);
  if (!opened.ok) return opened;
  try {
    const newPhrase = generateRecoveryPhrase();
    const salt = randomSalt();
    const kek = await deriveKekFromPhrase(newPhrase, salt, KDF_VERSION);
    const wrap = await wrapSecret(await importKek(kek), opened.kVault);
    kek.fill(0);
    await api.regenerateVaultPhrase({
      kdfVersion: KDF_VERSION,
      saltPhrase: bytesToBase64Url(salt),
      wrapPhrase: bytesToBase64Url(wrap),
    });
    await rememberVault(userId, opened.kVault);
    invalidateStatusCache();
    return { ok: true, recoveryPhrase: newPhrase };
  } finally {
    opened.kVault.fill(0);
  }
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
