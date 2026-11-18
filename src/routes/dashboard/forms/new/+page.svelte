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
  import { deleteTemplate, loadTemplates, type FormTemplate } from "$lib/form/templates";
  import { forgetTryout, readTryout } from "$lib/form/tryout";
  import Alert from "$lib/components/Alert.svelte";
  import IconButton from "$lib/components/IconButton.svelte";
  import Modal from "$lib/components/Modal.svelte";
  import IconPlusRegular from "phosphor-icons-svelte/IconPlusRegular.svelte";
  import IconTrashRegular from "phosphor-icons-svelte/IconTrashRegular.svelte";
  import { DEFAULT_LOCALE, LOCALES } from "$lib/i18n/locale";
  import { createMyPortal } from "$lib/portal/client";
  import { openMemberPortal } from "$lib/portal/deposits";
  import { PORTAL_TITLE_MAX, PortalBundleTooLargeError, type PortalSettings } from "$lib/portal/keys";
  import { auth } from "$lib/stores/auth.svelte";
  import { isUnlocked, subscribeToVaultState } from "$lib/vault/client";
  import { unlockPrompt } from "$lib/vault/prompt.svelte";
  import { onDestroy } from "svelte";

  // "choose": the account has templates, so it picks one or starts empty first.
  type Phase = "loading" | "no_plan" | "full" | "locked" | "choose" | "ready";

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

  // ─── templates ────────────────────────────────────────────────────────────
  let templates = $state<FormTemplate[]>([]);
  let unreadableTemplates = $state(0);
  let removing = $state<FormTemplate | null>(null);
  let isRemoving = $state(false);
  let templateError = $state<string | null>(null);

  function startFrom(template: FormTemplate | null) {
    if (template) {
      initial = {
        ...initial,
        title: template.title,
        lang: template.lang,
        message: template.message,
        thanks: template.thanks,
        questions: template.questions,
        notifyOnDelivery: template.notifyOnDelivery,
      };
    }
    phase = "ready";
  }

  async function confirmRemove() {
    if (!removing || isRemoving) return;
    isRemoving = true;
    templateError = null;
    try {
      await deleteTemplate(removing.id);
      templates = templates.filter((t) => t.id !== removing?.id);
      removing = null;
      // With the last one gone there is nothing left to choose from.
      if (templates.length === 0) phase = "ready";
    } catch {
      templateError = "Couldn't delete the template. Try again.";
      removing = null;
    } finally {
      isRemoving = false;
    }
  }

  /** True when the editor should open at once: a copy, or a form brought from the try-out. */
  async function prefill(userId: string): Promise<boolean> {
    // A form built on /forms/try before there was an account or a plan.
    const tried = copyFrom ? null : readTryout();
    if (tried) initial = { ...initial, ...tried };
    if (!copyFrom) return tried !== null;
    const opened = await openMemberPortal(userId, copyFrom, window.location.origin).catch(() => null);
    if (!opened?.ok) return true;
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
    return true;
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
      else if (await prefill(auth.user.id)) phase = "ready";
      else {
        // Templates are a help, not a need: without them the editor opens empty.
        const found = await loadTemplates(auth.user.id).catch(() => null);
        if (found?.ok) {
          templates = found.templates;
          unreadableTemplates = found.unreadable;
        }
        phase = templates.length > 0 ? "choose" : "ready";
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

  const dateFmt = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" });

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
    forgetTryout();
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
        : phase === "choose"
          ? "Start empty, or from a template you saved. A template fills in the questions and texts; you can change all of it."
          : "Questions people answer through a link. Their answers are encrypted before they leave the browser."}
      back={{ href: "/dashboard/forms", label: "All forms" }}
      align="left"
    />

    {#if phase === "loading"}
      <div role="status" aria-live="polite" class="flex flex-col items-center gap-4 py-16 text-info">
        <Spinner class="size-8" aria-hidden="true" />
        <p class="text-muted-foreground">Loading…</p>
      </div>
    {:else if phase === "choose"}
      <div class="space-y-4">
        {#if templateError}
          <Alert tone="destructive">{templateError}</Alert>
        {/if}
        <ul class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <li>
            <button
              type="button"
              onclick={() => startFrom(null)}
              class="flex h-full min-h-32 w-full flex-col items-start justify-between gap-4 rounded-lg border border-dashed border-border p-5 text-left transition-colors duration-200 ease-out hover:cursor-pointer hover:border-muted-foreground hover:bg-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span class="inline-flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <IconPlusRegular class="size-4" />
              </span>
              <span>
                <span class="block font-medium text-foreground">Start empty</span>
                <span class="block text-sm text-muted-foreground">A new form with one question to begin with.</span>
              </span>
            </button>
          </li>
          {#each templates as template (template.id)}
            <li class="relative">
              <button
                type="button"
                onclick={() => startFrom(template)}
                class="flex h-full min-h-32 w-full flex-col items-start justify-between gap-4 rounded-lg bg-card p-5 pr-12 text-left transition-colors duration-200 ease-out hover:cursor-pointer hover:bg-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <span class="text-xs text-muted-foreground">Template</span>
                <span class="min-w-0 max-w-full">
                  <span class="block truncate font-medium text-foreground">{template.name}</span>
                  <span class="block text-sm text-muted-foreground">
                    {template.questions.length}
                    {template.questions.length === 1 ? "question" : "questions"}, saved {dateFmt.format(new Date(template.createdAt))}
                  </span>
                </span>
              </button>
              <div class="absolute right-2 top-2">
                <IconButton label="Delete the template {template.name}" tone="destructive" onclick={() => (removing = template)}>
                  <IconTrashRegular class="size-4" />
                </IconButton>
              </div>
            </li>
          {/each}
        </ul>
        {#if unreadableTemplates > 0}
          <p class="text-sm text-muted-foreground">
            {unreadableTemplates}
            {unreadableTemplates === 1 ? "template" : "templates"} did not open with this vault and
            {unreadableTemplates === 1 ? "is" : "are"} not shown.
          </p>
        {/if}
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

<Modal
  open={removing !== null}
  title="Delete this template?"
  description="Forms you already made from it are not touched. This can't be undone."
  onClose={() => {
    if (!isRemoving) removing = null;
  }}
>
  {#snippet footer()}
    <Button type="button" variant="ghost" fullWidth={false} onclick={() => (removing = null)} disabled={isRemoving}>
      Keep it
    </Button>
    <Button type="button" fullWidth={false} onclick={confirmRemove} disabled={isRemoving}>
      {#if isRemoving}
        <Spinner aria-hidden="true" />
        Deleting…
      {:else}
        Delete template
      {/if}
    </Button>
  {/snippet}
</Modal>
