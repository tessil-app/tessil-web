<script lang="ts">
  // Dashboard-wide guard: not signed in goes to /login. Waits for
  // `auth.loaded` so a hard refresh doesn't bounce users mid-load. A vault
  // is not required to be here; pages that need one ask for it.

  import { goto } from "$app/navigation";
  import { auth } from "$lib/stores/auth.svelte";

  let { children } = $props();

  $effect(() => {
    if (!auth.loaded) return;
    if (!auth.isAuthenticated) {
      goto("/login", { replaceState: true });
    }
  });
</script>

{@render children()}
