import { describe, expect, it } from "bun:test";

import { LOCALIZED } from "$lib/i18n/routes.js";
import { comparisons as shown } from "./comparisons";
import { comparisonsNl as shownNl } from "./comparisons.nl";
import { receivingComparisons } from "./receiving";
import { receivingComparisonsNl } from "./receiving.nl";
import { CHOOSE } from "./choose";

// Every comparison, whichever products the build has announced.
const comparisons = [...shown.filter((c) => !c.kind || c.kind === "send"), ...receivingComparisons];
const comparisonsNl = [...shownNl.filter((c) => !c.kind || c.kind === "send"), ...receivingComparisonsNl];

describe("comparisons", () => {
  it("says when to pick each side, in both languages", () => {
    for (const c of comparisons) {
      for (const locale of ["en", "nl"] as const) {
        const choose = CHOOSE[c.slug]?.[locale];
        expect(choose?.them.length ?? 0).toBeGreaterThan(0);
        expect(choose?.tessil.length ?? 0).toBeGreaterThan(0);
      }
    }
    expect(Object.keys(CHOOSE).sort()).toEqual(comparisons.map((c) => c.slug).sort());
  });

  it("includes the portal and form comparisons", () => {
    expect(comparisons.some((c) => c.kind === "portal")).toBe(true);
    expect(comparisons.some((c) => c.kind === "form")).toBe(true);
  });

  it("gives every Dutch comparison the address routes.js lists", () => {
    for (const nl of comparisonsNl) {
      expect(comparisons.some((c) => c.slug === nl.enSlug)).toBe(true);
      expect(LOCALIZED[`/compare/${nl.enSlug}` as keyof typeof LOCALIZED]?.nl).toBe(`/nl/vergelijken/${nl.slug}`);
    }
  });

  it("has a Dutch version of every comparison", () => {
    for (const c of comparisons) {
      expect(comparisonsNl.some((nl) => nl.enSlug === c.slug)).toBe(true);
    }
  });

  it("keeps the same rows, in the same order, in both languages", () => {
    for (const nl of comparisonsNl) {
      const en = comparisons.find((c) => c.slug === nl.enSlug)!;
      expect(nl.rows.map((r) => [r.tessil === true || r.tessil === false ? r.tessil : "text", r.competitor === true || r.competitor === false ? r.competitor : "text"])).toEqual(
        en.rows.map((r) => [r.tessil === true || r.tessil === false ? r.tessil : "text", r.competitor === true || r.competitor === false ? r.competitor : "text"]),
      );
      expect(nl.faq.length).toBe(en.faq.length);
      expect(nl.kind).toBe(en.kind);
    }
  });
});
