// Regenerate every favicon variant from the canonical mark SVG.
// Run with: bun run brand:build
//
// Reads:  static/brand/mark.svg
// Writes: static/favicon.svg, apple-touch-icon.png, icon-192.png,
//         icon-512.png, icon-512-maskable.png, favicon-32x32.png,
//         site.webmanifest
//
// favicon.ico is intentionally skipped — modern browsers prefer
// favicon.svg, and legacy clients that still want .ico get served
// the 32x32 PNG renamed. If a true multi-resolution .ico becomes
// important, add the `png-to-ico` dep and a final step here.
//
// Rasterizer: @resvg/resvg-js. Bun.Image is raster-only and can't
// decode SVG; resvg-js is a small, focused Rust-backed rasterizer
// with no other moving parts.

import { Resvg } from "@resvg/resvg-js";
import { copyFile, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "static/brand/mark.svg");
const staticDir = join(root, "static");

async function renderPng(svg: Buffer, size: number, outName: string) {
  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: size } });
  const png = resvg.render().asPng();
  await writeFile(join(staticDir, outName), png);
}

async function main() {
  const svg = await readFile(src);

  await copyFile(src, join(staticDir, "favicon.svg"));

  const variants: { name: string; size: number }[] = [
    { name: "favicon-32x32.png", size: 32 },
    { name: "apple-touch-icon.png", size: 180 },
    { name: "icon-192.png", size: 192 },
    { name: "icon-512.png", size: 512 },
    { name: "icon-512-maskable.png", size: 512 },
  ];

  await Promise.all(
    variants.map(({ name, size }) => renderPng(svg, size, name)),
  );

  const manifest = {
    name: "Tessil",
    short_name: "Tessil",
    description: "End-to-end encrypted file transfer.",
    start_url: "/",
    display: "standalone",
    background_color: "#fafaf7",
    theme_color: "#1B4DFF",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };

  await writeFile(
    join(staticDir, "site.webmanifest"),
    JSON.stringify(manifest, null, 2),
  );

  console.log("Brand assets regenerated:");
  console.log("  static/favicon.svg");
  for (const { name } of variants) console.log(`  static/${name}`);
  console.log("  static/site.webmanifest");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
