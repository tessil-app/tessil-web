<script lang="ts">
  // The page that introduces the command-line tool and its MCP server.
  // Light, with one dark thing on it: a terminal the visitor can type in.
  // Every claim here is one /security#access-keys makes.

  import Button from "$lib/components/Button.svelte";
  import CommandTabs from "$lib/components/cli/CommandTabs.svelte";
  import DemoTerminal from "$lib/components/cli/DemoTerminal.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import SiteFooter from "$lib/components/SiteFooter.svelte";
  import TextLink from "$lib/components/TextLink.svelte";
  import IconCheckRegular from "phosphor-icons-svelte/IconCheckRegular.svelte";
  import IconXRegular from "phosphor-icons-svelte/IconXRegular.svelte";
  import { page } from "$app/state";
  import { localeFromPath } from "$lib/i18n/locale";
  import { cliMessages } from "$lib/i18n/messages/cli";
  import { hrefFor } from "$lib/i18n/paths";

  const locale = $derived(localeFromPath(page.url.pathname));
  const t = $derived(cliMessages[locale]);
  const href = (canonical: string) => hrefFor(canonical, locale);

  const installs = $derived([
    { id: "brew", label: "Homebrew", command: "brew install tessil-app/tap/tessil" },
    {
      id: "script",
      label: t.script,
      command: "curl -fsSL https://raw.githubusercontent.com/tessil-app/tessil-cli/main/install.sh | sh",
    },
    { id: "npm", label: "npm", command: "npx tessil help" },
  ] as const);
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

</script>

<Seo
  title={t.seoTitle}
  description={t.description}
  path="/cli"
/>

{#snippet commandRow(command: string)}
  <div class="flex items-center gap-2 rounded-xl border border-border bg-card py-2 pl-4 pr-2 text-left">
    <code class="command min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-[0.8125rem] text-foreground sm:text-sm">{command}</code>
    <Button variant="secondary" fullWidth={false} class="shrink-0 px-3 py-1.5 text-sm" onclick={() => copy(command)}>
      {copied === command ? t.copied : t.copy}
    </Button>
  </div>
{/snippet}

<div class="bg-background">
  <section class="mx-auto max-w-6xl px-4 sm:px-6 pt-10 pb-20 sm:pt-16 sm:pb-28">
    <div class="space-y-5">
      <h1 class="text-5xl font-semibold leading-none text-foreground sm:text-7xl lg:text-8xl" style="letter-spacing: -0.045em">
        {t.heading}
      </h1>
      <p class="max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
        {t.sub}
      </p>
    </div>

    <div class="mt-10 sm:mt-14">
      <DemoTerminal text={t.terminal} />
    </div>

    <div class="mt-14 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:items-center">
      <div class="space-y-2">
        <h2 class="text-2xl font-semibold tracking-tight text-foreground">{t.installTitle}</h2>
        <p class="text-muted-foreground">
          {t.installThen} <code class="font-mono text-foreground">tessil login</code>{t.installAfter}
          <TextLink href="https://github.com/tessil-app/tessil-cli">{t.readCode}</TextLink>
        </p>
      </div>
      <CommandTabs id="install" label={t.howInstall} options={installs} class="min-w-0" />
    </div>
  </section>

  <!-- Pair once -->
  <section class="border-t border-border">
    <div class="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-2 lg:items-center">
      <div class="min-w-0 space-y-5">
        <h2 class="text-3xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl">
          {t.pairTitle1}<br />{t.pairTitle2}
        </h2>
        <p class="max-w-xl text-lg leading-relaxed text-muted-foreground">
          <code class="font-mono text-foreground">tessil login</code> {t.pairBody}
        </p>
        <p class="max-w-xl text-muted-foreground">
          {t.pairKeychain}
        </p>
      </div>

      <!-- What the approval looks like. An illustration, not a control. -->
      <div aria-hidden="true" class="min-w-0 space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <p class="text-sm font-medium text-foreground">{t.mock.asking}</p>
        <dl class="space-y-2 text-sm">
          <div class="flex gap-4">
            <dt class="w-20 shrink-0 text-muted-foreground">{t.mock.callsItself}</dt>
            <dd class="text-foreground">MacBook, tessil</dd>
          </div>
          <div class="flex gap-4">
            <dt class="w-20 shrink-0 text-muted-foreground">{t.mock.itsKey}</dt>
            <dd class="font-mono text-xs text-foreground">0b28 b9da 2a75 0945 a5b7 9f5c 1796 c49a</dd>
          </div>
        </dl>
        <ul class="space-y-2 border-t border-border pt-4 text-sm text-foreground">
          {#each [{ label: t.mock.send, on: true }, { label: t.mock.see, on: true }, { label: t.mock.read, on: false }] as box (box.label)}
            <li class="flex items-center gap-2.5">
              <span class="flex size-4 items-center justify-center rounded {box.on ? 'bg-primary text-white' : 'border border-input'}">
                {#if box.on}<IconCheckRegular class="size-3" />{/if}
              </span>
              {box.label}
            </li>
          {/each}
        </ul>
        <div class="flex gap-2 pt-1">
          <span class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">{t.mock.approve}</span>
          <span class="px-3 py-2 text-sm text-muted-foreground">{t.mock.dont}</span>
        </div>
      </div>
    </div>
  </section>

  <!-- The assistant -->
  <section class="bg-card">
    <div class="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-2 lg:items-center">
      <div class="min-w-0 space-y-5">
        <h2 class="text-3xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl">
          {t.assistantTitle1}<br />{t.assistantTitle2}
        </h2>
        <p class="max-w-xl text-lg leading-relaxed text-muted-foreground">
          {t.assistantBody}
        </p>
        <ul class="space-y-2.5 text-foreground">
          {#each t.assistantPoints as point (point)}
            <li class="flex items-start gap-2.5">
              <span class="mt-1 shrink-0 text-primary"><IconCheckRegular class="size-4" /></span>
              {point}
            </li>
          {/each}
        </ul>
        <div class="max-w-xl space-y-2">
          {@render commandRow(assistantCommand)}
          <p class="text-sm text-muted-foreground">{t.anyAssistant}</p>
        </div>
      </div>

      <!-- A conversation, and the one place the link goes. An illustration, not a control. -->
      <div aria-hidden="true" class="min-w-0 space-y-3">
        <div class="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-primary-foreground">
          {t.chatAsk}
        </div>
        <div class="max-w-[85%] rounded-2xl rounded-bl-md border border-border bg-background px-4 py-3 text-foreground">
          <p class="mb-2 flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <span class="size-1.5 rounded-full bg-success"></span>
            tessil, send_files
          </p>
          {t.chatReply}
        </div>
        <div class="ml-auto flex max-w-[85%] items-center gap-3 rounded-xl border border-dashed border-input px-4 py-3">
          <span class="shrink-0 text-xs text-muted-foreground">{t.clipboard}</span>
          <span class="truncate font-mono text-xs text-primary">https://tessil.app/d/8sKq2ZpLw4…#rT9c…</span>
        </div>
      </div>
    </div>
  </section>

  <!-- Portals -->
  <section class="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-2 lg:items-center">
    <!-- A folder as pull leaves it. An illustration, not a control. -->
    <div aria-hidden="true" class="order-last min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-6 font-mono text-sm shadow-sm lg:order-first">
      <p class="text-muted-foreground">{t.folder}</p>
      {#each [{ ref: "7F3A-91C2", files: t.folderFiles[0], fresh: true }, { ref: "B6B7-3015", files: t.folderFiles[1], fresh: false }] as delivery (delivery.ref)}
        <p class="mt-3 flex items-center gap-2 pl-4 text-foreground">
          {delivery.ref}/
          {#if delivery.fresh}
            <span class="rounded-full bg-primary/10 px-2 py-0.5 font-sans text-xs font-medium text-primary">{t.fresh}</span>
          {/if}
        </p>
        {#each delivery.files as file (file)}
          <p class="pl-8 text-muted-foreground">{file}</p>
        {/each}
      {/each}
    </div>
    <div class="min-w-0 space-y-5">
      <h2 class="text-3xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl">
        {t.portalsTitle1}<br />{t.portalsTitle2}
      </h2>
      <p class="max-w-xl text-lg leading-relaxed text-muted-foreground">
        {t.portalsBefore}
        <code class="font-mono text-foreground">tessil pull</code> {t.portalsAfter}
      </p>
      <p class="max-w-xl text-muted-foreground">
        {t.portalsAgain}
      </p>
      <p class="text-sm text-muted-foreground">
        {t.portalsPaid}
        <TextLink href={href("/portals")}>{t.whatPortal}</TextLink>
      </p>
    </div>
  </section>

  <!-- What a key can do -->
  <section class="border-t border-border">
    <div class="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
      <div class="max-w-2xl space-y-5">
        <h2 class="text-3xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl">
          {t.keyTitle}
        </h2>
        <p class="text-lg leading-relaxed text-muted-foreground">
          {t.keyBody}
        </p>
      </div>
      <div class="mt-12 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2">
        <div class="space-y-4 bg-card p-6 sm:p-8">
          <p class="text-sm font-medium text-foreground">{t.itCan}</p>
          <ul class="space-y-2.5 text-foreground">
            {#each t.can as point (point)}
              <li class="flex items-start gap-2.5">
                <span class="mt-1 shrink-0 text-primary"><IconCheckRegular class="size-4" /></span>
                {point}
              </li>
            {/each}
          </ul>
        </div>
        <div class="space-y-4 bg-card p-6 sm:p-8">
          <p class="text-sm font-medium text-foreground">{t.itCannot}</p>
          <ul class="space-y-2.5 text-muted-foreground">
            {#each t.cannot as point (point)}
              <li class="flex items-start gap-2.5">
                <span class="mt-1 shrink-0"><IconXRegular class="size-4" /></span>
                {point}
              </li>
            {/each}
          </ul>
        </div>
      </div>
      <p class="mt-6 max-w-2xl text-sm text-muted-foreground">
        {t.honest}
        <TextLink href="{href('/security')}#access-keys">{t.howKeys}</TextLink>
      </p>
    </div>
  </section>

  <!-- Close -->
  <section class="border-t border-border">
    <div class="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 py-24 text-center sm:py-32">
      <h2 class="text-4xl font-semibold leading-none tracking-tight text-foreground sm:text-6xl">
        {t.installIt}
      </h2>
      <p class="max-w-lg text-lg text-muted-foreground">
        {t.oneKey}
      </p>
      <CommandTabs id="install-again" label={t.howInstall} options={installs} class="w-full max-w-xl" />
      <p class="flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
        <TextLink href="https://github.com/tessil-app/tessil-cli#readme">{t.everyCommand}</TextLink>
        <TextLink href="https://github.com/tessil-app/tessil-cli/releases">{t.downloads}</TextLink>
        <TextLink href="{href('/pricing')}#compare">{t.plans}</TextLink>
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
