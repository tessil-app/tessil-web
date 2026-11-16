<script lang="ts">
  // The page that introduces the command-line tool and its MCP server.
  // In the family of /portals: dark opening, large type, a little play.
  // Every claim here is one /security#access-keys makes.

  import Button from "$lib/components/Button.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import SiteFooter from "$lib/components/SiteFooter.svelte";
  import TextLink from "$lib/components/TextLink.svelte";
  import IconCheckRegular from "phosphor-icons-svelte/IconCheckRegular.svelte";
  import IconXRegular from "phosphor-icons-svelte/IconXRegular.svelte";
  import { onMount } from "svelte";

  const installs = [
    { id: "brew", label: "Homebrew", command: "brew install tessil-app/tap/tessil" },
    {
      id: "script",
      label: "Script",
      command: "curl -fsSL https://raw.githubusercontent.com/tessil-app/tessil-cli/main/install.sh | sh",
    },
    { id: "npm", label: "npm", command: "npx tessil help" },
  ] as const;
  let install = $state<(typeof installs)[number]["id"]>("brew");
  const installCommand = $derived(installs.find((i) => i.id === install)!.command);
  let copied = $state(false);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
      setTimeout(() => (copied = false), 1800);
    } catch {
      // Selecting the text by hand still works.
    }
  }

  // The terminal in the opening: a command is typed, then its answer
  // appears line by line. Three scenes, in turn.
  interface Scene {
    command: string;
    lines: { text: string; tone?: "dim" | "ok" | "link" }[];
  }
  const scenes: Scene[] = [
    {
      command: "tessil send report.pdf",
      lines: [
        { text: "Sent report.pdf (2.4 MB), encrypted on this machine.", tone: "ok" },
        { text: "The link works for 7 days.", tone: "dim" },
        { text: "https://tessil.app/d/8sKq2ZpLw4…#rT9c…", tone: "link" },
      ],
    },
    {
      command: 'tessil pull "Tax 2025"',
      lines: [
        { text: "Tax 2025/7F3A-91C2/passport.jpg" },
        { text: "Tax 2025/7F3A-91C2/annual-statement.pdf" },
        { text: "Tax 2025: 1 delivery saved, 4 already there.", tone: "ok" },
      ],
    },
    {
      command: "tessil login",
      lines: [
        { text: "Approve this program in your browser:", tone: "dim" },
        { text: "Code       K7QM-R2XD" },
        { text: "This key   0b28 b9da 2a75 0945 a5b7 9f5c 1796 c49a" },
        { text: "Paired with you@example.com.", tone: "ok" },
      ],
    },
  ];
  let scene = $state(0);
  let typed = $state(scenes[0].command.length);
  let shown = $state(scenes[0].lines.length);

  onMount(() => {
    // For people who asked for less motion the first scene stands still, complete.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    typed = 0;
    shown = 0;
    let timer: ReturnType<typeof setTimeout>;
    const step = () => {
      const current = scenes[scene];
      if (typed < current.command.length) {
        typed += 1;
        timer = setTimeout(step, 38 + Math.random() * 40);
      } else if (shown < current.lines.length) {
        shown += 1;
        timer = setTimeout(step, shown === 1 ? 520 : 260);
      } else {
        timer = setTimeout(() => {
          scene = (scene + 1) % scenes.length;
          typed = 0;
          shown = 0;
          step();
        }, 3200);
      }
    };
    timer = setTimeout(step, 600);
    return () => clearTimeout(timer);
  });

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

  const can = [
    "Send files and get a link",
    "List and delete what it sent",
    "Read the portals you hand it",
  ];
  const cannot = [
    "Open your vault or see your password",
    "Touch your account, billing or passkeys",
    "See transfers it did not send",
    "Open a portal you did not hand it",
  ];
</script>

<Seo
  title="Tessil from your terminal - CLI and MCP server"
  description="Send and receive end-to-end encrypted files from a terminal, a script or an AI assistant. Open source. Your assistant never sees the link."
  path="/cli"
/>

<!-- Pulled up behind the header, which turns dark while this is under it. -->
<div class="hero -mt-16" data-header-tone="dark">
  <div class="mx-auto flex min-h-[100svh] max-w-6xl flex-col items-center justify-center gap-5 px-4 pt-24 pb-10 text-center sm:px-6">
    <p class="inline-flex items-center gap-2 rounded-full border border-white/15 py-1 pl-1 pr-3.5 text-sm text-white/80">
      <span class="rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">New</span>
      A command-line tool and an MCP server
    </p>
    <h1 class="text-5xl font-semibold leading-none text-white sm:text-7xl lg:text-8xl" style="letter-spacing: -0.045em">
      No browser needed.
    </h1>
    <p class="max-w-xl text-base text-white/70 sm:text-lg">
      The same encrypted transfers and portals, from your terminal, your scripts and your AI
      assistant. We still see nothing.
    </p>

    <!-- An illustration of the tool at work, not a control. -->
    <div class="terminal mt-2 w-full min-w-0 max-w-2xl text-left" aria-hidden="true">
      <div class="flex items-center gap-1.5 border-b border-white/10 px-4 py-3">
        <span class="size-2.5 rounded-full bg-white/20"></span>
        <span class="size-2.5 rounded-full bg-white/20"></span>
        <span class="size-2.5 rounded-full bg-white/20"></span>
      </div>
      <div class="h-[9.5rem] overflow-hidden px-4 py-4 font-mono text-[0.8125rem] leading-relaxed sm:h-[10rem] sm:text-sm">
        <p class="text-white">
          <span class="text-white/40">$</span>
          {scenes[scene].command.slice(0, typed)}<span class="caret" class:blink={typed === scenes[scene].command.length}></span>
        </p>
        {#each scenes[scene].lines.slice(0, shown) as line (line.text)}
          <p
            class="truncate {line.tone === 'dim'
              ? 'text-white/45'
              : line.tone === 'ok'
                ? 'text-emerald-300'
                : line.tone === 'link'
                  ? 'text-[#8ea2ff]'
                  : 'text-white/75'}"
          >
            {line.text}
          </p>
        {/each}
      </div>
    </div>

    <div class="w-full max-w-2xl space-y-2">
      <div role="group" aria-label="How to install" class="flex justify-center gap-1 text-sm">
        {#each installs as option (option.id)}
          <button
            type="button"
            aria-pressed={install === option.id}
            onclick={() => (install = option.id)}
            class="tab rounded-full px-3 py-1 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white {install ===
            option.id
              ? 'bg-white/15 text-white'
              : 'text-white/55'}"
          >
            {option.label}
          </button>
        {/each}
      </div>
      <div class="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 py-2 pl-4 pr-2 text-left">
        <code class="command min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-[0.8125rem] text-white sm:text-sm">{installCommand}</code>
        <button
          type="button"
          onclick={() => copy(installCommand)}
          class="tab shrink-0 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-[#07080d] focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p class="text-sm text-white/50">
        Then <code class="font-mono text-white/75">tessil login</code>. Open source, AGPL-3.0.
        <a href="https://github.com/tessil-app/tessil-cli" class="text-white/80 underline underline-offset-4">Read the code</a>
      </p>
    </div>
  </div>
</div>

<div class="bg-background">
  <!-- Pair once -->
  <section class="mx-auto grid max-w-6xl gap-12 px-4 py-24 sm:px-6 sm:py-32 lg:grid-cols-2 lg:items-center">
    <div use:reveal class="reveal min-w-0 space-y-5">
      <h2 class="text-3xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl">
        It never asks<br />for your password.
      </h2>
      <p class="max-w-xl text-lg leading-relaxed text-muted-foreground">
        <code class="font-mono text-foreground">tessil login</code> makes a key of its own on your
        computer and shows a short code. You approve it in your browser, tick what it may do,
        and that is the pairing.
      </p>
      <p class="max-w-xl text-muted-foreground">
        The key lives in your system's keychain. It works for 90 days, and you can revoke it
        from your settings the moment you want to.
      </p>
    </div>

    <!-- What the approval looks like. An illustration, not a control. -->
    <div use:reveal aria-hidden="true" class="reveal min-w-0 space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
      <p class="text-sm font-medium text-foreground">A program is asking for access</p>
      <dl class="space-y-2 text-sm">
        <div class="flex gap-4">
          <dt class="w-20 shrink-0 text-muted-foreground">Calls itself</dt>
          <dd class="text-foreground">MacBook, tessil</dd>
        </div>
        <div class="flex gap-4">
          <dt class="w-20 shrink-0 text-muted-foreground">Its key</dt>
          <dd class="font-mono text-xs text-foreground">0b28 b9da 2a75 0945 a5b7 9f5c 1796 c49a</dd>
        </div>
      </dl>
      <ul class="space-y-2 border-t border-border pt-4 text-sm text-foreground">
        {#each [{ label: "Send files", on: true }, { label: "See what it sent", on: true }, { label: "Read portals you pick", on: false }] as box (box.label)}
          <li class="flex items-center gap-2.5">
            <span class="flex size-4 items-center justify-center rounded {box.on ? 'bg-primary text-white' : 'border border-input'}">
              {#if box.on}<IconCheckRegular class="size-3" />{/if}
            </span>
            {box.label}
          </li>
        {/each}
      </ul>
      <div class="flex gap-2 pt-1">
        <span class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Approve</span>
        <span class="px-3 py-2 text-sm text-muted-foreground">Don't approve</span>
      </div>
    </div>
  </section>
</div>

<!-- The assistant -->
<div class="hero" data-header-tone="dark">
  <section class="mx-auto grid max-w-6xl gap-12 px-4 py-24 sm:px-6 sm:py-32 lg:grid-cols-2 lg:items-center">
    <div use:reveal class="reveal min-w-0 space-y-5">
      <h2 class="text-3xl font-semibold leading-[1.08] text-white sm:text-5xl" style="letter-spacing: -0.03em">
        Your assistant sends it.<br />It never sees the link.
      </h2>
      <p class="max-w-xl text-lg leading-relaxed text-white/70">
        A link holds the key to your files, and whatever an assistant sees is kept by whoever
        runs the model. So the link goes to your clipboard, and the assistant is told only
        that it did.
      </p>
      <ul class="space-y-2.5 text-white/85">
        {#each ["No tool takes or returns a link, a key or a password", "No tool returns what is inside a file", "What a sender wrote is passed on marked as theirs", "It runs on your machine. There is no hosted version"] as point (point)}
          <li class="flex items-start gap-2.5">
            <span class="mt-1 shrink-0 text-[#8ea2ff]"><IconCheckRegular class="size-4" /></span>
            {point}
          </li>
        {/each}
      </ul>
      <div class="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 py-2 pl-4 pr-2">
        <code class="command min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-[0.8125rem] text-white sm:text-sm">claude mcp add tessil -- tessil mcp</code>
      </div>
      <p class="text-sm text-white/50">
        Works with any assistant that can start a local MCP server.
      </p>
    </div>

    <!-- A conversation. An illustration, not a control. -->
    <div use:reveal aria-hidden="true" class="reveal min-w-0 space-y-3">
      <div class="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-white/10 px-4 py-3 text-white">
        Send the signed contract to Anna, valid for three days.
      </div>
      <div class="max-w-[85%] rounded-2xl rounded-bl-md border border-white/10 px-4 py-3 text-white/85">
        <p class="mb-2 flex items-center gap-2 font-mono text-xs text-white/45">
          <span class="size-1.5 rounded-full bg-emerald-300"></span>
          tessil · send_files
        </p>
        Sent <span class="text-white">contract-signed.pdf</span>, encrypted on your machine. The
        link is on your clipboard. I can't see it.
      </div>
      <div class="ml-auto flex max-w-[85%] items-center gap-3 rounded-xl border border-dashed border-white/20 px-4 py-3">
        <span class="text-xs uppercase tracking-wider text-white/45">Clipboard</span>
        <span class="truncate font-mono text-xs text-[#8ea2ff]">https://tessil.app/d/8sKq2ZpLw4…#rT9c…</span>
      </div>
    </div>
  </section>
</div>

<div class="bg-background">
  <!-- Portals -->
  <section class="mx-auto grid max-w-6xl gap-12 px-4 py-24 sm:px-6 sm:py-32 lg:grid-cols-2 lg:items-center">
    <!-- A folder as pull leaves it. An illustration, not a control. -->
    <div use:reveal aria-hidden="true" class="reveal order-last min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-6 font-mono text-sm shadow-sm lg:order-first">
      <p class="text-muted-foreground">Tax 2025/</p>
      {#each [{ ref: "7F3A-91C2", files: ["passport.jpg", "annual-statement.pdf", "record.txt"], fresh: true }, { ref: "B6B7-3015", files: ["mortgage-overview.pdf", "record.txt"], fresh: false }] as delivery (delivery.ref)}
        <p class="mt-3 flex items-center gap-2 pl-4 text-foreground">
          {delivery.ref}/
          {#if delivery.fresh}
            <span class="rounded-full bg-primary/10 px-2 py-0.5 font-sans text-xs font-medium text-primary">new</span>
          {/if}
        </p>
        {#each delivery.files as file (file)}
          <p class="pl-8 text-muted-foreground">{file}</p>
        {/each}
      {/each}
    </div>
    <div use:reveal class="reveal min-w-0 space-y-5">
      <h2 class="text-3xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl">
        Portals that<br />file themselves.
      </h2>
      <p class="max-w-xl text-lg leading-relaxed text-muted-foreground">
        Hand a portal to the tool and
        <code class="font-mono text-foreground">tessil pull</code> brings down what arrived: one
        folder per delivery, with the files and a record of who sent what.
      </p>
      <p class="max-w-xl text-muted-foreground">
        Run it again and it fetches only what is new. Put it on a schedule and a portal whose
        files are deleted after 30 days becomes an archive you keep.
      </p>
      <p class="text-sm text-muted-foreground">
        Reading portals needs a paid plan, like portals themselves.
        <TextLink href="/portals">What a portal is</TextLink>
      </p>
    </div>
  </section>

  <!-- What a key can do -->
  <section class="border-t border-border">
    <div class="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
      <div use:reveal class="reveal max-w-2xl space-y-5">
        <h2 class="text-3xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl">
          A key, not the keys.
        </h2>
        <p class="text-lg leading-relaxed text-muted-foreground">
          The tool signs in with an access key that is its own. It can do what you ticked. The
          rest is not forbidden to it; it was never given the means.
        </p>
      </div>
      <div use:reveal class="reveal mt-12 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2">
        <div class="space-y-4 bg-card p-6 sm:p-8">
          <p class="text-sm font-medium text-foreground">It can</p>
          <ul class="space-y-2.5 text-foreground">
            {#each can as point (point)}
              <li class="flex items-start gap-2.5">
                <span class="mt-1 shrink-0 text-primary"><IconCheckRegular class="size-4" /></span>
                {point}
              </li>
            {/each}
          </ul>
        </div>
        <div class="space-y-4 bg-card p-6 sm:p-8">
          <p class="text-sm font-medium text-foreground">It cannot</p>
          <ul class="space-y-2.5 text-muted-foreground">
            {#each cannot as point (point)}
              <li class="flex items-start gap-2.5">
                <span class="mt-1 shrink-0"><IconXRegular class="size-4" /></span>
                {point}
              </li>
            {/each}
          </ul>
        </div>
      </div>
      <p use:reveal class="reveal mt-6 max-w-2xl text-sm text-muted-foreground">
        One thing we will not pretend: an assistant that can also run commands on your computer
        can do what you can do there, including reading your clipboard. Those limits are set
        where you approve what it runs.
        <TextLink href="/security#access-keys">How access keys work</TextLink>
      </p>
    </div>
  </section>

  <!-- Close -->
  <section class="border-t border-border">
    <div use:reveal class="reveal mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 py-24 text-center sm:py-32">
      <h2 class="text-4xl font-semibold leading-none tracking-tight text-foreground sm:text-6xl">
        Install it.
      </h2>
      <p class="max-w-lg text-lg text-muted-foreground">
        One access key comes with every account, the free one included.
      </p>
      <div class="flex w-full max-w-xl items-center gap-2 rounded-xl border border-border bg-card py-2 pl-4 pr-2 text-left">
        <code class="command min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-sm text-foreground">{installs[0].command}</code>
        <Button fullWidth={false} class="shrink-0 px-3 py-1.5 text-sm" onclick={() => copy(installs[0].command)}>
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <p class="text-sm text-muted-foreground">
        <TextLink href="https://github.com/tessil-app/tessil-cli#readme">Every command</TextLink>
        ·
        <TextLink href="https://github.com/tessil-app/tessil-cli/releases">Downloads</TextLink>
        ·
        <TextLink href="/pricing#compare">What each plan includes</TextLink>
      </p>
    </div>
  </section>

  <SiteFooter />
</div>

<style>
  .hero {
    background: #07080d;
  }

  .terminal {
    border-radius: 0.875rem;
    border: 1px solid rgb(255 255 255 / 0.12);
    background: rgb(255 255 255 / 0.04);
    box-shadow: 0 30px 80px -30px rgb(27 77 255 / 0.45);
  }

  .caret {
    display: inline-block;
    width: 0.55em;
    height: 1.05em;
    margin-left: 1px;
    vertical-align: text-bottom;
    background: rgb(255 255 255 / 0.8);
  }
  .caret.blink {
    animation: blink 1s steps(1) infinite;
  }
  @keyframes blink {
    50% {
      opacity: 0;
    }
  }

  /* A long command scrolls sideways under a thin bar in the text's own
     colour, in place of the system's heavy one. */
  .command {
    padding-bottom: 0.25rem;
    margin-bottom: -0.25rem;
    scrollbar-width: thin;
    scrollbar-color: color-mix(in srgb, currentColor 30%, transparent) transparent;
  }
  .command::-webkit-scrollbar {
    height: 4px;
  }
  .command::-webkit-scrollbar-track {
    background: transparent;
  }
  .command::-webkit-scrollbar-thumb {
    border-radius: 999px;
    background: color-mix(in srgb, currentColor 30%, transparent);
  }
  @media (hover: hover) {
    .command::-webkit-scrollbar-thumb:hover {
      background: color-mix(in srgb, currentColor 55%, transparent);
    }
  }

  .tab {
    transition:
      background-color 150ms ease-out,
      color 150ms ease-out;
    cursor: pointer;
  }
  @media (hover: hover) {
    .tab:hover {
      color: white;
    }
    .tab.bg-white:hover {
      color: #07080d;
      background-color: rgb(255 255 255 / 0.88);
    }
  }

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
    .caret.blink {
      animation: none;
    }
    .reveal {
      opacity: 1;
      transform: none;
      transition: none;
    }
  }
</style>
