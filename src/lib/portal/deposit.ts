// The depositor's side of a portal: open the link, then send files that
// only the portal's members can read. Runs with no account and no vault.

import { api, ApiError } from "$lib/api/client";
import { encryptFilename, encryptString } from "$lib/crypto/encrypt";
import { generateKey } from "$lib/crypto/key";
import { sealTo } from "$lib/crypto/seal";
import { encryptFileStream } from "$lib/crypto/streaming";
import { checkFileType } from "$lib/upload/fileTypeCheck";
import { uploadEncryptedStreamMultipart } from "$lib/upload/multipart";
import { base64UrlToBytes, bytesToBase64Url } from "$lib/crypto/base64url";
import { depositTokenFor, linkKeyFromFragment, openPortalBundle } from "./keys";

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
    },
  };
}

/** Ties a deposit's sealed key to its portal and transfer. The owner uses the same string to open it. */
export function depositKeyContext(portalId: string, transferId: string): string {
  return `deposit-key|${portalId}|${transferId}`;
}

export type FileProgress = (
  index: number,
  status: "uploading" | "complete" | "error",
  percent: number,
) => void;

export class DepositError extends Error {
  constructor(
    message: string,
    /** The file the message is about, when it is about one. */
    readonly fileIndex: number | null = null,
  ) {
    super(message);
    this.name = "DepositError";
  }
}

function explain(err: unknown, fileName: string | null): string {
  if (err instanceof ApiError) {
    switch (err.code) {
      case "portal_not_accepting":
        return "This portal is not accepting files right now.";
      case "portal_full":
        return "This portal is full. Let the person you are sending to know.";
      case "file_too_large":
        return fileName ? `"${fileName}" is too large for this portal.` : err.message;
      case "transfer_too_large":
        return "These files are too large to send in one go. Try sending fewer at a time.";
    }
    if (err.status === 429) return "Too many uploads right now. Try again in a little while.";
    if (err.status === 404) return "This portal no longer exists.";
  }
  return err instanceof Error ? err.message : "The upload failed.";
}

/**
 * Encrypts and uploads `files` as one deposit. Throws DepositError with a
 * message fit to show, or an AbortError when cancelled.
 */
export async function sendDeposit(
  portal: OpenedPortal,
  files: File[],
  note: string,
  options: { signal?: AbortSignal; onProgress?: FileProgress } = {},
): Promise<void> {
  const { signal, onProgress } = options;
  const aborted = () => new DOMException("aborted", "AbortError");

  for (let i = 0; i < files.length; i++) {
    const blocked = await checkFileType(files[i]);
    if (blocked) throw new DepositError(`"${files[i].name}": ${blocked}`, i);
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
    throw new DepositError(explain(err, null));
  }

  try {
    for (let i = 0; i < files.length; i++) {
      if (signal?.aborted) throw aborted();
      const file = files[i];
      try {
        const { encryptedName, iv } = await encryptFilename(file.name, key);
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
          signal,
          onProgress: (p) => onProgress?.(i, "uploading", p.percent),
        });
        onProgress?.(i, "complete", 100);
      } catch (err) {
        if ((err as DOMException)?.name === "AbortError") throw err;
        onProgress?.(i, "error", 0);
        throw new DepositError(explain(err, file.name), i);
      }
    }

    // Anonymous sealing is right here: anyone may deposit, and the members
    // gain nothing by knowing which browser sealed the key.
    const rawKey = new Uint8Array(await crypto.subtle.exportKey("raw", key));
    const sealedKey = await sealTo(portal.publicKey, rawKey, depositKeyContext(portal.id, transferId));
    rawKey.fill(0);
    try {
      await api.completeTransfer(transferId, { sealedKey: bytesToBase64Url(sealedKey) });
    } catch (err) {
      throw new DepositError(explain(err, null));
    }
  } catch (err) {
    api.abortTransfer(transferId).catch(() => {});
    throw err;
  }
}
