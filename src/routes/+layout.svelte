<script lang="ts">
  import { afterNavigate, goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { ModeWatcher, setMode } from "mode-watcher";
  import { auth } from "$lib/stores/auth.svelte";
  import { api } from "$lib/api/client";
  import {
    lock as lockVault,
    isUnlocked,
    subscribeToVaultState,
    unlockWithPassword,
    unlockWithPhrase,
    vaultHasPassword,
  } from "$lib/vault/client";
  import { unlockPrompt } from "$lib/vault/prompt.svelte";
  import { cn } from "$lib/utils";
  import Wordmark from "$lib/components/brand/Wordmark.svelte";
  import DropdownMenu from "$lib/components/DropdownMenu.svelte";
  import DropdownMenuItem from "$lib/components/DropdownMenuItem.svelte";
  import Modal from "$lib/components/Modal.svelte";
  import PasskeyUnlockButton from "$lib/components/PasskeyUnlockButton.svelte";
  import PasswordInput from "$lib/components/PasswordInput.svelte";
  import Textarea from "$lib/components/Textarea.svelte";
  import Select from "$lib/components/Select.svelte";
  import { readVaultHoldDays, setVaultHoldDays, VAULT_HOLD_DAYS, type VaultHoldDays } from "$lib/vault/session";
  import Button from "$lib/components/Button.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import Alert from "$lib/components/Alert.svelte";
  import IconGearRegular from "phosphor-icons-svelte/IconGearRegular.svelte";
  import IconListRegular from "phosphor-icons-svelte/IconListRegular.svelte";
  import IconTrayRegular from "phosphor-icons-svelte/IconTrayRegular.svelte";
  import IconClipboardTextRegular from "phosphor-icons-svelte/IconClipboardTextRegular.svelte";
  import IconUploadRegular from "phosphor-icons-svelte/IconUploadRegular.svelte";
  import { ACCESS_KEYS_ANNOUNCED, FORMS_ANNOUNCED, PORTALS_ANNOUNCED } from "$lib/config/launch";
  import IconLockRegular from "phosphor-icons-svelte/IconLockRegular.svelte";
  import IconLockOpenRegular from "phosphor-icons-svelte/IconLockOpenRegular.svelte";
  import IconSignOutRegular from "phosphor-icons-svelte/IconSignOutRegular.svelte";
  import LanguageSuggestion from "$lib/components/LanguageSuggestion.svelte";
  import LanguageSwitch from "$lib/components/LanguageSwitch.svelte";
  import { readChosenLocale, rememberLocale, uiLocale } from "$lib/i18n/app.svelte";
  import { HTML_LANG, localeFromPath } from "$lib/i18n/locale";
import { hrefFor } from "$lib/i18n/paths";
  import { chromeMessages } from "$lib/i18n/messages/chrome";
  import { sendMessages } from "$lib/i18n/messages/send";
  import "../app.css";

  let { children } = $props();

  // The language of everything around the page. See $lib/i18n/app.svelte.ts.
  const locale = $derived(uiLocale($page.url.pathname));
  const c = $derived(chromeMessages[locale]);
  const vaultWords = $derived(sendMessages[locale]);

  // The server writes <html lang> into each page; after that, moving between
  // pages in the browser has to keep it right. Portal and form pages set
  // their own, from the language the visitor picks there.
  $effect(() => {
    const path = $page.url.pathname;
    if (/^\/(p|f|d)\//.test(path)) return;
    document.documentElement.lang = HTML_LANG[locale];
  });

  // Reading the Dutch site counts as choosing Dutch, until the reader picks,
  // so signing in from there carries on in Dutch.
  $effect(() => {
    if (localeFromPath($page.url.pathname) === "nl" && readChosenLocale() === null) rememberLocale("nl");
  });

  let vaultUnlocked = $state(false);

  let unlockOpen = $state(false);
  // This device's choice of how long the vault stays open, set before unlocking.
  let holdDays = $state("1");
  $effect(() => {
    if (unlockOpen) holdDays = String(readVaultHoldDays());
  });
  $effect(() => {
    const days = Number(holdDays) as VaultHoldDays;
    if (unlockOpen && VAULT_HOLD_DAYS.includes(days)) void setVaultHoldDays(days);
  });
  let unlockMode = $state<"password" | "phrase">("password");
  // A vault can exist without a password. Then the dialog offers the
  // passkey and the recovery phrase, and no password field.
  let hasVaultPassword = $state(true);
  // A free account has no portals of its own but can be given one.
  let hasSharedPortals = $state(false);
  let sharedCheckedFor: string | null = null;
  $effect(() => {
    const user = auth.user;
    if (!user) {
      hasSharedPortals = false;
      sharedCheckedFor = null;
      return;
    }
    if (user.tier === "pro" || user.tier === "max" || sharedCheckedFor === user.id) return;
    sharedCheckedFor = user.id;
    api
      .listPortals()
      .then((res) => (hasSharedPortals = res.portals.length > 0))
      .catch(() => {});
  });

  $effect(() => {
    if (!unlockOpen) return;
    vaultHasPassword()
      .then((has) => {
        hasVaultPassword = has;
        if (!has) unlockMode = "phrase";
      })
      .catch(() => {});
  });
  let unlockPassword = $state("");
  let unlockPhrase = $state("");
  let unlockError = $state<string | null>(null);
  let isUnlockingVault = $state(false);

  // Dark mode is scoped to /dashboard; afterNavigate (not $effect) avoids the mode-watcher reactive loop.
  const isApp = $derived($page.url.pathname.startsWith("/dashboard"));
  // A new page has its own sections; wait for it to render, then look again.
  afterNavigate(() => {
    requestAnimationFrame(readHeaderTone);
  });

  afterNavigate(({ to }) => {
    const path = to?.url.pathname ?? "/";
    if (!path.startsWith("/dashboard")) {
      setMode("light");
    }
  });

  // For plans that include portals, and accounts someone shared one with.
  const showPortals = $derived(
    auth.user?.tier === "pro" || auth.user?.tier === "max" || hasSharedPortals,
  );
  const showForms = $derived(FORMS_ANNOUNCED && showPortals);

  // Signed-out visitors get the pages that help them decide. Signed-in
  // people get their own pages instead; these stay in the footer for them.
  const publicLinks = $derived([
    ...(PORTALS_ANNOUNCED ? [{ href: hrefFor("/portals", locale), label: c.portals }] : []),
    ...(FORMS_ANNOUNCED ? [{ href: hrefFor("/forms", locale), label: c.forms }] : []),
    ...(ACCESS_KEYS_ANNOUNCED ? [{ href: hrefFor("/cli", locale), label: c.cli }] : []),
    { href: hrefFor("/pricing", locale), label: c.pricing },
    { href: hrefFor("/security", locale), label: c.security },
  ]);

  // Header links are plain text; the current page is the darker one.
  const navLinkBase =
    "px-3 py-2 rounded-md transition-colors duration-150 ease-out focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
  const navLinkInactive = "text-muted-foreground hover:text-foreground";
  const navLinkActive = "text-foreground font-medium";

  // The glass header takes the tone of what is under it. A dark section
  // marks itself with data-header-tone="dark"; while one sits behind the
  // header, the header uses the dark palette.
  let isDarkTop = $state(false);
  // Nothing has scrolled under the header yet.
  let atTop = $state(true);
  let headerEl = $state<HTMLElement | null>(null);

  function readHeaderTone() {
    if (!headerEl) return;
    atTop = window.scrollY < 4;
    const line = headerEl.getBoundingClientRect().bottom / 2;
    isDarkTop = [...document.querySelectorAll<HTMLElement>('[data-header-tone="dark"]')].some((el) => {
      const r = el.getBoundingClientRect();
      return r.top <= line && r.bottom > line;
    });
  }

  $effect(() => {
    if (!headerEl) return;
    let queued = false;
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        readHeaderTone();
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    readHeaderTone();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  });

  function isActive(path: string, exact = false) {
    const current = $page.url.pathname;
    return exact ? current === path : current === path || current.startsWith(`${path}/`);
  }

  async function handleLogout() {
    await auth.logout();
    goto("/", { replaceState: true });
  }

  async function handleLock() {
    await lockVault();
  }

  // Track vault locked/unlocked so the account menu shows the right action +
  // icon. subscribeToVaultState fires on lock()/unlock(); the initial read
  // covers the current session.
  $effect(() => {
    const user = auth.user;
    if (!user) {
      vaultUnlocked = false;
      return;
    }
    let active = true;
    isUnlocked(user.id).then((u) => {
      if (active) vaultUnlocked = u;
    });
    const unsub = subscribeToVaultState((s) => {
      vaultUnlocked = s.unlocked;
    });
    return () => {
      active = false;
      unsub();
    };
  });

  $effect(() => {
    if (unlockPrompt.requested) {
      unlockPrompt.requested = false;
      openUnlock();
    }
  });

  function openUnlock() {
    unlockMode = "password";
    unlockPassword = "";
    unlockPhrase = "";
    unlockError = null;
    unlockOpen = true;
  }

  function closeUnlock() {
    unlockOpen = false;
    unlockError = null;
    unlockPassword = "";
    unlockPhrase = "";
  }

  async function submitUnlock(e?: Event) {
    e?.preventDefault();
    if (isUnlockingVault || !auth.user) return;
    unlockError = null;
    isUnlockingVault = true;
    try {
      const result =
        unlockMode === "password"
          ? await unlockWithPassword(auth.user.id, unlockPassword)
          : await unlockWithPhrase(auth.user.id, unlockPhrase);
      if (!result.ok) {
        unlockError =
          result.reason === "wrong_password"
            ? vaultWords.wrongPassword
            : result.reason === "wrong_phrase"
              ? vaultWords.wrongPhrase
              : result.reason === "not_setup"
                ? vaultWords.noVault
                : vaultWords.unreadableVault;
        return;
      }
      closeUnlock();
    } catch (err) {
      unlockError = err instanceof Error ? err.message : c.unlockFailed;
    } finally {
      isUnlockingVault = false;
    }
  }

  const canSubmitUnlock = $derived(
    !isUnlockingVault &&
      (unlockMode === "password"
        ? unlockPassword.length > 0
        : unlockPhrase.trim().length > 0),
  );

  function userInitial(email: string): string {
    return email.trim().charAt(0).toUpperCase() || "?";
  }
</script>

<!-- og:site_name / og:type / twitter:card / the default title all live statically
     in app.html; duplicating them here added a second tag on every page (and a
     second <title> on SSR'd routes like /compare). -->
{#if isApp}
  <ModeWatcher />
{/if}
<a
  href="#main-content"
  class="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-card focus:text-foreground focus:rounded-md focus:outline-2 focus:outline-offset-2 focus:outline-ring"
>
  {c.skip}
</a>
<div class="min-h-screen bg-background text-foreground">
  <header
    bind:this={headerEl}
    class={cn(
      "sticky top-0 z-40 border-b transition-[background-color,border-color] duration-200 ease-out",
      // On a dark page the bar is invisible until something scrolls under
      // it. A blur at the very top would pull in the light page edge and
      // show as a pale strip.
      isDarkTop
        ? atTop
          ? "dark border-transparent bg-transparent"
          : "dark border-white/10 bg-[#07080d]/55 backdrop-blur-2xl backdrop-saturate-150"
        : "border-border/40 bg-background/40 supports-[backdrop-filter]:bg-background/30 backdrop-blur-2xl backdrop-saturate-150",
    )}
  >
    <div
      class={cn(
        "mx-auto py-3 flex items-center justify-between gap-4",
        "max-w-6xl px-4 sm:px-6",
      )}
    >
      <a
        href={hrefFor("/", locale)}
        class="inline-flex text-sm hover:opacity-80 transition-opacity duration-200 ease-out focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded"
        aria-label={c.home}
      >
        <Wordmark layout="horizontal" markSize={22} />
      </a>
      <nav class="flex items-center gap-2 text-sm" aria-label={c.accountNav}>
        {#if auth.loaded}
          {#if auth.isAuthenticated && auth.user}
            {@const email = auth.user.email}
            <a
              href="/dashboard"
              aria-current={(isActive("/dashboard", true) || isActive("/dashboard/new")) ? "page" : undefined}
              class={cn(navLinkBase, "hidden sm:inline-flex", (isActive("/dashboard", true) || isActive("/dashboard/new")) ? navLinkActive : navLinkInactive)}
            >
              {c.transfers}
            </a>
            {#if showPortals}
              <a
                href="/dashboard/portals"
                aria-current={isActive("/dashboard/portals") ? "page" : undefined}
                class={cn(navLinkBase, "hidden sm:inline-flex", isActive("/dashboard/portals") ? navLinkActive : navLinkInactive)}
              >
                {c.portals}
              </a>
            {/if}
            {#if showForms}
              <a
                href="/dashboard/forms"
                aria-current={isActive("/dashboard/forms") ? "page" : undefined}
                class={cn(navLinkBase, "hidden sm:inline-flex", isActive("/dashboard/forms") ? navLinkActive : navLinkInactive)}
              >
                {c.forms}
              </a>
            {/if}
            <LanguageSwitch class="mx-1" />
            <DropdownMenu
              align="end"
              label={c.accountMenu}
              triggerClass="p-1 hover:bg-accent text-muted-foreground hover:text-foreground"
            >
              {#snippet trigger()}
                <span
                  class="inline-flex items-center justify-center size-8 rounded-full bg-secondary text-secondary-foreground font-medium text-xs"
                  aria-hidden="true"
                >
                  {userInitial(email)}
                </span>
              {/snippet}
              {#snippet children(close)}
                <div
                  class="px-3 py-2 border-b border-border mb-1"
                >
                  <p class="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {c.signedInAs}
                  </p>
                  <p class="text-sm text-foreground truncate" title={email}>{email}</p>
                </div>
                <!-- On a phone the page links live here; there is no room for them beside the logo. -->
                <DropdownMenuItem
                  href="/dashboard/new"
                  onSelect={() => { goto("/dashboard/new"); close(); }}
                  class="sm:hidden"
                >
                  <IconUploadRegular class="size-4 opacity-70" />
                  {c.newTransfer}
                </DropdownMenuItem>
                <DropdownMenuItem
                  href="/dashboard"
                  onSelect={() => { goto("/dashboard"); close(); }}
                  class={cn("sm:hidden", (isActive("/dashboard", true) || isActive("/dashboard/new")) && "bg-accent")}
                >
                  <IconListRegular class="size-4 opacity-70" />
                  {c.transfers}
                </DropdownMenuItem>
                {#if showPortals}
                  <DropdownMenuItem
                    href="/dashboard/portals"
                    onSelect={() => { goto("/dashboard/portals"); close(); }}
                    class={cn("sm:hidden", isActive("/dashboard/portals") && "bg-accent")}
                  >
                    <IconTrayRegular class="size-4 opacity-70" />
                    {c.portals}
                  </DropdownMenuItem>
                {/if}
                {#if showForms}
                  <DropdownMenuItem
                    href="/dashboard/forms"
                    onSelect={() => { goto("/dashboard/forms"); close(); }}
                    class={cn("sm:hidden", isActive("/dashboard/forms") && "bg-accent")}
                  >
                    <IconClipboardTextRegular class="size-4 opacity-70" />
                    {c.forms}
                  </DropdownMenuItem>
                {/if}
                <div class="my-1 h-px bg-border sm:hidden" role="separator"></div>
                <DropdownMenuItem
                  href="/dashboard/settings/account"
                  onSelect={() => { goto("/dashboard/settings/account"); close(); }}
                  class={isActive("/dashboard/settings") ? "bg-accent" : ""}
                >
                  <IconGearRegular class="size-4 opacity-70" />
                  {c.settings}
                </DropdownMenuItem>
                {#if auth.needsVaultSetup}
                  <DropdownMenuItem
                    onSelect={() => { goto("/setup/vault"); close(); }}
                  >
                    <IconLockRegular class="size-4 opacity-70" />
                    {c.setUpVault}
                  </DropdownMenuItem>
                {:else if vaultUnlocked}
                  <DropdownMenuItem
                    onSelect={() => { handleLock(); close(); }}
                  >
                    <IconLockOpenRegular class="size-4 opacity-70" />
                    {c.lockVault}
                  </DropdownMenuItem>
                {:else}
                  <DropdownMenuItem
                    onSelect={() => { close(); openUnlock(); }}
                  >
                    <IconLockRegular class="size-4 opacity-70" />
                    {c.unlockVault}
                  </DropdownMenuItem>
                {/if}
                <div class="my-1 h-px bg-border" role="separator"></div>
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => { close(); handleLogout(); }}
                >
                  <IconSignOutRegular class="size-4 opacity-70" />
                  {c.signOut}
                </DropdownMenuItem>
              {/snippet}
            </DropdownMenu>
          {:else}
            {#each publicLinks as link (link.href)}
              <a
                href={link.href}
                aria-current={isActive(link.href, true) ? "page" : undefined}
                class={cn(navLinkBase, "hidden sm:inline-flex", isActive(link.href, true) ? navLinkActive : navLinkInactive)}
              >
                {link.label}
              </a>
            {/each}
            <div class="sm:hidden">
              <DropdownMenu
                align="end"
                label={c.menu}
                triggerClass="p-2 hover:bg-accent text-muted-foreground hover:text-foreground"
              >
                {#snippet trigger()}
                  <IconListRegular class="size-5" />
                {/snippet}
                {#snippet children(close)}
                  {#each publicLinks as link (link.href)}
                    <DropdownMenuItem
                      href={link.href}
                      onSelect={() => { goto(link.href); close(); }}
                      class={isActive(link.href, true) ? "bg-accent" : ""}
                    >
                      {link.label}
                    </DropdownMenuItem>
                  {/each}
                {/snippet}
              </DropdownMenu>
            </div>
            <LanguageSwitch class="mx-1" />
            <a
              href="/login"
              aria-current={isActive("/login", true) ? "page" : undefined}
              class={cn(
                "inline-flex items-center rounded-full border border-border/80 bg-card/60 supports-[backdrop-filter]:bg-card/40 backdrop-blur-sm px-4 py-1.5 text-sm font-medium text-foreground transition-[background-color,border-color,color] duration-200 ease-out hover:bg-card hover:border-border focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                isActive("/login", true) && "bg-card border-border",
              )}
            >
              {c.signIn}
            </a>
          {/if}
        {/if}
      </nav>
    </div>
  </header>
  <LanguageSuggestion />

  <main id="main-content">
    {@render children()}
  </main>
</div>

{#if auth.isAuthenticated}
  <Modal
    open={unlockOpen}
    title={c.unlockTitle}
    description={c.unlockBody}
    onClose={closeUnlock}
  >
    <form onsubmit={submitUnlock} class="space-y-4" novalidate>
      <PasskeyUnlockButton active={unlockOpen} disabled={isUnlockingVault} onUnlocked={closeUnlock} />
      {#if unlockMode === "password"}
        <PasswordInput
          id="nav-unlock-password"
          label={c.vaultPassword}
          autocomplete="current-password"
          required
          bind:value={unlockPassword}
          disabled={isUnlockingVault}
        />
      {:else}
        <Textarea
          id="nav-unlock-phrase"
          label={c.recoveryPhrase}
          placeholder="word word word …"
          rows={3}
          bind:value={unlockPhrase}
          disabled={isUnlockingVault}
        />
      {/if}

      <Select
        id="nav-unlock-hold"
        label={c.stayUnlocked}
        bind:value={holdDays}
        disabled={isUnlockingVault}
        options={VAULT_HOLD_DAYS.map((d) => ({ value: String(d), label: c.days(d) }))}
      />

      {#if unlockError}
        <Alert tone="destructive">{unlockError}</Alert>
      {/if}

      {#if hasVaultPassword}
      <button
        type="button"
        onclick={() => {
          unlockMode = unlockMode === "password" ? "phrase" : "password";
          unlockError = null;
        }}
        class="text-xs text-muted-foreground hover:text-foreground hover:cursor-pointer underline-offset-4 hover:underline focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded"
        disabled={isUnlockingVault}
      >
        {unlockMode === "password"
          ? c.usePhrase
          : c.usePassword}
      </button>
      {/if}
    </form>

    {#snippet footer()}
      <Button
        type="button"
        variant="ghost"
        fullWidth={false}
        onclick={closeUnlock}
        disabled={isUnlockingVault}
      >
        {c.cancel}
      </Button>
      <Button
        type="button"
        fullWidth={false}
        onclick={() => submitUnlock()}
        disabled={!canSubmitUnlock}
      >
        {#if isUnlockingVault}
          <Spinner aria-hidden="true" />
          {c.unlocking}
        {:else}
          {c.unlock}
        {/if}
      </Button>
    {/snippet}
  </Modal>
{/if}
