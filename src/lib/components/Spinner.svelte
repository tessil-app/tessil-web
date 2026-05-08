<script lang="ts">
  import { cn } from "$lib/utils";

  interface Props {
    class?: string;
  }

  let { class: className }: Props = $props();
</script>

<div
  class={cn(
    "inline-block w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin",
    className
  )}
  role="status"
  aria-label="Loading"
></div>
