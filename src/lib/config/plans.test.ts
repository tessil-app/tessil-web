import { describe, expect, it } from "bun:test";

// Every group shown, including the ones behind launch flags.
process.env.VITE_FORMS_ANNOUNCED = "true";
process.env.VITE_ACCESS_KEYS_ANNOUNCED = "true";
const { COMPARISON, comparisonFor, untranslatedComparison } = await import("./plans");

describe("the plan comparison in Dutch", () => {
  it("has the flagged groups in this test", () => {
    expect(COMPARISON.some((g) => g.title === "Asking through forms")).toBe(true);
    expect(COMPARISON.some((g) => g.title === "From a terminal or an AI assistant")).toBe(true);
  });

  it("has Dutch for every title, label and note", () => {
    expect(untranslatedComparison()).toEqual([]);
  });

  it("keeps the numbers and puts days in Dutch", () => {
    const nl = comparisonFor("nl");
    const row = nl[0].rows.find((r) => r.label === "Hoe lang een link geldig kan blijven");
    expect(row?.values.pro).toBe("30 dagen");
    expect(nl[0].rows[0].values.pro).toBe("10 GB");
  });
});
