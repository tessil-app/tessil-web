// Sends several files at once. Small files travel side by side, which is
// what makes a batch of photos quick; a large file already uses several
// connections for its own parts, so it takes every lane for itself.

/** Files up to this size fit in one part, and count as small. */
export const SMALL_FILE_BYTES = 10 * 1024 * 1024;
const LANES = 3;

/**
 * Runs `worker` for every item, in order of start, with at most LANES small
 * items in flight. The first failure cancels the rest (via the signal each
 * worker gets) and is thrown once all have stopped.
 */
export async function runFiles<T>(
  items: T[],
  sizeOf: (item: T) => number,
  worker: (item: T, index: number, signal: AbortSignal) => Promise<void>,
  outer?: AbortSignal,
): Promise<void> {
  const controller = new AbortController();
  const onOuterAbort = () => controller.abort();
  if (outer?.aborted) controller.abort();
  outer?.addEventListener("abort", onOuterAbort, { once: true });

  let free = LANES;
  let wake: (() => void) | null = null;
  const lanesFreed = () => {
    wake?.();
    wake = null;
  };
  let failure: unknown = null;
  const running: Promise<void>[] = [];

  try {
    for (let index = 0; index < items.length; index++) {
      const item = items[index]!;
      const lanes = sizeOf(item) <= SMALL_FILE_BYTES ? 1 : LANES;
      while (free < lanes && !controller.signal.aborted) {
        await new Promise<void>((resolve) => (wake = resolve));
      }
      if (controller.signal.aborted) break;
      free -= lanes;
      running.push(
        worker(item, index, controller.signal)
          .catch((err) => {
            // The first real error wins over the cancellations it causes.
            if (failure === null || (failure as DOMException)?.name === "AbortError") failure = err;
            controller.abort();
          })
          .finally(() => {
            free += lanes;
            lanesFreed();
          }),
      );
    }
    await Promise.all(running);
  } finally {
    outer?.removeEventListener("abort", onOuterAbort);
  }

  if (failure !== null) throw failure;
  if (controller.signal.aborted) throw new DOMException("aborted", "AbortError");
}
