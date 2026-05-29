<script lang="ts">
  import { cn } from "$lib/utils";
  import type { Snippet } from "svelte";

  type Current =
    | "home"
    | "privacy"
    | "terms"
    | "security"
    | "abuse"
    | "download"
    | "dashboard";

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

  const links: { key: Current; href: string; label: string }[] = [
    { key: "home", href: "/", label: "Home" },
    { key: "privacy", href: "/privacy", label: "Privacy" },
    { key: "terms", href: "/terms", label: "Terms" },
    { key: "security", href: "/security", label: "Security" },
    { key: "abuse", href: "/abuse", label: "Abuse" },
  ];
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
      <a href="https://github.com/VerburgtJimmy" class={linkClass}>GitHub</a>
      <span aria-hidden="true">·</span>
    {/if}
    <a href="/pricing" class={linkClass}>Pro</a>
  </div>
</footer>
