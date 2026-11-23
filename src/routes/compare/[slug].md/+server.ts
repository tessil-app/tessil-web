// A comparison as Markdown, English or Dutch, for AI agents.
import { error } from "@sveltejs/kit";
import { allComparisonDocs, comparisonMarkdown } from "$lib/seo/agentText";
import type { EntryGenerator, RequestHandler } from "./$types";

export const prerender = true;

export const entries: EntryGenerator = () => allComparisonDocs().map((d) => ({ slug: d.slug }));

export const GET: RequestHandler = ({ params }) => {
  const doc = allComparisonDocs().find((d) => d.slug === params.slug);
  if (!doc) error(404, "Not found");
  return new Response(comparisonMarkdown(doc.comparison, doc), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
};
