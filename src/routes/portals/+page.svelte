<script lang="ts">
  // The page that introduces portals. More playful than the rest of the
  // site on purpose; the claims are the same ones /security makes.

  import Button from "$lib/components/Button.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import SiteFooter from "$lib/components/SiteFooter.svelte";
  import TextLink from "$lib/components/TextLink.svelte";
  import { auth } from "$lib/stores/auth.svelte";
  import IconCheckRegular from "phosphor-icons-svelte/IconCheckRegular.svelte";

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

  const numbers = [
    {
      big: "0",
      unit: "accounts",
      text: "The people sending need none. They open your link, pick their files and press send. From a phone works fine.",
    },
    {
      big: "1",
      unit: "list",
      text: "Say what you need. They see what is still missing, and so do you. No more chasing the third attachment.",
    },
    {
      big: "30",
      unit: "days",
      text: "Then it is gone, automatically. Download what you want to keep. Nothing piles up, here or anywhere.",
    },
  ];

  // Fades a block in the first time it scrolls into view.
  function reveal(node: HTMLElement) {
    if (typeof IntersectionObserver === "undefined") {
      node.dataset.in = "";
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          node.dataset.in = "";
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(node);
    return { destroy: () => observer.disconnect() };
  }
</script>

<Seo
  title="Portals - Tessil"
  description="A link where people send you files that only you can open. Encrypted in their browser, deleted after 30 days, no account needed to send."
  path="/portals"
/>

<div class="hero">
  <div class="mx-auto flex min-h-[calc(100svh-3.5rem)] max-w-7xl flex-col items-center justify-center gap-6 px-4 py-16 text-center sm:px-6">
    <p class="inline-flex items-center gap-2 rounded-full border border-white/15 py-1 pl-1 pr-3.5 text-sm text-white/80">
      <span class="rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">New</span>
      Tessil now works both ways
    </p>
    <h1 class="text-6xl font-semibold leading-none text-white sm:text-8xl lg:text-9xl" style="letter-spacing: -0.045em">
      Portals.
    </h1>
    <p class="max-w-md text-lg text-white/70 sm:text-xl">
      Hand out one link. Files find their way to you, and nobody else.
    </p>

    <div class="stage" aria-hidden="true">
      <div class="glow"></div>
      <div class="ring ring-a"></div>
      <div class="ring ring-b"></div>
      <div class="ring ring-c"></div>
      <div class="depth"></div>
      {#each files as f (f.label)}
        <span
          class="file"
          style="--x: {f.x}; --y: {f.y}; --r: {f.r}deg; --d: {f.d}s"
        >
          {f.label}
        </span>
      {/each}
    </div>

    <p class="text-sm text-white/50">What goes in, only you can take out.</p>
  </div>
</div>

<div class="bg-background">
  <section class="mx-auto max-w-5xl px-4 py-24 sm:px-6 sm:py-32">
    <p use:reveal class="reveal text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl sm:leading-[1.1]">
      Until now you could send files without us seeing them.
      <span class="text-muted-foreground">Now people can send files to you the same way.</span>
    </p>
  </section>

  <section class="mx-auto grid max-w-7xl gap-6 px-4 pb-24 sm:px-6 md:grid-cols-3">
    {#each numbers as n, i (n.unit)}
      <div use:reveal class="reveal rounded-2xl bg-card p-8" style="transition-delay: {i * 80}ms">
        <p class="flex items-baseline gap-2">
          <span class="text-7xl font-semibold leading-none tracking-tighter text-primary sm:text-8xl">{n.big}</span>
          <span class="text-xl font-semibold text-foreground">{n.unit}</span>
        </p>
        <p class="mt-6 text-base leading-relaxed text-muted-foreground">{n.text}</p>
      </div>
    {/each}
  </section>
</div>

<div class="hero">
  <section class="mx-auto max-w-5xl px-4 py-24 text-center sm:px-6 sm:py-32">
    <h2 use:reveal class="reveal text-4xl font-semibold leading-none text-white sm:text-7xl" style="letter-spacing: -0.035em">
      We see nothing. Still.
    </h2>
    <p use:reveal class="reveal mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-white/70">
      Files are encrypted in the sender's browser, with a key that only your browser can
      unlock. It lives in your vault, not on our servers. We cannot read the files, their
      names, the notes people add, what you ask for, or even what you called the portal.
    </p>
    <p use:reveal class="reveal mt-6 text-sm text-white/60">
      Don't take our word for it.
      <a href="/security#portals" class="text-white underline underline-offset-4">Read how it works</a>
      or
      <a href="/verify" class="text-white underline underline-offset-4">check it yourself</a>.
    </p>
  </section>
</div>

<div class="bg-background">
  <section class="mx-auto grid max-w-7xl gap-12 px-4 py-24 sm:px-6 sm:py-32 lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-center">
    <div use:reveal class="reveal space-y-5">
      <h2 class="text-3xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl">
        Ask once.<br />Watch it arrive.
      </h2>
      <p class="max-w-xl text-lg leading-relaxed text-muted-foreground">
        Add a short list of what you need. Everyone who opens your link sees it, ticks things
        off as they add files, and gets a confirmation with a reference. You get the same
        reference on your side.
      </p>
      <ul class="space-y-2.5 text-foreground">
        {#each ["A confirmation for them, a record for you", "Search across everything that came in", "Share a portal with one colleague", "Switch a link off whenever you like"] as point (point)}
          <li class="flex items-center gap-2.5">
            <IconCheckRegular class="size-4 shrink-0 text-primary" />
            {point}
          </li>
        {/each}
      </ul>
    </div>

    <!-- What the sender sees. An illustration, not a control. -->
    <div use:reveal aria-hidden="true" class="reveal space-y-3.5 rounded-2xl border border-border bg-card p-6 shadow-sm">
      <p class="text-xs text-muted-foreground">Send files to</p>
      <p class="text-xl font-semibold tracking-tight text-foreground">Studio North</p>
      <div class="flex justify-between border-t border-border pt-3.5 text-xs text-muted-foreground">
        <span>What is needed</span>
        <span>2 of 3 added</span>
      </div>
      {#each [{ label: "Signed contract", file: "contract-signed.pdf" }, { label: "Logo files", file: "logo.zip" }] as row (row.label)}
        <div class="flex items-center gap-2.5 rounded-md border border-border px-3.5 py-2.5 text-sm">
          <IconCheckRegular class="size-4 shrink-0 text-success-foreground" />
          <span class="flex-1 text-foreground">{row.label}</span>
          <span class="text-xs text-muted-foreground">{row.file}</span>
        </div>
      {/each}
      <div class="flex items-center gap-2.5 rounded-md border border-dashed border-border px-3.5 py-2.5 text-sm text-muted-foreground">
        <span class="size-4 shrink-0 rounded-full border border-dashed border-warning"></span>
        <span class="flex-1">Invoice details</span>
        <span class="text-xs font-medium text-foreground">Choose file</span>
      </div>
      <div class="rounded-md bg-primary py-2.5 text-center text-sm font-medium text-primary-foreground">
        Send 2 files
      </div>
    </div>
  </section>

  <section class="border-t border-border">
    <div use:reveal class="reveal mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 py-24 text-center sm:px-6 sm:py-32">
      <h2 class="text-4xl font-semibold leading-none tracking-tight text-foreground sm:text-6xl">
        Open one.
      </h2>
      <p class="max-w-lg text-lg text-muted-foreground">
        Portals are part of the paid plans. You set them up in your dashboard, and it takes
        about as long as reading this sentence twice.
      </p>
      <div class="flex flex-wrap items-center justify-center gap-3">
        {#if auth.user}
          <Button href="/dashboard/portals" fullWidth={false}>Open your portals</Button>
        {:else}
          <Button href="/pricing" fullWidth={false}>See the plans</Button>
          <Button href="/login" variant="secondary" fullWidth={false}>Sign in</Button>
        {/if}
      </div>
      <p class="text-sm text-muted-foreground">
        Sending files stays free, with or without an account.
        <TextLink href="/">Send something</TextLink>
      </p>
    </div>
  </section>

  <SiteFooter />
</div>

<style>
  .hero {
    background: #07080d;
    /* Files start beyond the edge on a phone. */
    overflow: hidden;
  }

  /* ── the portal ─────────────────────────────────────────────────────── */
  .stage {
    position: relative;
    width: min(78vw, 26rem);
    aspect-ratio: 1;
    margin: 1.5rem 0;
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

  /* ── scroll reveal ──────────────────────────────────────────────────── */
  .reveal {
    opacity: 0;
    transform: translateY(1.25rem);
    transition:
      opacity 500ms ease-out,
      transform 500ms ease-out;
  }
  .reveal:global([data-in]) {
    opacity: 1;
    transform: none;
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
    .reveal {
      opacity: 1;
      transform: none;
      transition: none;
    }
  }
</style>
