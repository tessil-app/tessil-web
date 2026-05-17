<script lang="ts">
  // Dashboard-wide guard. Two gates:
  //   1. Not signed in → /login
  //   2. Signed in but no vault yet → /setup/vault
  // Both gates wait for `auth.loaded` so a hard refresh doesn't bounce
  // users mid-load.

  import { goto } from "$app/navigation";
  import { auth } from "$lib/stores/auth.svelte";

  let { children } = $props();

  $effect(() => {
    if (!auth.loaded) return;
    if (!auth.isAuthenticated) {
      goto("/login", { replaceState: true });
      return;
    }
    if (auth.needsVaultSetup) {
      goto("/setup/vault", { replaceState: true });
    }
  });
</script>

{@render children()}
