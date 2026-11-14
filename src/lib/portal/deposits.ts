// A member's side of a portal: open it with their vault, then read what
// was deposited. Every deposit carries its own key, sealed to the portal's
// public key; the portal private key from the member's vault opens it.

import { api, type DepositRow, type FileInfo } from "$lib/api/client";
import { base64UrlToBytes, bytesToBase64Url } from "$lib/crypto/base64url";
import type { Locale } from "$lib/i18n/locale";
import { decryptFilename, decryptString } from "$lib/crypto/decrypt";
import { openSealed, type RecipientKeypair } from "$lib/crypto/seal";
import { plaintextSize } from "$lib/crypto/streaming";
import { readVaultDerivationKey } from "$lib/vault/session";
import { decodeDepositFileName, decodeDepositNote, depositKeyContext } from "./deposit";
import {
  openPortalBundle,
  openPortalKeys,
  portalLink,
  sealPortalBundle,
  settingsOf,
  type ChecklistItem,
  type PortalSettings,
} from "./keys";
import { depositReference } from "./receipt";

export interface OpenedMemberPortal {
  id: string;
  role: "owner" | "member";
  title: string;
  link: string;
  isDisabled: boolean;
  /** Opens deposit keys. The private half is not readable by page script. */
  keypair: RecipientKeypair;
  /** What the owner asks visitors for. */
  checklist: ChecklistItem[];
  /** Needed to re-seal the public bundle when the owner changes it. */
  linkKey: Uint8Array;
  keyVersion: number;
  lang: Locale | null;
  message: string;
  thanks: string;
  askSender: boolean;
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
      link: portalLink(origin, row.id, keys.linkKey),
      isDisabled: row.isDisabled,
      keypair: { privateKey: keys.privateKey, publicKey: info.publicKey },
      linkKey: keys.linkKey,
      keyVersion: info.keyVersion,
      ...settingsOf(info),
    },
  };
}

export interface DepositFile extends FileInfo {
  name: string;
  /** Size of the file itself; `size` is the stored, encrypted size. */
  plainSize: number;
  /** The checklist item the sender attached it to, if any. */
  itemId: string | null;
}

/** Which requested items a deposit covers. */
export interface DepositCoverage {
  provided: ChecklistItem[];
  missing: ChecklistItem[];
}

export function coverageOf(checklist: ChecklistItem[], files: { itemId: string | null }[]): DepositCoverage {
  const sent = new Set(files.map((f) => f.itemId).filter((id): id is string => id !== null));
  return {
    provided: checklist.filter((item) => sent.has(item.id)),
    missing: checklist.filter((item) => !sent.has(item.id)),
  };
}

/**
 * Replaces a portal's name, texts and switches. Re-seals the public bundle
 * under the same link key, so the portal's link does not change. Owner only.
 */
export async function savePortalSettings(
  portal: OpenedMemberPortal,
  settings: PortalSettings,
): Promise<void> {
  const bundle = await sealPortalBundle(portal.id, portal.linkKey, {
    publicKey: portal.keypair.publicKey,
    keyVersion: portal.keyVersion,
    title: settings.title.trim(),
    ...(settings.lang ? { lang: settings.lang } : {}),
    checklist: settings.checklist,
    message: settings.message,
    thanks: settings.thanks,
    askSender: settings.askSender,
  });
  await api.updatePortal(portal.id, { publicBundle: bytesToBase64Url(bundle) });
}

export interface OpenedDeposit {
  id: string;
  /** The short code the sender got on their confirmation. */
  reference: string;
  createdAt: string;
  expiresAt: string;
  /** The depositor's note, if they left one. */
  note: string | null;
  /** The depositor's name, when the portal asks for it. */
  sender: string | null;
  files: DepositFile[];
  totalBytes: number;
  key: CryptoKey;
}

export interface DepositPage {
  deposits: OpenedDeposit[];
  /** Deposits whose key did not open with this portal's key. */
  unreadable: number;
  nextCursor: string | null;
  /** When this member last looked, as the server had it before this visit. */
  lastSeenAt: string | null;
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
      row.files.map(async (f) => {
        const stored = await decryptFilename(f.encryptedName, f.encryptedNameIv, key).catch(
          () => null,
        );
        const decoded = stored === null ? { name: "Unreadable name", itemId: null } : decodeDepositFileName(stored);
        return { ...f, plainSize: plaintextSize(f.size), name: decoded.name, itemId: decoded.itemId };
      }),
    );
    let stored: string | null = null;
    if (row.encryptedTitle && row.encryptedTitleIv) {
      stored = await decryptString(row.encryptedTitle, row.encryptedTitleIv, key).catch(() => null);
    }
    const { note, sender } = decodeDepositNote(stored ?? "");
    return {
      id: row.id,
      reference: await depositReference(row.id),
      createdAt: row.createdAt,
      expiresAt: row.expiresAt,
      note,
      sender,
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
    lastSeenAt: res.lastSeenAt ?? null,
  };
}
