// A member's side of a portal: open it with their vault, then read what
// was deposited. Every deposit carries its own key, sealed to the portal's
// public key; the portal private key from the member's vault opens it.

import { api, type DepositRow, type FileInfo } from "$lib/api/client";
import { base64UrlToBytes } from "$lib/crypto/base64url";
import { decryptFilename, decryptString } from "$lib/crypto/decrypt";
import { openSealed, type RecipientKeypair } from "$lib/crypto/seal";
import { plaintextSize } from "$lib/crypto/streaming";
import { readVaultDerivationKey } from "$lib/vault/session";
import { depositKeyContext } from "./deposit";
import { openPortalBundle, openPortalKeys, portalLink } from "./keys";

export interface OpenedMemberPortal {
  id: string;
  role: "owner" | "member";
  title: string;
  link: string;
  isDisabled: boolean;
  /** Opens deposit keys. The private half is not readable by page script. */
  keypair: RecipientKeypair;
}

export type OpenMemberPortalResult =
  | { ok: true; portal: OpenedMemberPortal }
  | { ok: false; reason: "locked" | "not_found" | "unreadable" };

export async function openMemberPortal(
  userId: string,
  portalId: string,
  origin: string,
): Promise<OpenMemberPortalResult> {
  const [list, derivationKey] = await Promise.all([
    api.listPortals(),
    readVaultDerivationKey(userId),
  ]);
  const row = list.portals.find((p) => p.id === portalId);
  if (!row) return { ok: false, reason: "not_found" };
  if (!derivationKey) return { ok: false, reason: "locked" };

  const keys = await openPortalKeys(
    { userId, derivationKey },
    row.id,
    row.keyVersion,
    base64UrlToBytes(row.sealedKeys),
  );
  const info = keys
    ? await openPortalBundle(row.id, keys.linkKey, base64UrlToBytes(row.publicBundle))
    : null;
  if (!keys || !info) return { ok: false, reason: "unreadable" };

  return {
    ok: true,
    portal: {
      id: row.id,
      role: row.role,
      title: info.title,
      link: portalLink(origin, row.id, keys.linkKey),
      isDisabled: row.isDisabled,
      keypair: { privateKey: keys.privateKey, publicKey: info.publicKey },
    },
  };
}

export interface DepositFile extends FileInfo {
  name: string;
  /** Size of the file itself; `size` is the stored, encrypted size. */
  plainSize: number;
}

export interface OpenedDeposit {
  id: string;
  createdAt: string;
  expiresAt: string;
  /** The depositor's note, if they left one. */
  note: string | null;
  files: DepositFile[];
  totalBytes: number;
  key: CryptoKey;
}

export interface DepositPage {
  deposits: OpenedDeposit[];
  /** Deposits whose key did not open with this portal's key. */
  unreadable: number;
  nextCursor: string | null;
}

async function openDeposit(
  portal: OpenedMemberPortal,
  row: DepositRow,
): Promise<OpenedDeposit | null> {
  const raw = await openSealed(
    portal.keypair,
    base64UrlToBytes(row.sealedKey),
    depositKeyContext(portal.id, row.id),
  );
  if (!raw) return null;
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) as ArrayBuffer,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"],
    );
    const files = await Promise.all(
      row.files.map(async (f) => ({
        ...f,
        plainSize: plaintextSize(f.size),
        name: await decryptFilename(f.encryptedName, f.encryptedNameIv, key).catch(
          () => "Unreadable name",
        ),
      })),
    );
    let note: string | null = null;
    if (row.encryptedTitle && row.encryptedTitleIv) {
      note = await decryptString(row.encryptedTitle, row.encryptedTitleIv, key).catch(() => null);
    }
    return {
      id: row.id,
      createdAt: row.createdAt,
      expiresAt: row.expiresAt,
      note: note && note.length > 0 ? note : null,
      files,
      totalBytes: files.reduce((sum, f) => sum + f.plainSize, 0),
      key,
    };
  } finally {
    raw.fill(0);
  }
}

export async function loadDeposits(
  portal: OpenedMemberPortal,
  cursor: string | null = null,
): Promise<DepositPage> {
  const res = await api.listDeposits(portal.id, cursor);
  const opened = await Promise.all(res.deposits.map((row) => openDeposit(portal, row)));
  const deposits = opened.filter((d): d is OpenedDeposit => d !== null);
  return {
    deposits,
    unreadable: opened.length - deposits.length,
    nextCursor: res.nextCursor,
  };
}
