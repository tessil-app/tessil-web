// Everything llms.txt points at, in one file.
import { llmsFullTxt } from "$lib/seo/agentText";

export const prerender = true;

export function GET() {
  return new Response(llmsFullTxt(), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
