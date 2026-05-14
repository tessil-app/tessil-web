// Phase F vault client — wrap-on-create + (later) unwrap-on-dashboard.
// See docs/audit/28-dashboard-transfer-key-vault.md.
//
// Flow at upload time:
//   1. fetchPrfSalts()  → list of (credentialId, salt) for the user's
//      PRF-capable credentials. Cached for the session.
//   2. deriveVaultKey() → triggers ONE WebAuthn assertion with PRF eval,
//      derives K_vault via HKDF-SHA-256, and caches it (non-extractable
//      CryptoKey) in module-level closure keyed by credentialId. Per
//      D-116 the cache lives only as long as the JS module instance —
//      cleared on tab close, page navigation away from the SPA shell,
//      or via clearVaultCache() on sign-out.
//   3. wrapTransferKey(rawKey, credentialId) → AES-GCM-wraps the 32-byte
//      K_transfer under K_vault. Returns the 60-byte wire format
//      (wrap_iv || ct || tag) base64url-encoded for the API.
//
// The wrap path is strictly additive — any failure here (no PRF cred,
// UV dismissed, network glitch on salt fetch) returns null/throws and
// the caller falls back to the unvaulted /complete path. See doc 28 §3.

import {
  startAuthentication,
  type AuthenticationResponseJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
import { api, type PrfSaltEntry } from "$lib/api/client";

const PRF_PURPOSE_VAULT = "jtransfer:vault:transfer-key:v1";
const HKDF_SALT_LABEL = "jtransfer.hkdf.vault.v1";
const WRAP_IV_LEN = 12;
const TRANSFER_KEY_BYTES = 32;
const WRAP_WIRE_BYTES = 60; // wrap_iv(12) || ct(32) || tag(16)

// Non-extractable AES-GCM K_vault per credentialId (base64url). Module-level
// per D-116 — survives only as long as the JS module instance.
const vaultKeyCache = new Map<string, CryptoKey>();

let prfSaltsCache: PrfSaltEntry[] | null = null;
let prfSaltsCachePromise: Promise<PrfSaltEntry[]> | null = null;

export function clearVaultCache(): void {
  vaultKeyCache.clear();
  prfSaltsCache = null;
  prfSaltsCachePromise = null;
}

function base64UrlToBytes(s: string): Uint8Array {
  let b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function fetchPrfSalts(): Promise<PrfSaltEntry[]> {
  if (prfSaltsCache) return prfSaltsCache;
  if (prfSaltsCachePromise) return prfSaltsCachePromise;
  prfSaltsCachePromise = api
    .getPrfSalts()
    .then((r) => {
      prfSaltsCache = r.salts;
      return r.salts;
    })
    .finally(() => {
      prfSaltsCachePromise = null;
    });
  return prfSaltsCachePromise;
}

/**
 * Returns true if the signed-in user has at least one PRF-capable credential
 * with the vault purpose salt provisioned. Used by the upload UI to decide
 * whether to expose the vault toggle.
 *
 * Caches the underlying salt list to avoid a round trip per render.
 * Returns false (and does NOT throw) if the user is not signed in or the
 * endpoint errors — vault is strictly additive.
 */
export async function hasVaultCapableCredential(): Promise<boolean> {
  try {
    const salts = await fetchPrfSalts();
    return salts.some((s) => s.purpose === PRF_PURPOSE_VAULT);
  } catch {
    return false;
  }
}

interface DerivedVault {
  credentialId: string; // base64url
  key: CryptoKey;
}

/**
 * Triggers a single WebAuthn assertion with PRF eval to derive K_vault.
 * The assertion is *not* sent back to the server — only its PRF output is
 * used. The challenge is therefore client-generated (no server round trip
 * needed for replay protection; the bytes never leave the browser).
 *
 * On success, caches the derived non-extractable CryptoKey keyed by the
 * credentialId the user picked, and returns both.
 *
 * Returns null on any soft failure (no PRF creds, user cancels, PRF output
 * empty). Caller treats null as "skip vault" per doc 28 §3.
 */
export async function deriveVaultKey(): Promise<DerivedVault | null> {
  let salts: PrfSaltEntry[];
  try {
    salts = await fetchPrfSalts();
  } catch {
    return null;
  }
  const vaultEntries = salts.filter((s) => s.purpose === PRF_PURPOSE_VAULT);
  if (vaultEntries.length === 0) return null;

  // Build the PRF eval map. SimpleWebAuthn v13 expects base64url credential
  // IDs and base64url salt bytes in the JSON request shape.
  const evalByCredential: Record<string, { first: string }> = {};
  for (const e of vaultEntries) {
    evalByCredential[e.credentialId] = { first: e.salt };
  }

  const challenge = bytesToBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const allowCredentials = vaultEntries.map((e) => ({
    id: e.credentialId,
    type: "public-key" as const,
  }));

  const optionsJSON: PublicKeyCredentialRequestOptionsJSON = {
    challenge,
    rpId: window.location.hostname,
    allowCredentials,
    userVerification: "required",
    // Cast: PRF lives in the WebAuthn Level 3 extension namespace and
    // simplewebauthn's typing for `extensions` accepts the open shape.
    extensions: { prf: { evalByCredential } } as unknown as Record<
      string,
      unknown
    >,
  };

  let response: AuthenticationResponseJSON;
  try {
    response = await startAuthentication({ optionsJSON });
  } catch {
    // User cancelled, no authenticator available, origin mismatch — all
    // surface here. Soft-fail; caller falls back to unvaulted flow.
    return null;
  }

  // Pull the PRF output from clientExtensionResults. SimpleWebAuthn v13
  // returns these as base64url strings. The type for the extensions blob
  // is open, so cast narrowly here.
  const ext = response.clientExtensionResults as {
    prf?: { results?: { first?: string } };
  } | undefined;
  const prfB64Url = ext?.prf?.results?.first;
  if (typeof prfB64Url !== "string" || prfB64Url.length === 0) return null;

  const prfBytes = base64UrlToBytes(prfB64Url);
  if (prfBytes.byteLength === 0) return null;

  // HKDF-SHA-256 → 256-bit AES-GCM key, non-extractable (D-116).
  let ikm: CryptoKey;
  try {
    ikm = await crypto.subtle.importKey(
      "raw",
      prfBytes.buffer as ArrayBuffer,
      "HKDF",
      false,
      ["deriveKey"],
    );
  } catch {
    return null;
  }

  let key: CryptoKey;
  try {
    key = await crypto.subtle.deriveKey(
      {
        name: "HKDF",
        hash: "SHA-256",
        salt: new TextEncoder().encode(HKDF_SALT_LABEL),
        info: new TextEncoder().encode(PRF_PURPOSE_VAULT),
      },
      ikm,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
  } catch {
    return null;
  }

  vaultKeyCache.set(response.id, key);
  return { credentialId: response.id, key };
}

/**
 * Wraps a 32-byte raw K_transfer under the cached K_vault for `credentialId`.
 * Throws if the K_vault has not been derived this session — caller must
 * deriveVaultKey() first.
 *
 * Wire format (doc 28 §5 / D-115):
 *   wrap_iv(12) || AES-GCM-ciphertext(32) || tag(16)  = 60 bytes
 * Encoded to base64url at the API boundary.
 */
export async function wrapTransferKey(
  rawTransferKey: ArrayBuffer,
  credentialId: string,
): Promise<{ wrappedKey: string; wrapCredentialId: string }> {
  if (rawTransferKey.byteLength !== TRANSFER_KEY_BYTES) {
    throw new Error("K_transfer must be exactly 32 bytes.");
  }
  const vaultKey = vaultKeyCache.get(credentialId);
  if (!vaultKey) {
    throw new Error("K_vault not derived for this credential.");
  }

  const wrapIv = crypto.getRandomValues(new Uint8Array(WRAP_IV_LEN));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: wrapIv.buffer as ArrayBuffer },
    vaultKey,
    rawTransferKey,
  );

  const wire = new Uint8Array(WRAP_WIRE_BYTES);
  wire.set(wrapIv, 0);
  wire.set(new Uint8Array(ciphertext), WRAP_IV_LEN);

  return {
    wrappedKey: bytesToBase64Url(wire),
    wrapCredentialId: credentialId,
  };
}

/**
 * Returns true iff the K_vault for `credentialId` is already cached
 * this session. Lets the dashboard decide whether to gate unwrap behind
 * a single "Unlock filenames" gesture (doc 28 §3, §9).
 */
export function isVaultUnlocked(credentialId: string): boolean {
  return vaultKeyCache.has(credentialId);
}

/**
 * Unwraps a 60-byte wire-format `wrappedKey` blob to a raw 32-byte
 * K_transfer using the cached K_vault for `credentialId`. Returns null on
 * any failure (cache miss, malformed blob, GCM tag mismatch — typically
 * "credential was deleted server-side, no longer recoverable"). Doc 28 §4
 * says the dashboard treats missing-credential as a silent soft failure
 * and reverts the row to blind, so callers should not surface anything
 * scarier than "(encrypted — original sign-in key no longer available)".
 */
export async function unwrapTransferKey(
  wrappedKeyB64Url: string,
  credentialId: string,
): Promise<ArrayBuffer | null> {
  const vaultKey = vaultKeyCache.get(credentialId);
  if (!vaultKey) return null;

  let wire: Uint8Array;
  try {
    wire = base64UrlToBytes(wrappedKeyB64Url);
  } catch {
    return null;
  }
  if (wire.byteLength !== WRAP_WIRE_BYTES) return null;

  const wrapIv = wire.subarray(0, WRAP_IV_LEN);
  const ciphertextAndTag = wire.subarray(WRAP_IV_LEN);

  try {
    return await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: wrapIv.buffer.slice(wrapIv.byteOffset, wrapIv.byteOffset + wrapIv.byteLength) as ArrayBuffer },
      vaultKey,
      ciphertextAndTag.buffer.slice(
        ciphertextAndTag.byteOffset,
        ciphertextAndTag.byteOffset + ciphertextAndTag.byteLength,
      ) as ArrayBuffer,
    );
  } catch {
    return null;
  }
}

/**
 * Encodes raw K_transfer bytes as the base64url string that goes in the
 * share URL fragment (matches the unvaulted flow's `exportKey` output).
 */
export function transferKeyToFragment(rawKey: ArrayBuffer): string {
  return bytesToBase64Url(new Uint8Array(rawKey));
}

/**
 * Imports a raw 32-byte K_transfer (the output of unwrapTransferKey) as
 * an AES-GCM CryptoKey suitable for decrypting filenames + file payloads.
 * Extractable=true so the dashboard can hand the raw bytes back as a URL
 * fragment in the "Get share link" recovery flow (doc 28 §3).
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

/**
 * Convenience: derive K_vault (if not already) and wrap a raw K_transfer
 * in one call. Returns null on any soft failure — caller falls back to the
 * unvaulted /complete path.
 */
export async function wrapWithVault(
  rawTransferKey: ArrayBuffer,
): Promise<{ wrappedKey: string; wrapCredentialId: string } | null> {
  // If any cached vault key exists from earlier in this session, reuse the
  // first one (single-credential is the dominant case; for multi-credential
  // users we keep using whichever credential they first unlocked with this
  // session — fewer UV prompts).
  let credentialId: string | undefined;
  for (const id of vaultKeyCache.keys()) {
    credentialId = id;
    break;
  }
  if (!credentialId) {
    const derived = await deriveVaultKey();
    if (!derived) return null;
    credentialId = derived.credentialId;
  }
  try {
    return await wrapTransferKey(rawTransferKey, credentialId);
  } catch {
    return null;
  }
}
