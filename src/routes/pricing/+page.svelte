<script lang="ts">
  // /pricing — public, robots-indexable. The pitch is "support the
  // platform"; the limit table is the tangible kicker (ADR-0006).
  // Authenticated users get a checkout CTA that round-trips through
  // Polar; anonymous visitors get nudged to sign in first so we can
  // bind the resulting Polar Customer to a JTransfer User row.

  import { goto } from "$app/navigation";
  import Alert from "$lib/components/Alert.svelte";
  import Badge from "$lib/components/Badge.svelte";
  import Button from "$lib/components/Button.svelte";
  import * as Frame from "$lib/components/frame";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import PageLayout from "$lib/components/PageLayout.svelte";
  import SegmentedControl from "$lib/components/SegmentedControl.svelte";
  import SiteFooter from "$lib/components/SiteFooter.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import { api } from "$lib/api/client";
  import { auth } from "$lib/stores/auth.svelte";
  import IconCheckRegular from "phosphor-icons-svelte/IconCheckRegular.svelte";

  type Cycle = "monthly" | "annual";

  let cycle = $state<Cycle>("monthly");
  let isRedirecting = $state(false);
  let checkoutError = $state<string | null>(null);

  const isPro = $derived(auth.user?.tier === "pro");

  async function upgrade() {
    if (isRedirecting) return;
    if (!auth.user) {
      // Anonymous: send them to sign in, then bounce back here so the
      // CTA picks up the now-authed state. Pricing isn't a private
      // route, just the checkout step needs a User row to bind the
      // Polar Customer to.
      await goto(`/login?redirect=${encodeURIComponent("/pricing")}`);
      return;
    }
    isRedirecting = true;
    checkoutError = null;
    try {
      const { url } = await api.createBillingCheckout(cycle);
      window.location.href = url;
    } catch (err) {
      checkoutError =
        err instanceof Error
          ? err.message
          : "Couldn't start checkout. Please try again.";
      isRedirecting = false;
    }
  }

  const freeBullets = [
    "1 GiB per file",
    "1 GiB per transfer",
    "2 GB monthly upload volume",
    "Up to 72-hour expiry",
    "End-to-end encryption",
    "Optional account + dashboard",
  ];

  const proBullets = [
    "10 GiB per file",
    "10 GiB per transfer",
    "100 GB monthly upload volume",
    "Up to 30-day expiry",
    "Same end-to-end encryption",
    "Supports the project directly",
  ];
</script>

<svelte:head>
  <title>Pricing — JTransfer</title>
  <meta
    name="description"
    content="JTransfer is built and run by one person. Pro keeps the project alive — and gives you more headroom on every limit."
  />
  <meta name="robots" content="index, follow" />
  <meta property="og:title" content="Pricing — JTransfer" />
  <meta
    property="og:description"
    content="Free is generous. Pro keeps the project alive."
  />
</svelte:head>

<PageLayout width="3xl">
  <PageHeader
    title="Support the project"
    tagline="JTransfer is built and run by one person. Pro keeps the lights on — and gives you more headroom."
  />

  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
      <SegmentedControl
        label="Billing cycle"
        options={[
          { value: "monthly" as Cycle, label: "Monthly" },
          { value: "annual" as Cycle, label: "Annual · save 17%" },
        ]}
        value={cycle}
        onChange={(v: Cycle) => (cycle = v)}
        class="max-w-sm"
      />
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Free column -->
      <Frame.Root>
        <Frame.Panel>
          <div class="space-y-4">
            <div class="flex items-center justify-between gap-2">
              <h2 class="text-xl font-semibold text-foreground">Free</h2>
              {#if !isPro}
                <Badge tone="muted">You're here</Badge>
              {/if}
            </div>
            <p class="text-sm text-muted-foreground">
              For everyone. Anonymous use is welcome and always will be.
            </p>
            <div class="flex items-baseline gap-2">
              <span class="text-3xl font-semibold text-foreground">€0</span>
              <span class="text-sm text-muted-foreground">forever</span>
            </div>
            <ul class="space-y-2">
              {#each freeBullets as bullet}
                <li class="flex items-start gap-2 text-sm text-foreground">
                  <IconCheckRegular class="size-4 mt-0.5 text-muted-foreground shrink-0" />
                  <span>{bullet}</span>
                </li>
              {/each}
            </ul>
          </div>
        </Frame.Panel>
      </Frame.Root>

      <!-- Pro column -->
      <Frame.Root>
        <Frame.Panel>
          <div class="space-y-4">
            <div class="flex items-center justify-between gap-2">
              <h2 class="text-xl font-semibold text-foreground">Pro</h2>
              {#if isPro}
                <Badge tone="success">Active</Badge>
              {/if}
            </div>
            <p class="text-sm text-muted-foreground">
              50× the monthly volume, longer retention, and a way to back
              what JTransfer stands for.
            </p>
            <div class="flex items-baseline gap-2">
              {#if cycle === "monthly"}
                <span class="text-3xl font-semibold text-foreground">€5</span>
                <span class="text-sm text-muted-foreground">/ month</span>
              {:else}
                <span class="text-3xl font-semibold text-foreground">€50</span>
                <span class="text-sm text-muted-foreground">/ year</span>
                <span class="text-xs text-muted-foreground">(~€4.17/mo)</span>
              {/if}
            </div>
            <ul class="space-y-2">
              {#each proBullets as bullet}
                <li class="flex items-start gap-2 text-sm text-foreground">
                  <IconCheckRegular class="size-4 mt-0.5 text-primary shrink-0" />
                  <span>{bullet}</span>
                </li>
              {/each}
            </ul>

            {#if checkoutError}
              <Alert tone="destructive">{checkoutError}</Alert>
            {/if}

            {#if isPro}
              <Button variant="secondary" href="/dashboard/settings/account">
                Manage your subscription
              </Button>
            {:else}
              <Button onclick={upgrade} disabled={isRedirecting}>
                {#if isRedirecting}
                  <Spinner aria-hidden="true" />
                  Opening checkout…
                {:else if !auth.user}
                  Sign in to upgrade
                {:else}
                  Upgrade to Pro
                {/if}
              </Button>
            {/if}
          </div>
        </Frame.Panel>
      </Frame.Root>
    </div>

    <Frame.Root>
      <Frame.Panel>
        <div class="space-y-3 text-sm text-muted-foreground">
          <p class="text-foreground font-medium">A few things worth knowing</p>
          <p>
            Payments are processed by
            <a
              href="https://polar.sh"
              class="text-foreground underline underline-offset-2 hover:no-underline"
              rel="noopener"
            >Polar</a>
            as our Merchant of Record — they handle VAT and invoicing under
            their own entity. We never see your card details.
          </p>
          <p>
            Pro is opt-out at any time. Cancellation keeps your subscription
            active until the end of the period you already paid for, then
            quietly returns you to Free. No refunds, no surprise charges.
          </p>
          <p>
            Privacy and security features stay on Free — passkeys,
            password-protected transfers, end-to-end encryption. Pro is limit
            uplifts, not a paywall on safety.
          </p>
        </div>
      </Frame.Panel>
    </Frame.Root>
  </div>

  <SiteFooter />
</PageLayout>
