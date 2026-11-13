import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

// The orchestrator talks to storage through XMLHttpRequest and to the API
// through `api`. Both are replaced here so a flaky connection can be scripted.

type Outcome = "ok" | "network" | number;
let script: Outcome[] = [];
let puts = 0;

class FakeXhr {
  status = 0;
  upload: { onprogress: ((e: { loaded: number }) => void) | null } = { onprogress: null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  open() {}
  getResponseHeader() {
    return '"etag"';
  }
  abort() {
    queueMicrotask(() => this.onabort?.());
  }
  send(_body?: Blob) {
    puts += 1;
    const outcome = script.shift() ?? "ok";
    queueMicrotask(() => {
      if (outcome === "network") return this.onerror?.();
      this.status = outcome === "ok" ? 200 : outcome;
      this.onload?.();
    });
  }
}

let completeCalls = 0;
let completeFailures = 0;
let aborted = 0;

class FakeApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

mock.module("$lib/api/client", () => ({
  ApiError: FakeApiError,
  api: {
    completeMultipartUpload: async ({ fileId }: { fileId: string }) => {
      completeCalls += 1;
      if (completeFailures > 0) {
        completeFailures -= 1;
        throw new Error("Network error: Unable to reach API");
      }
      return { fileId, size: 30 };
    },
    abortMultipartUpload: async () => {
      aborted += 1;
    },
  },
}));

const { timing, uploadEncryptedStreamMultipart } = await import("./multipart");
const original = { ...timing };

function source(bytes: number): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(c) {
      c.enqueue(new Uint8Array(bytes));
      c.close();
    },
  });
}

function run(onProgress?: (stalled: boolean) => void, signal?: AbortSignal) {
  return uploadEncryptedStreamMultipart({
    uploadId: "u",
    fileId: "f",
    transferId: "t",
    r2Key: "k",
    source: source(30),
    partUrls: [1, 2, 3].map((n) => ({ partNumber: n, url: `http://s/${n}`, contentLength: 10 })),
    onProgress: (p) => onProgress?.(p.stalled),
    signal,
  });
}

beforeEach(() => {
  (globalThis as unknown as { XMLHttpRequest: unknown }).XMLHttpRequest = FakeXhr;
  Object.assign(timing, { retryBaseMs: 1, retryMaxMs: 2, stallMaxMs: 3, giveUpAfterMs: 5000, idleTimeoutMs: 5000 });
  script = [];
  puts = 0;
  completeCalls = 0;
  completeFailures = 0;
  aborted = 0;
});

afterEach(() => {
  Object.assign(timing, original);
});

describe("cutting the stream into parts", () => {
  it("keeps every byte in order when chunks and parts do not line up", async () => {
    const sent: Uint8Array[] = [];
    class Capturing extends FakeXhr {
      send(body?: Blob) {
        void body!.arrayBuffer().then((b) => sent.push(new Uint8Array(b)));
        super.send();
      }
    }
    (globalThis as unknown as { XMLHttpRequest: unknown }).XMLHttpRequest = Capturing;

    const all = Uint8Array.from({ length: 30 }, (_, i) => i);
    const chunks = [all.slice(0, 7), all.slice(7, 8), all.slice(8, 23), all.slice(23, 30)];
    await uploadEncryptedStreamMultipart({
      uploadId: "u",
      fileId: "f",
      transferId: "t",
      r2Key: "k",
      source: new ReadableStream({
        start(c) {
          for (const chunk of chunks) c.enqueue(chunk);
          c.close();
        },
      }),
      partUrls: [1, 2, 3].map((n) => ({ partNumber: n, url: `http://s/${n}`, contentLength: 10 })),
    });
    await new Promise((r) => setTimeout(r, 5));

    const joined = sent.sort((a, b) => a[0]! - b[0]!).flatMap((p) => Array.from(p));
    expect(sent.map((p) => p.length)).toEqual([10, 10, 10]);
    expect(joined).toEqual(Array.from(all));
  });
});

describe("an upload on a bad connection", () => {
  it("waits out a long drop and finishes without starting over", async () => {
    // Ten failed requests in a row is far past the quick retries.
    script = Array<Outcome>(10).fill("network");
    const seen: boolean[] = [];
    const result = await run((stalled) => seen.push(stalled));

    expect(result).toEqual({ fileId: "f", size: 30 });
    expect(aborted).toBe(0);
    expect(puts).toBe(13); // 10 failures, then each of the 3 parts once
    expect(seen).toContain(true);
    expect(seen.at(-1)).toBe(false);
  });

  it("does not report a stall for a short blip", async () => {
    script = ["network", 503];
    const seen: boolean[] = [];
    await run((stalled) => seen.push(stalled));
    expect(seen).not.toContain(true);
    expect(aborted).toBe(0);
  });

  it("keeps the stored parts when the final call cannot get through", async () => {
    completeFailures = 6;
    const result = await run();
    expect(result.size).toBe(30);
    expect(completeCalls).toBe(7);
    expect(puts).toBe(3);
    expect(aborted).toBe(0);
  });

  it("fails at once on an error that waiting cannot fix", async () => {
    script = [403];
    await expect(run()).rejects.toThrow("Part upload failed: 403");
    expect(aborted).toBe(1);
  });

  it("gives up after the limit", async () => {
    Object.assign(timing, { giveUpAfterMs: 20 });
    script = Array<Outcome>(500).fill("network");
    await expect(run()).rejects.toThrow("network");
    expect(aborted).toBe(1);
  });

  it("stops when cancelled while waiting", async () => {
    Object.assign(timing, { stallMaxMs: 10_000, retryBaseMs: 50 });
    script = Array<Outcome>(500).fill("network");
    const controller = new AbortController();
    const pending = run((stalled) => {
      if (stalled) controller.abort();
    }, controller.signal);
    await expect(pending).rejects.toThrow();
    expect(aborted).toBe(1);
  });
});
