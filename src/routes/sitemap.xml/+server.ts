import { comparisons } from "$lib/compare/comparisons";
import { comparisonsNl, nlSlugForEn } from "$lib/compare/comparisons.nl";
import { SITE_URL } from "$lib/config/site";
import type { RequestHandler } from "./$types";

// Prerendered at build time so the sitemap cannot drift from the route list.
// No lastmod: a stale one is worse than none, and git dates are not available
// in the CI build.
export const prerender = true;

type Entry = { path: string; alternates?: { en: string; nl: string } };

const entries: Entry[] = [
  { path: "/", alternates: { en: "/", nl: "/nl" } },
  { path: "/nl", alternates: { en: "/", nl: "/nl" } },
  { path: "/eu" },
  { path: "/verify" },
  { path: "/compare" },
  { path: "/compare/eu-encrypted-file-transfer" },
  { path: "/security" },
  { path: "/pricing" },
  { path: "/privacy" },
  { path: "/terms" },
  { path: "/abuse" },
  ...comparisons.map((c) => {
    const nl = nlSlugForEn(c.slug);
    return {
      path: `/compare/${c.slug}`,
      alternates: nl
        ? { en: `/compare/${c.slug}`, nl: `/nl/vergelijken/${nl}` }
        : undefined,
    };
  }),
  ...comparisonsNl.map((c) => ({
    path: `/nl/vergelijken/${c.slug}`,
    alternates: { en: `/compare/${c.enSlug}`, nl: `/nl/vergelijken/${c.slug}` },
  })),
];

function url(e: Entry): string {
  const alt = e.alternates
    ? [
        `<xhtml:link rel="alternate" hreflang="en" href="${SITE_URL}${e.alternates.en}"/>`,
        `<xhtml:link rel="alternate" hreflang="nl" href="${SITE_URL}${e.alternates.nl}"/>`,
        `<xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}${e.alternates.en}"/>`,
      ].join("")
    : "";
  return `<url><loc>${SITE_URL}${e.path}</loc>${alt}</url>`;
}

export const GET: RequestHandler = () => {
  const body =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">` +
    entries.map(url).join("") +
    `</urlset>`;
  return new Response(body, {
    headers: { "Content-Type": "application/xml" },
  });
};
