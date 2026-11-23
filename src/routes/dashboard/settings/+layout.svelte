<script lang="ts">
  // Settings sidebar shell. The sidebar collapses to a horizontal tab row on
  // narrow screens - anchor tags keep server-rendered links / browser
  // back-forward sane (each tab is its own route).

  import { page } from "$app/state";
  import IdentityStrip from "$lib/components/IdentityStrip.svelte";
  import DefinitionRow from "$lib/components/DefinitionRow.svelte";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import PageLayout from "$lib/components/PageLayout.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import { ACCESS_KEYS_ANNOUNCED } from "$lib/config/launch";
  import { auth } from "$lib/stores/auth.svelte";
  import { cn } from "$lib/utils";

  import { appLocale } from "$lib/i18n/app.svelte";
  import { HTML_LANG } from "$lib/i18n/locale";
  import { settingsMessages } from "$lib/i18n/messages/settings";
  let { children } = $props();

  const locale = $derived(appLocale());
  const t = $derived(settingsMessages[locale]);
  const navItems = $derived([
    { href: "/dashboard/settings/account", label: t.nav.account },
    { href: "/dashboard/settings/security", label: t.nav.security },
    { href: "/dashboard/settings/vault", label: t.nav.vault },
    ...(ACCESS_KEYS_ANNOUNCED ? [{ href: "/dashboard/settings/access", label: t.nav.access }] : []),
    { href: "/dashboard/settings/usage", label: t.nav.usage },
  ]);

  const currentPath = $derived(page.url.pathname);

  const memberSinceFmt = $derived(new Intl.DateTimeFormat(HTML_LANG[locale], { year: "numeric", month: "long" }));
</script>

<Seo title={t.seoTitle} robots="noindex" />

<PageLayout width="5xl">
  {#if !auth.loaded}
    <div
      role="status"
      aria-live="polite"
      class="flex flex-col items-center gap-4 py-16 text-info"
    >
      <Spinner class="size-8" aria-hidden="true" />
      <p class="text-muted-foreground">{t.loading}</p>
    </div>
  {:else if auth.user}
    <PageHeader title={t.title} align="left" back={{ href: "/dashboard", label: t.back }} />

    <IdentityStrip>
      <DefinitionRow label={t.email} value={auth.user.email} />
      <DefinitionRow
        label={t.plan}
        value={t.tiers[auth.user.tier] ?? auth.user.tier}
      />
      <DefinitionRow
        label={t.memberSince}
        value={memberSinceFmt.format(new Date(auth.user.createdAt))}
      />
    </IdentityStrip>

    <div class="grid grid-cols-1 md:grid-cols-[12rem_1fr] gap-6 md:gap-8 mt-6">
      <nav aria-label={t.sections}>
        <ul
          class="flex md:flex-col gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:overflow-visible -mx-4 px-4 md:mx-0 md:px-0"
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
