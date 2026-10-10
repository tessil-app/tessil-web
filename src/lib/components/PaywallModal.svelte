<script lang="ts">
  import { api } from "$lib/api/client";
  import { savePass, type StoredPass } from "$lib/billing/pass";
  import Alert from "$lib/components/Alert.svelte";
  import Button from "$lib/components/Button.svelte";
  import Modal from "$lib/components/Modal.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import { PASS_PRICE, PLAN_PRICE } from "$lib/config/pricing";
  import { auth } from "$lib/stores/auth.svelte";
  import { formatSize } from "$lib/utils";

  interface Props {
    open: boolean;
    /** Largest transfer a paid send allows, in bytes. */
    maxTransferSize: number;
    /** Longest expiry a paid send allows, in hours. */
    maxExpiryHours: number;
    /** A pass whose checkout was opened earlier and not yet seen as paid. */
    resume?: StoredPass | null;
    /** Payment confirmed. `passToken` is null when a subscription covers it. */
    onPaid: (passToken: string | null) => void;
    onClose: () => void;
  }

  let { open, maxTransferSize, maxExpiryHours, resume = null, onPaid, onClose }: Props =
    $props();

  const POLL_MS = 3000;
  // Polar checkouts expire; stop asking after this and let the sender retry.
  const POLL_LIMIT_MS = 20 * 60 * 1000;

  type Waiting = { kind: "pass"; token: string; url: string } | { kind: "plan"; url: string };

  let waiting = $state<Waiting | null>(null);
  let busy = $state<"pass" | "plan" | null>(null);
  let error = $state<string | null>(null);

  const maxDays = $derived(Math.round(maxExpiryHours / 24));

  $effect(() => {
    if (!open) {
      waiting = null;
      busy = null;
      error = null;
      return;
    }
    if (resume && !waiting) {
      waiting = { kind: "pass", token: resume.token, url: resume.url };
    }
  });

  $effect(() => {
    const current = waiting;
    if (!open || !current) return;

    const started = Date.now();
    let stopped = false;

    async function check() {
      if (stopped || !current) return;
      if (Date.now() - started > POLL_LIMIT_MS) {
        stopped = true;
        waiting = null;
        error = "The checkout timed out. Nothing was charged unless you finished paying; start again when you are ready.";
        return;
      }
      try {
        if (current.kind === "pass") {
          const { state } = await api.getPassStatus(current.token);
          if (stopped) return;
          if (state === "paid") {
            stopped = true;
            onPaid(current.token);
          }
        } else {
          const { tier } = await api.getBillingStatus();
          if (stopped) return;
          if (tier === "pro") {
            stopped = true;
            await auth.refresh();
            onPaid(null);
          }
        }
      } catch {
        // A failed poll is not a failed payment; the next tick retries.
      }
    }

    const timer = setInterval(check, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  });

  // The tab is opened inside the click handler so the browser treats it as
  // user-initiated; the checkout URL is filled in once the API answers.
  function openCheckoutTab(): Window | null {
    const tab = window.open("", "_blank");
    if (tab) tab.opener = null;
    return tab;
  }

  async function buyPass() {
    if (busy) return;
    busy = "pass";
    error = null;
    const tab = openCheckoutTab();
    try {
      const { token, url } = await api.createPassCheckout();
      savePass({ token, url });
      if (tab) tab.location.href = url;
      waiting = { kind: "pass", token, url };
    } catch (err) {
      tab?.close();
      error = err instanceof Error ? err.message : "Could not start the checkout.";
    } finally {
      busy = null;
    }
  }

  async function subscribe() {
    if (busy) return;
    busy = "plan";
    error = null;
    const tab = openCheckoutTab();
    try {
      const { url } = await api.createBillingCheckout("monthly");
      if (tab) tab.location.href = url;
      waiting = { kind: "plan", url };
    } catch (err) {
      tab?.close();
      error = err instanceof Error ? err.message : "Could not start the checkout.";
    } finally {
      busy = null;
    }
  }

  const optionClass =
    "rounded-lg border border-border bg-muted/30 p-4 flex flex-col gap-3";
  const linkClass = "text-primary underline underline-offset-2";
</script>

<Modal
  {open}
  {onClose}
  title={waiting ? "Finish paying in the other tab" : "Send this transfer"}
  description={waiting
    ? "This page continues on its own once the payment goes through."
    : "Sending on Tessil is paid. Receiving stays free."}
>
  {#if error}
    <Alert tone="destructive">{error}</Alert>
  {/if}

  {#if waiting}
    <div class="flex items-center gap-2 text-sm text-muted-foreground">
      <Spinner aria-hidden="true" />
      Waiting for the payment. Your files stay selected here.
    </div>
    <p class="text-sm text-muted-foreground">
      Checkout did not open, or you closed it?
      <a href={waiting.url} target="_blank" rel="noopener noreferrer" class={linkClass}
        >Open the checkout again</a
      >.
    </p>
    <p class="text-xs text-muted-foreground leading-relaxed">
      You are only charged once you confirm on Polar's page. Closing this
      window does not cancel a payment you already made: a paid pass is kept
      in this browser until it is used.
    </p>
  {:else}
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div class={optionClass}>
        <div>
          <p class="text-sm font-semibold text-foreground">Just this one</p>
          <p class="text-2xl font-semibold text-foreground">
            {PASS_PRICE}
            <span class="text-sm font-normal text-muted-foreground">once</span>
          </p>
        </div>
        <p class="text-xs text-muted-foreground leading-relaxed grow">
          One transfer, up to {formatSize(maxTransferSize)}, kept for up to
          {maxDays} days. No account, nothing recurring.
        </p>
        <Button onclick={buyPass} disabled={busy !== null}>
          {busy === "pass" ? "Opening checkout…" : `Pay ${PASS_PRICE}`}
        </Button>
      </div>

      <div class={optionClass}>
        <div>
          <p class="text-sm font-semibold text-foreground">Send regularly</p>
          <p class="text-2xl font-semibold text-foreground">
            {PLAN_PRICE}
            <span class="text-sm font-normal text-muted-foreground">a month</span>
          </p>
        </div>
        <p class="text-xs text-muted-foreground leading-relaxed grow">
          No fee per transfer, same {formatSize(maxTransferSize)} and
          {maxDays}-day limits, plus a dashboard of what you sent. Needs an
          account.
        </p>
        {#if auth.user}
          <Button variant="secondary" onclick={subscribe} disabled={busy !== null}>
            {busy === "plan" ? "Opening checkout…" : `Subscribe for ${PLAN_PRICE}`}
          </Button>
        {:else}
          <Button variant="secondary" href="/login">Create an account</Button>
        {/if}
      </div>
    </div>

    {#if !auth.user}
      <p class="text-xs text-muted-foreground leading-relaxed">
        Creating an account leaves this page, so you will need to add your
        files again afterwards.
      </p>
    {/if}

    <p class="text-xs text-muted-foreground leading-relaxed">
      <strong class="font-medium text-foreground">Cancelling is one click</strong>
      from your account settings or Polar's customer portal. No notice period,
      and it runs until the end of the month you paid for. Detail on the
      <a href="/pricing#cancel" class={linkClass}>pricing page</a>.
    </p>

    <p class="text-xs text-muted-foreground leading-relaxed">
      Polar handles the payment in a new tab, so your files stay here. Your
      files are still encrypted in this browser, and we do not store which
      payment paid for which transfer.
    </p>
  {/if}

  {#snippet footer()}
    <Button variant="ghost" fullWidth={false} onclick={onClose}>
      {waiting ? "Cancel" : "Not now"}
    </Button>
  {/snippet}
</Modal>
