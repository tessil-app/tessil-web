<script lang="ts">
  // 80%/95% caps; dismiss state in localStorage keyed by `{period}:{threshold}`.
  // Below 80% on every dimension OR already-dismissed for this period → renders nothing.

  import { onMount } from "svelte";
  import Alert from "$lib/components/Alert.svelte";
  import type { UsageResponse } from "$lib/api/client";
  import { formatSize } from "$lib/utils";

  interface Props {
    usage: UsageResponse | null;
  }

  let { usage }: Props = $props();

  function periodKey(iso: string): string {
    const d = new Date(iso);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  }

  type Threshold = 80 | 95;

  function pct(used: number, cap: number): number {
    if (cap <= 0) return 0;
    return (used / cap) * 100;
  }

  function storageKey(period: string, threshold: Threshold): string {
    return `jt_usage_banner_dismissed:${period}:${threshold}`;
  }

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
  </Alert>
{/if}
