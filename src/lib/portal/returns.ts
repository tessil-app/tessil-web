// Files an owner sends back through a portal. Each batch is an ordinary
// transfer of the owner's; its ID and key are added to the portal's
// encrypted bundle, so anyone who can open the portal's page can download
// it and nobody else can. The server sees an ordinary transfer and a
// bundle it cannot read.

import { api, ApiError, type FileInfo } from "$lib/api/client";
import { decryptFilename } from "$lib/crypto/decrypt";
import { encryptFilename, encryptString } from "$lib/crypto/encrypt";
import { exportKey, generateKey, importKey } from "$lib/crypto/key";
import { encryptFileStream, plaintextSize } from "$lib/crypto/streaming";
import { blockedKind } from "$lib/upload/fileTypeCheck";
import { uploadEncryptedStreamMultipart } from "$lib/upload/multipart";
import { runFiles } from "$lib/upload/pool";
import { wrapTransferKey } from "$lib/vault/client";
import type { FileProgress } from "./deposit";
import { savePortalSettings, type OpenedMemberPortal } from "./deposits";
import { PORTAL_RETURNS_MAX, type PortalReturn, type PortalSettings } from "./keys";

export interface ReturnFile extends FileInfo {
  name: string;
  plainSize: number;
}

export interface OpenedReturn {
  id: string;
  expiresAt: string;
  files: ReturnFile[];
  key: CryptoKey;
}

export interface LoadedReturns {
  returns: OpenedReturn[];
  /** IDs the server says no longer exist. A failed request is not "gone". */
  gone: string[];
}

/** Opens what the bundle lists. Batches that expired or were deleted are left out. */
export async function loadReturns(entries: PortalReturn[]): Promise<LoadedReturns> {
  const gone: string[] = [];
  const opened = await Promise.all(
    entries.map(async (entry): Promise<OpenedReturn | null> => {
      try {
        const meta = await api.getTransferMetadata(entry.id);
        if (!meta.files || meta.files.length === 0) return null;
        const key = await importKey(entry.key);
        const files = await Promise.all(
          meta.files.map(async (f) => ({
            ...f,
            plainSize: plaintextSize(f.size),
            name: await decryptFilename(f.encryptedName, f.encryptedNameIv, key).catch(
              () => "Unreadable name",
            ),
          })),
        );
        return { id: entry.id, expiresAt: meta.expiresAt, files, key };
      } catch (err) {
        if (err instanceof ApiError && (err.status === 404 || err.status === 410)) gone.push(entry.id);
        return null;
      }
    }),
  );
  return { returns: opened.filter((r): r is OpenedReturn => r !== null), gone };
}

function settingsFrom(portal: OpenedMemberPortal, returns: PortalReturn[]): PortalSettings {
  return {
    title: portal.title,
    lang: portal.lang,
    checklist: portal.checklist,
    message: portal.message,
    thanks: portal.thanks,
    fieldLabel: portal.fieldLabel,
    logo: portal.logo,
    twoWay: portal.twoWay,
    returns,
    closesAt: portal.closesAt,
    notifyOnDelivery: portal.notifyOnDelivery,
  };
}

export class ReturnError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReturnError";
  }
}

/**
 * Uploads `files` as one transfer of the owner's and lists it in the
 * portal's bundle. Returns the portal's new list. Throws ReturnError with a
 * message fit to show, or an AbortError when cancelled.
 */
export async function sendReturn(
  portal: OpenedMemberPortal,
  userId: string,
  files: File[],
  expiresInHours: number,
  options: { signal?: AbortSignal; onProgress?: FileProgress } = {},
): Promise<PortalReturn[]> {
  const { signal, onProgress } = options;
  if (portal.returns.length >= PORTAL_RETURNS_MAX) {
    throw new ReturnError(`A portal holds ${PORTAL_RETURNS_MAX} batches at most. Remove one first.`);
  }
  for (const file of files) {
    const blocked = await blockedKind(file);
    if (blocked) {
      throw new ReturnError(`"${file.name}": ${blocked === "script" ? "scripts" : "programs"} can't be sent.`);
    }
  }

  const key = await generateKey();
  // So it is recognisable among the owner's own transfers.
  const title = await encryptString(`Sent through ${portal.title}`.slice(0, 100), key);
  let transferId: string;
  try {
    const created = await api.createTransfer(expiresInHours, undefined, null, {
      encryptedTitle: title.ciphertext,
      encryptedTitleIv: title.iv,
    });
    transferId = created.transferId;
  } catch (err) {
    throw new ReturnError(err instanceof ApiError ? err.message : "Couldn't start the upload.");
  }

  try {
    const waiting = new Set<number>();
    await runFiles(
      files,
      (file) => file.size,
      async (file, i, fileSignal) => {
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
          throw new ReturnError(
            err instanceof ApiError ? err.message : `"${file.name}" could not be uploaded.`,
          );
        }
      },
      signal,
    );

    const raw = await crypto.subtle.exportKey("raw", key);
    const wrappedKey = await wrapTransferKey(userId, raw).catch(() => null);
    await api.completeTransfer(transferId, wrappedKey ? { wrappedKey } : undefined);

    const returns = [...portal.returns, { id: transferId, key: await exportKey(key) }];
    await savePortalSettings(portal, settingsFrom(portal, returns));
    return returns;
  } catch (err) {
    api.abortTransfer(transferId).catch(() => {});
    if (err instanceof ReturnError || (err as DOMException)?.name === "AbortError") throw err;
    throw new ReturnError(err instanceof Error ? err.message : "Couldn't send these files.");
  }
}

/** Takes a batch off the portal and deletes its files. Returns the new list. */
export async function removeReturn(portal: OpenedMemberPortal, id: string): Promise<PortalReturn[]> {
  const returns = portal.returns.filter((r) => r.id !== id);
  // Off the page first: a listed batch that no longer exists is harmless,
  // a deleted portal entry pointing at live files is not.
  await savePortalSettings(portal, settingsFrom(portal, returns));
  await api.deleteMyTransfer(id).catch(() => {});
  return returns;
}

/** Drops entries whose transfer is gone, so the list does not fill with dead ones. */
export async function pruneReturns(portal: OpenedMemberPortal, gone: string[]): Promise<PortalReturn[]> {
  const returns = portal.returns.filter((r) => !gone.includes(r.id));
  if (returns.length !== portal.returns.length) {
    await savePortalSettings(portal, settingsFrom(portal, returns));
  }
  return returns;
}
