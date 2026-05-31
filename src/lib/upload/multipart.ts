// Multipart upload orchestrator. Slices, uploads in parallel to R2, retries, aborts on hard failure.
//
// Part PUTs use XMLHttpRequest (not fetch) so we get upload.onprogress events:
// fetch exposes no upload progress, which made big files look frozen between
// part completions. With per-byte progress we report a smooth byte count plus
// a live speed (EMA) and ETA.

import {
  api,
  type CompleteMultipartUploadPart,
  type InitMultipartUploadPart,
} from "$lib/api/client";

const MAX_PART_RETRIES = 3;
// Concurrent part uploads. Kept moderate (below the browser's ~6-connection cap)
// so a large file doesn't put too much data in flight at once — heavy concurrency
// makes connection drops ("network connection was lost") more likely, notably on
// Safari/WebKit.
const PARALLELISM = 4;

interface PartTask {
  partNumber: number;
  url: string;
  contentLength: number;
  body: Blob;
}

export interface MultipartProgress {
  /** 0–100 across the whole file. */
  percent: number;
  bytesUploaded: number;
  totalBytes: number;
  /** Smoothed (EMA) upload rate in bytes/sec; null until enough samples. */
  bytesPerSecond: number | null;
  /** Estimated seconds remaining; null until a rate is known. */
  etaSeconds: number | null;
}

interface MultipartUploadInput {
  uploadId: string;
  fileId: string;
  transferId: string;
  r2Key: string;
  encryptedBlob: Blob;
  partUrls: InitMultipartUploadPart[];
  onProgress?: (progress: MultipartProgress) => void;
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

/**
 * PUT one part via XHR. `onLoaded` receives the *absolute* bytes uploaded for
 * this attempt (resets to ~0 when a retry starts a fresh request).
 */
function uploadSinglePart(
  task: PartTask,
  onLoaded: (loaded: number) => void,
  signal?: AbortSignal,
): Promise<PartUploadResult> {
  return new Promise<PartUploadResult>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("aborted", "AbortError"));
      return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open("PUT", task.url, true);

    const onAbort = () => xhr.abort();
    signal?.addEventListener("abort", onAbort, { once: true });
    const cleanup = () => signal?.removeEventListener("abort", onAbort);

    xhr.upload.onprogress = (e) => onLoaded(e.loaded);

    xhr.onload = () => {
      cleanup();
      if (xhr.status >= 200 && xhr.status < 300) {
        // R2 (S3-compatible) returns the etag in the `ETag` response header,
        // quoted. CompleteMultipartUpload requires it back verbatim — keep
        // the quotes. Readable cross-origin because the bucket CORS policy
        // exposes ETag.
        const etag =
          xhr.getResponseHeader("ETag") ?? xhr.getResponseHeader("etag");
        if (!etag) {
          reject(new Error("Part response missing ETag header"));
          return;
        }
        onLoaded(task.contentLength); // count the part fully on success
        resolve({ etag });
      } else {
        const err = new Error(`Part upload failed: ${xhr.status}`) as Error & {
          status?: number;
        };
        err.status = xhr.status;
        reject(err);
      }
    };

    xhr.onerror = () => {
      cleanup();
      // Status 0 marks network errors as retryable.
      const err = new Error("Part upload failed (network)") as Error & {
        status?: number;
      };
      err.status = 0;
      reject(err);
    };

    xhr.onabort = () => {
      cleanup();
      reject(new DOMException("aborted", "AbortError"));
    };

    xhr.send(task.body);
  });
}

async function uploadPartWithRetry(
  task: PartTask,
  onLoaded: (loaded: number) => void,
  signal?: AbortSignal,
): Promise<PartUploadResult> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_PART_RETRIES; attempt++) {
    try {
      onLoaded(0); // reset this part's contribution at the start of the attempt
      return await uploadSinglePart(task, onLoaded, signal);
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

  const totalBytes = tasks.reduce((sum, t) => sum + t.contentLength, 0);
  // Per-part uploaded bytes; aggregated across the parallel parts for a smooth
  // total. Indexed by task position so a retry can reset just its own slot.
  const partLoaded = new Array<number>(tasks.length).fill(0);

  // Speed/ETA tracking (EMA over wall-clock).
  let emaBps = 0;
  let lastSampleT = performance.now();
  let lastSampleBytes = 0;
  let lastEmitT = 0;

  function report(force = false): void {
    const totalLoaded = partLoaded.reduce((a, b) => a + b, 0);
    const now = performance.now();
    const dt = (now - lastSampleT) / 1000;
    if (dt >= 0.2) {
      const inst = Math.max(0, (totalLoaded - lastSampleBytes) / dt);
      emaBps = emaBps === 0 ? inst : 0.2 * inst + 0.8 * emaBps;
      lastSampleT = now;
      lastSampleBytes = totalLoaded;
    }
    // Throttle UI emits — onprogress can fire very frequently.
    if (!force && totalLoaded < totalBytes && now - lastEmitT < 80) return;
    lastEmitT = now;
    const remaining = Math.max(0, totalBytes - totalLoaded);
    onProgress?.({
      percent: totalBytes > 0 ? (totalLoaded / totalBytes) * 100 : 0,
      bytesUploaded: totalLoaded,
      totalBytes,
      bytesPerSecond: emaBps > 0 ? emaBps : null,
      etaSeconds: emaBps > 0 ? remaining / emaBps : null,
    });
  }

  try {
    const results = await runWithConcurrency(tasks, PARALLELISM, async (task, idx) => {
      const result = await uploadPartWithRetry(
        task,
        (loaded) => {
          partLoaded[idx] = Math.min(loaded, task.contentLength);
          report();
        },
        controller.signal,
      );
      partLoaded[idx] = task.contentLength;
      report();
      return { partNumber: task.partNumber, etag: result.etag };
    });

    report(true); // ensure a final 100% emit

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
