<script lang="ts">
  import { ModeWatcher } from "mode-watcher";
  import "../app.css";
  let { children } = $props();
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
    <div class="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
      <a href="/" class="font-semibold tracking-tight">JTransfer</a>
    </div>
  </header>

  <main id="main-content">
    {@render children()}
  </main>
</div>
