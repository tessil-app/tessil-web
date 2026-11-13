import { describe, expect, it } from "bun:test";
import { buildReceiptText, depositReference } from "./receipt";

describe("deposit reference", () => {
  it("is short, readable and the same for both sides", async () => {
    const a = await depositReference("V1StGXR8_Z5jdHi6B-myT");
    expect(a).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}$/);
    expect(await depositReference("V1StGXR8_Z5jdHi6B-myT")).toBe(a);
    expect(await depositReference("V1StGXR8_Z5jdHi6B-myU")).not.toBe(a);
  });

  it("does not contain the deposit's ID", async () => {
    const id = "ABCDEF12_Z5jdHi6B-myT";
    expect(await depositReference(id)).not.toContain(id.slice(0, 4));
  });
});

describe("receipt text", () => {
  const base = {
    portalTitle: "Administratiekantoor Jansen",
    reference: "7F3A-91C2",
    at: new Date("2026-11-12T14:30:00Z"),
    note: "Stukken 2026",
    files: [
      { name: "jaaropgave.pdf", size: "120 KB" },
      { name: "id-kopie.jpg", size: "2.1 MB" },
    ],
  };

  it("gives the sender a Dutch confirmation with everything they need to quote", () => {
    const text = buildReceiptText({ ...base, kind: "sent", locale: "nl" });
    expect(text).toContain("Verzendbevestiging");
    expect(text).toContain("Verstuurd naar: Administratiekantoor Jansen");
    expect(text).toContain("Referentie: 7F3A-91C2");
    expect(text).toContain("Opmerking: Stukken 2026");
    expect(text).toContain("Bestanden (2):");
    expect(text).toContain("  - jaaropgave.pdf (120 KB)");
    expect(text).toContain("12 november 2026");
  });

  it("gives the receiver a record that says when the files go", () => {
    const text = buildReceiptText({
      ...base,
      kind: "received",
      locale: "en",
      note: null,
      deletedOn: new Date("2026-12-12T14:30:00Z"),
    });
    expect(text).toContain("Record of files received");
    expect(text).toContain("Portal: Administratiekantoor Jansen");
    expect(text).toContain("Deleted automatically on: 12 December 2026");
    expect(text).not.toContain("Note:");
    expect(text).toContain("Keep your own copy");
  });
});
