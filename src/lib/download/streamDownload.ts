// Streaming download to disk via a scoped Service Worker.
//
// Fixes the recipient-side OOM ceiling and gives a native browser download
// (including Safari/iOS) for TSL1 transfers, and (Phase 2b) pulls the ciphertext
// with parallel ranged GETs for throughput. The Service Worker is generic and
// holds no crypto: this module decrypts client-side and feeds plaintext chunks
// to the worker over a MessagePort; the worker turns them into a streaming
// attachment Response.
//
// The ciphertext is pulled with parallel ranged GETs against the presigned URL,
// each range decrypted chunk-by-chunk and reordered into sequence before feeding
// the worker (so the worker stays generic). Small files never reach here (the
// download page uses a simple buffered download below its size gate), and any
// failure here is caught by the caller and falls back to that buffered path, so
// a missing/blocked worker, ranges-unsupported, or a legacy (non-TSL1) object
// never breaks downloads. See docs/audit/32-streaming-download-service-worker.md.

import {
  plaintextSize,
  parseStreamHeader,
  chunkLayout,
  chunkByteOffset,
  decryptChunk,
  HEADER_SIZE,
} from "$lib/crypto/streaming";

const SW_URL = "/_tessil_dl/sw.js";
const SW_SCOPE = "/_tessil_dl/";

// Chunks per ranged request (with 1 MiB chunks this is ~4 MiB per range).
const RANGE_CHUNKS = 4;
const MAX_RANGE_RETRIES = 3;

/** Whether the streaming-to-disk path is usable in this browser. */
export function canStreamToDisk(): boolean {
  return (
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    typeof MessageChannel !== "undefined" &&
    typeof ReadableStream !== "undefined"
  );
}

// WebKit (Safari/iOS) drops connections under heavy parallelism, so we keep its
// concurrency lower (the same scar that capped upload parallelism).
function isWebKit(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return true;
  return /^((?!chrome|chromium|crios|android|edg).)*safari/i.test(ua);
}

function downloadConcurrency(): number {
  return isWebKit() ? 2 : 4;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException("aborted", "AbortError"));
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

let registration: Promise<ServiceWorkerRegistration> | null = null;
async function ensureWorker(): Promise<ServiceWorkerRegistration> {
  if (!registration) {
    registration = (async () => {
      const reg = await navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE });
      if (reg.active) return reg;
      const sw = reg.installing ?? reg.waiting;
      if (sw) {
        await new Promise<void>((resolve) => {
          const onState = () => {
            if (sw.state === "activated") {
              sw.removeEventListener("statechange", onState);
              resolve();
            }
          };
          sw.addEventListener("statechange", onState);
        });
      }
      return reg;
    })().catch((err) => {
      registration = null; // allow a later retry
      throw err;
    });
  }
  return registration;
}

/** Fetches an inclusive byte range, expecting 206 Partial Content, with retry. */
async function fetchRange(
  url: string,
  start: number,
  endInclusive: number,
  signal: AbortSignal | undefined,
): Promise<Uint8Array<ArrayBuffer>> {
  const expected = endInclusive - start + 1;
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RANGE_RETRIES; attempt++) {
    try {
      const resp = await fetch(url, { headers: { Range: `bytes=${start}-${endInclusive}` }, signal });
      if (resp.status !== 206) {
        // Server ignored the Range (200 = whole object). Bail so the caller can
        // fall back to the buffered path rather than pull the whole file N times.
        throw new Error(`range request not honored: ${resp.status}`);
      }
      const buf = new Uint8Array(await resp.arrayBuffer());
      if (buf.length !== expected) throw new Error(`short range: ${buf.length} != ${expected}`);
      return buf;
    } catch (err) {
      if ((err as DOMException).name === "AbortError") throw err;
      lastError = err;
      if (attempt === MAX_RANGE_RETRIES) break;
      await sleep(Math.min(1000 * 2 ** attempt, 8000) + Math.random() * 400, signal);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("range fetch failed");
}

/**
 * Parallel ranged download: pulls ~RANGE_CHUNKS-sized byte ranges concurrently,
 * decrypts each chunk, and emits plaintext chunks to `onChunk` in global order.
 * A lookahead window bounds buffered memory.
 */
async function pumpParallel(
  url: string,
  key: CryptoKey,
  ciphertextSize: number,
  onChunk: (chunk: Uint8Array) => void,
  signal: AbortSignal | undefined,
): Promise<void> {
  const ac = new AbortController();
  const onOuterAbort = () => ac.abort();
  signal?.addEventListener("abort", onOuterAbort, { once: true });

  try {
    const header = await fetchRange(url, 0, HEADER_SIZE - 1, ac.signal);
    const { baseIv, chunkSize } = parseStreamHeader(header);
    const { total, wireChunk, lastWireSize } = chunkLayout(ciphertextSize, chunkSize);
    const numRanges = Math.ceil(total / RANGE_CHUNKS);
    const concurrency = downloadConcurrency();
    const lookahead = concurrency * 2;

    const ready = new Map<number, Uint8Array[]>();
    const inFlight = new Map<number, Promise<void>>();
    let nextToStart = 0;
    let nextToEmit = 0;
    let failed: unknown = null;

    const startRange = (r: number) => {
      const startChunk = r * RANGE_CHUNKS;
      const endChunk = Math.min(startChunk + RANGE_CHUNKS, total);
      const byteStart = chunkByteOffset(startChunk, wireChunk);
      const byteEndExclusive =
        endChunk >= total ? ciphertextSize : chunkByteOffset(endChunk, wireChunk);
      const promise = (async () => {
        const wire = await fetchRange(url, byteStart, byteEndExclusive - 1, ac.signal);
        const plains: Uint8Array[] = [];
        for (let i = startChunk; i < endChunk; i++) {
          const within = (i - startChunk) * wireChunk;
          const size = i < total - 1 ? wireChunk : lastWireSize;
          plains.push(await decryptChunk(key, baseIv, i, i === total - 1, wire.subarray(within, within + size)));
        }
        ready.set(r, plains);
      })()
        .catch((err) => {
          if (failed === null) failed = err;
        })
        .finally(() => {
          inFlight.delete(r);
        });
      inFlight.set(r, promise);
    };

    while (nextToEmit < numRanges) {
      if (failed) throw failed;
      if (ac.signal.aborted) throw new DOMException("aborted", "AbortError");

      while (
        nextToStart < numRanges &&
        inFlight.size < concurrency &&
        nextToStart < nextToEmit + lookahead
      ) {
        startRange(nextToStart++);
      }

      const plains = ready.get(nextToEmit);
      if (plains) {
        ready.delete(nextToEmit);
        for (const pc of plains) onChunk(pc);
        nextToEmit++;
        continue;
      }

      if (inFlight.size === 0) throw failed ?? new Error("download stalled");
      await Promise.race(inFlight.values());
    }
    if (failed) throw failed;
  } finally {
    signal?.removeEventListener("abort", onOuterAbort);
    ac.abort(); // cancel any still-in-flight ranges on exit
  }
}

/**
 * The download failed after the browser had begun writing the file. The
 * caller must not fall back to the buffered path: a partial file is already
 * on disk and buffering a large file would exhaust memory.
 */
export class StreamInterruptedError extends Error {
  constructor(cause: unknown) {
    super(cause instanceof Error ? cause.message : "download interrupted");
    this.name = "StreamInterruptedError";
  }
}

export interface StreamDownloadOptions {
  downloadUrl: string;
  key: CryptoKey;
  /** Framed ciphertext size (the file's stored size). */
  ciphertextSize: number;
  /** Decrypted filename. */
  filename: string;
  mimeType?: string | null;
  /** 0..1 of plaintext written. */
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}

/**
 * Streams a TSL1 transfer to disk. Throws on any failure. A failure before
 * the first plaintext was handed to the browser (worker unavailable, ranges
 * unsupported, a non-TSL1 object) is a plain error and the caller can fall
 * back to the buffered path; a later one is a StreamInterruptedError.
 */
export async function streamingDownloadToDisk(opts: StreamDownloadOptions): Promise<void> {
  const { downloadUrl, key, ciphertextSize, filename, mimeType, onProgress, signal } = opts;

  const reg = await ensureWorker();
  const worker = reg.active;
  if (!worker) throw new Error("download worker unavailable");

  const id = crypto.randomUUID();
  const size = plaintextSize(ciphertextSize);
  const channel = new MessageChannel();
  let resolveAck: (() => void) | null = null;
  let resolveStarted: (() => void) | null = null;
  channel.port1.onmessage = (ev) => {
    const type = ev.data?.type;
    if (type === "ack") resolveAck?.();
    else if (type === "started") resolveStarted?.();
  };

  // Register the download with the worker and wait for its ack before triggering
  // the iframe, so the worker has the stream ready when the request arrives.
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("download worker did not respond")), 5000);
    resolveAck = () => {
      clearTimeout(timer);
      resolve();
    };
    worker.postMessage(
      { type: "init", id, filename, mimeType: mimeType ?? "application/octet-stream", size },
      [channel.port2],
    );
  });

  // Watch for the worker to actually begin serving the download (its fetch
  // handler posts "started"). If the trigger is blocked (e.g. CSP) or otherwise
  // fails, this never arrives, we time out, and the caller falls back to the
  // buffered path instead of silently "succeeding" with no file.
  const started = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("download did not start (worker trigger blocked)")),
      4000,
    );
    resolveStarted = () => {
      clearTimeout(timer);
      resolve();
    };
  });

  // Trigger the native download via a hidden iframe inside the worker's scope.
  const iframe = document.createElement("iframe");
  iframe.hidden = true;
  iframe.src = `${SW_SCOPE}${id}`;
  document.body.appendChild(iframe);
  const removeIframe = () => setTimeout(() => iframe.remove(), 2000);

  const onAbort = () => {
    try {
      channel.port1.postMessage({ type: "abort" });
    } catch {
      /* port may be closed */
    }
  };
  signal?.addEventListener("abort", onAbort, { once: true });

  let written = 0;
  const feed = (chunk: Uint8Array) => {
    written += chunk.length;
    // Transfer the buffer to the worker (zero-copy); chunk is not reused.
    channel.port1.postMessage({ type: "chunk", chunk }, [chunk.buffer as ArrayBuffer]);
    if (size > 0) onProgress?.(Math.min(1, written / size));
  };

  try {
    await started; // bail to the buffered fallback if the worker never engaged
    await pumpParallel(downloadUrl, key, ciphertextSize, feed, signal);
    channel.port1.postMessage({ type: "end" });
    onProgress?.(1);
    removeIframe();
  } catch (err) {
    onAbort();
    removeIframe();
    const aborted = (err as DOMException)?.name === "AbortError";
    throw written > 0 && !aborted ? new StreamInterruptedError(err) : err;
  } finally {
    signal?.removeEventListener("abort", onAbort);
  }
}
