<script lang="ts">
  // Link to the page one level up. PageHeader shows it via its `back` prop;
  // use it directly on a page that has no header in some states.

  import { cn } from "$lib/utils";
  import IconArrowLeftRegular from "phosphor-icons-svelte/IconArrowLeftRegular.svelte";

  interface Props {
    href: string;
    label: string;
    class?: string;
  }

  let { href, label, class: className }: Props = $props();
</script>

<p class={cn("mb-4 text-sm", className)}>
  <a
    {href}
    class="inline-flex items-center gap-1.5 rounded text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
  >
    <IconArrowLeftRegular class="size-3.5" />
    {label}
  </a>
</p>
