import { describe, expect, it } from "bun:test";
import { comparisonGroups, untranslatedComparison, valueNl } from "./plans";

describe("the plan comparison in Dutch", () => {
  it("covers the groups behind launch flags too", () => {
    const titles = comparisonGroups({ forms: true, accessKeys: true }).map((g) => g.title);
    expect(titles).toContain("Asking through forms");
    expect(titles).toContain("From a terminal or an AI assistant");
  });

  it("has Dutch for every title, label and note", () => {
    expect(untranslatedComparison()).toEqual([]);
  });

  it("keeps the numbers and puts days in Dutch", () => {
    expect(valueNl("30 days")).toBe("30 dagen");
    expect(valueNl("1 day")).toBe("1 dag");
    expect(valueNl("10 GB")).toBe("10 GB");
    expect(valueNl(true)).toBe(true);
  });
});
