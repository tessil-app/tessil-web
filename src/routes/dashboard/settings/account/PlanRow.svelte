<script lang="ts">
  // The account's plan: what it is, when it renews or ends, and the way
  // to change or cancel it. Also where a buyer lands after paying.

  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import Alert from "$lib/components/Alert.svelte";
  import Button from "$lib/components/Button.svelte";
  import DividerRow from "$lib/components/DividerRow.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import TextLink from "$lib/components/TextLink.svelte";
  import { api, type BillingStatusResponse } from "$lib/api/client";
  import { PORTALS_ANNOUNCED } from "$lib/config/launch";
  import { PLANS } from "$lib/config/plans";
  import { SUPPORT_EMAIL } from "$lib/config/support";
  import { auth } from "$lib/stores/auth.svelte";

  const justPaid = page.url.searchParams.get("upgraded") === "1";
  // The payment provider tells the API a moment after sending the buyer back.
  const ATTEMPTS = 15;
  const PAUSE_MS = 2000;

  let status = $state<BillingStatusResponse | null>(null);
  let arrival = $state<"waiting" | "active" | "slow" | null>(justPaid ? "waiting" : null);
  let opening = $state(false);
  let openError = $state<string | null>(null);

  const dateFmt = new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const sub = $derived(status?.subscription ?? null);
  const paid = $derived(status !== null && status.tier !== "free" && sub !== null);
  const planName = $derived(PLANS.find((p) => p.id === status?.tier)?.name ?? "Free");
  const visible = $derived(paid || PORTALS_ANNOUNCED || arrival !== null);

  const body = $derived.by(() => {
    // Not "Free" in the moment between paying and the plan arriving.
    if (!status || arrival === "waiting") return "";
    if (!paid || !sub) {
      return "Free. A plan adds portals: links where other people send you files.";
    }
    const date = dateFmt.format(new Date(sub.currentPeriodEnd));
    if (sub.status === "past_due") {
      return `${planName}. The last payment did not go through. Update your card to keep it.`;
    }
    if (sub.cancelAtPeriodEnd) {
      return `${planName}. Ends on ${date} and does not renew.`;
    }
    return `${planName}. Renews on ${date}. Change it, update your card or cancel at any time.`;
  });

  onMount(() => {
    let stopped = false;
    (async () => {
      for (let i = 0; i < ATTEMPTS && !stopped; i++) {
        status = await api.getBillingStatus().catch(() => status);
        if (!justPaid || (status && status.tier !== "free")) break;
        await new Promise((r) => setTimeout(r, PAUSE_MS));
      }
      if (!justPaid || stopped) return;
      const active = status !== null && status.tier !== "free";
      arrival = active ? "active" : "slow";
      if (active) await auth.refresh();
      // Drop the marker so a reload does not thank them twice.
      await goto(page.url.pathname, { replaceState: true, noScroll: true, keepFocus: true });
    })();
    return () => {
      stopped = true;
    };
  });

  async function manage() {
    if (opening) return;
    opening = true;
    openError = null;
    try {
      const { url } = await api.openBillingPortal();
      window.location.href = url;
    } catch {
      openError = "Couldn't open your plan settings. Try again in a moment.";
      opening = false;
    }
  }
</script>

{#if visible}
  <DividerRow title="Plan" {body}>
    {#snippet actions()}
      {#if paid}
        <Button variant="secondary" fullWidth={false} onclick={manage} disabled={opening}>
          {#if opening}
            <Spinner aria-hidden="true" />
          {/if}
          Manage plan
        </Button>
      {:else if status && PORTALS_ANNOUNCED && arrival === null}
        <Button variant="secondary" fullWidth={false} href="/pricing">See plans</Button>
      {/if}
    {/snippet}

    {#snippet expanded()}
      {#if arrival === "waiting"}
        <Alert tone="info">
          <span class="inline-flex items-center gap-2">
            <Spinner aria-hidden="true" />
            Payment received. Switching your plan on.
          </span>
        </Alert>
      {:else if arrival === "active"}
        <Alert tone="success" onClose={() => (arrival = null)}>
          You are on {planName}. Thank you.
          <TextLink href="/dashboard/portals">Create a portal</TextLink>
        </Alert>
      {:else if arrival === "slow"}
        <Alert tone="warning">
          Your payment went through, but the plan is not switched on here yet. This can take a
          minute: reload the page. If it stays like this, write to
          <TextLink href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</TextLink>.
        </Alert>
      {/if}
      {#if openError}
        <Alert tone="destructive">{openError}</Alert>
      {/if}
    {/snippet}
  </DividerRow>
{/if}
