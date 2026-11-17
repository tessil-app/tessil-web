<script lang="ts">
  // The page that introduces the command-line tool and its MCP server.
  // Light, with one dark thing on it: a terminal the visitor can type in.
  // Every claim here is one /security#access-keys makes.

  import Button from "$lib/components/Button.svelte";
  import DemoTerminal from "$lib/components/cli/DemoTerminal.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import SiteFooter from "$lib/components/SiteFooter.svelte";
  import SegmentedControl from "$lib/components/SegmentedControl.svelte";
  import TextLink from "$lib/components/TextLink.svelte";
  import IconCheckRegular from "phosphor-icons-svelte/IconCheckRegular.svelte";
  import IconXRegular from "phosphor-icons-svelte/IconXRegular.svelte";

  const installs = [
    { id: "brew", label: "Homebrew", command: "brew install tessil-app/tap/tessil" },
    {
      id: "script",
      label: "Script",
      command: "curl -fsSL https://raw.githubusercontent.com/tessil-app/tessil-cli/main/install.sh | sh",
    },
    { id: "npm", label: "npm", command: "npx tessil help" },
  ] as const;
  type InstallId = (typeof installs)[number]["id"];
  let install = $state<InstallId>("brew");
  const installCommand = $derived(installs.find((i) => i.id === install)!.command);
  let copied = $state<string | null>(null);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      copied = text;
      setTimeout(() => (copied = null), 1800);
    } catch {
      // Selecting the text by hand still works.
    }
  }

  const assistantCommand = "claude mcp add tessil -- tessil mcp";

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

{#snippet commandRow(command: string)}
  <div class="flex items-center gap-2 rounded-xl border border-border bg-card py-2 pl-4 pr-2 text-left">
    <code class="command min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-[0.8125rem] text-foreground sm:text-sm">{command}</code>
    <Button variant="secondary" fullWidth={false} class="shrink-0 px-3 py-1.5 text-sm" onclick={() => copy(command)}>
      {copied === command ? "Copied" : "Copy"}
    </Button>
  </div>
{/snippet}

<div class="bg-background">
  <section class="mx-auto max-w-6xl px-4 sm:px-6 pt-10 pb-20 sm:pt-16 sm:pb-28">
    <div class="space-y-5">
      <h1 class="text-5xl font-semibold leading-none text-foreground sm:text-7xl lg:text-8xl" style="letter-spacing: -0.045em">
        No browser needed.
      </h1>
      <p class="max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
        The same encrypted transfers and portals, from your terminal, your scripts and your AI
        assistant. We still see nothing.
      </p>
    </div>

    <div class="mt-10 sm:mt-14">
      <DemoTerminal />
    </div>

    <div class="mt-14 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:items-center">
      <div class="space-y-2">
        <h2 class="text-2xl font-semibold tracking-tight text-foreground">Install the real one</h2>
        <p class="text-muted-foreground">
          Then <code class="font-mono text-foreground">tessil login</code>. Open source, AGPL-3.0.
          <TextLink href="https://github.com/tessil-app/tessil-cli">Read the code</TextLink>
        </p>
      </div>
      <div class="min-w-0 space-y-3">
        <SegmentedControl
          label="How to install"
          value={install}
          onChange={(v: InstallId) => (install = v)}
          options={installs.map((i) => ({ value: i.id, label: i.label }))}
        />
        {@render commandRow(installCommand)}
      </div>
    </div>
  </section>

  <!-- Pair once -->
  <section class="border-t border-border">
    <div class="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-2 lg:items-center">
      <div class="min-w-0 space-y-5">
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
      <div aria-hidden="true" class="min-w-0 space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
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
    </div>
  </section>

  <!-- The assistant -->
  <section class="bg-card">
    <div class="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-2 lg:items-center">
      <div class="min-w-0 space-y-5">
        <h2 class="text-3xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl">
          Your assistant sends it.<br />It never sees the link.
        </h2>
        <p class="max-w-xl text-lg leading-relaxed text-muted-foreground">
          A link holds the key to your files, and whatever an assistant sees is kept by whoever
          runs the model. So the link goes to your clipboard, and the assistant is told only
          that it did.
        </p>
        <ul class="space-y-2.5 text-foreground">
          {#each ["No tool takes or returns a link, a key or a password", "No tool returns what is inside a file", "What a sender wrote is passed on marked as theirs", "It runs on your machine. There is no hosted version"] as point (point)}
            <li class="flex items-start gap-2.5">
              <span class="mt-1 shrink-0 text-primary"><IconCheckRegular class="size-4" /></span>
              {point}
            </li>
          {/each}
        </ul>
        <div class="max-w-xl space-y-2">
          {@render commandRow(assistantCommand)}
          <p class="text-sm text-muted-foreground">Works with any assistant that can start a local MCP server.</p>
        </div>
      </div>

      <!-- A conversation, and the one place the link goes. An illustration, not a control. -->
      <div aria-hidden="true" class="min-w-0 space-y-3">
        <div class="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-primary-foreground">
          Send the signed contract to Anna, valid for three days.
        </div>
        <div class="max-w-[85%] rounded-2xl rounded-bl-md border border-border bg-background px-4 py-3 text-foreground">
          <p class="mb-2 flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <span class="size-1.5 rounded-full bg-success"></span>
            tessil, send_files
          </p>
          Sent contract-signed.pdf, encrypted on your machine. The link is on your clipboard.
          I can't see it.
        </div>
        <div class="ml-auto flex max-w-[85%] items-center gap-3 rounded-xl border border-dashed border-input px-4 py-3">
          <span class="shrink-0 text-xs text-muted-foreground">Your clipboard</span>
          <span class="truncate font-mono text-xs text-primary">https://tessil.app/d/8sKq2ZpLw4…#rT9c…</span>
        </div>
      </div>
    </div>
  </section>

  <!-- Portals -->
  <section class="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-2 lg:items-center">
    <!-- A folder as pull leaves it. An illustration, not a control. -->
    <div aria-hidden="true" class="order-last min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-6 font-mono text-sm shadow-sm lg:order-first">
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
    <div class="min-w-0 space-y-5">
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
    <div class="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
      <div class="max-w-2xl space-y-5">
        <h2 class="text-3xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl">
          A key, not the keys.
        </h2>
        <p class="text-lg leading-relaxed text-muted-foreground">
          The tool signs in with an access key that is its own. It can do what you ticked. The
          rest is not forbidden to it; it was never given the means.
        </p>
      </div>
      <div class="mt-12 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2">
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
      <p class="mt-6 max-w-2xl text-sm text-muted-foreground">
        One thing we will not pretend: an assistant that can also run commands on your computer
        can do what you can do there, including reading your clipboard. Those limits are set
        where you approve what it runs.
        <TextLink href="/security#access-keys">How access keys work</TextLink>
      </p>
    </div>
  </section>

  <!-- Close -->
  <section class="border-t border-border">
    <div class="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 py-24 text-center sm:py-32">
      <h2 class="text-4xl font-semibold leading-none tracking-tight text-foreground sm:text-6xl">
        Install it.
      </h2>
      <p class="max-w-lg text-lg text-muted-foreground">
        One access key comes with every account, the free one included.
      </p>
      <div class="w-full max-w-xl">
        {@render commandRow(installs[0].command)}
      </div>
      <p class="flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
        <TextLink href="https://github.com/tessil-app/tessil-cli#readme">Every command</TextLink>
        <TextLink href="https://github.com/tessil-app/tessil-cli/releases">Downloads</TextLink>
        <TextLink href="/pricing#compare">What each plan includes</TextLink>
      </p>
    </div>
  </section>

  <SiteFooter />
</div>

<style>
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
</style>
