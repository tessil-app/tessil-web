// Unlocking the vault with a passkey. A passkey can evaluate a PRF: a
// function only that authenticator can compute, giving the same 32 bytes
// for the same salt every time. Those bytes derive a key that wraps the
// vault key, next to the wraps made from the password and the recovery
// phrase. See docs/adr/0014-portal-keys-and-vault-items.md, point 10.
//
// The passkey is asked directly here, with a throwaway challenge: this
// ceremony proves nothing to the server and is never sent to it. Its only
// purpose is the PRF output, which stays in this browser.

import { base64UrlToBytes, bytesToBase64Url } from "$lib/crypto/base64url";

const CONTEXT = "tessil/vault-passkey/v1";
const IV_BYTES = 12;
const WRAP_BYTES = 60; // iv(12) || K_vault(32) || tag(16)
export const PRF_SALT_BYTES = 32;

const encoder = new TextEncoder();

function buffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export interface PrfRequest {
  /** base64url WebAuthn credential ID. */
  credentialId: string;
  /** base64url, PRF_SALT_BYTES long. */
  prfSalt: string;
}

export interface PrfResult {
  /** Which of the requested credentials answered. */
  credentialId: string;
  output: Uint8Array;
}

export type PrfFailure = "unsupported" | "cancelled" | "no_prf";

/** Whether this browser can do WebAuthn at all. PRF support is only known by trying. */
export function passkeyUnlockPossible(): boolean {
  return typeof window !== "undefined" && typeof window.PublicKeyCredential === "function";
}

/**
 * Asks one of the given passkeys for its PRF output.
 *   unsupported  no WebAuthn here
 *   cancelled    the user dismissed the prompt, or no listed passkey is on this device
 *   no_prf       the passkey answered but cannot evaluate a PRF
 */
export async function evaluatePrf(
  requests: PrfRequest[],
): Promise<{ ok: true; result: PrfResult } | { ok: false; reason: PrfFailure }> {
  if (!passkeyUnlockPossible() || requests.length === 0) return { ok: false, reason: "unsupported" };

  const evalByCredential: Record<string, { first: ArrayBuffer }> = {};
  for (const r of requests) evalByCredential[r.credentialId] = { first: buffer(base64UrlToBytes(r.prfSalt)) };

  let credential: PublicKeyCredential | null;
  try {
    credential = (await navigator.credentials.get({
      publicKey: {
        challenge: buffer(crypto.getRandomValues(new Uint8Array(32))),
        allowCredentials: requests.map((r) => ({
          type: "public-key" as const,
          id: buffer(base64UrlToBytes(r.credentialId)),
        })),
        userVerification: "required",
        extensions: { prf: { evalByCredential } } as AuthenticationExtensionsClientInputs,
      },
    })) as PublicKeyCredential | null;
  } catch {
    return { ok: false, reason: "cancelled" };
  }
  if (!credential) return { ok: false, reason: "cancelled" };

  const extensions = credential.getClientExtensionResults() as {
    prf?: { results?: { first?: ArrayBuffer | ArrayBufferView } };
  };
  const first = extensions.prf?.results?.first;
  if (!first) return { ok: false, reason: "no_prf" };
  const output =
    first instanceof ArrayBuffer
      ? new Uint8Array(first.slice(0))
      : new Uint8Array(first.buffer.slice(first.byteOffset, first.byteOffset + first.byteLength));
  if (output.byteLength < 32) return { ok: false, reason: "no_prf" };

  return {
    ok: true,
    result: { credentialId: bytesToBase64Url(new Uint8Array(credential.rawId)), output },
  };
}

async function wrappingKey(prfOutput: Uint8Array): Promise<CryptoKey> {
  const master = await crypto.subtle.importKey("raw", buffer(prfOutput), "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(0), info: encoder.encode(CONTEXT) },
    master,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

// Bound to the account and the passkey, so the server cannot move a wrap
// from one passkey or account to another.
function aad(userId: string, authenticatorId: string): ArrayBuffer {
  return buffer(encoder.encode(`${CONTEXT}|${userId}|${authenticatorId}`));
}

export function newPrfSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(PRF_SALT_BYTES));
}

/** Wraps the raw vault key under a passkey's PRF output. */
export async function wrapVaultKeyForPasskey(
  prfOutput: Uint8Array,
  userId: string,
  authenticatorId: string,
  kVault: Uint8Array,
): Promise<Uint8Array> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: buffer(iv), additionalData: aad(userId, authenticatorId) },
    await wrappingKey(prfOutput),
    buffer(kVault),
  );
  const out = new Uint8Array(IV_BYTES + ciphertext.byteLength);
  out.set(iv, 0);
  out.set(new Uint8Array(ciphertext), IV_BYTES);
  return out;
}

/** The raw vault key, or null when the wrap was not made by this passkey for this account. */
export async function unwrapVaultKeyWithPasskey(
  prfOutput: Uint8Array,
  userId: string,
  authenticatorId: string,
  wrap: Uint8Array,
): Promise<Uint8Array | null> {
  if (wrap.byteLength !== WRAP_BYTES) return null;
  try {
    const plaintext = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: buffer(wrap.subarray(0, IV_BYTES)),
        additionalData: aad(userId, authenticatorId),
      },
      await wrappingKey(prfOutput),
      buffer(wrap.subarray(IV_BYTES)),
    );
    return new Uint8Array(plaintext);
  } catch {
    return null;
  }
}
