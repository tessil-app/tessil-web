// Regenerate every favicon and OG variant from canonical brand SVGs.
// Run with: bun run brand:build
//
// Reads, from static/brand: favicon.svg (follows light and dark), tile.svg
//         (the mark on a rounded paper square), icon.svg (the mark with room
//         around it for app icons), og-image.svg, og-portals.svg, profile.svg, profile-dark.svg
// Writes: static/favicon.svg, favicon-32x32.png, apple-touch-icon.png,
//         icon-192.png, icon-512.png, icon-512-maskable.png,
//         site.webmanifest, og-image.png, og-portals.png, and brand/profile*.png for
//         account avatars elsewhere
//
// favicon.ico is intentionally skipped — modern browsers prefer
// favicon.svg, and the few legacy clients that still want .ico can
// be served the 32x32 PNG renamed.
//
// Rasterizer: @resvg/resvg-js, with Switzer loaded from scripts/fonts so
// og-image.svg renders without the font installed.

import { Resvg } from "@resvg/resvg-js";
import { copyFile, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const staticDir = join(root, "static");
const brand = (name: string) => join(staticDir, "brand", name);
// The rasterizer reads neither woff2 nor a variable weight axis, so these
// are the two weights the social image uses, cut from the same font.
const switzerFonts = ["Regular", "Semibold"].map((w) =>
  join(root, `scripts/fonts/Switzer-${w}.ttf`),
);

async function renderMarkPng(svg: Buffer, size: number, outName: string) {
  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: size } });
  const png = resvg.render().asPng();
  await writeFile(join(staticDir, outName), png);
}

// The homepage painting, inlined so the rasterizer needs no file access. It
// reads no webp, so scripts/og/painting.jpg is a JPEG copy of the featured
// image: replace it when the featured painting changes.
async function paintingDataUri(): Promise<string> {
  const file = await readFile(join(root, "scripts/og/painting.jpg"));
  return `data:image/jpeg;base64,${file.toString("base64")}`;
}

async function renderSocialPng(from: string, outName: string) {
  const svg = (await readFile(brand(from), "utf8")).replace("%PAINTING%", await paintingDataUri());
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: 1200 },
    font: {
      fontFiles: switzerFonts,
      loadSystemFonts: false,
      defaultFontFamily: "Switzer",
    },
  });
  await writeFile(join(staticDir, outName), resvg.render().asPng());
}

async function main() {
  await copyFile(brand("favicon.svg"), join(staticDir, "favicon.svg"));

  // Dark tiles need a light ground wherever the surface behind is unknown.
  const variants: { name: string; size: number; from: string }[] = [
    { name: "favicon-32x32.png", size: 32, from: "tile.svg" },
    { name: "apple-touch-icon.png", size: 180, from: "icon.svg" },
    { name: "icon-192.png", size: 192, from: "icon.svg" },
    { name: "icon-512.png", size: 512, from: "icon.svg" },
    { name: "icon-512-maskable.png", size: 512, from: "icon.svg" },
    { name: "brand/profile.png", size: 1024, from: "profile.svg" },
    { name: "brand/profile-dark.png", size: 1024, from: "profile-dark.svg" },
  ];

  await Promise.all(
    variants.map(async ({ name, size, from }) =>
      renderMarkPng(await readFile(brand(from)), size, name),
    ),
  );

  await renderSocialPng("og-image.svg", "og-image.png");
  await renderSocialPng("og-portals.svg", "og-portals.png");

  const manifest = {
    name: "Tessil",
    short_name: "Tessil",
    description: "End-to-end encrypted file transfer.",
    start_url: "/",
    display: "standalone",
    background_color: "#fafaf7",
    theme_color: "#fafaf7",
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
  console.log("  static/og-portals.png");
  console.log("  static/site.webmanifest");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
