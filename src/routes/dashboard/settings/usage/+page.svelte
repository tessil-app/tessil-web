<script lang="ts">
  // What the account uses against what its plan allows. Read-only: the
  // numbers come from /api/me/usage, which reads the counters without
  // spending anything, and from the list of portals.

  import Alert from "$lib/components/Alert.svelte";
  import Badge from "$lib/components/Badge.svelte";
  import Button from "$lib/components/Button.svelte";
  import DetailItem from "$lib/components/DetailItem.svelte";
  import DetailList from "$lib/components/DetailList.svelte";
  import * as Frame from "$lib/components/frame";
  import ProgressBar from "$lib/components/ProgressBar.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import TextLink from "$lib/components/TextLink.svelte";
  import { api, type UsageResponse } from "$lib/api/client";
  import { FORMS_ANNOUNCED, PORTALS_ANNOUNCED } from "$lib/config/launch";
  import { PLANS } from "$lib/config/plans";
  import { formatSize } from "$lib/utils";
  import { onMount } from "svelte";

  let usage = $state<UsageResponse | null>(null);
  let usageError = $state<string | null>(null);
  // How many portals and forms the account owns, against what the plan includes.
  let owned = $state<{ portals: number; maxPortals: number; forms: number; maxForms: number } | null>(null);

  onMount(async () => {
    // Shown when it comes; the page is complete without it.
    void api
      .listPortals()
      .then((res) => {
        const mine = res.portals.filter((p) => p.role === "owner");
        owned = {
          portals: mine.filter((p) => p.kind !== "form").length,
          maxPortals: res.maxPortals,
          forms: mine.filter((p) => p.kind === "form").length,
          maxForms: res.maxForms ?? 0,
        };
      })
      .catch(() => {});
    try {
      usage = await api.getMyUsage();
    } catch (err) {
      usageError = err instanceof Error ? err.message : "Couldn't load usage details.";
    }
  });

  const NEAR = 80;
  const FULL = 95;

  function percent(used: number, cap: number): number {
    if (cap <= 0) return 0;
    return Math.min(100, Math.round((used / cap) * 100));
  }
  function toneOf(pct: number): "info" | "warning" | "destructive" {
    return pct >= FULL ? "destructive" : pct >= NEAR ? "warning" : "info";
  }

  const dayFmt = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "long" });
  const timeFmt = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" });

  /** "on 1 December" for a day further off, "today at 01:00" or "tomorrow at 01:00" when near. */
  function resets(iso: string): string {
    const at = new Date(iso);
    const days = Math.floor((at.getTime() - Date.now()) / 86_400_000);
    if (days >= 2) return `on ${dayFmt.format(at)}`;
    const sameDay = at.toDateString() === new Date().toDateString();
    return `${sameDay ? "today" : "tomorrow"} at ${timeFmt.format(at)}`;
  }

  const planName = $derived(PLANS.find((p) => p.id === usage?.tier)?.name ?? "Free");

  interface Meter {
    id: string;
    title: string;
    value: string;
    pct: number;
    note: string;
  }

  // What is kept now comes first: it is the limit that stops things arriving.
  const meters = $derived.by<Meter[]>(() => {
    if (!usage) return [];
    const list: Meter[] = [];
    if (usage.storage) {
      list.push({
        id: "storage",
        title: "Storage",
        value: `${formatSize(usage.storage.usedBytes)} of ${formatSize(usage.storage.quotaBytes)}`,
        pct: percent(usage.storage.usedBytes, usage.storage.quotaBytes),
        note: "Everything kept for you right now: what you sent and what people sent you. Space comes back when things are deleted or expire.",
      });
    }
    list.push({
      id: "sent",
      title: "Sent by you this month",
      value: `${formatSize(usage.monthlyVolume.usedBytes)} of ${formatSize(usage.monthlyVolume.capBytes)}`,
      pct: percent(usage.monthlyVolume.usedBytes, usage.monthlyVolume.capBytes),
      note: `Starts again ${resets(usage.monthlyVolume.resetAt)}.`,
    });
    if (usage.portalVolume) {
      list.push({
        id: "received",
        title: "Received this month",
        value: `${formatSize(usage.portalVolume.usedBytes)} of ${formatSize(usage.portalVolume.capBytes)}`,
        pct: percent(usage.portalVolume.usedBytes, usage.portalVolume.capBytes),
        note: `Everything people sent you, all links together. It does not use up what you can send. Starts again ${resets(usage.portalVolume.resetAt)}.`,
      });
    }
    list.push({
      id: "daily",
      title: "Transfers today",
      value: `${usage.dailyTransfers.used} of ${usage.dailyTransfers.cap}`,
      pct: percent(usage.dailyTransfers.used, usage.dailyTransfers.cap),
      note: `Starts again ${resets(usage.dailyTransfers.resetAt)}.`,
    });
    return list;
  });

  const tight = $derived(meters.filter((m) => m.pct >= NEAR));
  const canGrow = $derived(PORTALS_ANNOUNCED && usage !== null && usage.tier !== "max");

  const counts = $derived.by(() => {
    if (!owned) return [];
    return [
      ...(owned.maxPortals > 0 ? [{ label: "Portals", used: owned.portals, max: owned.maxPortals }] : []),
      ...(FORMS_ANNOUNCED && owned.maxForms > 0 ? [{ label: "Forms", used: owned.forms, max: owned.maxForms }] : []),
    ];
  });

  function expiry(hours: number[]): string {
    const longest = Math.max(...hours);
    return longest >= 24 ? `${longest / 24} days` : `${longest} hours`;
  }
</script>

<Frame.Root>
  <Frame.Panel>
    <div class="space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2.5">
          <h2 class="text-xl font-semibold text-foreground">Usage</h2>
          {#if usage}
            <Badge tone={usage.tier === "free" ? "muted" : "info"}>{planName}</Badge>
          {/if}
        </div>
        {#if canGrow}
          <Button variant="secondary" fullWidth={false} class="py-2 px-3 text-sm" href="/dashboard/settings/account">
            Change plan
          </Button>
        {/if}
      </div>

      {#if usageError}
        <Alert tone="destructive">{usageError}</Alert>
      {:else if !usage}
        <div class="flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <Spinner aria-hidden="true" />
          Loading usage…
        </div>
      {:else}
        {#if tight.length > 0}
          <Alert tone={tight.some((m) => m.pct >= FULL) ? "destructive" : "warning"}>
            {tight.map((m) => m.title).join(" and ")}
            {tight.length === 1 ? "is" : "are"} close to what {planName} allows.
            {#if canGrow}A larger plan gives more room.{/if}
          </Alert>
        {/if}

        <div class="grid gap-x-8 gap-y-6 sm:grid-cols-2">
          {#each meters as meter (meter.id)}
            <section class="space-y-2" aria-labelledby="usage-{meter.id}">
              <div class="flex items-baseline justify-between gap-3">
                <h3 id="usage-{meter.id}" class="text-sm font-medium text-foreground">{meter.title}</h3>
                <span class="text-sm tabular-nums text-muted-foreground">{meter.pct}%</span>
              </div>
              <p class="text-2xl font-semibold tracking-tight tabular-nums text-foreground">{meter.value}</p>
              <ProgressBar progress={meter.pct} tone={toneOf(meter.pct)} />
              <p class="text-xs leading-relaxed text-muted-foreground">{meter.note}</p>
            </section>
          {/each}
        </div>

        <section class="space-y-3 border-t border-border pt-5">
          <h3 class="text-sm font-medium text-foreground">What {planName} allows</h3>
          <DetailList>
            {#each counts as count (count.label)}
              <DetailItem label={count.label}>{count.used} of {count.max}</DetailItem>
            {/each}
            <DetailItem label="One file">up to {formatSize(usage.caps.maxFileSize)}</DetailItem>
            <DetailItem label="One transfer">up to {formatSize(usage.caps.maxTransferSize)}</DetailItem>
            <DetailItem label="A link can last">up to {expiry(usage.caps.allowedExpiryHours)}</DetailItem>
          </DetailList>
          {#if PORTALS_ANNOUNCED}
            <p class="text-xs text-muted-foreground">
              Every limit of every plan is in the
              <TextLink href="/pricing#compare">comparison</TextLink>.
            </p>
          {/if}
        </section>
      {/if}
    </div>
  </Frame.Panel>
</Frame.Root>
