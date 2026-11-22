<script lang="ts">
  import {
    SUPPORT_GITHUB_SPONSORS_URL,
    SUPPORT_KOFI_URL,
  } from "$lib/config/support";
  import { cn } from "$lib/utils";
  import { page } from "$app/state";
  import { uiLocale } from "$lib/i18n/app.svelte";
  import { hrefFor } from "$lib/i18n/paths";
  import { chromeMessages } from "$lib/i18n/messages/chrome";
  import type { Snippet } from "svelte";

  type Current =
    | "home"
    | "compare"
    | "verify"
    | "pricing"
    | "privacy"
    | "terms"
    | "security"
    | "abuse"
    | "download"
    | "dashboard"
    | "data";

  interface Props {
    current?: Current;
    /** Optional content (e.g. a privacy reassurance line) rendered above the links. */
    tagline?: Snippet;
    /** Show the GitHub source link in the link row. Defaults to true. */
    github?: boolean;
    class?: string;
  }

  let {
    current,
    tagline,
    github = true,
    class: className,
  }: Props = $props();

  const linkClass =
    "hover:text-foreground transition-colors duration-200 ease-out";

  // In the page's language, and to that language's pages where they exist.
  const locale = $derived(uiLocale(page.url.pathname));
  const words = $derived(chromeMessages[locale].footer);
  const links: { key: Current; href: string; label: string }[] = $derived(
    (["home", "compare", "verify", "pricing", "privacy", "data", "terms", "security", "abuse"] as const).map((key) => ({
      key,
      href: hrefFor(key === "home" ? "/" : key === "data" ? "/what-we-store" : `/${key}`, locale),
      label: words[key],
    })),
  );
</script>

<footer
  class={cn(
    "mt-16 text-center text-sm text-muted-foreground space-y-4",
    className
  )}
>
  {#if tagline}
    <div class="max-w-xl mx-auto text-balance">{@render tagline()}</div>
  {/if}
  <div class="flex items-center justify-center gap-3 flex-wrap">
    {#each links as link, i (link.key)}
      {#if current === link.key}
        <span aria-current="page" class="text-foreground">{link.label}</span>
      {:else}
        <a href={link.href} class={linkClass}>{link.label}</a>
      {/if}
      <span aria-hidden="true">·</span>
    {/each}
    {#if github}
      <a href="https://github.com/tessil-app" class={linkClass}>GitHub</a>
      <span aria-hidden="true">·</span>
    {/if}
    <a
      href={SUPPORT_GITHUB_SPONSORS_URL}
      target="_blank"
      rel="noopener noreferrer"
      class={linkClass}>Sponsor</a
    >
    <span aria-hidden="true">·</span>
    <a
      href={SUPPORT_KOFI_URL}
      target="_blank"
      rel="noopener noreferrer"
      class={linkClass}>Ko-fi</a
    >
  </div>
</footer>
