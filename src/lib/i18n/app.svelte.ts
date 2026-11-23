// Which language the site speaks to this reader.
//
// Public pages say it in their address (/nl/...). Pages after sign-in keep one
// address and follow the account's choice; before that is known, or without
// an account, the reader's last explicit choice on this device; signed out,
// the browser's language; and failing that, English. The account's choice is set
// in Settings, Account. Public pages never switch by browser language; they
// offer the other version instead (LanguageSuggestion).

import { api } from "$lib/api/client";
import { auth } from "$lib/stores/auth.svelte";
import { isLocale, localeFromPath, type Locale } from "./locale";

const CHOICE_KEY = "tessil:locale";

function readStorage(): Locale | null {
  try {
    const value = localStorage.getItem(CHOICE_KEY);
    return isLocale(value) ? value : null;
  } catch {
    return null;
  }
}

// Held in state so pages follow a choice made while they are open.
const device = $state<{ chosen: Locale | null }>({
  chosen: typeof window === "undefined" ? null : readStorage(),
});

/** The language this device last chose explicitly, or null. */
export function readChosenLocale(): Locale | null {
  return device.chosen;
}

export function rememberLocale(locale: Locale): void {
  device.chosen = locale;
  try {
    localStorage.setItem(CHOICE_KEY, locale);
  } catch {
    // Without storage the choice lasts until the page is closed.
  }
}

function browserLocale(): Locale | null {
  if (typeof navigator === "undefined") return null;
  return (navigator.languages?.[0] ?? navigator.language ?? "").toLowerCase().startsWith("nl") ? "nl" : null;
}

/** Pages whose language comes from the account rather than the address. */
export function isAppPath(pathname: string): boolean {
  return /^\/(dashboard|setup|signin|login|d)(\/|$)/.test(pathname);
}

/**
 * The account's language, then this device's choice, then English. Signed
 * out (sign-in pages), the browser's language comes before English.
 */
export function appLocale(): Locale {
  const chosen = auth.user?.locale;
  if (isLocale(chosen)) return chosen;
  return readChosenLocale() ?? (auth.user ? null : browserLocale()) ?? "en";
}

/** The language for a page at this address. */
export function uiLocale(pathname: string): Locale {
  if (localeFromPath(pathname) === "nl") return "nl";
  return isAppPath(pathname) ? appLocale() : "en";
}

/** Sets the account's language, or only this device's when signed out. */
export async function chooseLocale(locale: Locale): Promise<void> {
  rememberLocale(locale);
  if (!auth.user) return;
  await api.setMyLocale(locale);
  auth.user = { ...auth.user, locale };
}
