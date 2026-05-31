<script lang="ts">
  // Read-only view of the user's current consumption against their
  // tier caps. Data comes from /api/me/usage, which reads the
  // rate-limit counters without consuming a slot.

  import Alert from "$lib/components/Alert.svelte";
  import * as Frame from "$lib/components/frame";
  import ProgressBar from "$lib/components/ProgressBar.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import { api, type UsageResponse } from "$lib/api/client";
  import { formatSize } from "$lib/utils";
  import { onMount } from "svelte";

  let usage = $state<UsageResponse | null>(null);
  let usageError = $state<string | null>(null);

  onMount(async () => {
    try {
      usage = await api.getMyUsage();
    } catch (err) {
      usageError =
        err instanceof Error ? err.message : "Couldn't load usage details.";
    }
  });

  function percent(used: number, cap: number): number {
    if (cap <= 0) return 0;
    return Math.min(100, Math.round((used / cap) * 100));
  }

  const dateFmt = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  function relativeReset(iso: string): string {
    const ms = new Date(iso).getTime() - Date.now();
    if (ms <= 0) return "any moment";
    const mins = Math.round(ms / 60000);
    if (mins < 60) return `in ${mins}m`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `in ${hours}h`;
    const days = Math.round(hours / 24);
    return `in ${days}d`;
  }
</script>

<Frame.Root>
  <Frame.Panel>
    <div class="space-y-4">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <h2 class="text-xl font-semibold text-foreground">This period</h2>
      </div>

      {#if usageError}
        <Alert tone="destructive">{usageError}</Alert>
      {:else if !usage}
        <div class="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner aria-hidden="true" />
          Loading usage…
        </div>
      {:else}
        {@const monthlyPct = percent(usage.monthlyVolume.usedBytes, usage.monthlyVolume.capBytes)}
        {@const dailyPct = percent(usage.dailyTransfers.used, usage.dailyTransfers.cap)}

        <section class="space-y-2">
          <div class="flex items-baseline justify-between gap-2 flex-wrap">
            <span class="text-sm font-medium text-foreground">Monthly upload volume</span>
            <span class="text-sm text-muted-foreground">
              {formatSize(usage.monthlyVolume.usedBytes)} of {formatSize(usage.monthlyVolume.capBytes)}
              <span class="text-foreground">({monthlyPct}%)</span>
            </span>
          </div>
          <ProgressBar progress={monthlyPct} />
          <p class="text-xs text-muted-foreground">
            Resets {relativeReset(usage.monthlyVolume.resetAt)} · {dateFmt.format(new Date(usage.monthlyVolume.resetAt))}
          </p>
        </section>

        <section class="space-y-2">
          <div class="flex items-baseline justify-between gap-2 flex-wrap">
            <span class="text-sm font-medium text-foreground">Daily transfers</span>
            <span class="text-sm text-muted-foreground">
              {usage.dailyTransfers.used} of {usage.dailyTransfers.cap}
              <span class="text-foreground">({dailyPct}%)</span>
            </span>
          </div>
          <ProgressBar progress={dailyPct} />
          <p class="text-xs text-muted-foreground">
            Resets {relativeReset(usage.dailyTransfers.resetAt)} · {dateFmt.format(new Date(usage.dailyTransfers.resetAt))}
          </p>
        </section>

        <section class="space-y-2 pt-2 border-t border-border">
          <h3 class="text-sm font-medium text-foreground">Per-transfer limits</h3>
          <dl class="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
            <dt class="text-muted-foreground">Max file size</dt>
            <dd class="text-foreground">{formatSize(usage.caps.maxFileSize)}</dd>

            <dt class="text-muted-foreground">Max total per transfer</dt>
            <dd class="text-foreground">{formatSize(usage.caps.maxTransferSize)}</dd>

            <dt class="text-muted-foreground">Available expiry options</dt>
            <dd class="text-foreground">
              {usage.caps.allowedExpiryHours
                .map((h) => (h >= 24 ? `${h / 24}d` : `${h}h`))
                .join(" · ")}
            </dd>
          </dl>
        </section>

      {/if}
    </div>
  </Frame.Panel>
</Frame.Root>
