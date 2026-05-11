<script lang="ts">
  import { goto } from "$app/navigation";
  import { ModeWatcher } from "mode-watcher";
  import { auth } from "$lib/stores/auth.svelte";
  import "../app.css";
  let { children } = $props();

  async function handleLogout() {
    await auth.logout();
    goto("/", { replaceState: true });
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
          {#if auth.isAuthenticated}
            <a
              href="/dashboard"
              class="px-3 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Dashboard
            </a>
            <button
              type="button"
              onclick={handleLogout}
              class="hover:cursor-pointer px-3 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Sign out
            </button>
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
