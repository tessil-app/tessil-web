<script lang="ts">
  // Settings sidebar shell. The sidebar collapses to a horizontal tab row on
  // narrow screens — anchor tags keep server-rendered links / browser
  // back-forward sane (each tab is its own route).

  import { page } from "$app/state";
  import IdentityStrip from "$lib/components/IdentityStrip.svelte";
  import DefinitionRow from "$lib/components/DefinitionRow.svelte";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import PageLayout from "$lib/components/PageLayout.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import { auth } from "$lib/stores/auth.svelte";
  import { cn } from "$lib/utils";
  import IconArrowLeftRegular from "phosphor-icons-svelte/IconArrowLeftRegular.svelte";

  let { children } = $props();

  const navItems = [
    { href: "/dashboard/settings/account", label: "Account" },
    { href: "/dashboard/settings/security", label: "Security" },
    { href: "/dashboard/settings/vault", label: "Vault" },
    { href: "/dashboard/settings/usage", label: "Usage" },
  ];

  const currentPath = $derived(page.url.pathname);

  const memberSinceFmt = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "long",
  });
</script>

<svelte:head>
  <title>Settings — Tessil</title>
  <meta name="robots" content="noindex, nofollow, noarchive, nosnippet" />
</svelte:head>

<PageLayout width="3xl">
  {#if !auth.loaded}
    <div
      role="status"
      aria-live="polite"
      class="flex flex-col items-center gap-4 py-16 text-info"
    >
      <Spinner class="size-8" aria-hidden="true" />
      <p class="text-muted-foreground">Loading…</p>
    </div>
  {:else if auth.user}
    <PageHeader title="Settings" align="left">
      {#snippet actions()}
        <a
          href="/dashboard"
          class="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded"
        >
          <IconArrowLeftRegular class="size-3.5" />
          Back to dashboard
        </a>
      {/snippet}
    </PageHeader>

    <IdentityStrip>
      <DefinitionRow label="Email" value={auth.user.email} />
      <DefinitionRow
        label="Plan"
        value={auth.user.tier.charAt(0).toUpperCase() + auth.user.tier.slice(1)}
      />
      <DefinitionRow
        label="Member since"
        value={memberSinceFmt.format(new Date(auth.user.createdAt))}
      />
    </IdentityStrip>

    <div class="grid grid-cols-1 md:grid-cols-[12rem_1fr] gap-6 md:gap-8 mt-6">
      <nav aria-label="Settings sections">
        <ul
          class="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible -mx-4 px-4 md:mx-0 md:px-0"
        >
          {#each navItems as item (item.href)}
            {@const active = currentPath === item.href || currentPath.startsWith(item.href + "/")}
            <li class="shrink-0">
              <a
                href={item.href}
                class={cn(
                  "block px-3 py-2 rounded-md text-sm transition-colors duration-200 ease-out whitespace-nowrap focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  active
                    ? "bg-accent text-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </a>
            </li>
          {/each}
        </ul>
      </nav>

      <div class="min-w-0 space-y-6">
        {@render children()}
      </div>
    </div>
  {/if}
</PageLayout>
