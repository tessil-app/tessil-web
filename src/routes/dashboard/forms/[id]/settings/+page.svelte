<script lang="ts">
  // Change a form's name, questions and switches. Owner only. The link stays
  // the same: only the encrypted bundle behind it is replaced. Responses
  // already in keep the wording they were answered with.

  import { page } from "$app/stores";
  import Button from "$lib/components/Button.svelte";
  import EmptyState from "$lib/components/EmptyState.svelte";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import PageLayout from "$lib/components/PageLayout.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import FormEditor from "$lib/components/form/FormEditor.svelte";
  import { api } from "$lib/api/client";
  import { questionLimit } from "$lib/form/questions";
  import { openMemberPortal, savePortalSettings, type OpenedMemberPortal } from "$lib/portal/deposits";
  import { PortalBundleTooLargeError, type PortalSettings } from "$lib/portal/keys";
  import { auth } from "$lib/stores/auth.svelte";
  import { subscribeToVaultState } from "$lib/vault/client";
  import { unlockPrompt } from "$lib/vault/prompt.svelte";
  import { onDestroy } from "svelte";
  import { appLocale } from "$lib/i18n/app.svelte";
  import { formsAppMessages } from "$lib/i18n/messages/formsApp";
  import { portalsAppMessages } from "$lib/i18n/messages/portalsApp";

  const locale = $derived(appLocale());
  const f = $derived(formsAppMessages[locale]);
  const m = $derived(f.edit);
  const l = $derived(portalsAppMessages[locale].list);
  const d = $derived(portalsAppMessages[locale].detail);

  type Phase = "loading" | "locked" | "missing" | "not_owner" | "ready";

  const formId = $derived($page.params.id ?? "");
  const backHref = $derived(`/dashboard/forms/${formId}`);

  let phase = $state<Phase>("loading");
  let form = $state<OpenedMemberPortal | null>(null);
  // From the account as loaded; the editor reads this once, when it opens.
  let canBrand = $state(auth.user?.tier === "max");
  let limit = $state(questionLimit(auth.user?.tier));
  let hasLoaded = $state(false);

  async function load() {
    if (!auth.user) return;
    canBrand = auth.user.tier === "max";
    limit = questionLimit(auth.user.tier);
    void api
      .getMyUsage()
      .then((u) => {
        canBrand = u.tier === "max";
        limit = questionLimit(u.tier);
      })
      .catch(() => {});
    try {
      const opened = await openMemberPortal(auth.user.id, formId, window.location.origin);
      if (!opened.ok) {
        phase = opened.reason === "locked" ? "locked" : "missing";
        return;
      }
      form = opened.portal;
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

  const unsubscribe = subscribeToVaultState(() => {
    if (hasLoaded && phase !== "ready") void load();
  });
  onDestroy(unsubscribe);

  async function save(settings: PortalSettings) {
    if (!form) return;
    try {
      await savePortalSettings(form, settings);
    } catch (err) {
      if (err instanceof PortalBundleTooLargeError) {
        throw new Error(f.create.errors.tooLarge);
      }
      throw err;
    }
    const { newPassword: _typed, ...kept } = settings;
    form = { ...form, ...kept, questions: settings.questions ?? [] };
  }
</script>

<Seo title={m.seoTitle(form?.title ?? null)} robots="noindex" />

<!-- Once open, the editor is the whole screen. -->
{#if phase === "ready" && form}
  <FormEditor
    initial={{
      title: form.title,
      lang: form.lang,
      checklist: [],
      message: form.message,
      thanks: form.thanks,
      fieldLabel: "",
      logo: form.logo,
      twoWay: false,
      returns: [],
      questions: form.questions,
      closesAt: form.closesAt,
      notifyOnDelivery: form.notifyOnDelivery,
      hasPassword: form.hasPassword,
      newPassword: "",
    }}
    mode="edit"
    onSave={save}
    cancelHref={backHref}
    questionLimit={Math.max(limit, form.questions.length)}
    {canBrand}
    uiLocale={locale}
  />
{:else}
  <PageLayout width="5xl">
    <PageHeader
      title={m.title}
      tagline={form ? form.title : undefined}
      back={{ href: backHref, label: m.back }}
      align="left"
    />

    {#if phase === "loading"}
      <div role="status" aria-live="polite" class="flex flex-col items-center gap-4 py-16 text-info">
        <Spinner class="size-8" aria-hidden="true" />
        <p class="text-muted-foreground">{l.loading}</p>
      </div>
    {:else if phase === "locked"}
      <EmptyState title={auth.needsVaultSetup ? d.needsVault : d.vaultLocked}>
        <p>{m.lockedBody}</p>
        {#snippet actions()}
          {#if auth.needsVaultSetup}
            <Button fullWidth={false} href="/setup/vault">{l.setUpVault}</Button>
          {:else}
            <Button fullWidth={false} onclick={() => unlockPrompt.request()}>{l.unlockVault}</Button>
          {/if}
        {/snippet}
      </EmptyState>
    {:else if phase === "missing"}
      <EmptyState title={f.responses.notFound}>
        <p>{f.create.cantCopyBody}</p>
      </EmptyState>
    {:else if phase === "not_owner"}
      <EmptyState title={m.notOwner}>
        <p>{m.notOwnerBody}</p>
      </EmptyState>
    {/if}
  </PageLayout>
{/if}
