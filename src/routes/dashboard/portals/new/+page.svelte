<script lang="ts">
  // Create a portal: name, what to ask for, and the switches, with a
  // preview of the page visitors get. Its keys go into the vault.

  import { goto } from "$app/navigation";
  import Button from "$lib/components/Button.svelte";
  import EmptyState from "$lib/components/EmptyState.svelte";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import PageLayout from "$lib/components/PageLayout.svelte";
  import PortalEditor from "$lib/components/portal/PortalEditor.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import { api, ApiError } from "$lib/api/client";
  import { DEFAULT_LOCALE, LOCALES } from "$lib/i18n/locale";
  import { page } from "$app/stores";
  import { createMyPortal } from "$lib/portal/client";
  import { openMemberPortal } from "$lib/portal/deposits";
  import { PORTAL_TITLE_MAX, type PortalSettings } from "$lib/portal/keys";
  import { auth } from "$lib/stores/auth.svelte";
  import { isUnlocked, subscribeToVaultState } from "$lib/vault/client";
  import { unlockPrompt } from "$lib/vault/prompt.svelte";
  import { onDestroy } from "svelte";

  type Phase = "loading" | "no_plan" | "full" | "locked" | "ready";

  let phase = $state<Phase>("loading");
  let maxPortals = $state(0);
  let maxTotalSize = $state(0);
  let canBrand = $state(false);
  let hasLoaded = $state(false);

  const wanted =
    typeof navigator === "undefined"
      ? []
      : (navigator.languages ?? [navigator.language]).map((l) => l.toLowerCase().slice(0, 2));
  let initial = $state<PortalSettings>({
    title: "",
    lang: LOCALES.find((l) => wanted.includes(l)) ?? DEFAULT_LOCALE,
    checklist: [],
    message: "",
    thanks: "",
    fieldLabel: "",
    logo: null,
    twoWay: false,
    returns: [],
    closesAt: null,
    notifyOnDelivery: false,
    hasPassword: false,
    newPassword: "",
  });

  // "Duplicate" on an existing portal lands here with its ID.
  const copyFrom = $derived($page.url.searchParams.get("from"));

  async function prefill(userId: string) {
    if (!copyFrom) return;
    const opened = await openMemberPortal(userId, copyFrom, window.location.origin).catch(() => null);
    if (!opened?.ok) return;
    const from = opened.portal;
    initial = {
      title: `${from.title} (copy)`.slice(0, PORTAL_TITLE_MAX),
      lang: from.lang,
      checklist: from.checklist,
      message: from.message,
      thanks: from.thanks,
      fieldLabel: from.fieldLabel,
      logo: from.logo,
      twoWay: from.twoWay,
      // Files sent back belong to the original, as does its closing date.
      returns: [],
      closesAt: null,
      notifyOnDelivery: from.notifyOnDelivery,
      // A password cannot be read back, so the copy starts without one.
      hasPassword: false,
      newPassword: "",
    };
  }

  async function load() {
    if (!auth.user) return;
    void api
      .getMyUsage()
      .then((u) => {
        maxTotalSize = u.caps.maxTransferSize;
        canBrand = u.tier === "max";
      })
      .catch(() => {});
    try {
      const res = await api.listPortals();
      maxPortals = res.maxPortals;
      const owned = res.portals.filter((p) => p.role === "owner").length;
      if (maxPortals === 0) phase = "no_plan";
      else if (owned >= maxPortals) phase = "full";
      else if (auth.needsVaultSetup || !(await isUnlocked(auth.user.id))) phase = "locked";
      else {
        await prefill(auth.user.id);
        phase = "ready";
      }
    } catch {
      // The form still works; the server has the last word on limits.
      phase = "ready";
    }
  }

  $effect(() => {
    if (!auth.loaded || !auth.user || hasLoaded) return;
    hasLoaded = true;
    void load();
  });

  // Keeps what was typed when the vault locks while the form is open.
  const unsubscribe = subscribeToVaultState(() => {
    if (hasLoaded && phase === "locked") void load();
  });
  onDestroy(unsubscribe);

  async function create(settings: PortalSettings) {
    if (!auth.user) return;
    let result;
    try {
      result = await createMyPortal(auth.user.id, settings, window.location.origin);
    } catch (err) {
      if (err instanceof ApiError && err.code === "portals_require_paid_plan") {
        throw new Error("Portals are part of the paid plans.");
      }
      if (err instanceof ApiError && err.code === "keypair_required") {
        throw new Error("Lock and unlock your vault once, then try again.");
      }
      throw err;
    }
    if (!result.ok) {
      unlockPrompt.request();
      throw new Error("Your vault is locked. Unlock it and try again.");
    }
    await goto(`/dashboard/portals/${result.portal.id}`);
  }
</script>

<Seo title="New portal - Tessil" robots="noindex" />

<PageLayout width="5xl">
  <PageHeader
    title={copyFrom ? "Duplicate portal" : "New portal"}
    tagline={copyFrom
      ? "A new portal with its own link, set up like the one you copied. Deliveries are not copied."
      : "A link where other people send you files. Set it up the way you want them to see it."}
    back={{ href: "/dashboard/portals", label: "All portals" }}
    align="left"
  />

  {#if phase === "loading"}
    <div role="status" aria-live="polite" class="flex flex-col items-center gap-4 py-16 text-info">
      <Spinner class="size-8" aria-hidden="true" />
      <p class="text-muted-foreground">Loading…</p>
    </div>
  {:else if phase === "no_plan"}
    <EmptyState title="Portals are part of the paid plans">
      <p>
        A portal is a link you hand out so clients or colleagues can send you files, encrypted
        in their browser so only you can open them.
      </p>
      {#snippet actions()}
        <Button href="/pricing" fullWidth={false}>See the plans</Button>
      {/snippet}
    </EmptyState>
  {:else if phase === "full"}
    <EmptyState title="You have all the portals your plan includes">
      <p>
        Your plan includes {maxPortals}
        {maxPortals === 1 ? "portal" : "portals"}. Delete one you no longer use, or move to a
        plan with more.
      </p>
      {#snippet actions()}
        <Button href="/pricing" fullWidth={false}>See the plans</Button>
        <Button href="/dashboard/portals" variant="secondary" fullWidth={false}>Your portals</Button>
      {/snippet}
    </EmptyState>
  {:else if phase === "locked"}
    <EmptyState title={auth.needsVaultSetup ? "Portals need a vault" : "Your vault is locked"}>
      <p>A portal's keys are kept in your vault, so only you can open what people send.</p>
      {#snippet actions()}
        {#if auth.needsVaultSetup}
          <Button fullWidth={false} href="/setup/vault">Set up vault</Button>
        {:else}
          <Button fullWidth={false} onclick={() => unlockPrompt.request()}>Unlock vault</Button>
        {/if}
      {/snippet}
    </EmptyState>
  {:else}
    <PortalEditor
      {initial}
      mode="create"
      onSave={create}
      cancelHref="/dashboard/portals"
      {maxTotalSize}
      {canBrand}
    />
  {/if}
</PageLayout>
