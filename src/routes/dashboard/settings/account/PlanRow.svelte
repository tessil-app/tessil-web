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
  import { plansFor } from "$lib/config/plans";
  import { SUPPORT_EMAIL } from "$lib/config/support";
  import { auth } from "$lib/stores/auth.svelte";

  import { appLocale } from "$lib/i18n/app.svelte";
  import { HTML_LANG } from "$lib/i18n/locale";
  import { settingsMessages } from "$lib/i18n/messages/settings";
  import { hrefFor } from "$lib/i18n/paths";
  const locale = $derived(appLocale());
  const t = $derived(settingsMessages[locale].planRow);
  const justPaid = page.url.searchParams.get("upgraded") === "1";
  // The payment provider tells the API a moment after sending the buyer back.
  const ATTEMPTS = 15;
  const PAUSE_MS = 2000;

  let status = $state<BillingStatusResponse | null>(null);
  let arrival = $state<"waiting" | "active" | "slow" | null>(justPaid ? "waiting" : null);
  let opening = $state(false);
  let openError = $state<string | null>(null);

  const dateFmt = $derived(new Intl.DateTimeFormat(HTML_LANG[locale], { day: "numeric", month: "long", year: "numeric" }));

  const sub = $derived(status?.subscription ?? null);
  const onPaidPlan = $derived(status !== null && status.tier !== "free");
  const paid = $derived(onPaidPlan && sub !== null && sub.canceledAt === null);
  const planName = $derived(plansFor(locale).find((p) => p.id === (status?.tier ?? "free"))?.name ?? "Free");
  // The other paid plan, when this one is running and can be changed.
  const other = $derived.by<{ name: string; up: boolean } | null>(() => {
    if (!paid || !sub || sub.status === "past_due" || sub.cancelAtPeriodEnd) return null;
    if (status?.tier === "pro") return { name: "Max", up: true };
    if (status?.tier === "max") return { name: "Pro", up: false };
    return null;
  });
  const visible = $derived(onPaidPlan || PORTALS_ANNOUNCED || arrival !== null);

  const body = $derived.by(() => {
    // Not "Free" in the moment between paying and the plan arriving.
    if (!status || arrival === "waiting") return "";
    // A plan set by hand: nothing to renew or manage.
    if (onPaidPlan && !paid) return t.given(planName);
    if (!paid || !sub) return t.free;
    const date = dateFmt.format(new Date(sub.currentPeriodEnd));
    if (sub.status === "past_due") {
      return t.pastDue(planName);
    }
    if (sub.cancelAtPeriodEnd) {
      return t.ends(planName, date);
    }
    return t.renews(planName, date);
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
      openError = t.openFailed;
      opening = false;
    }
  }
</script>

{#if visible}
  <DividerRow title={t.title} {body}>
    {#snippet actions()}
      {#if paid}
        <!-- Both lead to the payment provider's page, where the change is made and priced. -->
        {#if other}
          <Button variant={other.up ? "primary" : "secondary"} fullWidth={false} onclick={manage} disabled={opening}>
            {other.up ? t.upgradeTo(other.name) : t.downgradeTo(other.name)}
          </Button>
        {/if}
        <Button variant="secondary" fullWidth={false} onclick={manage} disabled={opening}>
          {#if opening}
            <Spinner aria-hidden="true" />
          {/if}
          {t.manage}
        </Button>
      {:else if status && onPaidPlan}
        <!-- A plan given by hand: nothing to manage, but the plans can be looked at. -->
        <Button variant="secondary" fullWidth={false} href={hrefFor("/pricing", locale)}>{t.seePlans}</Button>
      {:else if status && PORTALS_ANNOUNCED && arrival === null}
        <Button fullWidth={false} href={hrefFor("/pricing", locale)}>{t.upgrade}</Button>
      {/if}
    {/snippet}

    {#snippet expanded()}
      {#if arrival === "waiting"}
        <Alert tone="info">
          <span class="inline-flex items-center gap-2">
            <Spinner aria-hidden="true" />
            {t.waiting}
          </span>
        </Alert>
      {:else if arrival === "active"}
        <Alert tone="success" onClose={() => (arrival = null)}>
          {t.active(planName)}
          <TextLink href="/dashboard/portals">{t.createPortal}</TextLink>
        </Alert>
      {:else if arrival === "slow"}
        <Alert tone="warning">
          {t.slow}
          <TextLink href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</TextLink>.
        </Alert>
      {/if}
      {#if openError}
        <Alert tone="destructive">{openError}</Alert>
      {/if}
    {/snippet}
  </DividerRow>
{/if}
