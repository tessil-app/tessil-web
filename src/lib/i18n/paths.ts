// A page's address in each language. The pairs live in routes.js; these
// helpers are the only code that reads them. See locale.ts for the languages.

import { LOCALES, type Locale } from "./locale";
import { LOCALIZED } from "./routes.js";

// Dutch address -> English address, built once from the list.
const TO_CANONICAL = new Map<string, string>(
  Object.entries(LOCALIZED).map(([canonical, paths]) => [paths.nl, canonical]),
);

function trim(pathname: string): string {
  return pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}


/** The English address of a page in any language; the route that renders it. */
export function canonicalPath(pathname: string): string {
  const path = trim(pathname);
  return TO_CANONICAL.get(path) ?? path;
}

/** A page's address in a language, or null when it does not exist in that language. */
export function localizedPath(canonical: string, locale: Locale): string | null {
  if (locale === "en") return canonical;
  return LOCALIZED[canonical]?.[locale] ?? null;
}

/** Every language a page exists in, with its address; empty for English-only pages. */
export function alternatesOf(canonical: string): { locale: Locale; path: string }[] {
  const others = LOCALES.filter((l) => l !== "en").flatMap((l) => {
    const path = localizedPath(canonical, l);
    return path ? [{ locale: l, path }] : [];
  });
  return others.length > 0 ? [{ locale: "en" as Locale, path: canonical }, ...others] : [];
}

/**
 * A link target in the reader's language: the Dutch address when the page
 * has one and the reader is reading Dutch, the English one otherwise.
 */
export function hrefFor(canonical: string, locale: Locale): string {
  return localizedPath(canonical, locale) ?? canonical;
}
