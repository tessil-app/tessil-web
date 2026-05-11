<script lang="ts">
  import { goto } from "$app/navigation";
  import PageLayout from "$lib/components/PageLayout.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import { auth } from "$lib/stores/auth.svelte";
  import { onMount } from "svelte";

  onMount(() => {
    if (auth.loaded && !auth.isAuthenticated) {
      goto("/login", { replaceState: true });
    }
  });

  $effect(() => {
    if (auth.loaded && !auth.isAuthenticated) {
      goto("/login", { replaceState: true });
    }
  });
</script>

<svelte:head>
  <title>Dashboard — JTransfer</title>
  <meta name="robots" content="noindex, nofollow, noarchive, nosnippet" />
</svelte:head>

<PageLayout>
  {#if !auth.loaded}
    <div
      role="status"
      aria-live="polite"
      class="flex flex-col items-center gap-4 py-16 text-info"
    >
      <Spinner class="w-8 h-8" aria-hidden="true" />
      <p class="text-muted-foreground">Loading…</p>
    </div>
  {:else if auth.user}
    <div class="bg-card border border-border rounded-2xl p-8">
      <h1 class="text-2xl font-semibold text-foreground mb-2">Dashboard</h1>
      <p class="text-sm text-muted-foreground">
        Signed in as <span class="text-foreground">{auth.user.email}</span>.
      </p>
      <p class="text-sm text-muted-foreground mt-4">
        Your transfers will appear here. Coming soon.
      </p>
    </div>
  {/if}
</PageLayout>
