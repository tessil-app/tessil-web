import { describe, expect, it } from "bun:test";
import { allComparisonDocs, comparisonMarkdown, comparisonMarkdownPath, llmsFullTxt, llmsTxt } from "./agentText";

describe("text for AI agents", () => {
  it("lists every comparison's Markdown copy in llms.txt", () => {
    const index = llmsTxt();
    for (const d of allComparisonDocs()) expect(index).toContain(comparisonMarkdownPath(d.slug));
  });

  it("gives each comparison its table, both sides of the choice and its FAQ", () => {
    for (const d of allComparisonDocs()) {
      const md = comparisonMarkdown(d.comparison, d);
      expect(md.startsWith(`# ${d.comparison.heading}`)).toBe(true);
      expect(md).toContain(`| Tessil | ${d.comparison.competitor} |`);
      for (const row of d.comparison.rows) expect(md).toContain(row.label);
      for (const f of d.comparison.faq) expect(md).toContain(f.q);
    }
  });

  it("nests every comparison one level down in llms-full.txt", () => {
    const full = llmsFullTxt();
    expect(full.match(/^# /gm)).toHaveLength(1);
    expect(full).toContain(`## ${allComparisonDocs()[0].comparison.heading}`);
  });
});
