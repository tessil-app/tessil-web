// Regenerate every favicon and OG variant from canonical brand SVGs.
// Run with: bun run brand:build
//
// Reads:  static/brand/mark.svg, static/brand/og-image.svg
// Writes: static/favicon.svg, favicon-32x32.png, apple-touch-icon.png,
//         icon-192.png, icon-512.png, icon-512-maskable.png,
//         site.webmanifest, og-image.png
//
// favicon.ico is intentionally skipped — modern browsers prefer
// favicon.svg, and the few legacy clients that still want .ico can
// be served the 32x32 PNG renamed.
//
// Rasterizer: @resvg/resvg-js. Switzer-Variable.woff2 is loaded as
// the default font family so og-image.svg renders correctly without
// system Switzer installed.

import { Resvg } from "@resvg/resvg-js";
import { copyFile, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const staticDir = join(root, "static");
const markSrc = join(staticDir, "brand/mark.svg");
const ogSrc = join(staticDir, "brand/og-image.svg");
const switzerFont = join(staticDir, "fonts/Switzer-Variable.woff2");

async function renderMarkPng(svg: Buffer, size: number, outName: string) {
  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: size } });
  const png = resvg.render().asPng();
  await writeFile(join(staticDir, outName), png);
}

async function renderOgPng(svg: Buffer) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: 1200 },
    font: {
      fontFiles: [switzerFont],
      loadSystemFonts: false,
      defaultFontFamily: "Switzer",
    },
  });
  const png = resvg.render().asPng();
  await writeFile(join(staticDir, "og-image.png"), png);
}

async function main() {
  const mark = await readFile(markSrc);

  await copyFile(markSrc, join(staticDir, "favicon.svg"));

  const variants: { name: string; size: number }[] = [
    { name: "favicon-32x32.png", size: 32 },
    { name: "apple-touch-icon.png", size: 180 },
    { name: "icon-192.png", size: 192 },
    { name: "icon-512.png", size: 512 },
    { name: "icon-512-maskable.png", size: 512 },
  ];

  await Promise.all(
    variants.map(({ name, size }) => renderMarkPng(mark, size, name)),
  );

  const og = await readFile(ogSrc);
  await renderOgPng(og);

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
  console.log("  static/og-image.png");
  console.log("  static/site.webmanifest");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
