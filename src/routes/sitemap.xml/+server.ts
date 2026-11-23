// The sitemap; see src/lib/seo/sitemap.ts.
import { FORMS_ANNOUNCED, PORTALS_ANNOUNCED } from "$lib/config/launch";
import { sitemapXml } from "$lib/seo/sitemap";

export const prerender = true;

export function GET() {
  const xml = sitemapXml({ portals: PORTALS_ANNOUNCED, forms: FORMS_ANNOUNCED, env: import.meta.env });
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
