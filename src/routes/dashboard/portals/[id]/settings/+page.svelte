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

  type Phase = "loading" | "locked" | "missing" | "not_owner" | "ready";

  const portalId = $derived($page.params.id ?? "");
  const backHref = $derived(`/dashboard/portals/${portalId}`);

  let phase = $state<Phase>("loading");
  let portal = $state<OpenedMemberPortal | null>(null);
  let maxTotalSize = $state(0);
  let hasLoaded = $state(false);

  async function load() {
    if (!auth.user) return;
    void api
      .getMyUsage()
      .then((u) => (maxTotalSize = u.caps.maxTransferSize))
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
    portal = { ...portal, ...settings };
  }
</script>

<Seo title="Settings - {portal?.title ?? 'Portal'} - Tessil" robots="noindex" />

<PageLayout width="5xl">
  <PageHeader
    title="Portal settings"
    tagline={portal ? portal.title : undefined}
    back={{ href: backHref, label: "Back to deliveries" }}
    align="left"
  />

  {#if phase === "loading"}
    <div role="status" aria-live="polite" class="flex flex-col items-center gap-4 py-16 text-info">
      <Spinner class="size-8" aria-hidden="true" />
      <p class="text-muted-foreground">Loading…</p>
    </div>
  {:else if phase === "locked"}
    <EmptyState title={auth.needsVaultSetup ? "This needs a vault" : "Your vault is locked"}>
      <p>A portal's settings are encrypted with a key kept in your vault.</p>
      {#snippet actions()}
        {#if auth.needsVaultSetup}
          <Button fullWidth={false} href="/setup/vault">Set up vault</Button>
        {:else}
          <Button fullWidth={false} onclick={() => unlockPrompt.request()}>Unlock vault</Button>
        {/if}
      {/snippet}
    </EmptyState>
  {:else if phase === "missing"}
    <EmptyState title="Portal not found">
      <p>It may have been deleted, or its keys did not open with your vault.</p>
    </EmptyState>
  {:else if phase === "not_owner"}
    <EmptyState title="Only the owner can change this portal">
      <p>It was shared with you, so you can see and download what people send.</p>
    </EmptyState>
  {:else if portal}
    <PortalEditor
      initial={{
        title: portal.title,
        lang: portal.lang,
        checklist: portal.checklist,
        message: portal.message,
        thanks: portal.thanks,
        askSender: portal.askSender,
      }}
      mode="edit"
      onSave={save}
      cancelHref={backHref}
      {maxTotalSize}
    />
  {/if}
</PageLayout>
