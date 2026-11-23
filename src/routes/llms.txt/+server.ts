// An index of the site for AI agents (llmstxt.org), prerendered at build.
import { llmsTxt } from "$lib/seo/agentText";

export const prerender = true;

export function GET() {
  return new Response(llmsTxt(), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
