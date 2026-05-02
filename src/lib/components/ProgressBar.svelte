<script lang="ts">
  interface Props {
    progress: number;
    label?: string;
  }

  let { progress, label }: Props = $props();
</script>

<div class="w-full">
  {#if label}
    <div class="flex justify-between mb-1 text-sm text-muted-foreground">
      <span>{label}</span>
      <span>{Math.round(progress)}%</span>
    </div>
  {/if}
  <div class="w-full bg-muted rounded-full h-2.5 overflow-hidden">
    <div
      class="bg-info h-2.5 rounded-full transition-[width] duration-200 ease-out"
      style="width: {progress}%"
    ></div>
  </div>
</div>
