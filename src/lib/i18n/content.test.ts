import { describe, expect, it } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Long-read pages keep each language in src/routes/<page>/content. The
// versions must have the same shape: same headings, list items, links and
// conditions, so a change to one shows up as a failure until the other follows.
const ROUTES = join(import.meta.dir, "../../routes");

function shape(source: string) {
  const count = (re: RegExp) => (source.match(re) ?? []).length;
  return {
    h2: count(/<h2\b/g),
    h3: count(/<h3\b/g),
    li: count(/<li\b/g),
    links: count(/<a\b/g),
    conditions: count(/\{#if\b/g),
    ids: [...source.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]),
  };
}

function contentDirs(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (!e.isDirectory()) return [];
    const path = join(dir, e.name);
    return e.name === "content" ? [path] : contentDirs(path);
  });
}

describe("long-read pages in each language", () => {
  const dirs = contentDirs(ROUTES);

  it("finds the pages", () => {
    expect(dirs.length).toBeGreaterThan(0);
  });

  for (const dir of dirs) {
    it(`${dir.slice(ROUTES.length + 1)} has the same shape in English and Dutch`, () => {
      const en = join(dir, "en.svelte");
      const nl = join(dir, "nl.svelte");
      expect(existsSync(en) && existsSync(nl)).toBe(true);
      expect(shape(readFileSync(nl, "utf8"))).toEqual(shape(readFileSync(en, "utf8")));
    });
  }
});
