// Sharing a portal with one other account. The owner's browser hands the
// portal's keys to the guest, sealed to the guest's public key and signed
// with the owner's; the guest's browser accepts them and keeps its own copy.
// Fingerprints let the two people check that no one swapped a key.

import { api } from "$lib/api/client";
import { base64UrlToBytes, bytesToBase64Url } from "$lib/crypto/base64url";
import type { RecipientKeypair } from "$lib/crypto/seal";
import { getUserPrivateKey, getVaultStatus } from "$lib/vault/client";
import { publicKeyFingerprint } from "$lib/vault/keypair";
import { readVaultDerivationKey } from "$lib/vault/session";
import { acceptPortalKeys, handPortalKeys } from "./keys";

export interface SharingGuest {
  userId: string;
  email: string;
  fingerprint: string | null;
}

export interface SharingInvite {
  id: string;
  email: string;
  createdAt: string;
  /** Set once they have an account with a vault; only then can access be given. */
  ready: { userId: string; publicKey: Uint8Array; fingerprint: string } | null;
}

export interface PortalSharing {
  maxGuests: number;
  guests: SharingGuest[];
  invites: SharingInvite[];
  /** The owner's own key, for the other person to compare. */
  myFingerprint: string | null;
}

async function myPublicKey(): Promise<Uint8Array | null> {
  const status = await getVaultStatus();
  return status.isSetup && status.publicKey ? base64UrlToBytes(status.publicKey) : null;
}

/** This account's key pair, from the unlocked vault. Null while it is locked. */
export async function myKeypair(userId: string): Promise<RecipientKeypair | null> {
  const [privateKey, publicKey] = await Promise.all([getUserPrivateKey(userId), myPublicKey()]);
  return privateKey && publicKey ? { privateKey, publicKey } : null;
}

/**
 * The fingerprint of this account's public key, for comparing with what an
 * access key shows. `checked` is true when this browser confirmed, with the
 * private key in the unlocked vault, that the public key the server names
 * really is its other half. Then the value does not rest on the server's
 * word. With the vault locked it does, and `checked` is false.
 */
export async function accountKeyFingerprint(
  userId: string,
): Promise<{ fingerprint: string; checked: boolean } | null> {
  const publicKey = await myPublicKey();
  if (!publicKey) return null;
  const fingerprint = await publicKeyFingerprint(publicKey);
  const privateKey = await getUserPrivateKey(userId).catch(() => null);
  if (!privateKey) return { fingerprint, checked: false };
  try {
    // Two halves of one pair agree on a shared secret with any third key.
    const ECDH = { name: "ECDH", namedCurve: "P-256" } as const;
    const other = await crypto.subtle.generateKey(ECDH, false, ["deriveBits"]);
    const named = await crypto.subtle.importKey(
      "raw",
      publicKey.buffer.slice(publicKey.byteOffset, publicKey.byteOffset + publicKey.byteLength) as ArrayBuffer,
      ECDH,
      false,
      [],
    );
    const [mine, theirs] = await Promise.all([
      crypto.subtle.deriveBits({ name: "ECDH", public: other.publicKey }, privateKey, 256),
      crypto.subtle.deriveBits({ name: "ECDH", public: named }, other.privateKey, 256),
    ]);
    const a = new Uint8Array(mine);
    const b = new Uint8Array(theirs);
    let diff = a.length ^ b.length;
    for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
    // A mismatch means the server names a key that is not this vault's. Show nothing.
    return diff === 0 ? { fingerprint, checked: true } : null;
  } catch {
    return null;
  }
}

export async function myFingerprint(): Promise<string | null> {
  const key = await myPublicKey();
  return key ? publicKeyFingerprint(key) : null;
}

export async function loadSharing(portalId: string): Promise<PortalSharing> {
  const [res, mine] = await Promise.all([api.getPortalSharing(portalId), myFingerprint()]);
  return {
    maxGuests: res.maxGuests,
    myFingerprint: mine,
    guests: await Promise.all(
      res.guests.map(async (g) => ({
        userId: g.userId,
        email: g.email,
        fingerprint: g.publicKey ? await publicKeyFingerprint(base64UrlToBytes(g.publicKey)) : null,
      })),
    ),
    invites: await Promise.all(
      res.invites.map(async (i) => {
        const publicKey = i.ready ? base64UrlToBytes(i.ready.publicKey) : null;
        return {
          id: i.id,
          email: i.email,
          createdAt: i.createdAt,
          ready:
            i.ready && publicKey
              ? { userId: i.ready.userId, publicKey, fingerprint: await publicKeyFingerprint(publicKey) }
              : null,
        };
      }),
    ),
  };
}

export type ShareResult = { ok: true } | { ok: false; reason: "locked" | "no_keys" };

/** Owner: hands the portal's keys to an invitee who is ready. */
export async function giveAccess(
  userId: string,
  portalId: string,
  invite: SharingInvite,
): Promise<ShareResult> {
  if (!invite.ready) return { ok: false, reason: "no_keys" };
  const [list, derivationKey, keypair] = await Promise.all([
    api.listPortals(),
    readVaultDerivationKey(userId),
    myKeypair(userId),
  ]);
  if (!derivationKey || !keypair) return { ok: false, reason: "locked" };
  const row = list.portals.find((p) => p.id === portalId);
  if (!row) return { ok: false, reason: "no_keys" };

  const handed = await handPortalKeys(
    { userId, derivationKey, keypair },
    { userId: invite.ready.userId, publicKey: invite.ready.publicKey },
    portalId,
    row.keyVersion,
    base64UrlToBytes(row.sealedKeys),
  );
  if (!handed) return { ok: false, reason: "no_keys" };

  await api.admitPortalInvitee(portalId, {
    inviteId: invite.id,
    sealedKeys: bytesToBase64Url(handed),
    sealedTo: bytesToBase64Url(invite.ready.publicKey),
  });
  return { ok: true };
}

export type AcceptResult = { ok: true } | { ok: false; reason: "locked" | "not_from_owner" };

/**
 * Guest: accepts the keys the owner handed over and stores a copy under
 * their own vault. Refuses anything not sealed by the owner's key.
 */
export async function acceptShare(userId: string, portalId: string): Promise<AcceptResult> {
  const [list, derivationKey, keypair] = await Promise.all([
    api.listPortals(),
    readVaultDerivationKey(userId),
    myKeypair(userId),
  ]);
  if (!derivationKey || !keypair) return { ok: false, reason: "locked" };
  const row = list.portals.find((p) => p.id === portalId);
  if (!row?.owner?.publicKey) return { ok: false, reason: "not_from_owner" };

  const accepted = await acceptPortalKeys(
    { userId, derivationKey, keypair },
    { userId: row.owner.userId, publicKey: base64UrlToBytes(row.owner.publicKey) },
    portalId,
    row.keyVersion,
    base64UrlToBytes(row.sealedKeys),
  );
  if (!accepted) return { ok: false, reason: "not_from_owner" };

  await api.replaceMyPortalKeys(portalId, bytesToBase64Url(accepted.kept));
  return { ok: true };
}
