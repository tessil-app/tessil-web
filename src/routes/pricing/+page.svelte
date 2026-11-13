<script lang="ts">
  // Two pages behind one address: what pricing says while everything is
  // free, and what it says once the plans are on sale.

  import { PORTALS_ANNOUNCED } from "$lib/config/launch";
  import Free from "./Free.svelte";
  import Plans from "./Plans.svelte";
</script>

{#if PORTALS_ANNOUNCED}
  <Plans />
{:else}
  <Free />
{/if}
