<script lang="ts">
  // Subscription state for the signed-in user, with the two actions that
  // matter: start the monthly plan, or manage and cancel it.
  import {
    api,
    type BillingStatusResponse,
    type EntitlementResponse,
  } from "$lib/api/client";
  import Alert from "$lib/components/Alert.svelte";
  import Button from "$lib/components/Button.svelte";
  import * as Frame from "$lib/components/frame";
  import { BILLING_PORTAL_URL, PASS_PRICE, PLAN_PRICE } from "$lib/config/pricing";
  import { auth } from "$lib/stores/auth.svelte";
  import { onMount } from "svelte";

  const POLL_MS = 3000;
  const POLL_LIMIT_MS = 20 * 60 * 1000;

  let status = $state<BillingStatusResponse | null>(null);
  let entitlement = $state<EntitlementResponse | null>(null);
  let busy = $state(false);
  let waiting = $state(false);
  let error = $state<string | null>(null);

  const isPro = $derived(status?.tier === "pro");
  const visible = $derived(isPro || entitlement?.paywall === true);

  const dateFmt = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  async function load() {
    try {
      [status, entitlement] = await Promise.all([
        api.getBillingStatus(),
        api.getEntitlement(),
      ]);
    } catch (err) {
      error = err instanceof Error ? err.message : "Couldn't load your plan.";
    }
  }

  onMount(load);

  $effect(() => {
    if (!waiting) return;
    const started = Date.now();
    const timer = setInterval(async () => {
      if (Date.now() - started > POLL_LIMIT_MS) {
        waiting = false;
        return;
      }
      try {
        const next = await api.getBillingStatus();
        if (next.tier === "pro") {
          status = next;
          waiting = false;
          await auth.refresh();
        }
      } catch {
        // Retry on the next tick.
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  });

  // Opened inside the click so the browser allows it; filled in afterwards.
  async function openInTab(getUrl: () => Promise<{ url: string }>): Promise<boolean> {
    if (busy) return false;
    busy = true;
    error = null;
    const tab = window.open("", "_blank");
    if (tab) tab.opener = null;
    try {
      const { url } = await getUrl();
      if (tab) tab.location.href = url;
      else window.location.href = url;
      return true;
    } catch (err) {
      tab?.close();
      error = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      return false;
    } finally {
      busy = false;
    }
  }

  async function subscribe() {
    if (await openInTab(() => api.createBillingCheckout("monthly"))) waiting = true;
  }

  function manage() {
    void openInTab(() => api.openBillingPortal());
  }

  const linkClass = "text-primary underline underline-offset-2";
</script>

{#if visible}
  <Frame.Root>
    <Frame.Panel>
      <div class="space-y-4">
        <h2 class="text-xl font-semibold text-foreground">Plan</h2>

        {#if error}
          <Alert tone="destructive">{error}</Alert>
        {/if}

        {#if isPro && status?.subscription}
          {@const sub = status.subscription}
          <p class="text-sm text-foreground">
            Monthly plan, {PLAN_PRICE} a month.
            {#if sub.cancelAtPeriodEnd}
              Cancelled: it ends on
              {dateFmt.format(new Date(sub.currentPeriodEnd))} and will not renew.
            {:else}
              Renews on {dateFmt.format(new Date(sub.currentPeriodEnd))}.
            {/if}
          </p>
          <div class="flex flex-wrap items-center gap-3">
            <Button variant="secondary" fullWidth={false} onclick={manage} disabled={busy}>
              Manage or cancel
            </Button>
          </div>
          <p class="text-xs text-muted-foreground leading-relaxed">
            Opens Polar's customer portal in a new tab. Cancelling there takes
            one click and the plan runs to the end of the month you paid for.
            You can also reach
            <a href={BILLING_PORTAL_URL} rel="noopener noreferrer" class={linkClass}
              >the portal</a
            >
            directly. More on the
            <a href="/pricing#cancel" class={linkClass}>pricing page</a>.
          </p>
        {:else if waiting}
          <p class="text-sm text-muted-foreground">
            Waiting for the payment in the other tab. This updates on its own.
          </p>
        {:else}
          <p class="text-sm text-muted-foreground">
            No active plan. Each transfer needs a {PASS_PRICE} pass, or you can
            subscribe and send without a fee per transfer.
          </p>
          <div class="flex flex-wrap items-center gap-3">
            <Button fullWidth={false} onclick={subscribe} disabled={busy}>
              Subscribe for {PLAN_PRICE} a month
            </Button>
          </div>
          <p class="text-xs text-muted-foreground leading-relaxed">
            Cancel any time in one click. Details on the
            <a href="/pricing#cancel" class={linkClass}>pricing page</a>.
          </p>
        {/if}
      </div>
    </Frame.Panel>
  </Frame.Root>
{/if}
