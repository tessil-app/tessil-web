// Records the short film on /forms: the real editor at /forms/try, driven
// step by step, one screenshot per frame. Run it again when the editor
// changes its looks.
//
//   VITE_FORMS_ANNOUNCED=true bun run dev      (in another terminal)
//   bun run scripts/record-forms-film.ts
//
// Needs Google Chrome and ffmpeg. Writes static/featured/forms-editor.mp4
// and its poster.

import { mkdir, rm } from "node:fs/promises";

const SITE = process.env.SITE ?? "http://localhost:5173";
const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const FPS = 15;
const WIDTH = 1280;
const HEIGHT = 800;
const work = `${import.meta.dir}/../.film`;
const out = `${import.meta.dir}/../static/featured`;

await rm(work, { recursive: true, force: true });
await mkdir(`${work}/frames`, { recursive: true });

const chrome = Bun.spawn(
  [CHROME, "--headless=new", "--remote-debugging-port=9335", `--user-data-dir=${work}/profile`, "--hide-scrollbars", "about:blank"],
  { stdout: "ignore", stderr: "ignore" },
);
await Bun.sleep(1500);
const targets = (await (await fetch("http://localhost:9335/json")).json()) as { type: string; webSocketDebuggerUrl: string }[];
const ws = new WebSocket(targets.find((t) => t.type === "page")!.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let calls = 0;
const waiting = new Map<number, (v: any) => void>();
ws.onmessage = (m) => {
  const d = JSON.parse(m.data as string);
  if (d.id && waiting.has(d.id)) waiting.get(d.id)!(d.result ?? d.error);
};
const send = (method: string, params: object = {}) =>
  new Promise<any>((resolve) => {
    const id = ++calls;
    waiting.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });
const js = async (expression: string) =>
  (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result?.value;

// ─── frames ─────────────────────────────────────────────────────────────────

let frames = 0;
async function frame(count = 1) {
  for (let i = 0; i < count; i++) {
    const started = Date.now();
    const shot = await send("Page.captureScreenshot", { format: "jpeg", quality: 92 });
    await Bun.write(`${work}/frames/${String(frames++).padStart(5, "0")}.jpg`, Buffer.from(shot.data, "base64"));
    // Real time passes between frames, so the page's own transitions show.
    await Bun.sleep(Math.max(0, 1000 / FPS - (Date.now() - started)));
  }
}
const hold = (seconds: number) => frame(Math.round(seconds * FPS));

// ─── a pointer, since a headless browser draws none ─────────────────────────

let at = { x: WIDTH / 2, y: HEIGHT / 2 };
async function addPointer() {
  await js(`(() => {
    const p = document.createElement("div");
    p.id = "film-pointer";
    p.style.cssText = "position:fixed;left:0;top:0;z-index:99999;pointer-events:none;width:22px;height:22px;transform:translate(${at.x}px,${at.y}px)";
    p.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M5 3l14 8.5-6.2 1.3 3.6 6.4-2.6 1.5-3.6-6.5L5 19z" fill="#111" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>';
    document.body.appendChild(p);
  })()`);
}
async function centre(selector: string): Promise<{ x: number; y: number }> {
  const box = await js(`(() => {
    const el = ${selector};
    if (!el) return null;
    el.scrollIntoView({ block: "nearest" });
    const r = el.getBoundingClientRect();
    return { x: r.left + Math.min(r.width / 2, 120), y: r.top + r.height / 2 };
  })()`);
  if (!box) throw new Error(`Not on the page: ${selector}`);
  return box;
}
async function glide(to: { x: number; y: number }) {
  const from = at;
  const steps = Math.max(5, Math.round(Math.hypot(to.x - from.x, to.y - from.y) / 55));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const eased = t * t * (3 - 2 * t);
    const x = from.x + (to.x - from.x) * eased;
    const y = from.y + (to.y - from.y) * eased;
    await js(`document.getElementById("film-pointer").style.transform = "translate(${x}px,${y}px)"`);
    await frame();
  }
  at = to;
}
async function click(selector: string) {
  const to = await centre(selector);
  await glide(to);
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: to.x, y: to.y });
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: to.x, y: to.y, button: "left", clickCount: 1 });
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: to.x, y: to.y, button: "left", clickCount: 1 });
  await frame(4);
}
async function type(text: string) {
  for (const char of text) {
    await send("Input.insertText", { text: char });
    await frame(char === " " ? 2 : 1);
  }
  await frame(5);
}
const button = (label: string, scope = "document") =>
  `[...${scope}.querySelectorAll("button,[role=menuitem],a")].find((b) => (b.getAttribute("aria-label") || b.textContent || "").trim().startsWith(${JSON.stringify(label)}) && b.getClientRects().length > 0)`;

// ─── the film ───────────────────────────────────────────────────────────────

await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: HEIGHT, deviceScaleFactor: 2, mobile: false });
await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }] });

// Start from a form with two questions, so there is something to add to.
await send("Page.navigate", { url: `${SITE}/forms/try` });
await Bun.sleep(2500);
await js(`localStorage.setItem("tessil:form-tryout", JSON.stringify({
  title: "New client intake",
  message: "A few questions before our first call. It takes about two minutes.",
  thanks: "Thank you. We will be in touch within two working days.",
  questions: [
    { id: "film01", type: "short", label: "Your name", required: true },
    { id: "film02", type: "choice", label: "Are you here for yourself or a business?", options: ["Myself", "A business"], required: true },
  ],
}))`);
await send("Page.navigate", { url: `${SITE}/forms/try` });
await Bun.sleep(3500);
await addPointer();
await hold(1.2);

// Add a long question and write it.
await click(button("Add question"));
await click(button("Long answer"));
await type("What can we help you with?");

// Add a file question.
await click(button("Add question"));
await click(button("File upload"));
await type("A copy of your ID");
await hold(0.6);

// Fill it in as a visitor would.
await click(button("Try it"));
await hold(0.8);
const preview = `document.querySelector("form[novalidate]")`;
await click(`${preview}.querySelector("input[type=text]")`);
await type("Anna de Vries");
await click(`${preview}.querySelectorAll("input[type=radio]")[1]`);
await click(`${preview}.querySelector("textarea")`);
await type("Setting up a small design studio.");
await hold(0.5);
await click(`[...${preview}.querySelectorAll("button[type=submit]")].at(-1)`);
await hold(2.4);

await js(`localStorage.removeItem("tessil:form-tryout")`);
chrome.kill();

// ─── the files ──────────────────────────────────────────────────────────────

await mkdir(out, { recursive: true });
const ffmpeg = (args: string[]) => Bun.spawn(["ffmpeg", "-y", "-loglevel", "error", ...args], { stdout: "inherit", stderr: "inherit" }).exited;
await ffmpeg([
  "-framerate", String(FPS), "-i", `${work}/frames/%05d.jpg`,
  "-vf", "scale=1600:-2:flags=lanczos", "-c:v", "libx264", "-preset", "slow", "-crf", "30",
  "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", `${out}/forms-editor.mp4`,
]);
await ffmpeg(["-i", `${work}/frames/00000.jpg`, "-vf", "scale=1600:-2:flags=lanczos", "-q:v", "4", `${out}/forms-editor.jpg`]);
await rm(work, { recursive: true, force: true });
console.log(`${frames} frames, ${(frames / FPS).toFixed(1)} s`);
