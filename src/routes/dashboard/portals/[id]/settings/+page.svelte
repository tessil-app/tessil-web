<script lang="ts">
  // Change what a portal is called, asks for and shows. Owner only. The
  // link stays the same: only the encrypted bundle behind it is replaced.

  import { page } from "$app/stores";
  import Button from "$lib/components/Button.svelte";
  import EmptyState from "$lib/components/EmptyState.svelte";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import PageLayout from "$lib/components/PageLayout.svelte";
  import PortalEditor from "$lib/components/portal/PortalEditor.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import { api } from "$lib/api/client";
  import {
    openMemberPortal,
    savePortalSettings,
    type OpenedMemberPortal,
  } from "$lib/portal/deposits";
  import type { PortalSettings } from "$lib/portal/keys";
  import { auth } from "$lib/stores/auth.svelte";
  import { subscribeToVaultState } from "$lib/vault/client";
  import { unlockPrompt } from "$lib/vault/prompt.svelte";
  import { onDestroy } from "svelte";
  import { appLocale } from "$lib/i18n/app.svelte";
  import { portalsAppMessages } from "$lib/i18n/messages/portalsApp";

  const locale = $derived(appLocale());
  const all = $derived(portalsAppMessages[locale]);
  const l = $derived(all.list);
  const d = $derived(all.detail);
  const t = $derived(all.edit);

  type Phase = "loading" | "locked" | "missing" | "not_owner" | "ready";

  const portalId = $derived($page.params.id ?? "");
  const backHref = $derived(`/dashboard/portals/${portalId}`);

  let phase = $state<Phase>("loading");
  let portal = $state<OpenedMemberPortal | null>(null);
  let maxTotalSize = $state(0);
  let canBrand = $state(false);
  let hasLoaded = $state(false);

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
      const opened = await openMemberPortal(auth.user.id, portalId, window.location.origin);
      if (!opened.ok) {
        phase = opened.reason === "locked" ? "locked" : "missing";
        return;
      }
      portal = opened.portal;
      phase = opened.portal.role === "owner" ? "ready" : "not_owner";
    } catch {
      phase = "missing";
    }
  }

  $effect(() => {
    if (!auth.loaded || !auth.user || hasLoaded) return;
    hasLoaded = true;
    void load();
  });

  // Only while there is no form on screen, so typing is never thrown away.
  const unsubscribe = subscribeToVaultState(() => {
    if (hasLoaded && phase !== "ready") void load();
  });
  onDestroy(unsubscribe);

  async function save(settings: PortalSettings) {
    if (!portal) return;
    await savePortalSettings(portal, settings);
    const { newPassword: _typed, ...kept } = settings;
    portal = { ...portal, ...kept };
  }
</script>

<Seo title={t.seoTitle(portal?.title ?? null)} robots="noindex" />

<PageLayout width="5xl">
  <PageHeader
    title={t.title}
    tagline={portal ? portal.title : undefined}
    back={{ href: backHref, label: t.back }}
    align="left"
  />

  {#if phase === "loading"}
    <div role="status" aria-live="polite" class="flex flex-col items-center gap-4 py-16 text-info">
      <Spinner class="size-8" aria-hidden="true" />
      <p class="text-muted-foreground">{l.loading}</p>
    </div>
  {:else if phase === "locked"}
    <EmptyState title={auth.needsVaultSetup ? d.needsVault : d.vaultLocked}>
      <p>{t.lockedBody}</p>
      {#snippet actions()}
        {#if auth.needsVaultSetup}
          <Button fullWidth={false} href="/setup/vault">{l.setUpVault}</Button>
        {:else}
          <Button fullWidth={false} onclick={() => unlockPrompt.request()}>{l.unlockVault}</Button>
        {/if}
      {/snippet}
    </EmptyState>
  {:else if phase === "missing"}
    <EmptyState title={d.notFound}>
      <p>{t.notFoundBody}</p>
    </EmptyState>
  {:else if phase === "not_owner"}
    <EmptyState title={t.notOwner}>
      <p>{t.notOwnerBody}</p>
    </EmptyState>
  {:else if portal}
    <PortalEditor
      initial={{
        title: portal.title,
        lang: portal.lang,
        checklist: portal.checklist,
        message: portal.message,
        thanks: portal.thanks,
        fieldLabel: portal.fieldLabel,
        logo: portal.logo,
        twoWay: portal.twoWay,
        returns: portal.returns,
        closesAt: portal.closesAt,
        notifyOnDelivery: portal.notifyOnDelivery,
        hasPassword: portal.hasPassword,
        newPassword: "",
      }}
      mode="edit"
      onSave={save}
      cancelHref={backHref}
      {maxTotalSize}
      {canBrand}
    />
  {/if}
</PageLayout>
