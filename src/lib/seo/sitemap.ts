// The sitemap, built at prerender (src/routes/sitemap.xml). Every public page with its Dutch address
// (from routes.js) as an alternate, and the date its content last changed,
// taken from git. A page whose date git cannot give is listed without one.

import { execFileSync } from "node:child_process";
import { comparisons } from "$lib/compare/comparisons";
import { receivingComparisons } from "$lib/compare/receiving";
import { SITE_URL } from "$lib/config/site";
import { HTML_LANG } from "$lib/i18n/locale";
import { alternatesOf } from "$lib/i18n/paths";
import { LOCALIZED } from "$lib/i18n/routes.js";

/** What the build announces: the launch flags, as the environment holds them. */
export type Shown = { portals: boolean; forms: boolean; env: Record<string, string | undefined> };

const COMPARE_DATA = [
  "src/lib/compare",
  "src/lib/components/ComparisonPage.svelte",
];

/** Public pages, by English address, with the files their content lives in. */
function pages({ portals, forms }: Shown): { path: string; sources: string[] }[] {
  const msg = (name: string) => `src/lib/i18n/messages/${name}.ts`;
  return [
    { path: "/", sources: ["src/routes/+page.svelte", msg("home"), msg("send")] },
    ...(portals ? [{ path: "/portals", sources: ["src/routes/portals", msg("portals")] }] : []),
    ...(forms ? [{ path: "/forms", sources: ["src/routes/forms/+page.svelte", msg("forms")] }] : []),
    { path: "/pricing", sources: ["src/routes/pricing", msg("pricing"), "src/lib/config/plans.ts"] },
    { path: "/what-we-store", sources: ["src/routes/what-we-store", msg("whatWeStore")] },
    { path: "/security", sources: ["src/routes/security"] },
    { path: "/privacy", sources: ["src/routes/privacy"] },
    { path: "/terms", sources: ["src/routes/terms"] },
    { path: "/verify", sources: ["src/routes/verify"] },
    { path: "/abuse", sources: ["src/routes/abuse", msg("abuse")] },
    { path: "/cli", sources: ["src/routes/cli", msg("cli")] },
    { path: "/compare", sources: ["src/routes/compare/+page.svelte", msg("compareIndex"), ...COMPARE_DATA] },
    ...[
      ...comparisons.filter((c) => !c.kind || c.kind === "send"),
      ...receivingComparisons.filter((c) => (c.kind === "form" ? forms : portals)),
    ].map((c) => ({ path: `/compare/${c.slug}`, sources: COMPARE_DATA })),
  ];
}

export function lastChanged(sources: string[]): string | null {
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%cs", "--", ...sources], { encoding: "utf8" }).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(out) ? out : null;
  } catch {
    return null;
  }
}

/** A Dutch address waits for the launch flag its page needs. */
function translated(path: string, env: Shown["env"]): boolean {
  const needs = (LOCALIZED as Record<string, { needs?: string }>)[path]?.needs;
  return !needs || env[needs] === "true";
}

function entry(loc: string, lastmod: string | null, alternates: { locale: "en" | "nl"; path: string }[]): string {
  return [
    "  <url>",
    `    <loc>${SITE_URL}${loc}</loc>`,
    ...(lastmod ? [`    <lastmod>${lastmod}</lastmod>`] : []),
    ...alternates.map((a) => `    <xhtml:link rel="alternate" hreflang="${HTML_LANG[a.locale]}" href="${SITE_URL}${a.path}" />`),
    ...(alternates.length > 0 ? [`    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}${alternates[0].path}" />`] : []),
    "  </url>",
  ].join("\n");
}

export function sitemapXml(shown: Shown, dated: (sources: string[]) => string | null = lastChanged): string {
  const urls = pages(shown).flatMap(({ path, sources }) => {
    const lastmod = dated(sources);
    const alternates = translated(path, shown.env) ? alternatesOf(path) : [];
    // Every language version is listed, each naming all the others.
    const locs = alternates.length > 0 ? alternates.map((a) => a.path) : [path];
    return locs.map((loc) => entry(loc, lastmod, alternates));
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...urls,
    "</urlset>",
    "",
  ].join("\n");
}
