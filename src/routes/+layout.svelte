<script lang="ts">
  import { afterNavigate, goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { ModeWatcher, setMode } from "mode-watcher";
  import { auth } from "$lib/stores/auth.svelte";
  import {
    lock as lockVault,
    isUnlocked,
    subscribeToVaultState,
    unlockWithPassword,
    unlockWithPhrase,
  } from "$lib/vault/client";
  import { cn } from "$lib/utils";
  import Wordmark from "$lib/components/brand/Wordmark.svelte";
  import DropdownMenu from "$lib/components/DropdownMenu.svelte";
  import DropdownMenuItem from "$lib/components/DropdownMenuItem.svelte";
  import Modal from "$lib/components/Modal.svelte";
  import PasswordInput from "$lib/components/PasswordInput.svelte";
  import Textarea from "$lib/components/Textarea.svelte";
  import Button from "$lib/components/Button.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import Alert from "$lib/components/Alert.svelte";
  import IconGearRegular from "phosphor-icons-svelte/IconGearRegular.svelte";
  import IconLockRegular from "phosphor-icons-svelte/IconLockRegular.svelte";
  import IconLockOpenRegular from "phosphor-icons-svelte/IconLockOpenRegular.svelte";
  import IconSignOutRegular from "phosphor-icons-svelte/IconSignOutRegular.svelte";
  import "../app.css";

  let { children } = $props();

  let vaultUnlocked = $state(false);

  let unlockOpen = $state(false);
  let unlockMode = $state<"password" | "phrase">("password");
  let unlockPassword = $state("");
  let unlockPhrase = $state("");
  let unlockError = $state<string | null>(null);
  let isUnlockingVault = $state(false);

  // Dark mode is scoped to /dashboard; afterNavigate (not $effect) avoids the mode-watcher reactive loop.
  const isApp = $derived($page.url.pathname.startsWith("/dashboard"));
  // Home and the download page run the wide (max-w-7xl) picture-frame layout;
  // the nav matches them so the wordmark/menu align with the content edges.
  // Everywhere else (dashboard + narrow content pages) stays compact at max-w-5xl.
  const isWideNav = $derived(
    $page.url.pathname === "/" || $page.url.pathname.startsWith("/d/"),
  );

  afterNavigate(({ to }) => {
    const path = to?.url.pathname ?? "/";
    if (!path.startsWith("/dashboard")) {
      setMode("light");
    }
  });

  const navLinkBase =
    "px-3 py-2 rounded-md focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
  const navLinkInactive =
    "text-muted-foreground hover:text-foreground hover:bg-accent";
  const navLinkActive = "bg-accent text-foreground";

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
            ? "That password didn't unlock the vault."
            : result.reason === "wrong_phrase"
              ? "That recovery phrase doesn't match. Check spelling and word order."
              : result.reason === "not_setup"
                ? "Vault isn't set up yet. Set one up from settings first."
                : "We couldn't read your vault. Try again.";
        return;
      }
      closeUnlock();
    } catch (err) {
      unlockError = err instanceof Error ? err.message : "Couldn't unlock.";
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

<svelte:head>
  <title>Tessil</title>
  <meta property="og:site_name" content="Tessil" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
</svelte:head>
{#if isApp}
  <ModeWatcher />
{/if}
<a
  href="#main-content"
  class="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-card focus:text-foreground focus:rounded-md focus:outline-2 focus:outline-offset-2 focus:outline-ring"
>
  Skip to main content
</a>
<div class="min-h-screen bg-background text-foreground">
  <header class="sticky top-0 z-40 border-b border-border/40 bg-background/40 backdrop-blur-2xl backdrop-saturate-150 supports-[backdrop-filter]:bg-background/30">
    <div
      class={cn(
        "mx-auto py-3 flex items-center justify-between gap-4",
        isWideNav ? "max-w-7xl px-4 sm:px-6" : "max-w-5xl px-4",
      )}
    >
      <a
        href="/"
        class="inline-flex text-sm hover:opacity-80 transition-opacity duration-200 ease-out focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded"
        aria-label="Tessil — home"
      >
        <Wordmark layout="horizontal" markSize={22} />
      </a>
      <nav class="flex items-center gap-2 text-sm" aria-label="Account">
        {#if auth.loaded}
          {#if auth.isAuthenticated && auth.user}
            {@const email = auth.user.email}
            <a
              href="/dashboard"
              aria-current={isActive("/dashboard", true) ? "page" : undefined}
              class={cn(navLinkBase, isActive("/dashboard", true) ? navLinkActive : navLinkInactive)}
            >
              Dashboard
            </a>
            <DropdownMenu
              align="end"
              label="Account menu"
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
                    Signed in as
                  </p>
                  <p class="text-sm text-foreground truncate" title={email}>{email}</p>
                </div>
                <DropdownMenuItem
                  href="/dashboard/settings/account"
                  onSelect={() => { goto("/dashboard/settings/account"); close(); }}
                  class={isActive("/dashboard/settings") ? "bg-accent" : ""}
                >
                  <IconGearRegular class="size-4 opacity-70" />
                  Settings
                </DropdownMenuItem>
                {#if auth.needsVaultSetup}
                  <DropdownMenuItem
                    onSelect={() => { goto("/setup/vault"); close(); }}
                  >
                    <IconLockRegular class="size-4 opacity-70" />
                    Set up vault
                  </DropdownMenuItem>
                {:else if vaultUnlocked}
                  <DropdownMenuItem
                    onSelect={() => { handleLock(); close(); }}
                  >
                    <IconLockOpenRegular class="size-4 opacity-70" />
                    Lock vault
                  </DropdownMenuItem>
                {:else}
                  <DropdownMenuItem
                    onSelect={() => { close(); openUnlock(); }}
                  >
                    <IconLockRegular class="size-4 opacity-70" />
                    Unlock vault
                  </DropdownMenuItem>
                {/if}
                <div class="my-1 h-px bg-border" role="separator"></div>
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => { close(); handleLogout(); }}
                >
                  <IconSignOutRegular class="size-4 opacity-70" />
                  Sign out
                </DropdownMenuItem>
              {/snippet}
            </DropdownMenu>
          {:else}
            <a
              href="/login"
              aria-current={isActive("/login", true) ? "page" : undefined}
              class={cn(
                "inline-flex items-center rounded-full border border-border/80 bg-card/60 supports-[backdrop-filter]:bg-card/40 backdrop-blur-sm px-4 py-1.5 text-sm font-medium text-foreground transition-[background-color,border-color,color] duration-200 ease-out hover:bg-card hover:border-border focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                isActive("/login", true) && "bg-card border-border",
              )}
            >
              Sign in
            </a>
          {/if}
        {/if}
      </nav>
    </div>
  </header>

  <main id="main-content">
    {@render children()}
  </main>
</div>

{#if auth.isAuthenticated}
  <Modal
    open={unlockOpen}
    title="Unlock your vault"
    description="Unlock to decrypt your transfer names on the dashboard."
    onClose={closeUnlock}
  >
    <form onsubmit={submitUnlock} class="space-y-4" novalidate>
      {#if unlockMode === "password"}
        <PasswordInput
          id="nav-unlock-password"
          label="Vault password"
          autocomplete="current-password"
          required
          bind:value={unlockPassword}
          disabled={isUnlockingVault}
        />
      {:else}
        <Textarea
          id="nav-unlock-phrase"
          label="Recovery phrase"
          placeholder="word word word …"
          rows={3}
          bind:value={unlockPhrase}
          disabled={isUnlockingVault}
        />
      {/if}

      {#if unlockError}
        <Alert tone="destructive">{unlockError}</Alert>
      {/if}

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
          ? "Forgot your password? Use your recovery phrase instead."
          : "Have your password? Use it instead."}
      </button>
    </form>

    {#snippet footer()}
      <Button
        type="button"
        variant="ghost"
        fullWidth={false}
        onclick={closeUnlock}
        disabled={isUnlockingVault}
      >
        Cancel
      </Button>
      <Button
        type="button"
        fullWidth={false}
        onclick={() => submitUnlock()}
        disabled={!canSubmitUnlock}
      >
        {#if isUnlockingVault}
          <Spinner aria-hidden="true" />
          Unlocking…
        {:else}
          Unlock
        {/if}
      </Button>
    {/snippet}
  </Modal>
{/if}
