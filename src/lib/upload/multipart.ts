// Multipart upload orchestrator. Slices, uploads in parallel to R2, retries, aborts on hard failure.

import {
  api,
  type CompleteMultipartUploadPart,
  type InitMultipartUploadPart,
} from "$lib/api/client";

const MAX_PART_RETRIES = 3;
// Browser per-origin connection cap; retries queue briefly behind in-flight Parts.
const PARALLELISM = 6;

interface PartTask {
  partNumber: number;
  url: string;
  contentLength: number;
  body: Blob;
}

interface MultipartUploadInput {
  uploadId: string;
  fileId: string;
  transferId: string;
  r2Key: string;
  encryptedBlob: Blob;
  partUrls: InitMultipartUploadPart[];
  onProgress?: (overallPercent: number) => void;
  /** AbortSignal for user-initiated cancel; rejects all in-flight Parts. */
  signal?: AbortSignal;
}

interface MultipartUploadResult {
  fileId: string;
  size: number;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function isRetryableStatus(status: number): boolean {
  if (status === 0) return true; // network error
  if (status === 408 || status === 425 || status === 429) return true;
  if (status >= 500 && status < 600) return true;
  return false;
}

interface PartUploadResult {
  etag: string;
}

async function uploadSinglePart(
  task: PartTask,
  signal?: AbortSignal,
): Promise<PartUploadResult> {
  let response: Response;
  try {
    response = await fetch(task.url, {
      method: "PUT",
      body: task.body,
      signal,
    });
  } catch (err) {
    if ((err as DOMException).name === "AbortError") throw err;
    // Status 0 marks network errors as retryable.
    const wrapped = new Error("Part upload failed (network)");
    (wrapped as Error & { status?: number }).status = 0;
    throw wrapped;
  }

  if (!response.ok) {
    const err = new Error(`Part upload failed: ${response.status}`);
    (err as Error & { status?: number }).status = response.status;
    throw err;
  }

  // R2 (S3-compatible) returns the etag in the `ETag` response header,
  // quoted. CompleteMultipartUpload requires it back verbatim — keep
  // the quotes.
  const etag = response.headers.get("ETag") ?? response.headers.get("etag");
  if (!etag) {
    throw new Error("Part response missing ETag header");
  }
  return { etag };
}

async function uploadPartWithRetry(
  task: PartTask,
  signal?: AbortSignal,
): Promise<PartUploadResult> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_PART_RETRIES; attempt++) {
    try {
      return await uploadSinglePart(task, signal);
    } catch (err) {
      if ((err as DOMException).name === "AbortError") throw err;
      lastError = err;
      const status = (err as { status?: number }).status ?? 0;
      if (!isRetryableStatus(status)) break;
      if (attempt === MAX_PART_RETRIES) break;

      // Exponential backoff with jitter, capped at 10s; jitter prevents lockstep retries.
      const base = Math.min(1000 * Math.pow(2, attempt), 10000);
      const jitter = Math.random() * 500;
      await sleep(base + jitter, signal);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Part upload failed");
}

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  const inFlight: Promise<void>[] = [];

  async function pickNext(): Promise<void> {
    const i = nextIndex++;
    if (i >= items.length) return;
    results[i] = await worker(items[i]!, i);
    await pickNext();
  }

  for (let i = 0; i < Math.min(concurrency, items.length); i++) {
    inFlight.push(pickNext());
  }
  await Promise.all(inFlight);
  return results;
}

/** Aborts cleanly on terminal failure. Caller handles init-multipart and one-shot semantics. */
export async function uploadEncryptedBlobMultipart(
  input: MultipartUploadInput,
): Promise<MultipartUploadResult> {
  const { uploadId, fileId, transferId, encryptedBlob, partUrls, onProgress, signal } = input;

  let offset = 0;
  const tasks: PartTask[] = partUrls.map((p) => {
    const body = encryptedBlob.slice(offset, offset + p.contentLength);
    offset += p.contentLength;
    return {
      partNumber: p.partNumber,
      url: p.url,
      contentLength: p.contentLength,
      body,
    };
  });

  // Linked to caller signal so a user cancel propagates to in-flight Parts.
  const controller = new AbortController();
  const onCallerAbort = () => controller.abort();
  signal?.addEventListener("abort", onCallerAbort, { once: true });

  let completedBytes = 0;
  let completedCount = 0;
  const totalBytes = tasks.reduce((sum, t) => sum + t.contentLength, 0);

  try {
    const results = await runWithConcurrency(tasks, PARALLELISM, async (task) => {
      const result = await uploadPartWithRetry(task, controller.signal);
      completedBytes += task.contentLength;
      completedCount++;
      onProgress?.((completedBytes / totalBytes) * 100);
      return { partNumber: task.partNumber, etag: result.etag };
    });

    const completeParts: CompleteMultipartUploadPart[] = results;
    const completed = await api.completeMultipartUpload({
      transferId,
      fileId,
      uploadId,
      parts: completeParts,
    });
    return completed;
  } catch (err) {
    controller.abort();
    // Best-effort; the R2 lifecycle rule sweeps any orphans within 7d.
    try {
      await api.abortMultipartUpload({ transferId, fileId, uploadId });
    } catch (abortErr) {
      console.warn("[multipart] abort-multipart cleanup failed:", abortErr);
    }
    throw err;
  } finally {
    signal?.removeEventListener("abort", onCallerAbort);
  }
}
