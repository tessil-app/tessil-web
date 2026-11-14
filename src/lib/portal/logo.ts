// A portal's logo: picked by the owner, shrunk in their browser and put in
// the encrypted bundle. The server never sees it.

import { LOGO_TYPES, PORTAL_LOGO_MAX_BYTES, type LogoType, type PortalLogo } from "./keys";

// Twice the size it is shown at, for sharp screens.
const MAX_WIDTH = 440;
const MAX_HEIGHT = 112;

export class LogoError extends Error {
  constructor(readonly code: "type" | "unreadable" | "too_large") {
    super(
      code === "type"
        ? "Choose a PNG, JPG or WebP image."
        : code === "unreadable"
          ? "That image could not be read. Try another file."
          : "That image is too detailed to store as a logo. Try a simpler one.",
    );
    this.name = "LogoError";
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

async function toBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

/** Shrinks an image to logo size and re-encodes it, dropping any metadata. */
export async function prepareLogo(file: File): Promise<PortalLogo> {
  if (!LOGO_TYPES.includes(file.type as LogoType)) throw new LogoError("type");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new LogoError("unreadable");
  }
  try {
    let scale = Math.min(1, MAX_WIDTH / bitmap.width, MAX_HEIGHT / bitmap.height);
    // Smaller and smaller until it fits. WebP first; PNG where a browser
    // cannot write WebP and quietly hands back something else.
    for (let attempt = 0; attempt < 6; attempt++) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new LogoError("unreadable");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      for (const [type, quality] of [
        ["image/webp", 0.9],
        ["image/webp", 0.75],
        ["image/png", undefined],
      ] as const) {
        const blob = await toBlob(canvas, type, quality);
        if (blob && blob.type === type && blob.size <= PORTAL_LOGO_MAX_BYTES) {
          return { type, data: await toBase64(blob) };
        }
      }
      scale *= 0.75;
    }
    throw new LogoError("too_large");
  } finally {
    bitmap.close();
  }
}
