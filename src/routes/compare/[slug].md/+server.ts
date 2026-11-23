// A comparison as Markdown, English or Dutch, for AI agents.
import { error } from "@sveltejs/kit";
import { allComparisonDocs, comparisonMarkdown } from "$lib/seo/agentText";
import { ROUNDUP_SLUG, ROUNDUP_SLUG_NL, roundupMarkdown } from "$lib/compare/roundup";
import { SITE_URL } from "$lib/config/site";
import type { EntryGenerator, RequestHandler } from "./$types";

const markdown = (body: string) => new Response(body, { headers: { "Content-Type": "text/markdown; charset=utf-8" } });

export const prerender = true;

export const entries: EntryGenerator = () => [
  ...allComparisonDocs().map((d) => ({ slug: d.slug })),
  { slug: ROUNDUP_SLUG },
  { slug: ROUNDUP_SLUG_NL },
];

export const GET: RequestHandler = ({ params }) => {
  if (params.slug === ROUNDUP_SLUG) return markdown(roundupMarkdown("en", SITE_URL));
  if (params.slug === ROUNDUP_SLUG_NL) return markdown(roundupMarkdown("nl", SITE_URL));
  const doc = allComparisonDocs().find((d) => d.slug === params.slug);
  if (!doc) error(404, "Not found");
  return markdown(comparisonMarkdown(doc.comparison, doc));
};
