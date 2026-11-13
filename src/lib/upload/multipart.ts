// Multipart upload orchestrator. Streams TSL1 ciphertext into R2 Parts in
// parallel, retries, aborts on hard failure.
//
// The ciphertext arrives as a ReadableStream (from streaming encryption), so we
// never hold the whole file in memory: Parts are read off the stream in order,
// each exactly its server-assigned contentLength, then uploaded with bounded
// concurrency. Peak memory is roughly PARALLELISM Parts.
//
// Part PUTs use XMLHttpRequest (not fetch) so we get upload.onprogress events:
// fetch exposes no upload progress, which made big files look frozen between
// part completions. With per-byte progress we report a smooth byte count plus
// a live speed (EMA) and ETA.
//
// A dropped connection does not fail the file. A part that keeps failing for
// network reasons is retried, with the parts already stored left alone, until
// the connection is back or GIVE_UP_AFTER_MS passes. Only this tab can
// continue: a reload starts the file again.

import {
  api,
  ApiError,
  type CompleteMultipartUploadPart,
  type InitMultipartUploadPart,
} from "$lib/api/client";

// Tunable so tests do not wait real seconds.
export const timing = {
  /** Quick retries before the upload is reported as stalled. */
  quickRetries: 3,
  retryBaseMs: 1000,
  retryMaxMs: 10_000,
  /** Longest wait between attempts while stalled. */
  stallMaxMs: 30_000,
  /** A part that has failed for this long ends the upload. */
  giveUpAfterMs: 30 * 60 * 1000,
  /** No bytes moving for this long counts as a dropped connection. */
  idleTimeoutMs: 60_000,
};
// Concurrent part uploads. Kept moderate (below the browser's ~6-connection cap)
// so a large file doesn't put too much data in flight at once - heavy concurrency
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
  /** The connection dropped and the upload is waiting to continue. */
  stalled: boolean;
}

interface MultipartUploadInput {
  uploadId: string;
  fileId: string;
  transferId: string;
  r2Key: string;
  /** Ciphertext stream (TSL1). Read in order into Parts; never fully buffered. */
  source: ReadableStream<Uint8Array>;
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
    const cleanup = () => {
      clearTimeout(idle);
      signal?.removeEventListener("abort", onAbort);
    };

    // A connection can die without an error event (sleep, a network
    // switch). No movement for a while is treated as a network failure.
    let idle: ReturnType<typeof setTimeout> | undefined;
    let timedOut = false;
    const watch = () => {
      clearTimeout(idle);
      idle = setTimeout(() => {
        timedOut = true;
        xhr.abort();
      }, timing.idleTimeoutMs);
    };
    watch();

    xhr.upload.onprogress = (e) => {
      watch();
      onLoaded(e.loaded);
    };

    xhr.onload = () => {
      cleanup();
      if (xhr.status >= 200 && xhr.status < 300) {
        // R2 (S3-compatible) returns the etag in the `ETag` response header,
        // quoted. CompleteMultipartUpload requires it back verbatim - keep
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
      if (timedOut) {
        const err = new Error("Part upload stalled") as Error & { status?: number };
        err.status = 0;
        reject(err);
        return;
      }
      reject(new DOMException("aborted", "AbortError"));
    };

    xhr.send(task.body);
  });
}

/** Waits `ms`, or less if the browser reports the connection is back. */
function waitForConnection(ms: number, signal?: AbortSignal): Promise<void> {
  if (typeof window === "undefined") return sleep(ms, signal);
  return new Promise((resolve, reject) => {
    const done = (fn: () => void) => {
      window.removeEventListener("online", onOnline);
      fn();
    };
    const onOnline = () => done(resolve);
    window.addEventListener("online", onOnline, { once: true });
    sleep(ms, signal).then(
      () => done(resolve),
      (err) => done(() => reject(err)),
    );
  });
}

function backoff(attempt: number, max: number): number {
  // Jitter keeps parallel parts from retrying in lockstep.
  return Math.min(timing.retryBaseMs * Math.pow(2, attempt), max) + Math.random() * (timing.retryBaseMs / 2);
}

/**
 * Runs `attempt` until it succeeds. Failures that look like a lost
 * connection are retried: quickly at first, then, with `onStall(true)`
 * reported, for as long as `giveUpAfterMs`. Anything else is thrown.
 */
async function untilConnected<T>(
  attempt: () => Promise<T>,
  isRetryable: (err: unknown) => boolean,
  onStall: (stalled: boolean) => void,
  signal?: AbortSignal,
): Promise<T> {
  let failingSince: number | null = null;
  let stalled = false;
  for (let n = 0; ; n++) {
    try {
      const result = await attempt();
      if (stalled) onStall(false);
      return result;
    } catch (err) {
      if ((err as DOMException)?.name === "AbortError") throw err;
      failingSince ??= Date.now();
      if (!isRetryable(err) || Date.now() - failingSince > timing.giveUpAfterMs) {
        if (stalled) onStall(false);
        throw err instanceof Error ? err : new Error("Upload failed");
      }
      if (n < timing.quickRetries) {
        await sleep(backoff(n, timing.retryMaxMs), signal);
        continue;
      }
      if (!stalled) {
        stalled = true;
        onStall(true);
      }
      await waitForConnection(backoff(n, timing.stallMaxMs), signal);
    }
  }
}

function uploadPartWithRetry(
  task: PartTask,
  onLoaded: (loaded: number) => void,
  onStall: (stalled: boolean) => void,
  signal?: AbortSignal,
): Promise<PartUploadResult> {
  return untilConnected(
    () => {
      onLoaded(0); // reset this part's contribution at the start of the attempt
      return uploadSinglePart(task, onLoaded, signal);
    },
    (err) => isRetryableStatus((err as { status?: number }).status ?? 0),
    onStall,
    signal,
  );
}

/**
 * Reads the ciphertext stream into Parts (in order, each exactly its
 * contentLength) and uploads them with bounded concurrency. Aborts cleanly on
 * terminal failure. Caller handles init-multipart and one-shot semantics.
 */
export async function uploadEncryptedStreamMultipart(
  input: MultipartUploadInput,
): Promise<MultipartUploadResult> {
  const { uploadId, fileId, transferId, source, partUrls, onProgress, signal } = input;

  // Linked to caller signal so a user cancel propagates to in-flight Parts and
  // the source reader.
  const controller = new AbortController();
  const onCallerAbort = () => controller.abort();
  signal?.addEventListener("abort", onCallerAbort, { once: true });

  const totalBytes = partUrls.reduce((sum, p) => sum + p.contentLength, 0);
  // Per-part uploaded bytes; aggregated across the parallel parts for a smooth
  // total. Indexed by task position so a retry can reset just its own slot.
  const partLoaded = new Array<number>(partUrls.length).fill(0);

  // How many parts, or the final call, are waiting for the connection.
  let stalledCount = 0;
  const onStall = (stalled: boolean) => {
    stalledCount += stalled ? 1 : -1;
    report(true);
  };

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
    // Throttle UI emits - onprogress can fire very frequently.
    if (!force && totalLoaded < totalBytes && now - lastEmitT < 80) return;
    lastEmitT = now;
    const remaining = Math.max(0, totalBytes - totalLoaded);
    onProgress?.({
      percent: totalBytes > 0 ? (totalLoaded / totalBytes) * 100 : 0,
      bytesUploaded: totalLoaded,
      totalBytes,
      bytesPerSecond: emaBps > 0 ? emaBps : null,
      etaSeconds: emaBps > 0 ? remaining / emaBps : null,
      stalled: stalledCount > 0,
    });
  }

  // Sequential reader over the ciphertext stream. Only this loop reads, so the
  // single reader is never touched concurrently; uploads run in parallel.
  const reader = source.getReader();
  // Chunks read but not yet handed to a Part. They are passed to the Blob
  // as they are, so a Part is assembled with one copy instead of several.
  const pending: Uint8Array[] = [];
  let pendingBytes = 0;
  let streamDone = false;
  async function readPart(n: number): Promise<Blob> {
    while (pendingBytes < n && !streamDone) {
      const { done, value } = await reader.read();
      if (done) {
        streamDone = true;
        break;
      }
      if (value && value.length) {
        pending.push(value);
        pendingBytes += value.length;
      }
    }
    const pieces: Uint8Array[] = [];
    let need = Math.min(n, pendingBytes);
    pendingBytes -= need;
    while (need > 0) {
      const head = pending[0]!;
      if (head.length <= need) {
        pieces.push(head);
        pending.shift();
        need -= head.length;
      } else {
        pieces.push(head.subarray(0, need));
        pending[0] = head.subarray(need);
        need = 0;
      }
    }
    return new Blob(pieces as BlobPart[]);
  }

  const results: CompleteMultipartUploadPart[] = new Array(partUrls.length);
  const inFlight = new Set<Promise<void>>();
  let firstError: unknown = null;

  try {
    for (let i = 0; i < partUrls.length; i++) {
      if (firstError) break;
      if (controller.signal.aborted) throw new DOMException("aborted", "AbortError");

      const p = partUrls[i]!;
      const body = await readPart(p.contentLength);
      if (body.size !== p.contentLength) {
        throw new Error("Ciphertext stream ended before all Parts were filled");
      }
      const task: PartTask = {
        partNumber: p.partNumber,
        url: p.url,
        contentLength: p.contentLength,
        body,
      };
      const idx = i;

      const job = (async () => {
        const result = await uploadPartWithRetry(
          task,
          (loaded) => {
            partLoaded[idx] = Math.min(loaded, task.contentLength);
            report();
          },
          onStall,
          controller.signal,
        );
        partLoaded[idx] = task.contentLength;
        report();
        results[idx] = { partNumber: task.partNumber, etag: result.etag };
      })();

      // Wrap so a rejection never goes unhandled; capture the first error and
      // abort the rest. `tracked` is referenced in its own callbacks, which run
      // after it is assigned.
      const tracked: Promise<void> = job.then(
        () => {
          inFlight.delete(tracked);
        },
        (err) => {
          inFlight.delete(tracked);
          if (firstError === null) firstError = err;
          controller.abort();
        },
      );
      inFlight.add(tracked);

      if (inFlight.size >= PARALLELISM) {
        await Promise.race(inFlight); // wait for a slot (never rejects - tracked catches)
      }
    }

    await Promise.allSettled(inFlight);
    if (firstError) throw firstError;
    if (controller.signal.aborted) throw new DOMException("aborted", "AbortError");

    report(true); // ensure a final 100% emit

    // Every part is stored; losing the connection now must not throw
    // them away. The server answers a repeated call for a finished file.
    return await untilConnected(
      () => api.completeMultipartUpload({ transferId, fileId, uploadId, parts: results }),
      (err) => !(err instanceof ApiError) || isRetryableStatus(err.status),
      onStall,
      controller.signal,
    );
  } catch (err) {
    controller.abort();
    await reader.cancel().catch(() => {});
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
