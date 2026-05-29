<script lang="ts">
  import { goto } from "$app/navigation";
  import Alert from "$lib/components/Alert.svelte";
  import Badge from "$lib/components/Badge.svelte";
  import Button from "$lib/components/Button.svelte";
  import DividerRow from "$lib/components/DividerRow.svelte";
  import * as Frame from "$lib/components/frame";
  import Spinner from "$lib/components/Spinner.svelte";
  import TextInput from "$lib/components/TextInput.svelte";
  import { api, type BillingStatusResponse } from "$lib/api/client";
  import { auth } from "$lib/stores/auth.svelte";
  import { onMount } from "svelte";

  let isExporting = $state(false);
  let exportError = $state<string | null>(null);

  let confirming = $state(false);
  let confirmEmail = $state("");
  let isDeleting = $state(false);
  let errorMessage = $state<string | null>(null);

  let billing = $state<BillingStatusResponse | null>(null);
  let billingError = $state<string | null>(null);
  let isOpeningPortal = $state(false);

  const dateFmt = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  onMount(async () => {
    try {
      billing = await api.getBillingStatus();
    } catch (err) {
      billingError =
        err instanceof Error ? err.message : "Couldn't load subscription details.";
    }
  });

  async function openPortal() {
    if (isOpeningPortal) return;
    isOpeningPortal = true;
    billingError = null;
    try {
      const { url } = await api.openBillingPortal();
      window.location.href = url;
    } catch (err) {
      billingError =
        err instanceof Error ? err.message : "Couldn't open the billing portal.";
      isOpeningPortal = false;
    }
  }

  async function exportAccount() {
    if (isExporting) return;
    isExporting = true;
    exportError = null;
    try {
      const { blob, filename } = await api.exportMyAccount();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      exportError = err instanceof Error ? err.message : "Couldn't export your data.";
    } finally {
      isExporting = false;
    }
  }

  function startConfirm() {
    confirming = true;
    confirmEmail = "";
    errorMessage = null;
  }

  function cancelConfirm() {
    confirming = false;
    confirmEmail = "";
    errorMessage = null;
  }

  async function deleteAccount() {
    if (isDeleting) return;
    isDeleting = true;
    errorMessage = null;
    try {
      await api.deleteMyAccount(confirmEmail);
      auth.user = null;
      await goto("/?deleted=1", { replaceState: true });
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : "Couldn't delete your account.";
    } finally {
      isDeleting = false;
    }
  }
</script>

<Frame.Root>
  <Frame.Panel>
    <div class="space-y-4">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <h2 class="text-xl font-semibold text-foreground">Subscription</h2>
        {#if billing}
          {#if billing.tier === "pro"}
            {#if billing.subscription?.status === "past_due"}
              <Badge tone="warning">Payment failed</Badge>
            {:else if billing.subscription?.cancelAtPeriodEnd}
              <Badge tone="muted">Ends {dateFmt.format(new Date(billing.subscription.currentPeriodEnd))}</Badge>
            {:else}
              <Badge tone="success">Pro · Active</Badge>
            {/if}
          {:else}
            <Badge tone="muted">Free</Badge>
          {/if}
        {/if}
      </div>

      {#if billingError}
        <Alert tone="destructive">{billingError}</Alert>
      {/if}

      {#if !billing && !billingError}
        <div class="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner aria-hidden="true" />
          Loading subscription…
        </div>
      {:else if billing}
        {#if billing.tier === "pro"}
          {#if billing.subscription?.status === "past_due"}
            <Alert tone="warning" title="Update your card to keep Pro">
              Your latest payment failed. Polar will retry automatically for
              a few days; if all retries fail your subscription will end.
            </Alert>
          {:else if billing.subscription?.cancelAtPeriodEnd}
            <p class="text-sm text-muted-foreground">
              Cancellation scheduled. Pro stays active until
              <span class="text-foreground"
                >{dateFmt.format(new Date(billing.subscription.currentPeriodEnd))}</span
              >, then you'll be back on Free. You can resume from the
              billing portal until then.
            </p>
          {:else if billing.subscription}
            <p class="text-sm text-muted-foreground">
              Thanks for backing the project. Next renewal on
              <span class="text-foreground"
                >{dateFmt.format(new Date(billing.subscription.currentPeriodEnd))}</span
              >.
            </p>
          {/if}

          <div class="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              fullWidth={false}
              onclick={openPortal}
              disabled={isOpeningPortal}
            >
              {#if isOpeningPortal}
                <Spinner aria-hidden="true" />
                Opening portal…
              {:else}
                Manage subscription
              {/if}
            </Button>
          </div>
        {:else}
          {#if billing.subscription?.canceledAt}
            <p class="text-sm text-muted-foreground">
              Your Pro subscription ended on
              <span class="text-foreground"
                >{dateFmt.format(new Date(billing.subscription.canceledAt))}</span
              >. You can resubscribe any time.
            </p>
          {:else}
            <p class="text-sm text-muted-foreground">
              You're on Free. Pro lifts the limits routine users hit.
              €5/month or €50/year, cancel any time.
            </p>
          {/if}

          <div class="flex flex-wrap gap-2">
            <Button
              fullWidth={false}
              onclick={() => goto("/pricing")}
            >
              Upgrade to Pro
            </Button>
          </div>
        {/if}
      {/if}
    </div>
  </Frame.Panel>
</Frame.Root>

<DividerRow
  title="Your data"
  body="Export everything we have on you as JSON: your account, transfers, and recent sign-in activity. File contents aren't included — we never had them."
>
  {#snippet actions()}
    <Button
      variant="secondary"
      fullWidth={false}
      onclick={exportAccount}
      disabled={isExporting}
    >
      {#if isExporting}
        <Spinner aria-hidden="true" />
        Preparing export
      {:else}
        Export
      {/if}
    </Button>
  {/snippet}

  {#snippet expanded()}
    {#if exportError}
      <Alert tone="destructive">
        {exportError}
        {#snippet action()}
          <Button variant="secondary" fullWidth={false} onclick={exportAccount}>
            Retry
          </Button>
        {/snippet}
      </Alert>
    {/if}
  {/snippet}
</DividerRow>

<DividerRow
  title="Danger zone"
  body="Permanently delete your account and all transfers. This can't be undone."
>
  {#snippet actions()}
    {#if !confirming}
      <Button variant="ghost" fullWidth={false} onclick={startConfirm}>
        Delete account
      </Button>
    {/if}
  {/snippet}

  {#snippet expanded()}
    {#if confirming && auth.user}
      <div class="flex flex-wrap items-end gap-2">
        <div class="flex-1 basis-64 min-w-0">
          <TextInput
            id="confirm-email"
            type="email"
            label={`Type ${auth.user.email} to confirm`}
            bind:value={confirmEmail}
            autocomplete="off"
            autocapitalize="off"
            spellcheck={false}
            error={errorMessage ?? undefined}
            disabled={isDeleting}
          />
        </div>
        <Button
          variant="secondary"
          fullWidth={false}
          onclick={cancelConfirm}
          disabled={isDeleting}
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          fullWidth={false}
          onclick={deleteAccount}
          disabled={isDeleting || confirmEmail.trim() !== auth.user.email}
        >
          {#if isDeleting}
            <Spinner aria-hidden="true" />
            Deleting
          {:else}
            Permanently delete
          {/if}
        </Button>
      </div>
    {/if}
  {/snippet}
</DividerRow>
