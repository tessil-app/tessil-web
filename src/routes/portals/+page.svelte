<script lang="ts">
  // The page that introduces portals. The dark one, and more playful than
  // the rest on purpose: a portal a visitor can drop a file into. The claims
  // are the same ones /security makes.

  import Button from "$lib/components/Button.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import SiteFooter from "$lib/components/SiteFooter.svelte";
  import CompareLinks from "$lib/components/CompareLinks.svelte";
  import TextLink from "$lib/components/TextLink.svelte";
  import { encryptFilename } from "$lib/crypto/encrypt";
  import { generateKey } from "$lib/crypto/key";
  import { encryptFileStream } from "$lib/crypto/streaming";
  import { depositReference } from "$lib/portal/receipt";
  import { auth } from "$lib/stores/auth.svelte";
  import { page } from "$app/state";
  import { localeFromPath } from "$lib/i18n/locale";
  import { hrefFor } from "$lib/i18n/paths";
  import { portalsMessages } from "$lib/i18n/messages/portals";
  import { formatSize } from "$lib/utils";
  import IconCheckRegular from "phosphor-icons-svelte/IconCheckRegular.svelte";

  const locale = $derived(localeFromPath(page.url.pathname));
  const t = $derived(portalsMessages[locale]);
  const href = (canonical: string) => hrefFor(canonical, locale);

  // Files on their way in: where each starts (in % of the stage), how it
  // is turned, and when it sets off.
  const files = [
    { label: "PDF", x: -46, y: -34, r: -18, d: 0 },
    { label: "JPG", x: 44, y: -40, r: 14, d: 0.7 },
    { label: "ZIP", x: -50, y: 22, r: 22, d: 1.4 },
    { label: "DOC", x: 48, y: 30, r: -12, d: 2.1 },
    { label: "PNG", x: -8, y: -50, r: 8, d: 2.8 },
    { label: "MOV", x: 10, y: 50, r: -24, d: 3.5 },
    { label: "XLS", x: -40, y: 46, r: 30, d: 4.2 },
    { label: "TXT", x: 36, y: -8, r: -6, d: 4.9 },
  ];

  // ─── a file of the visitor's own, through the portal ──────────────────────
  // Dropped or picked, it is encrypted here with the code a real portal
  // uses, and both sides of the result are shown. Nothing leaves the page.
  interface Passed {
    name: string;
    size: string;
    reference: string;
    /** The name as we would store it. */
    sealedName: string;
    /** The first bytes as we would store them. */
    hex: string;
  }

  let picker = $state<HTMLInputElement | null>(null);
  let hovering = $state(false);
  let falling = $state<string | null>(null);
  let passed = $state<Passed | null>(null);

  async function seal(file: File): Promise<Passed> {
    const key = await generateKey();
    const [{ encryptedName }, bytes, reference] = await Promise.all([
      encryptFilename(file.name, key),
      // The start of the file is enough to show; a large file is not read whole.
      new Response(encryptFileStream(new File([file.slice(0, 65536)], file.name), key).stream)
        .arrayBuffer()
        .then((b) => new Uint8Array(b)),
      depositReference(crypto.randomUUID()),
    ]);
    return {
      name: file.name,
      size: formatSize(file.size),
      reference,
      sealedName: encryptedName,
      hex: Array.from(bytes.slice(0, 72), (b) => b.toString(16).padStart(2, "0")).join(" "),
    };
  }

  async function take(file: File | undefined) {
    if (!file || falling) return;
    hovering = false;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    falling = file.name;
    try {
      // The result waits for the file to have gone in.
      const [result] = await Promise.all([seal(file), new Promise((r) => setTimeout(r, reduced ? 0 : 900))]);
      passed = result;
    } catch {
      passed = null;
    } finally {
      falling = null;
    }
  }

  function sample() {
    void take(new File([t.demo.sampleText.repeat(400)], t.demo.sampleName, { type: "application/pdf" }));
  }

</script>

<Seo
  title={t.title}
  description={t.description}
  path="/portals"
  product
/>

<!-- A file dropped beside the portal should not make the browser open it. -->
<svelte:window ondragover={(e) => e.preventDefault()} ondrop={(e) => e.preventDefault()} />

<!-- Pulled up behind the header, which turns dark while this is under it. -->
<div class="hero -mt-16" data-header-tone="dark">
  <div class="mx-auto flex min-h-[100svh] max-w-6xl flex-col items-center justify-center gap-4 px-4 sm:px-6 pt-24 pb-10 text-center sm:gap-5">
    <h1 class="text-6xl font-semibold leading-none text-white sm:text-7xl lg:text-8xl" style="letter-spacing: -0.045em">
      {t.heading}
    </h1>
    <p class="max-w-md text-base text-white/70 sm:text-lg">
      {t.sub}
    </p>

    <div class="grid w-full items-center gap-x-8 gap-y-6 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
      <!-- Our side of what went in. -->
      <div class="side order-2 lg:order-1 lg:text-right" class:shown={passed !== null} aria-live="polite">
        {#if passed}
          <p class="text-sm font-medium text-white">{t.demo.weHold}</p>
          <dl class="mt-3 space-y-2.5 text-sm">
            <div>
              <dt class="text-white/50">{t.demo.itsName}</dt>
              <dd class="sealed truncate">{passed.sealedName}</dd>
            </div>
            <div>
              <dt class="text-white/50">{t.demo.whatIsIn}</dt>
              <dd class="sealed line-clamp-3">{passed.hex}</dd>
            </div>
            <div>
              <dt class="text-white/50">{t.demo.whatWeRead}</dt>
              <dd class="text-white/85">{t.demo.sizeJustNow(passed.size)}</dd>
            </div>
          </dl>
        {/if}
      </div>

      <div class="order-1 flex flex-col items-center lg:order-2">
        <input
          bind:this={picker}
          type="file"
          class="hidden"
          onchange={(e) => {
            void take(e.currentTarget.files?.[0]);
            e.currentTarget.value = "";
          }}
        />
        <button
          type="button"
          class="stage"
          class:open={hovering}
          class:busy={falling !== null}
          aria-label={t.demo.stageLabel}
          onclick={() => picker?.click()}
          ondragenter={() => (hovering = true)}
          ondragleave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) hovering = false;
          }}
          ondrop={(e) => {
            e.preventDefault();
            void take(e.dataTransfer?.files?.[0]);
          }}
        >
          <span class="glow"></span>
          <span class="ring ring-a"></span>
          <span class="ring ring-b"></span>
          <span class="ring ring-c"></span>
          <span class="depth"></span>
          {#each files as f (f.label)}
            <span class="file" style="--x: {f.x}; --y: {f.y}; --r: {f.r}deg; --d: {f.d}s">
              {f.label}
            </span>
          {/each}
          {#if falling}
            <span class="dropped">{falling}</span>
          {/if}
        </button>
      </div>

      <!-- The owner's side of the same file. -->
      <div class="side order-3 lg:text-left" class:shown={passed !== null} aria-live="polite">
        {#if passed}
          <p class="text-sm font-medium text-white">{t.demo.youGet}</p>
          <div class="mt-3 space-y-2 rounded-xl border border-white/15 bg-white/5 p-4 text-left text-sm">
            <p class="flex items-baseline justify-between gap-3">
              <span class="font-mono text-white">{passed.reference}</span>
              <span class="text-white/50">{t.demo.justNow}</span>
            </p>
            <p class="truncate text-white/85">{passed.name}</p>
            <p class="text-white/50">{t.demo.kept(passed.size)}</p>
          </div>
          <p class="mt-2 text-sm text-white/50">{t.demo.vault}</p>
        {/if}
      </div>
    </div>

    <p class="text-sm text-white/60">
      {#if passed}
        {t.demo.done}
      {:else}
        {t.demo.prompt}
      {/if}
      <button type="button" class="text-white underline underline-offset-4 hover:cursor-pointer" onclick={sample}>
        {passed ? t.demo.another : t.demo.sample}
      </button>
    </p>
  </div>
</div>

<div class="bg-background">
  <section class="mx-auto max-w-6xl px-4 sm:px-6 py-24 sm:py-32">
    <p class="text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl sm:leading-[1.1]">
      {t.before}
      <span class="text-muted-foreground">{t.beforeAfter}</span>
    </p>

    <ol class="mt-16 grid gap-10 md:grid-cols-3">
      {#each t.sequence as step, i (step.title)}
        <li class="space-y-3 border-t border-border pt-5">
          <p class="text-sm font-medium tabular-nums text-primary">{i + 1}</p>
          <h2 class="text-xl font-semibold tracking-tight text-foreground">{step.title}</h2>
          <p class="text-base leading-relaxed text-muted-foreground">{step.text}</p>
        </li>
      {/each}
    </ol>
  </section>
</div>

<div class="hero" data-header-tone="dark">
  <section class="mx-auto max-w-6xl px-4 sm:px-6 py-24 text-center sm:py-32">
    <h2 class="text-4xl font-semibold leading-none text-white sm:text-7xl" style="letter-spacing: -0.035em">
      {t.seeNothing}
    </h2>
    <p class="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-white/70">
      {t.seeNothingBody}
    </p>
    <p class="mt-6 text-sm text-white/60">
      {t.takeWord}
      <a href="{href('/security')}#portals" class="text-white underline underline-offset-4">{t.readHow}</a>
      {t.or}
      <a href={href("/verify")} class="text-white underline underline-offset-4">{t.checkYourself}</a>.
    </p>
  </section>
</div>

<div class="bg-background">
  <section class="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 py-24 sm:py-32 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-center">
    <div class="space-y-5">
      <h2 class="text-3xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl">
        {t.askOnce}<br />{t.watchArrive}
      </h2>
      <p class="max-w-xl text-lg leading-relaxed text-muted-foreground">
        {t.askBody}
      </p>
      <ul class="space-y-2.5 text-foreground">
        {#each t.askPoints as point (point)}
          <li class="flex items-center gap-2.5">
            <IconCheckRegular class="size-4 shrink-0 text-primary" />
            {point}
          </li>
        {/each}
      </ul>
    </div>

    <!-- What the sender sees. An illustration, not a control. -->
    <div aria-hidden="true" class="space-y-3.5 rounded-2xl border border-border bg-card p-6 shadow-sm">
      <p class="text-xs text-muted-foreground">{t.mock.sendTo}</p>
      <p class="text-xl font-semibold tracking-tight text-foreground">Studio North</p>
      <div class="flex justify-between border-t border-border pt-3.5 text-xs text-muted-foreground">
        <span>{t.mock.needed}</span>
        <span>{t.mock.progress}</span>
      </div>
      {#each [{ label: t.mock.contract, file: t.demo.sampleName }, { label: t.mock.logos, file: "logo.zip" }] as row (row.label)}
        <div class="flex items-center gap-2.5 rounded-md border border-border px-3.5 py-2.5 text-sm">
          <IconCheckRegular class="size-4 shrink-0 text-success-foreground" />
          <span class="flex-1 text-foreground">{row.label}</span>
          <span class="text-xs text-muted-foreground">{row.file}</span>
        </div>
      {/each}
      <div class="flex items-center gap-2.5 rounded-md border border-dashed border-border px-3.5 py-2.5 text-sm text-muted-foreground">
        <span class="size-4 shrink-0 rounded-full border border-dashed border-warning"></span>
        <span class="flex-1">{t.mock.invoice}</span>
        <span class="text-xs font-medium text-foreground">{t.mock.choose}</span>
      </div>
      <div class="rounded-md bg-primary py-2.5 text-center text-sm font-medium text-primary-foreground">
        {t.mock.send}
      </div>
    </div>
  </section>

  <section class="border-t border-border">
    <div class="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
      <div class="max-w-2xl space-y-5">
        <h2 class="text-3xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl">
          {t.yours}
        </h2>
        <p class="text-lg leading-relaxed text-muted-foreground">
          {t.yoursBody}
        </p>
      </div>
      <ul class="mt-12 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {#each t.options as option (option.name)}
          <li class="space-y-2 bg-card p-6">
            <p class="flex items-center gap-2 font-medium text-foreground">
              {option.name}
              {#if option.max}
                <span class="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Max</span>
              {/if}
            </p>
            <p class="text-sm leading-relaxed text-muted-foreground">{option.about}</p>
          </li>
        {/each}
      </ul>
      <p class="mt-6 text-sm text-muted-foreground">
        {t.optionsNote}
      </p>
    </div>
  </section>

  <section class="border-t border-border">
    <div class="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 py-24 text-center sm:py-32">
      <h2 class="text-4xl font-semibold leading-none tracking-tight text-foreground sm:text-6xl">
        {t.open}
      </h2>
      <p class="max-w-lg text-lg text-muted-foreground">
        {t.openBody}
      </p>
      <div class="flex flex-wrap items-center justify-center gap-3">
        {#if auth.user}
          <Button href="/dashboard/portals" fullWidth={false}>{t.yourPortals}</Button>
        {:else}
          <Button href={href("/pricing")} fullWidth={false}>{t.plans}</Button>
          <Button href="/login" variant="secondary" fullWidth={false}>{t.signIn}</Button>
        {/if}
      </div>
      <p class="text-sm text-muted-foreground">
        {t.free}
        <TextLink href={href("/")}>{t.sendSomething}</TextLink>
      </p>
    </div>
  </section>

  <CompareLinks kind="portal" {locale} />

  <SiteFooter />
</div>

<style>
  .hero {
    background: #07080d;
    /* Files start beyond the edge on a phone. */
    overflow: hidden;
  }

  /* ── the portal ─────────────────────────────────────────────────────── */
  /* Sized by what the screen has left after the words, so the hero never scrolls. */
  .stage {
    position: relative;
    display: block;
    width: min(78vw, 28rem, 100svh - 24rem);
    min-width: 11rem;
    aspect-ratio: 1;
    margin: 0.5rem 0;
    flex-shrink: 0;
    border-radius: 50%;
    cursor: pointer;
    transition: transform 250ms cubic-bezier(0.25, 1, 0.5, 1);
  }
  .stage:focus-visible {
    outline: 2px solid #ffffff;
    outline-offset: 0.5rem;
  }
  /* A file is held over it: it opens a little. */
  .stage.open {
    transform: scale(1.06);
  }
  .stage.open .ring,
  .stage.busy .ring {
    animation-duration: 2.5s;
  }
  .stage.open .file {
    animation-play-state: paused;
  }

  /* The visitor's own file, on its way in. */
  .dropped {
    position: absolute;
    left: 50%;
    top: 50%;
    max-width: 70%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding: 0.5rem 0.875rem;
    border-radius: 0.625rem;
    background: #ffffff;
    color: #07080d;
    font-size: 0.875rem;
    font-weight: 600;
    box-shadow: 0 0.75rem 2rem rgba(0, 0, 0, 0.5);
    animation: go-in 900ms cubic-bezier(0.6, 0, 0.9, 0.4) forwards;
  }
  @keyframes go-in {
    0% {
      transform: translate(-50%, -50%) translateY(-46cqw) rotate(-6deg) scale(1);
      opacity: 0;
    }
    20% {
      opacity: 1;
    }
    100% {
      transform: translate(-50%, -50%) rotate(160deg) scale(0.03);
      opacity: 0;
    }
  }

  /* Either side of the portal: empty until a file has been through. */
  .side {
    min-width: 0;
    opacity: 0;
    transform: translateY(0.5rem);
    transition:
      opacity 250ms ease-out,
      transform 250ms ease-out;
  }
  .side.shown {
    opacity: 1;
    transform: none;
  }
  .sealed {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.75rem;
    line-height: 1.6;
    color: #9db4ff;
    overflow-wrap: anywhere;
  }

  .glow,
  .ring,
  .depth {
    position: absolute;
    border-radius: 50%;
  }
  .glow {
    inset: -18%;
    background: radial-gradient(closest-side, rgba(27, 77, 255, 0.5), rgba(27, 77, 255, 0) 70%);
    animation: breathe 5s ease-in-out infinite;
  }
  .ring {
    inset: 14%;
    background: conic-gradient(from 0deg, #1b4dff, #9db4ff, #ffffff, #1b4dff, #0a1f7a, #1b4dff);
    /* Only the rim of the disc shows. */
    mask: radial-gradient(closest-side, transparent 86%, #000 88%);
    -webkit-mask: radial-gradient(closest-side, transparent 86%, #000 88%);
    animation: spin 7s linear infinite;
  }
  .ring-b {
    inset: 19%;
    opacity: 0.55;
    animation-duration: 11s;
    animation-direction: reverse;
  }
  .ring-c {
    inset: 24%;
    opacity: 0.3;
    animation-duration: 16s;
  }
  .depth {
    inset: 21%;
    background: radial-gradient(circle, #000 0%, #04061a 55%, #0c1650 100%);
    box-shadow: inset 0 0 3.5rem rgba(27, 77, 255, 0.55);
  }

  .file {
    position: absolute;
    left: 50%;
    top: 50%;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    width: 2.75rem;
    height: 3.5rem;
    padding-bottom: 0.4rem;
    border-radius: 0.5rem;
    background: #ffffff;
    color: #1b4dff;
    font-size: 0.625rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    box-shadow: 0 0.5rem 1.5rem rgba(0, 0, 0, 0.4);
    opacity: 0;
    animation: drawn-in 5.6s cubic-bezier(0.55, 0, 0.85, 0.35) infinite;
    animation-delay: var(--d);
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  @keyframes breathe {
    50% {
      transform: scale(1.08);
      opacity: 0.8;
    }
  }
  /* From its place at the edge, into the middle, turning and shrinking. */
  @keyframes drawn-in {
    0% {
      transform: translate(-50%, -50%) translate(calc(var(--x) * 1cqw), calc(var(--y) * 1cqw)) rotate(var(--r)) scale(1);
      opacity: 0;
    }
    12%,
    70% {
      opacity: 1;
    }
    100% {
      transform: translate(-50%, -50%) rotate(calc(var(--r) + 200deg)) scale(0.04);
      opacity: 0;
    }
  }
  .stage {
    container-type: inline-size;
  }

  @media (prefers-reduced-motion: reduce) {
    .glow,
    .ring,
    .file {
      animation: none;
    }
    /* Files rest around the portal instead of flying in. */
    .file {
      opacity: 1;
      transform: translate(-50%, -50%) translate(calc(var(--x) * 1cqw), calc(var(--y) * 1cqw)) rotate(var(--r));
    }
    .dropped {
      display: none;
    }
    .stage,
    .side {
      transition: none;
    }
  }
</style>
