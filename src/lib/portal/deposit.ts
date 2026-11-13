// The depositor's side of a portal: open the link, then send files that
// only the portal's members can read. Runs with no account and no vault.

import { api, ApiError } from "$lib/api/client";
import { encryptFilename, encryptString } from "$lib/crypto/encrypt";
import { generateKey } from "$lib/crypto/key";
import { sealTo } from "$lib/crypto/seal";
import { encryptFileStream } from "$lib/crypto/streaming";
import { blockedKind } from "$lib/upload/fileTypeCheck";
import { uploadEncryptedStreamMultipart } from "$lib/upload/multipart";
import { runFiles } from "$lib/upload/pool";
import { base64UrlToBytes, bytesToBase64Url } from "$lib/crypto/base64url";
import type { Locale } from "$lib/i18n/locale";
import {
  depositTokenFor,
  linkKeyFromFragment,
  openPortalBundle,
  type ChecklistItem,
} from "./keys";

export const DEPOSIT_NOTE_MAX = 200;
// Shown until the API reports the owner's real limit.
const DEFAULT_MAX_TOTAL_SIZE = 10 * 1024 * 1024 * 1024;

export interface OpenedPortal {
  id: string;
  title: string;
  publicKey: Uint8Array;
  linkKey: Uint8Array;
  accepting: boolean;
  /** Most that one deposit may hold, from the owner's plan. */
  maxTotalSize: number;
  /** The language the owner chose for this page, if any. */
  lang: Locale | null;
  /** What the owner asks for. Empty: anything goes. */
  checklist: ChecklistItem[];
}

export type OpenPortalResult =
  | { ok: true; portal: OpenedPortal }
  /**
   * bad_link   the fragment is missing or is not a link key
   * not_found  no such portal
   * untrusted  the server's bundle did not open with this link. The public
   *            key cannot be trusted, so nothing may be uploaded.
   */
  | { ok: false; reason: "bad_link" | "not_found" | "untrusted" };

export async function openPortalFromLink(
  portalId: string,
  fragment: string,
): Promise<OpenPortalResult> {
  const linkKey = linkKeyFromFragment(fragment);
  if (!linkKey) return { ok: false, reason: "bad_link" };

  let res;
  try {
    res = await api.getPortalPublic(portalId);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return { ok: false, reason: "not_found" };
    throw err;
  }

  const info = await openPortalBundle(portalId, linkKey, base64UrlToBytes(res.publicBundle));
  if (!info) return { ok: false, reason: "untrusted" };
  return {
    ok: true,
    portal: {
      id: portalId,
      title: info.title,
      publicKey: info.publicKey,
      linkKey,
      accepting: res.accepting,
      maxTotalSize: res.maxTotalSize ?? DEFAULT_MAX_TOTAL_SIZE,
      lang: info.lang ?? null,
      checklist: info.checklist ?? [],
    },
  };
}

// A file sent for a checklist item carries the item's ID inside its
// encrypted name, ahead of a separator that cannot occur in a file name.
// The server stores the name as ciphertext and learns nothing new.
const ITEM_SEPARATOR = "\u001f";
const TAGGED_NAME = /^([a-z0-9]{6})\u001f([\s\S]*)$/;

export function encodeDepositFileName(name: string, itemId: string | null): string {
  const clean = name.replaceAll(ITEM_SEPARATOR, "");
  return itemId ? `${itemId}${ITEM_SEPARATOR}${clean}` : clean;
}

export function decodeDepositFileName(stored: string): { name: string; itemId: string | null } {
  const match = TAGGED_NAME.exec(stored);
  return match ? { name: match[2], itemId: match[1] } : { name: stored, itemId: null };
}

export interface DepositFileInput {
  file: File;
  /** The checklist item this file answers, if any. */
  itemId?: string | null;
}

/** Ties a deposit's sealed key to its portal and transfer. The owner uses the same string to open it. */
export function depositKeyContext(portalId: string, transferId: string): string {
  return `deposit-key|${portalId}|${transferId}`;
}

export type FileProgress = (
  index: number,
  status: "uploading" | "complete" | "error",
  percent: number,
  /** The connection dropped; the upload continues when it is back. */
  stalled?: boolean,
) => void;

export type DepositErrorCode =
  | "blocked_script"
  | "blocked_executable"
  | "not_accepting"
  | "portal_full"
  | "file_too_large"
  | "transfer_too_large"
  | "rate_limited"
  | "gone"
  | "failed";

/** What went wrong, as a code: the page words it in the visitor's language. */
export class DepositError extends Error {
  constructor(
    readonly code: DepositErrorCode,
    /** The file the error is about, when it is about one. */
    readonly fileName: string | null = null,
  ) {
    super(code);
    this.name = "DepositError";
  }
}

function codeFor(err: unknown): DepositErrorCode {
  if (err instanceof ApiError) {
    switch (err.code) {
      case "portal_not_accepting":
        return "not_accepting";
      case "portal_full":
        return "portal_full";
      case "file_too_large":
        return "file_too_large";
      case "transfer_too_large":
        return "transfer_too_large";
    }
    if (err.status === 429) return "rate_limited";
    if (err.status === 404) return "gone";
  }
  return "failed";
}

/**
 * Encrypts and uploads `files` as one deposit. Throws DepositError, or an
 * AbortError when cancelled. Returns what a confirmation needs.
 */
export async function sendDeposit(
  portal: OpenedPortal,
  entries: DepositFileInput[],
  note: string,
  options: { signal?: AbortSignal; onProgress?: FileProgress } = {},
): Promise<{ transferId: string; sentAt: Date }> {
  const { signal, onProgress } = options;
  const files = entries.map((e) => e.file);

  for (const file of files) {
    const blocked = await blockedKind(file);
    if (blocked) {
      throw new DepositError(blocked === "script" ? "blocked_script" : "blocked_executable", file.name);
    }
  }

  const key = await generateKey();
  const trimmedNote = note.trim().slice(0, DEPOSIT_NOTE_MAX);
  const encryptedNote = trimmedNote ? await encryptString(trimmedNote, key) : null;

  let transferId: string;
  try {
    const started = await api.startDeposit(portal.id, {
      depositToken: bytesToBase64Url(await depositTokenFor(portal.linkKey)),
      ...(encryptedNote
        ? { encryptedTitle: encryptedNote.ciphertext, encryptedTitleIv: encryptedNote.iv }
        : {}),
    });
    transferId = started.transferId;
  } catch (err) {
    throw new DepositError(codeFor(err));
  }

  try {
    // Which files are waiting for the connection; any one is enough to say so.
    const waiting = new Set<number>();
    await runFiles(
      files,
      (file) => file.size,
      async (file, i, fileSignal) => {
        try {
          const { encryptedName, iv } = await encryptFilename(
            encodeDepositFileName(file.name, entries[i].itemId ?? null),
            key,
          );
          const encryptor = encryptFileStream(file, key);
          onProgress?.(i, "uploading", 0);
          const init = await api.initMultipartUpload({
            transferId,
            contentType: file.type || "application/octet-stream",
            encryptedName,
            encryptedNameIv: iv,
            fileIv: encryptor.ivB64,
            size: encryptor.size,
          });
          await uploadEncryptedStreamMultipart({
            uploadId: init.uploadId,
            fileId: init.fileId,
            transferId,
            r2Key: init.r2Key,
            source: encryptor.stream,
            partUrls: init.partUrls,
            signal: fileSignal,
            onProgress: (p) => {
              if (p.stalled) waiting.add(i);
              else waiting.delete(i);
              onProgress?.(i, "uploading", p.percent, waiting.size > 0);
            },
          });
          waiting.delete(i);
          onProgress?.(i, "complete", 100, waiting.size > 0);
        } catch (err) {
          waiting.delete(i);
          if ((err as DOMException)?.name === "AbortError") throw err;
          onProgress?.(i, "error", 0);
          throw new DepositError(codeFor(err), file.name);
        }
      },
      signal,
    );

    // Anonymous sealing is right here: anyone may deposit, and the members
    // gain nothing by knowing which browser sealed the key.
    const rawKey = new Uint8Array(await crypto.subtle.exportKey("raw", key));
    const sealedKey = await sealTo(portal.publicKey, rawKey, depositKeyContext(portal.id, transferId));
    rawKey.fill(0);
    try {
      await api.completeTransfer(transferId, { sealedKey: bytesToBase64Url(sealedKey) });
    } catch (err) {
      throw new DepositError(codeFor(err));
    }
    return { transferId, sentAt: new Date() };
  } catch (err) {
    api.abortTransfer(transferId).catch(() => {});
    throw err;
  }
}
