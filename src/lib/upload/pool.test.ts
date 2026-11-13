import { describe, expect, it } from "bun:test";
import { runFiles, SMALL_FILE_BYTES } from "./pool";

const tick = (ms = 5) => new Promise((r) => setTimeout(r, ms));

describe("sending several files", () => {
  it("runs small files three at a time and a large one alone", async () => {
    const sizes = [1, 1, 1, 1, SMALL_FILE_BYTES + 1, 1, 1];
    let active = 0;
    const seen: { index: number; alongside: number }[] = [];
    await runFiles(
      sizes,
      (s) => s,
      async (_size, index) => {
        active += 1;
        seen.push({ index, alongside: active });
        await tick();
        active -= 1;
      },
    );
    expect(seen.map((s) => s.index)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(Math.max(...seen.map((s) => s.alongside))).toBe(3);
    expect(seen.find((s) => s.index === 4)!.alongside).toBe(1);
  });

  it("stops the others and reports the first real failure", async () => {
    const started: number[] = [];
    const cancelled: number[] = [];
    const pending = runFiles(
      [1, 1, 1, 1, 1],
      (s) => s,
      async (_s, index, signal) => {
        started.push(index);
        if (index === 1) {
          await tick(2);
          throw new Error("storage said no");
        }
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(resolve, 200);
          signal.addEventListener("abort", () => {
            clearTimeout(timer);
            cancelled.push(index);
            reject(new DOMException("aborted", "AbortError"));
          });
        });
      },
    );
    await expect(pending).rejects.toThrow("storage said no");
    expect(started).toEqual([0, 1, 2]);
    expect(cancelled.sort()).toEqual([0, 2]);
  });

  it("stops when the caller cancels", async () => {
    const controller = new AbortController();
    const pending = runFiles(
      [1, 1, 1, 1],
      (s) => s,
      async (_s, _i, signal) => {
        await new Promise<void>((_resolve, reject) =>
          signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))),
        );
      },
      controller.signal,
    );
    await tick();
    controller.abort();
    await expect(pending).rejects.toThrow();
  });
});
