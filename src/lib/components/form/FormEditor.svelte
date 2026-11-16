<script lang="ts">
  // Build a form: its name, questions and switches, with a live preview of
  // the page people fill in. Used to create a form and to change one.

  import { beforeNavigate } from "$app/navigation";
  import Alert from "$lib/components/Alert.svelte";
  import Badge from "$lib/components/Badge.svelte";
  import Button from "$lib/components/Button.svelte";
  import Checkbox from "$lib/components/Checkbox.svelte";
  import IconButton from "$lib/components/IconButton.svelte";
  import PasswordInput from "$lib/components/PasswordInput.svelte";
  import Reveal from "$lib/components/Reveal.svelte";
  import Select from "$lib/components/Select.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import Switch from "$lib/components/Switch.svelte";
  import Textarea from "$lib/components/Textarea.svelte";
  import TextInput from "$lib/components/TextInput.svelte";
  import TextLink from "$lib/components/TextLink.svelte";
  import FormView from "$lib/components/form/FormView.svelte";
  import {
    FORM_QUESTIONS_MAX,
    QUESTION_HINT_MAX,
    QUESTION_LABEL_MAX,
    QUESTION_OPTION_MAX,
    QUESTION_OPTIONS_MAX,
    hasOptions,
    newQuestionId,
    type Question,
    type QuestionType,
  } from "$lib/form/questions";
  import { DEFAULT_LOCALE, LOCALES, type Locale } from "$lib/i18n/locale";
  import { depositStrings } from "$lib/i18n/messages";
  import type { OpenedPortal } from "$lib/portal/deposit";
  import {
    PORTAL_MESSAGE_MAX,
    PORTAL_PASSWORD_MAX,
    PORTAL_PASSWORD_MIN,
    PORTAL_THANKS_MAX,
    PORTAL_TITLE_MAX,
    logoSrc,
    type PortalLogo,
    type PortalSettings,
  } from "$lib/portal/keys";
  import { prepareLogo } from "$lib/portal/logo";
  import { cn } from "$lib/utils";
  import IconArrowDownRegular from "phosphor-icons-svelte/IconArrowDownRegular.svelte";
  import IconArrowUpRegular from "phosphor-icons-svelte/IconArrowUpRegular.svelte";
  import IconPlusRegular from "phosphor-icons-svelte/IconPlusRegular.svelte";
  import IconTrashRegular from "phosphor-icons-svelte/IconTrashRegular.svelte";
  import IconXRegular from "phosphor-icons-svelte/IconXRegular.svelte";
  import { tick, untrack } from "svelte";

  interface Props {
    initial: PortalSettings;
    mode: "create" | "edit";
    /** Throws with a message fit to show when it fails. */
    onSave: (settings: PortalSettings) => Promise<void>;
    cancelHref: string;
    /** Questions the owner's plan allows per form. */
    questionLimit: number;
    /** The plan includes the Max options: logo and password. */
    canBrand?: boolean;
  }

  let { initial, mode, onSave, cancelHref, questionLimit, canBrand = false }: Props = $props();

  const TYPES: { value: QuestionType; label: string }[] = [
    { value: "short", label: "Short answer" },
    { value: "long", label: "Long answer" },
    { value: "choice", label: "One choice" },
    { value: "choices", label: "Several choices" },
    { value: "yesno", label: "Yes or no" },
    { value: "date", label: "Date" },
    { value: "file", label: "File upload" },
  ];

  const start = untrack(() => initial);
  let title = $state(start.title);
  let lang = $state<Locale>(start.lang ?? DEFAULT_LOCALE);
  let questions = $state<Question[]>(
    (start.questions ?? []).map((q) => ({ ...q, options: q.options ? [...q.options] : undefined })),
  );
  let messageOn = $state(start.message.length > 0);
  let message = $state(start.message);
  let thanksOn = $state(start.thanks.length > 0);
  let thanks = $state(start.thanks);
  let logoOn = $state(start.logo !== null);
  let logo = $state<PortalLogo | null>(start.logo);
  let logoError = $state<string | null>(null);
  let logoBusy = $state(false);
  let logoInput = $state<HTMLInputElement | null>(null);
  const brandLocked = $derived(!canBrand && start.logo === null);

  let passwordOn = $state(start.hasPassword);
  let newPassword = $state("");
  const passwordLocked = $derived(!canBrand && !start.hasPassword);
  const passwordMissing = $derived(passwordOn && !start.hasPassword && newPassword.length < PORTAL_PASSWORD_MIN);
  const passwordShort = $derived(passwordOn && newPassword.length > 0 && newPassword.length < PORTAL_PASSWORD_MIN);

  let closeOn = $state(start.closesAt !== null);
  let closeDay = $state(start.closesAt ? dayOf(new Date(start.closesAt)) : "");
  let notify = $state(start.notifyOnDelivery);

  function dayOf(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function endOfDay(day: string): string | null {
    const [y, m, d] = day.split("-").map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
  }

  const today = dayOf(new Date());

  async function pickLogo(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    logoBusy = true;
    logoError = null;
    try {
      logo = await prepareLogo(file);
    } catch (err) {
      logoError = err instanceof Error ? err.message : "That image could not be used.";
    } finally {
      logoBusy = false;
    }
  }

  // ─── questions ────────────────────────────────────────────────────────────

  const limit = $derived(Math.min(questionLimit, FORM_QUESTIONS_MAX));
  const atLimit = $derived(questions.length >= limit);

  /** As they will be stored: trimmed, and options only where the type has them. */
  function cleaned(list: Question[]): Question[] {
    return list.map((q) => {
      const options = hasOptions(q.type)
        ? [...new Set((q.options ?? []).map((o) => o.trim()).filter(Boolean))]
        : [];
      const hint = q.hint?.trim() ?? "";
      return {
        id: q.id,
        type: q.type,
        label: q.label.trim(),
        ...(hint ? { hint } : {}),
        ...(q.required ? { required: true } : {}),
        ...(options.length > 0 ? { options } : {}),
      };
    });
  }

  function problemOf(q: Question): string | null {
    if (!q.label.trim()) return "Write the question.";
    if (hasOptions(q.type) && !(q.options ?? []).some((o) => o.trim())) return "Add at least one option.";
    return null;
  }

  async function addQuestion() {
    if (atLimit) return;
    const id = newQuestionId();
    questions = [...questions, { id, type: "short", label: "" }];
    view = "form";
    await tick();
    document.getElementById(`fq-${id}-label`)?.focus();
  }

  function setType(index: number, type: QuestionType) {
    const q = questions[index];
    q.type = type;
    if (hasOptions(type) && !(q.options ?? []).length) q.options = ["", ""];
  }

  function move(index: number, by: -1 | 1) {
    const to = index + by;
    if (to < 0 || to >= questions.length) return;
    const next = [...questions];
    [next[index], next[to]] = [next[to], next[index]];
    questions = next;
  }

  function remove(index: number) {
    questions = questions.filter((_, i) => i !== index);
  }

  async function addOption(index: number) {
    const q = questions[index];
    if ((q.options ?? []).length >= QUESTION_OPTIONS_MAX) return;
    q.options = [...(q.options ?? []), ""];
    await tick();
    document.getElementById(`fq-${q.id}-opt-${q.options.length - 1}`)?.focus();
  }

  function removeOption(index: number, at: number) {
    const q = questions[index];
    q.options = (q.options ?? []).filter((_, i) => i !== at);
  }

  // ─── saving ───────────────────────────────────────────────────────────────

  let isSaving = $state(false);
  let saveError = $state<string | null>(null);
  let saved = $state(false);
  let triedSave = $state(false);
  let view = $state<"form" | "sent">("form");

  const settings = $derived<PortalSettings>({
    title: title.trim(),
    lang,
    checklist: [],
    message: messageOn ? message.trim() : "",
    thanks: thanksOn ? thanks.trim() : "",
    fieldLabel: "",
    logo: logoOn ? logo : null,
    twoWay: false,
    returns: [],
    questions: cleaned(questions),
    closesAt: closeOn ? endOfDay(closeDay) : null,
    notifyOnDelivery: notify,
    hasPassword: passwordOn,
    newPassword: passwordOn ? newPassword : "",
  });

  const problems = $derived(questions.map(problemOf));
  const formReady = $derived(questions.length > 0 && problems.every((p) => p === null));

  let baseline = $state(untrack(() => JSON.stringify(settings)));
  const dirty = $derived(JSON.stringify(settings) !== baseline);
  const canSave = $derived(
    settings.title.length > 0 && (mode === "create" || dirty) && !isSaving && !passwordMissing && !passwordShort,
  );

  $effect(() => {
    if (dirty) saved = false;
  });

  let leaving = false;
  beforeNavigate(({ cancel }) => {
    if (leaving || !dirty) return;
    if (!confirm("Leave without saving your changes?")) cancel();
  });

  async function save(e?: Event) {
    e?.preventDefault();
    if (!canSave) return;
    triedSave = true;
    if (!formReady) {
      const first = questions.find((q) => problemOf(q) !== null);
      if (first) document.getElementById(`fq-${first.id}-label`)?.focus();
      else document.getElementById("add-question")?.focus();
      return;
    }
    isSaving = true;
    saveError = null;
    try {
      leaving = mode === "create";
      await onSave(settings);
      baseline = JSON.stringify(settings);
      saved = true;
      triedSave = false;
    } catch (err) {
      leaving = false;
      saveError = err instanceof Error ? err.message : "Couldn't save. Try again.";
    } finally {
      isSaving = false;
    }
  }

  // The preview is the real page, fed from this form instead of a link.
  const previewForm = $derived<OpenedPortal>({
    id: "preview",
    title: settings.title || "Your form's name",
    publicKey: new Uint8Array(),
    linkKey: new Uint8Array(),
    accessToken: null,
    accepting: true,
    maxTotalSize: 0,
    lang,
    checklist: [],
    message: settings.message,
    thanks: settings.thanks,
    fieldLabel: "",
    closesAt: settings.closesAt,
    logo: settings.logo,
    twoWay: false,
    returns: [],
    kind: "form",
    questions: (settings.questions ?? []).map((q) => ({
      ...q,
      label: q.label || "Untitled question",
      ...(hasOptions(q.type) && !q.options?.length ? { options: ["Option 1"] } : {}),
    })),
  });

  const card = "rounded-lg bg-card p-4 sm:p-5";
</script>

{#snippet option(id: string, name: string, about: string, on: boolean, set: (v: boolean) => void, locked: boolean = false)}
  <div class="flex items-start justify-between gap-4">
    <div class="min-w-0 space-y-0.5">
      <p id="{id}-name" class="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
        {name}
        {#if locked}
          <a
            href="/pricing"
            class="focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded-full"
          >
            <Badge tone="info">Max plan</Badge>
          </a>
        {/if}
      </p>
      <p id="{id}-about" class="text-sm text-muted-foreground">{about}</p>
    </div>
    <Switch checked={on} onChange={set} labelledby="{id}-name" describedby="{id}-about" disabled={isSaving || locked} />
  </div>
{/snippet}

<div class="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
  <form onsubmit={save} class="space-y-4" novalidate>
    <section class={cn(card, "space-y-4")}>
      <TextInput
        id="form-title"
        label="Name"
        placeholder="For example: Intake for new clients"
        maxlength={PORTAL_TITLE_MAX}
        required
        bind:value={title}
        disabled={isSaving}
      />
      <p class="-mt-2 text-xs text-muted-foreground">
        People who open the link see this name above the questions. It is encrypted, like
        everything else on this page: we can't read it.
      </p>

      <fieldset class="space-y-2" disabled={isSaving}>
        <legend class="text-sm font-medium text-foreground">Language of the page they see</legend>
        <div class="flex flex-wrap gap-x-5 gap-y-2">
          {#each LOCALES as choice (choice)}
            <label class="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input
                type="radio"
                name="form-language"
                value={choice}
                bind:group={lang}
                class="size-4 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              />
              {depositStrings[choice].languageName}
            </label>
          {/each}
        </div>
        <p class="text-xs text-muted-foreground">Visitors can still switch on the page itself.</p>
      </fieldset>
    </section>

    <section class={cn(card, "space-y-4")} aria-labelledby="questions-heading">
      <div class="flex items-baseline justify-between gap-3">
        <div class="space-y-0.5">
          <h2 id="questions-heading" class="text-sm font-medium text-foreground">Questions</h2>
          <p class="text-sm text-muted-foreground">
            What people answer. A file upload question takes documents; the files count toward
            your storage.
          </p>
        </div>
        <span class="shrink-0 text-xs text-muted-foreground tabular-nums">{questions.length} of {limit}</span>
      </div>

      {#if questions.length > 0}
        <ol class="space-y-3">
          {#each questions as q, i (q.id)}
            {@const problem = triedSave ? problems[i] : null}
            <li class="rounded-md border border-border bg-background p-3 sm:p-4 space-y-3">
              <div class="flex flex-col gap-3 sm:flex-row sm:items-start">
                <div class="min-w-0 flex-1">
                  <TextInput
                    id="fq-{q.id}-label"
                    label="Question {i + 1}"
                    placeholder="For example: What is your name?"
                    maxlength={QUESTION_LABEL_MAX}
                    bind:value={q.label}
                    onfocus={() => (view = "form")}
                    error={problem ?? undefined}
                    disabled={isSaving}
                  />
                </div>
                <Select
                  id="fq-{q.id}-type"
                  label="Type"
                  class="sm:w-44"
                  value={q.type}
                  onchange={(e) => setType(i, (e.currentTarget as HTMLSelectElement).value as QuestionType)}
                  options={TYPES}
                  disabled={isSaving}
                />
              </div>

              <TextInput
                id="fq-{q.id}-hint"
                aria-label="Explanation under question {i + 1}"
                placeholder="Explanation under the question (optional)"
                maxlength={QUESTION_HINT_MAX}
                value={q.hint ?? ""}
                oninput={(e) => (q.hint = (e.currentTarget as HTMLInputElement).value)}
                disabled={isSaving}
              />

              {#if hasOptions(q.type)}
                <fieldset class="space-y-2">
                  <legend class="sr-only">Options for question {i + 1}</legend>
                  {#each q.options ?? [] as _, j (j)}
                    <div class="flex items-center gap-2">
                      <span
                        class={cn(
                          "size-4 shrink-0 border border-input",
                          q.type === "choice" ? "rounded-full" : "rounded",
                        )}
                        aria-hidden="true"
                      ></span>
                      <TextInput
                        id="fq-{q.id}-opt-{j}"
                        aria-label="Option {j + 1}"
                        placeholder="Option {j + 1}"
                        maxlength={QUESTION_OPTION_MAX}
                        class="min-w-0 flex-1"
                        value={q.options?.[j] ?? ""}
                        oninput={(e) => {
                          if (q.options) q.options[j] = (e.currentTarget as HTMLInputElement).value;
                        }}
                        onkeydown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void addOption(i);
                          }
                        }}
                        disabled={isSaving}
                      />
                      <IconButton
                        label="Remove option {j + 1}"
                        onclick={() => removeOption(i, j)}
                        disabled={isSaving || (q.options ?? []).length <= 1}
                      >
                        <IconXRegular class="size-4" />
                      </IconButton>
                    </div>
                  {/each}
                  {#if (q.options ?? []).length < QUESTION_OPTIONS_MAX}
                    <TextLink class="text-sm" onclick={() => addOption(i)} disabled={isSaving}>Add option</TextLink>
                  {/if}
                </fieldset>
              {/if}

              <div class="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                <Checkbox bind:checked={q.required} disabled={isSaving}>Required</Checkbox>
                <div class="flex items-center gap-1">
                  <IconButton label="Move question {i + 1} up" onclick={() => move(i, -1)} disabled={isSaving || i === 0}>
                    <IconArrowUpRegular class="size-4" />
                  </IconButton>
                  <IconButton
                    label="Move question {i + 1} down"
                    onclick={() => move(i, 1)}
                    disabled={isSaving || i === questions.length - 1}
                  >
                    <IconArrowDownRegular class="size-4" />
                  </IconButton>
                  <IconButton label="Remove question {i + 1}" tone="destructive" onclick={() => remove(i)} disabled={isSaving}>
                    <IconTrashRegular class="size-4" />
                  </IconButton>
                </div>
              </div>
            </li>
          {/each}
        </ol>
      {:else if triedSave}
        <p role="alert" class="text-sm text-destructive-foreground">Add at least one question.</p>
      {/if}

      {#if atLimit}
        <p class="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {#if limit < FORM_QUESTIONS_MAX}
            Your plan allows {limit} questions per form.
            <a
              href="/pricing"
              class="rounded-full focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <Badge tone="info">Max plan: {FORM_QUESTIONS_MAX}</Badge>
            </a>
          {:else}
            A form holds at most {FORM_QUESTIONS_MAX} questions.
          {/if}
        </p>
      {:else}
        <Button id="add-question" type="button" variant="secondary" fullWidth={false} onclick={addQuestion} disabled={isSaving}>
          <IconPlusRegular class="size-4" />
          Add question
        </Button>
      {/if}
    </section>

    <section class={cn(card, "space-y-4")} aria-labelledby="options-heading">
      <h2 id="options-heading" class="text-sm font-medium text-foreground">Options</h2>

      <div>
        {@render option(
          "opt-message",
          "Welcome message",
          "A few lines under the name: what the form is for, and by when.",
          messageOn,
          (v) => {
            messageOn = v;
            if (v) view = "form";
          },
        )}
        <Reveal open={messageOn}>
          <Textarea
            id="form-message"
            aria-labelledby="opt-message-name"
            placeholder="For example: Fill this in before our first meeting. It takes about five minutes."
            rows={3}
            maxlength={PORTAL_MESSAGE_MAX}
            bind:value={message}
            onfocus={() => (view = "form")}
            disabled={isSaving}
          />
        </Reveal>
      </div>

      <div class="border-t border-border pt-5">
        {@render option(
          "opt-thanks",
          "Thank-you note",
          "Shown after sending: what happens next, or when they will hear from you.",
          thanksOn,
          (v) => {
            thanksOn = v;
            if (v) view = "sent";
          },
        )}
        <Reveal open={thanksOn}>
          <Textarea
            id="form-thanks"
            aria-labelledby="opt-thanks-name"
            placeholder="For example: Thank you. We will call you within two working days."
            rows={2}
            maxlength={PORTAL_THANKS_MAX}
            bind:value={thanks}
            onfocus={() => (view = "sent")}
            disabled={isSaving}
          />
        </Reveal>
      </div>

      <div class="border-t border-border pt-5">
        {@render option(
          "opt-logo",
          "Your logo",
          "Shown above the name. Encrypted like the name: we can't see it.",
          logoOn,
          (v) => {
            logoOn = v;
            if (v) view = "form";
          },
          brandLocked,
        )}
        <Reveal open={logoOn}>
          <input bind:this={logoInput} type="file" accept="image/png,image/jpeg,image/webp" class="hidden" onchange={pickLogo} />
          <div class="flex flex-wrap items-center gap-3">
            {#if logo}
              <span class="flex h-14 items-center rounded-md border border-border bg-background px-3">
                <img src={logoSrc(logo)} alt="Your logo" class="max-h-9 max-w-[140px] object-contain" />
              </span>
            {/if}
            {#if canBrand || !logo}
              <Button
                type="button"
                variant="secondary"
                fullWidth={false}
                onclick={() => logoInput?.click()}
                disabled={isSaving || logoBusy || !canBrand}
              >
                {logoBusy ? "Preparing…" : logo ? "Replace" : "Choose image"}
              </Button>
            {/if}
            {#if logo}
              <TextLink onclick={() => (logo = null)} disabled={isSaving} class="text-sm text-muted-foreground">Remove</TextLink>
            {/if}
          </div>
          <p class="mt-2 text-xs text-muted-foreground">
            PNG, JPG or WebP. It is made smaller here in your browser before it is stored.
          </p>
          {#if logoError}
            <p role="alert" class="mt-1 text-xs text-destructive-foreground">{logoError}</p>
          {/if}
        </Reveal>
      </div>

      <div class="border-t border-border pt-5">
        {@render option(
          "opt-password",
          "Password",
          "The page asks for it before showing the questions. Pass it on separately from the link.",
          passwordOn,
          (v) => (passwordOn = v),
          passwordLocked,
        )}
        <Reveal open={passwordOn}>
          <PasswordInput
            id="form-new-password"
            label={start.hasPassword ? "New password (leave empty to keep the current one)" : "Password"}
            autocomplete="new-password"
            minlength={PORTAL_PASSWORD_MIN}
            maxlength={PORTAL_PASSWORD_MAX}
            bind:value={newPassword}
            disabled={isSaving}
            error={passwordShort ? `Use at least ${PORTAL_PASSWORD_MIN} characters.` : undefined}
            class="max-w-xs"
          />
          <p class="mt-2 text-xs text-muted-foreground">
            We never see it and can't show it to you again, so keep it somewhere. The link stays the same.
          </p>
        </Reveal>
      </div>

      <div class="border-t border-border pt-5">
        {@render option(
          "opt-close",
          "Closing date",
          "The form takes answers up to and including this day, then closes by itself.",
          closeOn,
          (v) => {
            closeOn = v;
            if (v) {
              view = "form";
              if (!closeDay) closeDay = dayOf(new Date(Date.now() + 14 * 86_400_000));
            }
          },
        )}
        <Reveal open={closeOn}>
          <TextInput
            id="form-close"
            type="date"
            label="Last day"
            min={today}
            bind:value={closeDay}
            onfocus={() => (view = "form")}
            disabled={isSaving}
            class="max-w-[14rem]"
          />
        </Reveal>
      </div>

      <div class="border-t border-border pt-5">
        {@render option(
          "opt-notify",
          "Email when a response arrives",
          "One email per form per hour at most, to you and whoever you share the form with. It can't say what was answered: we can't read that.",
          notify,
          (v) => (notify = v),
        )}
      </div>
    </section>

    {#if saveError}
      <Alert tone="destructive">{saveError}</Alert>
    {/if}

    <div class="flex flex-wrap items-center gap-3">
      <Button type="submit" fullWidth={false} disabled={!canSave}>
        {#if isSaving}
          <Spinner aria-hidden="true" />
          {mode === "create" ? "Creating…" : "Saving…"}
        {:else}
          {mode === "create" ? "Create form" : "Save changes"}
        {/if}
      </Button>
      <Button variant="ghost" fullWidth={false} href={cancelHref}>
        {mode === "create" || dirty ? "Cancel" : "Back"}
      </Button>
      {#if saved && !dirty}
        <p class="text-sm text-muted-foreground" role="status">Saved. The link stays the same.</p>
      {/if}
    </div>
  </form>

  <aside class="space-y-3 lg:sticky lg:top-24" aria-label="Preview">
    <div class="flex items-center justify-between gap-3">
      <h2 class="text-sm font-medium text-foreground">What they see</h2>
      <div role="group" aria-label="Preview of" class="flex gap-1 rounded-full bg-card p-1 text-xs">
        {#each [{ id: "form", label: "Form" }, { id: "sent", label: "After sending" }] as const as tab (tab.id)}
          <button
            type="button"
            aria-pressed={view === tab.id}
            onclick={() => (view = tab.id)}
            class={cn(
              "rounded-full px-3 py-1.5 transition-colors duration-150 ease-out hover:cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              view === tab.id ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        {/each}
      </div>
    </div>
    <!-- Looked at, not used: nothing in here can be clicked or tabbed to. -->
    <div class="min-h-[36rem] overflow-hidden rounded-xl border border-border bg-background" inert>
      <div class="px-6 py-8" style="zoom: 0.85">
        <FormView form={previewForm} locale={lang} preview={view} />
      </div>
    </div>
  </aside>
</div>
