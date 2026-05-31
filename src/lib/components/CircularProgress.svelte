<script lang="ts">
  interface Props {
    /** 0–100 */
    percent: number;
    size?: number;
    stroke?: number;
    /** Center label; defaults to the rounded percent. */
    label?: string;
    /** Small line under the center label. */
    sublabel?: string;
  }

  let { percent, size = 128, stroke = 8, label, sublabel }: Props = $props();

  const clamped = $derived(Math.max(0, Math.min(100, percent)));
  const radius = $derived((size - stroke) / 2);
  const circumference = $derived(2 * Math.PI * radius);
  const dashoffset = $derived(circumference * (1 - clamped / 100));
</script>

<div
  class="relative inline-flex items-center justify-center"
  style="width: {size}px; height: {size}px;"
  role="progressbar"
  aria-valuenow={Math.round(clamped)}
  aria-valuemin="0"
  aria-valuemax="100"
>
  <svg
    width={size}
    height={size}
    viewBox="0 0 {size} {size}"
    class="-rotate-90"
    aria-hidden="true"
  >
    <circle
      cx={size / 2}
      cy={size / 2}
      r={radius}
      fill="none"
      stroke="currentColor"
      stroke-width={stroke}
      class="text-border"
    />
    <circle
      cx={size / 2}
      cy={size / 2}
      r={radius}
      fill="none"
      stroke="currentColor"
      stroke-width={stroke}
      stroke-linecap="round"
      class="text-primary"
      stroke-dasharray={circumference}
      stroke-dashoffset={dashoffset}
      style="transition: stroke-dashoffset 300ms cubic-bezier(0.16, 1, 0.3, 1);"
    />
  </svg>
  <div class="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
    <span class="text-2xl font-semibold text-foreground tabular-nums leading-none">
      {label ?? `${Math.round(clamped)}%`}
    </span>
    {#if sublabel}
      <span class="mt-1 text-xs text-muted-foreground">{sublabel}</span>
    {/if}
  </div>
</div>
