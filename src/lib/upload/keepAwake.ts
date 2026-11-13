// While something is being sent: keep a phone's screen from locking, which
// would suspend the page, and ask before the tab is closed or reloaded.
// Returns the function that undoes both.

type Sentinel = { release: () => Promise<void> };
type WakeLockNavigator = Navigator & {
  wakeLock?: { request: (type: "screen") => Promise<Sentinel> };
};

export function holdWhileUploading(): () => void {
  if (typeof window === "undefined") return () => {};

  let released = false;
  let sentinel: Sentinel | null = null;

  async function keepScreenOn() {
    const wakeLock = (navigator as WakeLockNavigator).wakeLock;
    if (!wakeLock || released || document.visibilityState !== "visible") return;
    try {
      const got = await wakeLock.request("screen");
      if (released) void got.release().catch(() => {});
      else sentinel = got;
    } catch {
      // Refused, for example on low battery. The upload works without it.
    }
  }

  // The browser drops the lock when the page is hidden; take it again on return.
  const onVisible = () => void keepScreenOn();
  const onLeave = (e: BeforeUnloadEvent) => {
    e.preventDefault();
    e.returnValue = "";
  };

  void keepScreenOn();
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("beforeunload", onLeave);

  return () => {
    released = true;
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("beforeunload", onLeave);
    void sentinel?.release().catch(() => {});
    sentinel = null;
  };
}
