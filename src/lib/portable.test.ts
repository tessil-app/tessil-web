// The code a program outside the browser will share with this website must
// not reach for the browser or the framework. This walks the imports of
// that code and fails when something browser-only slips in.

import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const LIB = resolve(import.meta.dir);

// What the shared client is made of. Everything these import is checked too.
const ENTRIES = [
  "crypto/base64url.ts",
  "crypto/decrypt.ts",
  "crypto/encrypt.ts",
  "crypto/key.ts",
  "crypto/seal.ts",
  "crypto/streaming.ts",
  "crypto/transferPassword.ts",
  "portal/keys.ts",
  "portal/deposit.ts",
  "portal/receipt.ts",
  "upload/multipart.ts",
  "upload/pool.ts",
  "upload/fileTypeCheck.ts",
  "api/client.ts",
];

// Packages the shared client may depend on.
const PACKAGES = ["@hpke/core", "@hpke/common", "hash-wasm"];

// Used behind a `typeof` check, which is how the same file serves both worlds.
const GUARDED = /typeof (window|document|navigator|XMLHttpRequest|localStorage|indexedDB) [!=]==? "undefined"/;
const BROWSER_ONLY = /\b(window|document|navigator|localStorage|sessionStorage|indexedDB)\s*[.[]/;

function importsOf(source: string): string[] {
  return [...source.matchAll(/(?:from|import)\s+["']([^"']+)["']/g)].map((m) => m[1]);
}

function locate(from: string, specifier: string): string | null {
  const base = specifier.startsWith("$lib/")
    ? join(LIB, specifier.slice(5))
    : specifier.startsWith(".")
      ? join(dirname(from), specifier)
      : null;
  if (!base) return null;
  for (const candidate of [base, `${base}.ts`, join(base, "index.ts")]) {
    if (existsSync(candidate) && candidate.endsWith(".ts")) return candidate;
  }
  throw new Error(`cannot find ${specifier} imported by ${from}`);
}

function walk(): Map<string, string> {
  const seen = new Map<string, string>();
  const queue = ENTRIES.map((e) => join(LIB, e));
  while (queue.length > 0) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    const source = readFileSync(file, "utf8");
    seen.set(file, source);
    for (const specifier of importsOf(source)) {
      const next = locate(file, specifier);
      if (next) queue.push(next);
    }
  }
  return seen;
}

describe("the shared client code", () => {
  const files = walk();
  const short = (file: string) => file.slice(LIB.length + 1);

  it("imports nothing from the framework and only the packages it is allowed", () => {
    const problems: string[] = [];
    for (const [file, source] of files) {
      for (const specifier of importsOf(source)) {
        if (specifier.startsWith(".") || specifier.startsWith("$lib/")) continue;
        if (!PACKAGES.includes(specifier)) problems.push(`${short(file)} imports ${specifier}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it("does not touch the browser except behind a typeof check", () => {
    const problems: string[] = [];
    for (const [file, source] of files) {
      const lines = source.split("\n");
      const guarded = lines.some((line) => GUARDED.test(line));
      lines.forEach((line, i) => {
        const code = line.replace(/\/\/.*$/, "").replace(/^\s*\*.*$/, "");
        if (BROWSER_ONLY.test(code) && !guarded) problems.push(`${short(file)}:${i + 1} ${line.trim()}`);
      });
    }
    expect(problems).toEqual([]);
  });

  it("stays the size we think it is", () => {
    // A jump here means a new file was pulled in; look at what and why.
    expect(files.size).toBeLessThanOrEqual(20);
    expect([...files.keys()].map(short).sort()).toContain("vault/keypair.ts");
  });
});
