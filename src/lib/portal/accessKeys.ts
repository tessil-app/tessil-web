// Handing a portal to an access key. The portal's keys are sealed in this
// browser to the key's public key and signed with the account's own, the
// same way they are handed to an invited account. The server stores the
// result and can neither open nor forge it.

import { api, type AccessKey } from "$lib/api/client";
import { base64UrlToBytes, bytesToBase64Url } from "$lib/crypto/base64url";
import { ensureUserKeypair } from "$lib/vault/client";
import { readVaultDerivationKey } from "$lib/vault/session";
import { handPortalKeys } from "./keys";
import { myKeypair } from "./sharing";

export type GrantResult = { ok: true } | { ok: false; reason: "locked" | "no_keys" };

export async function grantPortalToKey(userId: string, key: AccessKey, portalId: string): Promise<GrantResult> {
  const derivationKey = await readVaultDerivationKey(userId);
  if (!derivationKey) return { ok: false, reason: "locked" };
  await ensureUserKeypair(userId);
  const keypair = await myKeypair(userId);
  if (!keypair) return { ok: false, reason: "locked" };

  const row = (await api.listPortals()).portals.find((p) => p.id === portalId);
  if (!row) return { ok: false, reason: "no_keys" };
  const handed = await handPortalKeys(
    { userId, derivationKey, keypair },
    // The key's ID stands where an account's would.
    { userId: key.id, publicKey: base64UrlToBytes(key.publicKey) },
    portalId,
    row.keyVersion,
    base64UrlToBytes(row.sealedKeys),
  );
  // Null when this account's own copy did not open: an invite not yet accepted.
  if (!handed) return { ok: false, reason: "no_keys" };
  await api.grantAccessKeyPortal(key.id, portalId, { sealedKeys: bytesToBase64Url(handed), keyVersion: row.keyVersion });
  return { ok: true };
}
