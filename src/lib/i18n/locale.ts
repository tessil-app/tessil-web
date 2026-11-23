// Which language a page is in, and its address in the other languages.
//
// Public pages carry their language in the address: Dutch lives under /nl,
// with Dutch words (/nl/portalen), and English has no prefix. The pairs are
// listed once, in routes.js, and paths.ts works with them. Pages after sign-in
// keep one address and follow the account's chosen language; see app.svelte.ts.
//
// Kept free of imports: the command-line tool shares this file.

export const LOCALES = ["en", "nl"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** BCP 47 tag for the html lang attribute and hreflang. */
export const HTML_LANG: Record<Locale, string> = {
  en: "en",
  nl: "nl",
};

/** Each language's name, written in that language. */
export const LANGUAGE_NAME: Record<Locale, string> = {
  en: "English",
  nl: "Nederlands",
};

export function isLocale(value: unknown): value is Locale {
  return LOCALES.some((l) => l === value);
}

/** The language an address is in. Anything under /nl is Dutch. */
export function localeFromPath(pathname: string): Locale {
  return pathname === "/nl" || pathname.startsWith("/nl/") ? "nl" : "en";
}
