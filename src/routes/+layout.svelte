<script lang="ts">
  import { goto } from "$app/navigation";
  import { ModeWatcher } from "mode-watcher";
  import { auth } from "$lib/stores/auth.svelte";
  import { lock as lockVault } from "$lib/vault/client";
  import DropdownMenu from "$lib/components/DropdownMenu.svelte";
  import DropdownMenuItem from "$lib/components/DropdownMenuItem.svelte";
  import IconGearRegular from "phosphor-icons-svelte/IconGearRegular.svelte";
  import IconLockRegular from "phosphor-icons-svelte/IconLockRegular.svelte";
  import IconSignOutRegular from "phosphor-icons-svelte/IconSignOutRegular.svelte";
  import "../app.css";
  let { children } = $props();

  async function handleLogout() {
    await auth.logout();
    goto("/", { replaceState: true });
  }

  async function handleLock() {
    await lockVault();
  }

  function userInitial(email: string): string {
    return email.trim().charAt(0).toUpperCase() || "?";
  }
</script>

<svelte:head>
  <title>JTransfer</title>
  <meta property="og:site_name" content="JTransfer" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
</svelte:head>
<ModeWatcher />
<a
  href="#main-content"
  class="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-card focus:text-foreground focus:rounded-[calc(var(--radius-2xl)-1px)] focus:outline-2 focus:outline-offset-2 focus:outline-ring"
>
  Skip to main content
</a>
<div class="min-h-screen bg-background text-foreground">
  <header class="border-b border-border/70 bg-background/80 backdrop-blur">
    <div class="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
      <a href="/" class="font-semibold tracking-tight">JTransfer</a>
      <nav class="flex items-center gap-2 text-sm" aria-label="Account">
        {#if auth.loaded}
          {#if auth.isAuthenticated && auth.user}
            {@const email = auth.user.email}
            <a
              href="/dashboard"
              class="px-3 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
                  href="/dashboard/settings"
                  onSelect={() => { goto("/dashboard/settings"); close(); }}
                >
                  <IconGearRegular class="size-4 opacity-70" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => { handleLock(); close(); }}
                >
                  <IconLockRegular class="size-4 opacity-70" />
                  Lock vault
                </DropdownMenuItem>
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
              class="px-3 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
