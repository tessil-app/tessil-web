<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    label: string;
    children: Snippet;
  }

  let { label, children }: Props = $props();
</script>

<dt class="text-muted-foreground">{label}</dt>
<dd class="min-w-0 break-words text-foreground">{@render children()}</dd>
