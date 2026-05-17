<script lang="ts">
  // /dashboard/settings has no content of its own — it redirects to the
  // first sub-route. Using a client-side effect (rather than the +page.ts
  // load) keeps the static export simple.

  import { goto } from "$app/navigation";
  import { onMount } from "svelte";

  onMount(() => {
    goto("/dashboard/settings/account", { replaceState: true });
  });
</script>
