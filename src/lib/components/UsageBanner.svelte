<script lang="ts">
  // Surfaces "you're close to a tier cap" in-page. Two thresholds:
  // 80% (yellow, soft nudge) and 95% (warning, more prominent). Each
  // is independently dismissable per billing period — once dismissed
  // at the 80% threshold for this month, the banner doesn't re-appear
  // until either the 95% threshold trips or the next period rolls
  // over. Dismiss state is stored in localStorage keyed by
  // `{period}:{threshold}` so it survives reloads without ever being
  // sent to the server.
  //
  // The parent passes the usage payload (already-fetched on the
  // dashboard) and the banner renders nothing when below 80% on every
  // tracked dimension, OR when the relevant threshold is already
  // dismissed for the current period.

  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import Alert from "$lib/components/Alert.svelte";
  import Button from "$lib/components/Button.svelte";
  import type { UsageResponse } from "$lib/api/client";
  import { formatSize } from "$lib/utils";

  interface Props {
    usage: UsageResponse | null;
  }

  let { usage }: Props = $props();

  // Period key — buckets dismiss state by the volume reset window so
  // dismissals don't carry over into the next period.
  function periodKey(iso: string): string {
    const d = new Date(iso);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  }

  // Threshold levels we track. Order matters — pick the highest
  // tripped + not-yet-dismissed when rendering.
  type Threshold = 80 | 95;

  function pct(used: number, cap: number): number {
    if (cap <= 0) return 0;
    return (used / cap) * 100;
  }

  function storageKey(period: string, threshold: Threshold): string {
    return `jt_usage_banner_dismissed:${period}:${threshold}`;
  }

  // Tracked separately so dismiss is reactive. Hydrated on mount;
  // SSR is off so this runs on the first client paint.
  let dismissed = $state<Record<string, true>>({});

  onMount(() => {
    if (!usage) return;
    const period = periodKey(usage.monthlyVolume.resetAt);
    const snapshot: Record<string, true> = {};
    for (const t of [80, 95] as const) {
      if (localStorage.getItem(storageKey(period, t)) === "1") {
        snapshot[storageKey(period, t)] = true;
      }
    }
    dismissed = snapshot;
  });

  // Compute the highest threshold the user has actually crossed,
  // restricted to dimensions where it matters (monthly volume +
  // daily transfer count). Returns null when nothing's interesting.
  const tripped = $derived.by((): { threshold: Threshold; dimension: string } | null => {
    if (!usage) return null;
    const monthlyPct = pct(usage.monthlyVolume.usedBytes, usage.monthlyVolume.capBytes);
    const dailyPct = pct(usage.dailyTransfers.used, usage.dailyTransfers.cap);
    const worstPct = Math.max(monthlyPct, dailyPct);
    const dimension = monthlyPct >= dailyPct ? "monthly upload volume" : "daily transfers";
    if (worstPct >= 95) return { threshold: 95, dimension };
    if (worstPct >= 80) return { threshold: 80, dimension };
    return null;
  });

  const period = $derived(
    usage ? periodKey(usage.monthlyVolume.resetAt) : "",
  );

  // Skip rendering when the tripped threshold is already dismissed
  // for the current period.
  const shouldShow = $derived.by(() => {
    if (!tripped) return false;
    return !dismissed[storageKey(period, tripped.threshold)];
  });

  function dismiss() {
    if (!tripped) return;
    const key = storageKey(period, tripped.threshold);
    localStorage.setItem(key, "1");
    dismissed = { ...dismissed, [key]: true };
  }

  const detailText = $derived.by(() => {
    if (!usage || !tripped) return "";
    if (tripped.dimension === "monthly upload volume") {
      return `${formatSize(usage.monthlyVolume.usedBytes)} of ${formatSize(usage.monthlyVolume.capBytes)} used this month`;
    }
    return `${usage.dailyTransfers.used} of ${usage.dailyTransfers.cap} transfers today`;
  });

  const isPro = $derived(usage?.tier === "pro");
</script>

{#if shouldShow && tripped}
  <Alert
    tone={tripped.threshold === 95 ? "warning" : "info"}
    onClose={dismiss}
  >
    {#if tripped.threshold === 95}
      You're almost out of {tripped.dimension}. {detailText}.
    {:else}
      You're approaching the {tripped.dimension} cap. {detailText}.
    {/if}
    {#snippet action()}
      {#if !isPro}
        <Button
          variant="secondary"
          fullWidth={false}
          onclick={() => goto("/pricing")}
        >
          Upgrade to Pro
        </Button>
      {/if}
    {/snippet}
  </Alert>
{/if}
