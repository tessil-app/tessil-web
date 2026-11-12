// What the dashboard needs from portals: list them with their titles and
// links, create one, switch one off, delete one. Decryption happens here;
// the server only ever sees opaque blobs.

import { api, type PortalRow } from "$lib/api/client";
import { base64UrlToBytes, bytesToBase64Url } from "$lib/crypto/base64url";
import { ensureUserKeypair } from "$lib/vault/client";
import { readVaultDerivationKey } from "$lib/vault/session";
import {
  PORTAL_TITLE_MAX,
  createPortalKeys,
  openPortalBundle,
  openPortalKeys,
  portalLink,
} from "./keys";

export { PORTAL_TITLE_MAX };

export interface MyPortal {
  id: string;
  role: "owner" | "member";
  isDisabled: boolean;
  createdAt: string;
  /**
   * open        title and link are available
   * locked      the vault is locked, so neither can be read yet
   * unreadable  the keys did not open with this vault
   */
  state: "open" | "locked" | "unreadable";
  title: string | null;
  link: string | null;
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
  const base = { id: row.id, role: row.role, isDisabled: row.isDisabled, createdAt: row.createdAt };
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
  title: string,
  origin: string,
): Promise<CreatePortalResult> {
  const derivationKey = await readVaultDerivationKey(userId);
  if (!derivationKey) return { ok: false, reason: "locked" };

  // The server refuses a portal for an account without a keypair. One is
  // made at unlock; this covers a session unlocked before that existed.
  await ensureUserKeypair(userId);

  const made = await createPortalKeys(title.trim(), { userId, derivationKey });
  const created = await api.createPortal({
    id: made.id,
    publicBundle: bytesToBase64Url(made.publicBundle),
    sealedKeys: bytesToBase64Url(made.sealedKeys),
    depositToken: bytesToBase64Url(made.depositToken),
  });
  return {
    ok: true,
    portal: {
      id: made.id,
      role: "owner",
      isDisabled: false,
      createdAt: created.createdAt,
      state: "open",
      title: title.trim(),
      link: portalLink(origin, made.id, made.linkKey),
    },
  };
}
