import { describe, expect, it } from "bun:test";
import { localeFromPath } from "./locale";
import { alternatesOf, canonicalPath, hrefFor, localizedPath } from "./paths";
import { LOCALIZED, LOCALIZED_ENTRIES } from "./routes.js";
import { sitemapXml } from "$lib/seo/sitemap";

describe("addresses in two languages", () => {
  it("knows the language of an address", () => {
    expect(localeFromPath("/")).toBe("en");
    expect(localeFromPath("/nl")).toBe("nl");
    expect(localeFromPath("/nl/vergelijken/wetransfer-alternatief")).toBe("nl");
    expect(localeFromPath("/nlx")).toBe("en");
  });

  it("finds the English page behind every Dutch address, and back", () => {
    for (const [canonical, paths] of Object.entries(LOCALIZED)) {
      expect(canonicalPath(paths.nl)).toBe(canonical);
      expect(canonicalPath(`${paths.nl}/`)).toBe(canonical);
      expect(localizedPath(canonical, "nl")).toBe(paths.nl);
      expect(localizedPath(canonical, "en")).toBe(canonical);
    }
  });

  it("puts every Dutch address under /nl, once", () => {
    for (const path of LOCALIZED_ENTRIES) expect(localeFromPath(path)).toBe("nl");
    expect(new Set(LOCALIZED_ENTRIES).size).toBe(LOCALIZED_ENTRIES.length);
  });

  it("lists alternates only for pages that exist in more than one language", () => {
    expect(alternatesOf("/")).toEqual([
      { locale: "en", path: "/" },
      { locale: "nl", path: "/nl" },
    ]);
    expect(alternatesOf("/a-page-only-in-english")).toEqual([]);
  });

  it("links to the reader's language where it can, and to English otherwise", () => {
    expect(hrefFor("/", "nl")).toBe("/nl");
    expect(hrefFor("/a-page-only-in-english", "nl")).toBe("/a-page-only-in-english");
    expect(hrefFor("/", "en")).toBe("/");
  });

  it("lists every page in the sitemap in each of its languages", () => {
    const env = { VITE_PORTALS_ANNOUNCED: "true", VITE_FORMS_ANNOUNCED: "true", VITE_ACCESS_KEYS_ANNOUNCED: "true" };
    const sitemap = sitemapXml({ portals: true, forms: true, env }, () => "2026-11-23");
    for (const [canonical, paths] of Object.entries(LOCALIZED)) {
      for (const path of [canonical, paths.nl]) {
        expect(sitemap).toContain(`<loc>https://tessil.app${path}</loc>`);
      }
    }
  });
});
