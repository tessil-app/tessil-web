// Dismissal state for the support prompt. Two first-party booleans, no
// identifier and nothing that leaves the browser.

import { browser } from "$app/environment";

const SENT_KEY = "tessil_support_sent";
const DISMISSED_KEY = "tessil_support_dismissed";

function read(key: string): boolean {
  if (!browser) return false;
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function write(key: string): void {
  if (!browser) return;
  try {
    localStorage.setItem(key, "1");
  } catch {
    // Blocked storage (private mode, hardened settings): the prompt just
    // behaves as if it had never been shown.
  }
}

/** Set when a transfer completes, so the ask only reaches people it worked for. */
export function markTransferSent(): void {
  write(SENT_KEY);
}

export function markPromptDismissed(): void {
  write(DISMISSED_KEY);
}

export function hasDismissedPrompt(): boolean {
  return read(DISMISSED_KEY);
}

/**
 * Read on mount only, so the prompt lands on a later visit rather than on top
 * of the share link the user came to copy.
 */
export function shouldAutoOpenPrompt(): boolean {
  return read(SENT_KEY) && !read(DISMISSED_KEY);
}
