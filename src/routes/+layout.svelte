<script lang="ts">
  import { ModeWatcher } from "mode-watcher";
  import { page } from "$app/stores";
  import "../app.css";
  let { children } = $props();
</script>

<svelte:head>
  <title>JTransfer - Secure File Sharing</title>
  <meta property="og:site_name" content="JTransfer" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
</svelte:head>
<ModeWatcher />
<div class="min-h-screen bg-background text-foreground">
  <div class="border-b border-border/70 bg-background/80 backdrop-blur">
    <div class="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
      <a href="/" class="font-semibold tracking-tight">JTransfer</a>
      <nav class="flex items-center gap-4 text-sm">
        <a
          href="/"
          class="transition-colors {($page.url.pathname === '/' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground')}"
          >File Share</a
        >
        <a
          href="/image-converter"
          class="transition-colors {($page.url.pathname.startsWith('/image-converter') ? 'text-foreground' : 'text-muted-foreground hover:text-foreground')}"
          >Image Converter</a
        >
      </nav>
    </div>
  </div>

  <main id="main-content">
    {@render children()}
  </main>
</div>
