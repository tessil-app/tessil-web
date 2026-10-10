import { browser } from "$app/environment";

// A single-transfer pass, kept until it is spent so a reload or a failed
// upload does not cost a second payment. Functional storage: the token is a
// random string that identifies a payment to our API, nothing about the person.
const KEY = "tessil_pass";

export interface StoredPass {
  token: string;
  /** Polar checkout for this pass, so an unfinished payment can be reopened. */
  url: string;
}

export function loadPass(): StoredPass | null {
  if (!browser) return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredPass>;
    if (typeof parsed.token !== "string" || typeof parsed.url !== "string") {
      return null;
    }
    return { token: parsed.token, url: parsed.url };
  } catch {
    return null;
  }
}

export function savePass(pass: StoredPass): void {
  if (!browser) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(pass));
  } catch {
    // Blocked storage: the pass still works for this page load.
  }
}

export function clearPass(): void {
  if (!browser) return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}
