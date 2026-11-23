<script lang="ts">
  // Forms the signed-in user is a member of: copy the link, switch off,
  // delete. Titles and links are decrypted in the browser, so they need an
  // unlocked vault. A form is a portal underneath (ADR-0016).

  import TextLink from "$lib/components/TextLink.svelte";
  import { goto } from "$app/navigation";
  import Alert from "$lib/components/Alert.svelte";
  import Badge from "$lib/components/Badge.svelte";
  import Button from "$lib/components/Button.svelte";
  import DetailItem from "$lib/components/DetailItem.svelte";
  import DetailList from "$lib/components/DetailList.svelte";
  import DropdownMenu from "$lib/components/DropdownMenu.svelte";
  import DropdownMenuItem from "$lib/components/DropdownMenuItem.svelte";
  import EmptyState from "$lib/components/EmptyState.svelte";
  import Modal from "$lib/components/Modal.svelte";
  import Notice from "$lib/components/Notice.svelte";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import PageLayout from "$lib/components/PageLayout.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import * as Table from "$lib/components/table";
  import { api } from "$lib/api/client";
  import { ApiError } from "$lib/api/client";
  import TextInput from "$lib/components/TextInput.svelte";
  import { saveTemplate, TEMPLATE_NAME_MAX } from "$lib/form/templates";
  import { DEFAULT_LOCALE } from "$lib/i18n/locale";
  import { loadMyPortals, type MyPortal } from "$lib/portal/client";
  import { openMemberPortal } from "$lib/portal/deposits";
  import { hasClosed } from "$lib/portal/keys";
  import { acceptShare, myFingerprint } from "$lib/portal/sharing";
  import { auth } from "$lib/stores/auth.svelte";
  import { formatSize } from "$lib/utils";
  import { isUnlocked, subscribeToVaultState } from "$lib/vault/client";
  import { unlockPrompt } from "$lib/vault/prompt.svelte";
  import IconDotsThreeRegular from "phosphor-icons-svelte/IconDotsThreeRegular.svelte";
  import { onDestroy } from "svelte";
  import { appLocale } from "$lib/i18n/app.svelte";
  import { hrefFor } from "$lib/i18n/paths";
  import { formsAppMessages } from "$lib/i18n/messages/formsApp";
  import { portalsAppMessages } from "$lib/i18n/messages/portalsApp";

  const locale = $derived(appLocale());
  const t = $derived(formsAppMessages[locale].list);
  const l = $derived(portalsAppMessages[locale].list);

  let portals = $state<MyPortal[]>([]);
  let maxForms = $state(0);
  let isLoading = $state(true);
  let hasLoaded = $state(false);
  let errorMessage = $state<string | null>(null);
  let vaultUnlocked = $state(false);

  let copiedId = $state<string | null>(null);
  let busyId = $state<string | null>(null);
  let confirmDeleteId = $state<string | null>(null);
  let isDeleting = $state(false);

  const ownedCount = $derived(portals.filter((p) => p.role === "owner").length);
  const confirmDeletePortal = $derived(
    confirmDeleteId ? (portals.find((p) => p.id === confirmDeleteId) ?? null) : null,
  );

  let storage = $state<{ usedBytes: number; quotaBytes: number } | null>(null);

  async function load() {
    if (!auth.user) return;
    errorMessage = null;
    // Shown next to the list; the page works without it.
    void api
      .getMyUsage()
      .then((u) => (storage = u.storage ?? null))
      .catch(() => {});
    try {
      vaultUnlocked = await isUnlocked(auth.user.id);
      const res = await loadMyPortals(auth.user.id, window.location.origin);
      portals = res.portals.filter((p) => p.kind === "form");
      maxForms = res.maxForms;
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : t.errors.load;
    } finally {
      isLoading = false;
    }
  }

  $effect(() => {
    if (!auth.loaded || !auth.user || hasLoaded) return;
    hasLoaded = true;
    void load();
  });

  // Titles and links appear as soon as the vault is unlocked, and are
  // dropped again when it locks.
  const unsubscribe = subscribeToVaultState(() => {
    if (hasLoaded) void load();
  });
  onDestroy(unsubscribe);

  async function copyLink(portal: MyPortal) {
    if (!portal.link) return;
    try {
      await navigator.clipboard.writeText(portal.link);
      copiedId = portal.id;
      setTimeout(() => {
        if (copiedId === portal.id) copiedId = null;
      }, 2000);
    } catch {
      errorMessage = l.errors.copy;
    }
  }

  async function toggleDisabled(portal: MyPortal) {
    if (busyId) return;
    busyId = portal.id;
    errorMessage = null;
    try {
      await api.updatePortal(portal.id, { isDisabled: !portal.isDisabled });
      portals = portals.map((p) =>
        p.id === portal.id ? { ...p, isDisabled: !portal.isDisabled } : p,
      );
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : t.errors.update;
    } finally {
      busyId = null;
    }
  }

  // ─── forms shared with this account ───────────────────────────────────────
  let acceptId = $state<string | null>(null);
  let isAccepting = $state(false);
  let acceptError = $state<string | null>(null);
  let ownFingerprint = $state<string | null>(null);
  let leaveId = $state<string | null>(null);
  let isLeaving = $state(false);

  const acceptPortal = $derived(acceptId ? (portals.find((p) => p.id === acceptId) ?? null) : null);
  const leavePortal = $derived(leaveId ? (portals.find((p) => p.id === leaveId) ?? null) : null);

  async function openAccept(portal: MyPortal) {
    // Accepting stores the keys in the vault.
    if (auth.needsVaultSetup) {
      goto("/setup/vault");
      return;
    }
    if (!vaultUnlocked) {
      unlockPrompt.request();
      return;
    }
    acceptError = null;
    ownFingerprint = await myFingerprint();
    acceptId = portal.id;
  }

  async function confirmAccept() {
    if (!auth.user || !acceptId || isAccepting) return;
    isAccepting = true;
    acceptError = null;
    try {
      const result = await acceptShare(auth.user.id, acceptId);
      if (!result.ok) {
        acceptError =
          result.reason === "locked"
            ? l.errors.locked
            : t.errors.notSealed;
        return;
      }
      acceptId = null;
      await load();
    } catch (err) {
      acceptError = err instanceof Error ? err.message : l.errors.accept;
    } finally {
      isAccepting = false;
    }
  }

  async function confirmLeave() {
    if (!auth.user || !leaveId || isLeaving) return;
    isLeaving = true;
    errorMessage = null;
    try {
      await api.removePortalMember(leaveId, auth.user.id);
      portals = portals.filter((p) => p.id !== leaveId);
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : t.errors.leave;
    } finally {
      leaveId = null;
      isLeaving = false;
    }
  }

  async function confirmDelete() {
    if (!confirmDeleteId || isDeleting) return;
    isDeleting = true;
    errorMessage = null;
    try {
      await api.deletePortal(confirmDeleteId);
      portals = portals.filter((p) => p.id !== confirmDeleteId);
      confirmDeleteId = null;
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : t.errors.delete;
      confirmDeleteId = null;
    } finally {
      isDeleting = false;
    }
  }

  // ─── keeping a form's setup as a template ─────────────────────────────────
  let templateOf = $state<MyPortal | null>(null);
  let templateName = $state("");
  let savingTemplate = $state(false);
  let templateError = $state<string | null>(null);
  let templateSaved = $state<string | null>(null);

  function askTemplate(portal: MyPortal) {
    templateOf = portal;
    templateName = (portal.title ?? "").slice(0, TEMPLATE_NAME_MAX);
    templateError = null;
  }

  async function confirmTemplate(e: Event) {
    e.preventDefault();
    if (!auth.user || !templateOf || savingTemplate || !templateName.trim()) return;
    savingTemplate = true;
    templateError = null;
    try {
      const opened = await openMemberPortal(auth.user.id, templateOf.id, window.location.origin);
      if (!opened.ok) {
        templateError =
          opened.reason === "locked" ? l.errors.locked : t.errors.cantOpen;
        return;
      }
      const form = opened.portal;
      const saved = await saveTemplate(auth.user.id, {
        name: templateName.trim(),
        title: form.title,
        lang: form.lang ?? DEFAULT_LOCALE,
        message: form.message,
        thanks: form.thanks,
        questions: form.questions,
        notifyOnDelivery: form.notifyOnDelivery,
      });
      if (!saved) {
        templateError = l.errors.locked;
        return;
      }
      templateSaved = templateName.trim();
      templateOf = null;
    } catch (err) {
      templateError =
        err instanceof ApiError && err.code === "template_limit_reached"
          ? t.errors.templateLimit
          : err instanceof ApiError && err.code === "forms_require_paid_plan"
            ? t.errors.templatePaid
            : t.errors.templateSave;
    } finally {
      savingTemplate = false;
    }
  }

  const dateFmt = $derived(
    new Intl.DateTimeFormat(locale === "nl" ? "nl-NL" : undefined, { year: "numeric", month: "short", day: "numeric" }),
  );
</script>

<Seo title={t.seoTitle} robots="noindex" />

<PageLayout width="5xl">
  {#if !auth.loaded || (auth.user && isLoading)}
    <div role="status" aria-live="polite" class="flex flex-col items-center gap-4 py-16 text-info">
      <Spinner class="size-8" aria-hidden="true" />
      <p class="text-muted-foreground">{l.loading}</p>
    </div>
  {:else if auth.user}
    <PageHeader
      title={t.title}
      tagline={t.tagline}
      align="left"
    >
      {#snippet actions()}
        <!-- The empty state has its own button; two would be one too many. -->
        {#if maxForms > 0 && portals.length > 0}
          <Button fullWidth={false} class="whitespace-nowrap" href="/dashboard/forms/new">{t.newForm}</Button>
        {/if}
      {/snippet}
    </PageHeader>

    <div class="space-y-6">
      {#if errorMessage}
        <Alert tone="destructive">{errorMessage}</Alert>
      {/if}
      {#if templateSaved}
        <Alert tone="success" onClose={() => (templateSaved = null)}>
          {t.templateSaved(templateSaved)}
        </Alert>
      {/if}

      {#if auth.needsVaultSetup && maxForms > 0}
        <Notice>
          {t.needsVault}
          {#snippet action()}
            <Button variant="secondary" fullWidth={false} href="/setup/vault">{l.setUpVault}</Button>
          {/snippet}
        </Notice>
      {:else if !vaultUnlocked && maxForms > 0}
        <Notice>
          {t.vaultLocked}
          {#snippet action()}
            <Button variant="secondary" fullWidth={false} onclick={() => unlockPrompt.request()}>
              {l.unlockVault}
            </Button>
          {/snippet}
        </Notice>
      {/if}

      {#if maxForms === 0 && portals.length === 0}
        <EmptyState title={t.paidTitle}>
          <p>{t.paidBody}</p>
          {#snippet actions()}
            <Button href={hrefFor("/pricing", locale)} fullWidth={false}>{l.seePlans}</Button>
          {/snippet}
        </EmptyState>
      {:else if portals.length === 0}
        <EmptyState title={t.emptyTitle}>
          <p>{t.emptyBody}</p>
          {#snippet actions()}
            <Button fullWidth={false} href="/dashboard/forms/new">{t.createFirst}</Button>
          {/snippet}
        </EmptyState>
      {:else}
        {#snippet nameCell(portal: MyPortal)}
          <div class="min-w-0 flex-1">
            <div class="font-medium text-foreground truncate">
              {#if portal.state === "open"}
                {portal.title}
              {:else if portal.state === "invited"}
                {t.from(portal.sharedBy?.email ?? l.someone)}
              {:else if portal.state === "locked"}
                {t.locked}
              {:else}
                {t.unreadable}
              {/if}
            </div>
            <div class="text-xs text-muted-foreground">
              {#if portal.state === "unreadable"}
                {t.unreadableNote(portal.role === "owner")}
              {:else if portal.state === "invited"}
                {l.invitedNote}
              {:else}
                {l.created(dateFmt.format(new Date(portal.createdAt)))}
                {#if portal.role === "member"}
                  · {l.sharedBy(portal.sharedBy?.email ?? l.someoneElse)}
                {/if}
                <span class="sm:hidden">
                  · {t.responses(portal.deliveries)}{portal.unseen > 0
                    ? `, ${l.newCount(portal.unseen)}`
                    : ""}
                </span>
              {/if}
            </div>
          </div>
        {/snippet}
        {#snippet statusBadge(portal: MyPortal)}
          {@const closed = hasClosed(portal.closesAt)}
          <Badge
            tone={portal.state === "invited" ? "info" : portal.isDisabled || closed ? "muted" : "success"}
          >
            {portal.state === "invited"
              ? l.waiting
              : portal.isDisabled
                ? l.off
                : closed
                  ? l.closed
                  : t.open}
          </Badge>
        {/snippet}

        <Table.Root
          cols="grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.8fr)_9rem]"
          actions="md"
        >
          {#snippet header()}
            <div>{t.colForm}</div>
            <div>{t.colResponses}</div>
            <div>{t.colLast}</div>
            <div>{l.colStored}</div>
            <div>{l.colStatus}</div>
          {/snippet}

          {#each portals as portal (portal.id)}
            <Table.Row
              href={portal.state === "open" ? `/dashboard/forms/${portal.id}` : undefined}
              actionsOnPhone
            >
              {#snippet cells()}
                {@render nameCell(portal)}
                <div class="flex items-center gap-2 text-muted-foreground">
                  {portal.deliveries}
                  {#if portal.unseen > 0}
                    <Badge tone="info">{l.newCount(portal.unseen)}</Badge>
                  {/if}
                </div>
                <div class="text-muted-foreground">
                  {portal.lastDeliveryAt ? dateFmt.format(new Date(portal.lastDeliveryAt)) : l.noneYet}
                </div>
                <div class="text-muted-foreground">
                  {portal.storedBytes > 0 ? formatSize(portal.storedBytes) : "0"}
                </div>
                <div>{@render statusBadge(portal)}</div>
              {/snippet}
              {#snippet stacked()}
                <div class="flex items-center justify-between gap-3">
                  {@render nameCell(portal)}
                  {@render statusBadge(portal)}
                </div>
              {/snippet}
              {#snippet actions()}
                {#if portal.state === "invited"}
                  <Button
                    variant="secondary"
                    fullWidth={false}
                    class="py-2 px-3 text-sm"
                    onclick={() => openAccept(portal)}
                  >
                    {l.accept}
                  </Button>
                {/if}
                {#if portal.link}
                  <button
                    type="button"
                    onclick={() => copyLink(portal)}
                    aria-label={l.copyLinkFor(portal.title ?? "")}
                    class="hidden sm:inline-flex text-xs font-medium px-2 py-2 rounded-md text-muted-foreground transition-colors duration-150 ease-out hover:cursor-pointer hover:text-foreground hover:bg-background focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    {copiedId === portal.id ? l.copied : l.copyLink}
                  </button>
                {/if}
                {#if portal.link || portal.role === "owner" || portal.role === "member"}
                  <DropdownMenu
                    label={t.moreFor(portal.title)}
                    triggerClass="p-2 text-muted-foreground hover:text-foreground hover:bg-background"
                  >
                    {#snippet trigger()}
                      <IconDotsThreeRegular class="size-5" />
                    {/snippet}
                    {#snippet children(close)}
                      {#if portal.link}
                        <DropdownMenuItem
                          onSelect={() => {
                            close();
                            void copyLink(portal);
                          }}
                        >
                          {l.copyLink}
                        </DropdownMenuItem>
                      {/if}
                      {#if portal.role === "member"}
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={busyId === portal.id}
                          onSelect={() => {
                            close();
                            leaveId = portal.id;
                          }}
                        >
                          {portal.state === "invited" ? l.decline : l.leave}
                        </DropdownMenuItem>
                      {/if}
                      {#if portal.role === "owner"}
                        {#if portal.state === "open"}
                          <DropdownMenuItem
                            onSelect={() => {
                              close();
                              void goto(`/dashboard/forms/${portal.id}/settings`);
                            }}
                          >
                            {l.settings}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => {
                              close();
                              void goto(`/dashboard/forms/new?from=${portal.id}`);
                            }}
                          >
                            {l.duplicate}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => {
                              close();
                              askTemplate(portal);
                            }}
                          >
                            {t.saveAsTemplate}
                          </DropdownMenuItem>
                        {/if}
                        <DropdownMenuItem
                          disabled={busyId === portal.id}
                          onSelect={() => {
                            close();
                            void toggleDisabled(portal);
                          }}
                        >
                          {portal.isDisabled ? l.switchOn : l.switchOff}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={busyId === portal.id}
                          onSelect={() => {
                            close();
                            confirmDeleteId = portal.id;
                          }}
                        >
                          {l.delete}
                        </DropdownMenuItem>
                      {/if}
                    {/snippet}
                  </DropdownMenu>
                {/if}
              {/snippet}
            </Table.Row>
          {/each}
        </Table.Root>

        {#if maxForms > 0}
          <p class="text-xs text-muted-foreground">
            {t.onPlan(ownedCount, maxForms)}
            {#if storage}
              {l.storage(formatSize(storage.usedBytes), formatSize(storage.quotaBytes))}
              <TextLink
                href="/dashboard/settings/usage"
              >
                {l.details}
              </TextLink>
            {/if}
          </p>
        {/if}
      {/if}
    </div>
  {/if}
</PageLayout>

<Modal
  open={confirmDeletePortal !== null}
  title={t.deleteTitle}
  description={t.deleteBody}
  onClose={() => (confirmDeleteId = null)}
>
  {#snippet footer()}
    <Button
      type="button"
      variant="ghost"
      fullWidth={false}
      onclick={() => (confirmDeleteId = null)}
      disabled={isDeleting}
    >
      {l.keep}
    </Button>
    <Button type="button" fullWidth={false} onclick={confirmDelete} disabled={isDeleting}>
      {#if isDeleting}
        <Spinner aria-hidden="true" />
        {l.deleting}
      {:else}
        {t.deleteForm}
      {/if}
    </Button>
  {/snippet}
</Modal>

<Modal
  open={templateOf !== null}
  title={t.templateTitle}
  description={t.templateBody}
  onClose={() => {
    if (!savingTemplate) templateOf = null;
  }}
>
  <form id="save-template" onsubmit={confirmTemplate} class="space-y-3" novalidate>
    <TextInput
      id="template-name"
      label={t.templateName}
      maxlength={TEMPLATE_NAME_MAX}
      autocomplete="off"
      bind:value={templateName}
      disabled={savingTemplate}
    />
    {#if templateError}
      <Alert tone="destructive">{templateError}</Alert>
    {/if}
  </form>
  {#snippet footer()}
    <Button type="button" variant="ghost" fullWidth={false} onclick={() => (templateOf = null)} disabled={savingTemplate}>
      {l.cancel}
    </Button>
    <Button type="submit" form="save-template" fullWidth={false} disabled={savingTemplate || !templateName.trim()}>
      {#if savingTemplate}
        <Spinner aria-hidden="true" />
        {t.saving}
      {:else}
        {t.saveTemplate}
      {/if}
    </Button>
  {/snippet}
</Modal>

<Modal
  open={acceptPortal !== null}
  title={t.acceptTitle}
  description={t.acceptBody(acceptPortal?.sharedBy?.email ?? null)}
  onClose={() => (acceptId = null)}
>
  <div class="space-y-3">
    <DetailList>
      <DetailItem label={l.theirKey}>
        <span class="font-mono text-xs">{acceptPortal?.sharedBy?.fingerprint ?? l.unknown}</span>
      </DetailItem>
      <DetailItem label={l.yourKey}>
        <span class="font-mono text-xs">{ownFingerprint ?? l.unknown}</span>
      </DetailItem>
    </DetailList>
    <p class="text-xs text-muted-foreground">
      {l.compare}
    </p>
    {#if acceptError}
      <Alert tone="destructive">{acceptError}</Alert>
    {/if}
  </div>
  {#snippet footer()}
    <Button type="button" variant="ghost" fullWidth={false} onclick={() => (acceptId = null)} disabled={isAccepting}>
      {l.notNow}
    </Button>
    <Button type="button" fullWidth={false} onclick={confirmAccept} disabled={isAccepting}>
      {#if isAccepting}
        <Spinner aria-hidden="true" />
        {l.accepting2}
      {:else}
        {l.accept}
      {/if}
    </Button>
  {/snippet}
</Modal>

<Modal
  open={leavePortal !== null}
  title={leavePortal?.state === "invited" ? t.declineTitle : t.leaveTitle}
  description={t.leaveBody}
  onClose={() => (leaveId = null)}
>
  {#snippet footer()}
    <Button type="button" variant="ghost" fullWidth={false} onclick={() => (leaveId = null)} disabled={isLeaving}>
      {l.cancel}
    </Button>
    <Button type="button" fullWidth={false} onclick={confirmLeave} disabled={isLeaving}>
      {isLeaving ? l.leaving : leavePortal?.state === "invited" ? l.decline : l.leave}
    </Button>
  {/snippet}
</Modal>
