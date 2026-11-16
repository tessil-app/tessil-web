<script lang="ts">
  // Create a form: name, questions and switches, with a preview of the page
  // people fill in. Its keys go into the vault.

  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import Button from "$lib/components/Button.svelte";
  import EmptyState from "$lib/components/EmptyState.svelte";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import PageLayout from "$lib/components/PageLayout.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import FormEditor from "$lib/components/form/FormEditor.svelte";
  import { api, ApiError } from "$lib/api/client";
  import { newQuestionId, questionLimit } from "$lib/form/questions";
  import { DEFAULT_LOCALE, LOCALES } from "$lib/i18n/locale";
  import { createMyPortal } from "$lib/portal/client";
  import { openMemberPortal } from "$lib/portal/deposits";
  import { PORTAL_TITLE_MAX, PortalBundleTooLargeError, type PortalSettings } from "$lib/portal/keys";
  import { auth } from "$lib/stores/auth.svelte";
  import { isUnlocked, subscribeToVaultState } from "$lib/vault/client";
  import { unlockPrompt } from "$lib/vault/prompt.svelte";
  import { onDestroy } from "svelte";

  type Phase = "loading" | "no_plan" | "full" | "locked" | "ready";

  let phase = $state<Phase>("loading");
  let maxForms = $state(0);
  let canBrand = $state(false);
  let limit = $state(questionLimit(auth.user?.tier));
  let hasLoaded = $state(false);

  const wanted =
    typeof navigator === "undefined"
      ? []
      : (navigator.languages ?? [navigator.language]).map((l) => l.toLowerCase().slice(0, 2));
  const startLang = LOCALES.find((l) => wanted.includes(l)) ?? DEFAULT_LOCALE;
  let initial = $state<PortalSettings>({
    title: "",
    lang: startLang,
    checklist: [],
    message: "",
    thanks: "",
    fieldLabel: "",
    logo: null,
    twoWay: false,
    returns: [],
    // Starts with the question nearly every form asks.
    questions: [{ id: newQuestionId(), type: "short", label: startLang === "nl" ? "Naam" : "Name", required: true }],
    closesAt: null,
    notifyOnDelivery: false,
    hasPassword: false,
    newPassword: "",
  });

  // "Duplicate" on an existing form lands here with its ID.
  const copyFrom = $derived($page.url.searchParams.get("from"));

  async function prefill(userId: string) {
    if (!copyFrom) return;
    const opened = await openMemberPortal(userId, copyFrom, window.location.origin).catch(() => null);
    if (!opened?.ok) return;
    const from = opened.portal;
    initial = {
      ...initial,
      title: `${from.title} (copy)`.slice(0, PORTAL_TITLE_MAX),
      lang: from.lang,
      message: from.message,
      thanks: from.thanks,
      logo: from.logo,
      questions: from.questions,
      notifyOnDelivery: from.notifyOnDelivery,
    };
  }

  async function load() {
    if (!auth.user) return;
    void api
      .getMyUsage()
      .then((u) => {
        canBrand = u.tier === "max";
        limit = questionLimit(u.tier);
      })
      .catch(() => {});
    try {
      const res = await api.listPortals();
      maxForms = res.maxForms ?? 0;
      const owned = res.portals.filter((p) => p.role === "owner" && p.kind === "form").length;
      if (maxForms === 0) phase = "no_plan";
      else if (owned >= maxForms) phase = "full";
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
      if (err instanceof PortalBundleTooLargeError) {
        throw new Error("That is more than a form can hold. Shorten some questions, or remove the logo.");
      }
      if (err instanceof ApiError && err.code === "forms_require_paid_plan") {
        throw new Error("Forms are part of the paid plans.");
      }
      if (err instanceof ApiError && err.code === "form_limit_reached") {
        throw new Error("You have all the forms your plan includes. Delete one first.");
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
    await goto(`/dashboard/forms/${result.portal.id}`);
  }
</script>

<Seo title="New form - Tessil" robots="noindex" />

<!-- Once open, the editor is the whole screen. -->
{#if phase === "ready"}
  <FormEditor {initial} mode="create" onSave={create} cancelHref="/dashboard/forms" questionLimit={limit} {canBrand} />
{:else}
  <PageLayout width="5xl">
    <PageHeader
      title={copyFrom ? "Duplicate form" : "New form"}
      tagline={copyFrom
        ? "A new form with its own link, set up like the one you copied. Responses are not copied."
        : "Questions people answer through a link. Their answers are encrypted before they leave the browser."}
      back={{ href: "/dashboard/forms", label: "All forms" }}
      align="left"
    />

    {#if phase === "loading"}
      <div role="status" aria-live="polite" class="flex flex-col items-center gap-4 py-16 text-info">
        <Spinner class="size-8" aria-hidden="true" />
        <p class="text-muted-foreground">Loading…</p>
      </div>
    {:else if phase === "no_plan"}
      <EmptyState title="Forms are part of the paid plans">
        <p>
          A form is a link where people answer your questions and can add documents, encrypted in
          their browser so only you can read the answers.
        </p>
        {#snippet actions()}
          <Button href="/pricing" fullWidth={false}>See the plans</Button>
        {/snippet}
      </EmptyState>
    {:else if phase === "full"}
      <EmptyState title="You have all the forms your plan includes">
        <p>
          Your plan includes {maxForms}
          {maxForms === 1 ? "form" : "forms"}. Delete one you no longer use, or move to a plan with
          more.
        </p>
        {#snippet actions()}
          <Button href="/pricing" fullWidth={false}>See the plans</Button>
          <Button href="/dashboard/forms" variant="secondary" fullWidth={false}>Your forms</Button>
        {/snippet}
      </EmptyState>
    {:else if phase === "locked"}
      <EmptyState title={auth.needsVaultSetup ? "Forms need a vault" : "Your vault is locked"}>
        <p>A form's keys are kept in your vault, so only you can read what people answer.</p>
        {#snippet actions()}
          {#if auth.needsVaultSetup}
            <Button fullWidth={false} href="/setup/vault">Set up vault</Button>
          {:else}
            <Button fullWidth={false} onclick={() => unlockPrompt.request()}>Unlock vault</Button>
          {/if}
        {/snippet}
      </EmptyState>
    {/if}
  </PageLayout>
{/if}
