import { describe, expect, it } from "bun:test";
import { decodeDepositFileName, encodeDepositFileName } from "./deposit";
import { coverageOf } from "./deposits";
import {
  CHECKLIST_MAX_ITEMS,
  newChecklistItemId,
  openPortalBundle,
  sealPortalBundle,
} from "./keys";

const ECDH = { name: "ECDH", namedCurve: "P-256" } as const;
async function publicKey(): Promise<Uint8Array> {
  const pair = await crypto.subtle.generateKey(ECDH, true, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
}

describe("the checklist in a portal's bundle", () => {
  it("round-trips, encrypted, without changing the link key", async () => {
    const linkKey = crypto.getRandomValues(new Uint8Array(32));
    const checklist = [
      { id: "abc123", label: "Kopie van je ID" },
      { id: "def456", label: "Jaaropgave 2025" },
    ];
    const bundle = await sealPortalBundle("p", linkKey, {
      publicKey: await publicKey(),
      title: "T",
      keyVersion: 1,
      checklist,
    });
    expect(new TextDecoder().decode(bundle)).not.toContain("Jaaropgave");
    expect((await openPortalBundle("p", linkKey, bundle))?.checklist).toEqual(checklist);
  });

  it("is absent when nothing is asked for", async () => {
    const linkKey = crypto.getRandomValues(new Uint8Array(32));
    const bundle = await sealPortalBundle("p", linkKey, {
      publicKey: await publicKey(),
      title: "T",
      keyVersion: 1,
      checklist: [],
    });
    expect((await openPortalBundle("p", linkKey, bundle))?.checklist).toBeUndefined();
  });

  it("drops malformed, duplicate and surplus items", async () => {
    const linkKey = crypto.getRandomValues(new Uint8Array(32));
    const many = Array.from({ length: 30 }, (_, i) => ({
      id: `item${String(i).padStart(2, "0")}`,
      label: `Item ${i}`,
    }));
    const bundle = await sealPortalBundle("p", linkKey, {
      publicKey: await publicKey(),
      title: "T",
      keyVersion: 1,
      checklist: [
        { id: "abc123", label: "  Good  " },
        { id: "abc123", label: "Duplicate id" },
        { id: "BAD ID", label: "Bad id" },
        { id: "emptyl", label: "   " },
        { id: "longla", label: "x".repeat(200) },
        ...many,
      ],
    });
    const opened = (await openPortalBundle("p", linkKey, bundle))!.checklist!;
    expect(opened[0]).toEqual({ id: "abc123", label: "Good" });
    expect(opened.filter((i) => i.id === "abc123")).toHaveLength(1);
    expect(opened.some((i) => i.label === "Bad id" || i.label === "")).toBe(false);
    expect(opened.find((i) => i.id === "longla")!.label).toHaveLength(80);
    expect(opened.length).toBeLessThanOrEqual(CHECKLIST_MAX_ITEMS);
  });

  it("makes item IDs of the expected shape", () => {
    const ids = new Set(Array.from({ length: 100 }, newChecklistItemId));
    expect(ids.size).toBe(100);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]{6}$/);
  });
});

describe("tagging a file with the item it answers", () => {
  it("round-trips the item and the name", () => {
    const stored = encodeDepositFileName("jaaropgave 2025.pdf", "def456");
    expect(decodeDepositFileName(stored)).toEqual({ name: "jaaropgave 2025.pdf", itemId: "def456" });
  });

  it("leaves an untagged name exactly as it was", () => {
    expect(encodeDepositFileName("notes.txt", null)).toBe("notes.txt");
    expect(decodeDepositFileName("notes.txt")).toEqual({ name: "notes.txt", itemId: null });
  });

  it("is not fooled by a file name that looks like a tag", () => {
    // Six lowercase characters at the start of a real name, no separator.
    expect(decodeDepositFileName("abc123-report.pdf")).toEqual({ name: "abc123-report.pdf", itemId: null });
    // A separator smuggled into a name is stripped before tagging.
    const stored = encodeDepositFileName("zzzzzz\u001fevil.pdf", "abc123");
    expect(decodeDepositFileName(stored)).toEqual({ name: "zzzzzzevil.pdf", itemId: "abc123" });
    const untagged = encodeDepositFileName("zzzzzz\u001fevil.pdf", null);
    expect(decodeDepositFileName(untagged).itemId).toBeNull();
  });
});

describe("what a delivery covers", () => {
  const checklist = [
    { id: "abc123", label: "ID" },
    { id: "def456", label: "Jaaropgave" },
    { id: "ghi789", label: "Hypotheekoverzicht" },
  ];

  it("splits the list into provided and missing", () => {
    const coverage = coverageOf(checklist, [
      { itemId: "def456" },
      { itemId: "def456" },
      { itemId: null },
      { itemId: "abc123" },
    ]);
    expect(coverage.provided.map((i) => i.id)).toEqual(["abc123", "def456"]);
    expect(coverage.missing.map((i) => i.id)).toEqual(["ghi789"]);
  });

  it("ignores files tagged for an item that is no longer asked for", () => {
    const coverage = coverageOf(checklist, [{ itemId: "old000" }]);
    expect(coverage.provided).toHaveLength(0);
    expect(coverage.missing).toHaveLength(3);
  });

  it("has nothing missing when nothing is asked for", () => {
    expect(coverageOf([], [{ itemId: null }])).toEqual({ provided: [], missing: [] });
  });
});
