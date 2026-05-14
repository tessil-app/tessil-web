<script lang="ts">
  import { cn } from "$lib/utils";

  interface Props {
    label: string;
    value: string;
    class?: string;
  }

  let { label, value, class: className }: Props = $props();
</script>

<div class={cn("flex flex-col gap-0.5 min-w-0", className)}>
  <dt class="text-xs font-normal text-muted-foreground">{label}</dt>
  <dd class="text-sm text-foreground m-0 break-words">{value}</dd>
</div>
