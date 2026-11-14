// What the dashboard needs from portals: list them with their titles and
// links, create one, switch one off, delete one. Decryption happens here;
// the server only ever sees opaque blobs.

import { api, type PortalRow } from "$lib/api/client";
import { base64UrlToBytes, bytesToBase64Url } from "$lib/crypto/base64url";
import { ensureUserKeypair } from "$lib/vault/client";
import { publicKeyFingerprint } from "$lib/vault/keypair";
import { readVaultDerivationKey } from "$lib/vault/session";
import {
  PORTAL_TITLE_MAX,
  accessTokenFor,
  createPortalKeys,
  openPortalBundle,
  isHandedCopy,
  openPortalKeys,
  portalLink,
  type PortalSettings,
} from "./keys";

export { PORTAL_TITLE_MAX };

export interface MyPortal {
  id: string;
  role: "owner" | "member";
  isDisabled: boolean;
  /** The owner's closing date, if any. */
  closesAt: string | null;
  createdAt: string;
  /**
   * open        title and link are available
   * locked      the vault is locked, so neither can be read yet
   * unreadable  the keys did not open with this vault
   * invited     the owner shared it and this account has not accepted yet
   */
  state: "open" | "locked" | "unreadable" | "invited";
  title: string | null;
  link: string | null;
  /** Live deliveries, how many are new to this account, and what they take up. */
  deliveries: number;
  unseen: number;
  storedBytes: number;
  lastDeliveryAt: string | null;
  /** On portals shared with this account: who shared it, and their key to compare. */
  sharedBy: { email: string; fingerprint: string | null } | null;
}

export interface MyPortals {
  maxPortals: number;
  portals: MyPortal[];
}

async function readRow(
  row: PortalRow,
  userId: string,
  derivationKey: CryptoKey | null,
  origin: string,
): Promise<MyPortal> {
  const sharedBy =
    row.role === "member" && row.owner
      ? {
          email: row.owner.email,
          fingerprint: row.owner.publicKey
            ? await publicKeyFingerprint(base64UrlToBytes(row.owner.publicKey))
            : null,
        }
      : null;
  const base = {
    id: row.id,
    role: row.role,
    isDisabled: row.isDisabled,
    closesAt: row.closesAt ?? null,
    createdAt: row.createdAt,
    sharedBy,
    deliveries: row.deliveries ?? 0,
    unseen: row.unseen ?? 0,
    storedBytes: row.storedBytes ?? 0,
    lastDeliveryAt: row.lastDeliveryAt ?? null,
  };
  // Says who shared it even while the vault is locked.
  if (isHandedCopy(base64UrlToBytes(row.sealedKeys))) {
    return { ...base, state: "invited", title: null, link: null };
  }
  if (!derivationKey) return { ...base, state: "locked", title: null, link: null };

  const keys = await openPortalKeys(
    { userId, derivationKey },
    row.id,
    row.keyVersion,
    base64UrlToBytes(row.sealedKeys),
  );
  const info = keys
    ? await openPortalBundle(row.id, keys.linkKey, base64UrlToBytes(row.publicBundle))
    : null;
  if (!keys || !info) return { ...base, state: "unreadable", title: null, link: null };

  return {
    ...base,
    state: "open",
    title: info.title,
    link: portalLink(origin, row.id, keys.linkKey),
  };
}

export async function loadMyPortals(userId: string, origin: string): Promise<MyPortals> {
  const [res, derivationKey] = await Promise.all([
    api.listPortals(),
    readVaultDerivationKey(userId),
  ]);
  const portals = await Promise.all(
    res.portals.map((row) => readRow(row, userId, derivationKey, origin)),
  );
  return { maxPortals: res.maxPortals, portals };
}

export type CreatePortalResult =
  | { ok: true; portal: MyPortal }
  | { ok: false; reason: "locked" };

export async function createMyPortal(
  userId: string,
  settings: PortalSettings,
  origin: string,
): Promise<CreatePortalResult> {
  const title = settings.title;
  const derivationKey = await readVaultDerivationKey(userId);
  if (!derivationKey) return { ok: false, reason: "locked" };

  // The server refuses a portal for an account without a keypair. One is
  // made at unlock; this covers a session unlocked before that existed.
  await ensureUserKeypair(userId);

  const password = settings.hasPassword ? settings.newPassword : "";
  const made = await createPortalKeys(title.trim(), { userId, derivationKey }, settings.lang ?? undefined, {
    checklist: settings.checklist,
    message: settings.message,
    thanks: settings.thanks,
    fieldLabel: settings.fieldLabel,
    ...(settings.logo ? { logo: settings.logo } : {}),
    twoWay: settings.twoWay,
  });
  const created = await api.createPortal({
    id: made.id,
    publicBundle: bytesToBase64Url(made.publicBundle),
    sealedKeys: bytesToBase64Url(made.sealedKeys),
    depositToken: bytesToBase64Url(made.depositToken),
    ...(settings.closesAt ? { closesAt: settings.closesAt } : {}),
    ...(settings.notifyOnDelivery ? { notifyOnDelivery: true } : {}),
    ...(password
      ? { accessToken: bytesToBase64Url(await accessTokenFor(made.id, made.linkKey, password)) }
      : {}),
  });
  return {
    ok: true,
    portal: {
      id: made.id,
      role: "owner",
      isDisabled: false,
      closesAt: settings.closesAt,
      createdAt: created.createdAt,
      sharedBy: null,
      deliveries: 0,
      unseen: 0,
      storedBytes: 0,
      lastDeliveryAt: null,
      state: "open",
      title: title.trim(),
      link: portalLink(origin, made.id, made.linkKey),
    },
  };
}
