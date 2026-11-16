<script lang="ts">
  // Build or change a form, full screen. The rail lists the questions; the
  // canvas is the form itself, typed into where it shows. A question looks
  // the same at rest and while edited: editing only adds controls around
  // it, so nothing jumps. Two pages, as the visitor sees them: the
  // questions, and what shows after sending. "Try it" makes either usable.

  import { beforeNavigate } from "$app/navigation";
  import Alert from "$lib/components/Alert.svelte";
  import Badge from "$lib/components/Badge.svelte";
  import Button from "$lib/components/Button.svelte";
  import Drawer from "$lib/components/Drawer.svelte";
  import DrawerSection from "$lib/components/DrawerSection.svelte";
  import DropdownMenu from "$lib/components/DropdownMenu.svelte";
  import DropdownMenuItem from "$lib/components/DropdownMenuItem.svelte";
  import IconButton from "$lib/components/IconButton.svelte";
  import PasswordInput from "$lib/components/PasswordInput.svelte";
  import Reveal from "$lib/components/Reveal.svelte";
  import SearchField from "$lib/components/SearchField.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import Switch from "$lib/components/Switch.svelte";
  import TextInput from "$lib/components/TextInput.svelte";
  import FormView from "$lib/components/form/FormView.svelte";
  import * as Frame from "$lib/components/frame";
  import {
    FORM_QUESTIONS_MAX,
    QUESTION_HINT_MAX,
    QUESTION_LABEL_MAX,
    QUESTION_OPTION_MAX,
    QUESTION_OPTIONS_MAX,
    hasOptions,
    type QuestionType,
  } from "$lib/form/questions";
  import { LOCALES } from "$lib/i18n/locale";
  import { depositStrings, formStrings } from "$lib/i18n/messages";
  import {
    PORTAL_MESSAGE_MAX,
    PORTAL_PASSWORD_MAX,
    PORTAL_PASSWORD_MIN,
    PORTAL_THANKS_MAX,
    PORTAL_TITLE_MAX,
    logoSrc,
  } from "$lib/portal/keys";
  import { cn } from "$lib/utils";
  import IconArrowDownRegular from "phosphor-icons-svelte/IconArrowDownRegular.svelte";
  import IconArrowLeftRegular from "phosphor-icons-svelte/IconArrowLeftRegular.svelte";
  import IconArrowUpRegular from "phosphor-icons-svelte/IconArrowUpRegular.svelte";
  import IconCaretDownRegular from "phosphor-icons-svelte/IconCaretDownRegular.svelte";
  import IconCheckCircleRegular from "phosphor-icons-svelte/IconCheckCircleRegular.svelte";
  import IconCheckRegular from "phosphor-icons-svelte/IconCheckRegular.svelte";
  import IconCopyRegular from "phosphor-icons-svelte/IconCopyRegular.svelte";
  import IconDotsSixVerticalRegular from "phosphor-icons-svelte/IconDotsSixVerticalRegular.svelte";
  import IconEyeRegular from "phosphor-icons-svelte/IconEyeRegular.svelte";
  import IconGearRegular from "phosphor-icons-svelte/IconGearRegular.svelte";
  import IconHandWavingRegular from "phosphor-icons-svelte/IconHandWavingRegular.svelte";
  import IconListBulletsRegular from "phosphor-icons-svelte/IconListBulletsRegular.svelte";
  import IconPaperclipRegular from "phosphor-icons-svelte/IconPaperclipRegular.svelte";
  import IconPencilSimpleRegular from "phosphor-icons-svelte/IconPencilSimpleRegular.svelte";
  import IconPlusRegular from "phosphor-icons-svelte/IconPlusRegular.svelte";
  import IconTrashRegular from "phosphor-icons-svelte/IconTrashRegular.svelte";
  import IconWarningRegular from "phosphor-icons-svelte/IconWarningRegular.svelte";
  import IconXRegular from "phosphor-icons-svelte/IconXRegular.svelte";
  import { onMount, tick, untrack } from "svelte";
  import { fade, fly } from "svelte/transition";
  import { cubicOut } from "svelte/easing";
  import { autosize, fieldSizing } from "$lib/actions/autosize";
  import Tabs from "$lib/components/Tabs.svelte";
  import { FormDraft, type EditorProps } from "./formDraft.svelte";
  import { QUESTION_TYPES_SHOWN, TYPE_ICON, typeLabel } from "./questionTypes";
  import Unfold from "./Unfold.svelte";

  let props: EditorProps = $props();
  const d = new FormDraft(untrack(() => props));
  const t = $derived(formStrings[d.lang]);
  const dep = $derived(depositStrings[d.lang]);

  type Page = "form" | "after";
  let page = $state<Page>("form");
  let mode = $state<"edit" | "preview">("edit");
  // "start" is the block with the name and welcome message.
  let active = $state<string | null>(null);
  let inView = $state<string>("start");
  let settingsOpen = $state(false);
  let sheetOpen = $state(false);
  let query = $state("");
  let scroller = $state<HTMLElement | null>(null);
  let railEl = $state<HTMLElement | null>(null);
  let logoInput = $state<HTMLInputElement | null>(null);

  const current = $derived(page === "after" ? "after" : (active ?? inView));
  const matches = $derived.by(() => {
    const words = query.trim().toLowerCase();
    if (!words) return null;
    return new Set(d.questions.filter((q) => q.label.toLowerCase().includes(words)).map((q) => q.id));
  });

  beforeNavigate(({ cancel }) => {
    if (d.leaving || !d.dirty) return;
    if (!confirm("Leave without saving your changes?")) cancel();
  });

  // The editor is the whole screen: only its panes scroll.
  onMount(() => {
    const html = document.documentElement;
    const before = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = before;
    };
  });

  const blockOf = (id: string) => document.getElementById(`sb-${id}`);

  /** Moves editing to `id`, keeping that block where it is on screen. */
  async function activate(id: string | null) {
    if (active === id) return;
    const el = id ? blockOf(id) : null;
    const before = el?.getBoundingClientRect().top;
    active = id;
    await tick();
    if (el && before !== undefined) {
      const shift = el.getBoundingClientRect().top - before;
      if (Math.abs(shift) > 0.5) scroller?.scrollBy(0, shift);
    }
  }

  /** From the rail: show it, and edit it unless previewing. */
  async function goTo(id: string, focus = true) {
    sheetOpen = false;
    if (id === "after") {
      page = "after";
      active = null;
      scroller?.scrollTo({ top: 0 });
      return;
    }
    const switching = page !== "form";
    page = "form";
    if (mode === "preview") {
      await tick();
      const target = id === "start" ? scroller?.querySelector("header") : document.getElementById(`q-${id}-label`);
      target?.scrollIntoView({ block: "center", behavior: switching ? "auto" : "smooth" });
      return;
    }
    active = id;
    await tick();
    blockOf(id)?.scrollIntoView({ block: "center", behavior: switching ? "auto" : "smooth" });
    if (focus) document.getElementById(`sf-${id}`)?.focus({ preventScroll: true });
  }

  function onBlockPointer(e: PointerEvent, id: string) {
    const target = e.target as HTMLElement;
    if (target.closest("input, textarea, button, select, label, a, [role=menu]")) return;
    // A click on the field mock or the empty space edits the question text.
    e.preventDefault();
    void activate(id).then(() => {
      const field = document.getElementById(`sf-${id}`) as HTMLTextAreaElement | null;
      field?.focus({ preventScroll: true });
      field?.setSelectionRange(field.value.length, field.value.length);
    });
  }

  function onDocPointer(e: PointerEvent) {
    const target = e.target as HTMLElement;
    if (target.closest("[data-block], [data-keep-active], [role=dialog], dialog")) return;
    void activate(null);
  }

  function onKey(e: KeyboardEvent) {
    if (e.key !== "Escape" || e.defaultPrevented || settingsOpen) return;
    if (sheetOpen) {
      sheetOpen = false;
    } else if (active) {
      (document.activeElement as HTMLElement | null)?.blur();
      void activate(null);
    }
  }

  async function add(type: QuestionType, after: string | null = active) {
    sheetOpen = false;
    page = "form";
    mode = "edit";
    const i = d.questions.findIndex((q) => q.id === after);
    const at = i >= 0 ? i + 1 : after === "start" ? 0 : d.questions.length;
    const id = d.addQuestion(type, at);
    if (!id) return;
    active = id;
    await tick();
    blockOf(id)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    document.getElementById(`sf-${id}`)?.focus({ preventScroll: true });
  }

  async function move(i: number, by: number) {
    const focused = document.activeElement as HTMLElement | null;
    d.moveTo(i, i + by);
    await tick();
    focused?.focus({ preventScroll: true });
    blockOf(d.questions[i + by]?.id ?? "")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function remove(i: number) {
    const next = d.questions[i + 1] ?? d.questions[i - 1];
    d.remove(i);
    active = null;
    if (next) void goTo(next.id, false);
  }

  async function addOption(i: number) {
    const at = d.addOption(i);
    if (at === null) return;
    await tick();
    document.getElementById(`so-${d.questions[i].id}-${at}`)?.focus();
  }

  function questionKeys(e: KeyboardEvent, i: number) {
    if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
      e.preventDefault();
      void move(i, e.key === "ArrowUp" ? -1 : 1);
    } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void add(d.questions[i].type, d.questions[i].id);
    }
  }

  async function save(e?: Event) {
    e?.preventDefault();
    const result = await d.save();
    if (result?.firstProblem) {
      mode = "edit";
      await goTo(result.firstProblem);
    }
  }

  // The rail follows what is on screen while nothing is being edited.
  onMount(() => {
    const seen = new Map<string, boolean>();
    let io: IntersectionObserver | null = null;
    const watch = () => {
      io?.disconnect();
      if (!scroller) return;
      io = new IntersectionObserver(
        (entries) => {
          for (const en of entries) seen.set((en.target as HTMLElement).dataset.block!, en.isIntersecting);
          const order = [...(scroller?.querySelectorAll<HTMLElement>("[data-block]") ?? [])].map((el) => el.dataset.block!);
          const first = order.find((id) => seen.get(id));
          if (first) inView = first;
        },
        { root: scroller, rootMargin: "-30% 0px -60% 0px" },
      );
      scroller.querySelectorAll("[data-block]").forEach((el) => io!.observe(el));
    };
    watch();
    const mo = new MutationObserver(watch);
    if (scroller) mo.observe(scroller, { childList: true, subtree: true });
    return () => {
      io?.disconnect();
      mo.disconnect();
    };
  });

  // Keep the rail's highlighted entry in sight.
  $effect(() => {
    const id = current;
    railEl?.querySelector(`[data-rail="${id}"]`)?.scrollIntoView({ block: "nearest" });
  });

  // Drag to reorder in the rail.
  let dragFrom = $state<number | null>(null);
  let dropAt = $state<number | null>(null);

  // Text typed where it shows. Plain text until focused; the ring is drawn
  // inside so no clipped parent can hide it.
  const bare =
    "block w-full resize-none rounded-md bg-transparent px-1.5 -mx-1.5 py-0.5 text-foreground [field-sizing:content] placeholder:text-muted-foreground/60 transition-[background-color,box-shadow] duration-150 ease-out hover:bg-secondary/60 focus:bg-background focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ring/70";
  const blockClass = (on: boolean, bad = false) =>
    cn(
      "relative rounded-xl border px-4 py-4 sm:px-6 transition-[background-color,border-color,box-shadow] duration-150 ease-out",
      on ? "border-border bg-card shadow-sm" : "border-transparent hover:bg-card/50 cursor-text",
      bad && !on && "border-destructive/50",
    );
</script>

<svelte:window onkeydown={onKey} />
<svelte:document onpointerdown={onDocPointer} />

{#snippet typePicker(after: string | null, label: string, cls = "", iconOnly = false, side: "top" | "bottom" = "bottom")}
  <DropdownMenu {label} align="start" {side} class={cls} triggerClass={cn("rounded-md", cls)}>
    {#snippet trigger()}
      <span
        class={cn(
          "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-foreground transition-colors duration-150 hover:bg-secondary",
          iconOnly && "w-full justify-center lg:justify-start",
        )}
        title={label}
      >
        <IconPlusRegular class="size-4 shrink-0" /><span class={iconOnly ? "hidden lg:inline" : ""}>{label}</span>
      </span>
    {/snippet}
    {#snippet children(close)}
      {#each QUESTION_TYPES_SHOWN as type (type.value)}
        {@const Icon = TYPE_ICON[type.value]}
        <DropdownMenuItem
          onSelect={() => {
            close();
            void add(type.value, after);
          }}
        >
          <span class="flex items-center gap-2.5"><Icon class="size-4 text-muted-foreground" />{type.label}</span>
        </DropdownMenuItem>
      {/each}
    {/snippet}
  </DropdownMenu>
{/snippet}

<!-- The outline. `compact` narrows it to numbers and icons between md and lg. -->
{#snippet rail(compact: boolean)}
  {@const wide = compact ? "hidden lg:inline" : ""}
  {@const item = (on: boolean) =>
    cn(
      "group/item flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
      compact && "justify-center lg:justify-start",
      on ? "bg-secondary text-foreground font-medium" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
    )}
  <div class="flex min-h-0 flex-1 flex-col p-2">
    <button type="button" data-rail="start" title="Start" class={item(current === "start")} onclick={() => goTo("start")}>
      <IconHandWavingRegular class="size-4 shrink-0" />
      <span class={cn("truncate", wide)}>Start</span>
    </button>

    <div class={cn("mt-3 flex items-center justify-between px-2 pb-1", compact && "justify-center lg:justify-between")}>
      <span class={cn("text-xs font-medium uppercase tracking-wide text-muted-foreground", wide)}>Questions</span>
      <span class="text-xs text-muted-foreground tabular-nums">{d.questions.length}/{d.limit}</span>
    </div>
    {#if d.questions.length > 6}
      <div class={cn("px-1 pb-2", compact && "hidden lg:block")}>
        <SearchField bind:value={query} label="Find a question" placeholder="Find a question" />
      </div>
    {/if}

    <ol bind:this={railEl} class="thin-scroll min-h-0 flex-1 space-y-px overflow-y-auto">
      {#each d.questions as q, i (q.id)}
        {@const Icon = TYPE_ICON[q.type]}
        {@const bad = d.triedSave && d.problems[i] !== null}
        <li
          class={cn("relative", matches !== null && !matches.has(q.id) && "hidden")}
          ondragover={(e) => {
            if (dragFrom === null) return;
            e.preventDefault();
            const r = e.currentTarget.getBoundingClientRect();
            dropAt = e.clientY < r.top + r.height / 2 ? i : i + 1;
          }}
          ondrop={(e) => {
            e.preventDefault();
            if (dragFrom !== null && dropAt !== null) d.moveTo(dragFrom, dropAt > dragFrom ? dropAt - 1 : dropAt);
            dragFrom = null;
            dropAt = null;
          }}
        >
          {#if dragFrom !== null && dropAt === i}
            <span class="absolute -top-px left-2 right-2 h-0.5 rounded-full bg-primary"></span>
          {/if}
          <button
            type="button"
            data-rail={q.id}
            draggable="true"
            title={q.label || "Untitled"}
            ondragstart={() => (dragFrom = i)}
            ondragend={() => {
              dragFrom = null;
              dropAt = null;
            }}
            class={cn(item(current === q.id), dragFrom === i && "opacity-40", compact && "flex-col gap-0.5 lg:flex-row lg:gap-2")}
            onclick={() => goTo(q.id)}
          >
            <IconDotsSixVerticalRegular class={cn("size-3.5 shrink-0 cursor-grab opacity-0 group-hover/item:opacity-60", wide)} />
            <span class={cn("shrink-0 text-xs tabular-nums text-muted-foreground", compact ? "lg:w-5 lg:text-right" : "w-5 text-right")}>{i + 1}</span>
            {#if bad}
              <IconWarningRegular class="size-4 shrink-0 text-destructive-foreground" />
            {:else}
              <Icon class="size-4 shrink-0" />
            {/if}
            <span class={cn("min-w-0 flex-1 truncate", !q.label && "italic", wide)}>{q.label || "Untitled"}</span>
            {#if q.required && !bad}
              <span class={cn("shrink-0 text-destructive-foreground", wide)} aria-label="required">*</span>
            {/if}
          </button>
          {#if dragFrom !== null && dropAt === i + 1 && i === d.questions.length - 1}
            <span class="absolute -bottom-px left-2 right-2 h-0.5 rounded-full bg-primary"></span>
          {/if}
        </li>
      {/each}
      {#if matches !== null && matches.size === 0}
        <li class="px-2 py-2 text-sm text-muted-foreground">No question matches.</li>
      {/if}
    </ol>

    <div class="border-t border-border px-0.5 pt-2">
      {#if d.atLimit}
        <p class={cn("px-1 text-xs text-muted-foreground", compact && "hidden lg:block")}>
          {d.limit < FORM_QUESTIONS_MAX ? `Your plan allows ${d.limit} questions.` : `${FORM_QUESTIONS_MAX} is the most a form holds.`}
        </p>
      {:else}
        {@render typePicker(null, "Add question", "block w-full", compact, "top")}
      {/if}
    </div>

    <div class="mt-2 space-y-px border-t border-border pt-2">
      <button type="button" data-rail="after" title="After sending" class={item(current === "after")} onclick={() => goTo("after")}>
        <IconCheckCircleRegular class="size-4 shrink-0" /><span class={wide}>After sending</span>
      </button>
      <button type="button" title="Settings" class={item(false)} onclick={() => ((sheetOpen = false), (settingsOpen = true))}>
        <IconGearRegular class="size-4 shrink-0" /><span class={wide}>Settings</span>
      </button>
    </div>
  </div>
{/snippet}

{#snippet switchRow(id: string, name: string, about: string, on: boolean, set: (v: boolean) => void, locked = false)}
  <div class="flex items-start justify-between gap-4">
    <div class="min-w-0 space-y-0.5">
      <p id="{id}-name" class="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
        {name}
        {#if locked}<Badge tone="info">Max plan</Badge>{/if}
      </p>
      <p id="{id}-about" class="text-sm text-muted-foreground">{about}</p>
    </div>
    <Switch checked={on} onChange={set} labelledby="{id}-name" describedby="{id}-about" disabled={d.isSaving || locked} />
  </div>
{/snippet}

<!-- Not a <form>: the try-out inside has its own, whose submit must not save. -->
<div class="fixed inset-0 z-[45] flex flex-col bg-background text-foreground">
  <!-- App bar -->
  <header data-keep-active class="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-2 border-b border-border px-2 py-2 sm:flex-nowrap sm:px-3">
    <a
      href={props.cancelHref}
      aria-label="Back"
      title="Back"
      class="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <IconArrowLeftRegular class="size-4" />
    </a>
    <button
      type="button"
      aria-label="Outline"
      class="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground md:hidden"
      onclick={() => (sheetOpen = true)}
    >
      <IconListBulletsRegular class="size-4" />
    </button>
    <button type="button" class="min-w-0 flex-1 rounded-md px-1.5 py-0.5 text-left hover:bg-secondary/60 sm:max-w-xs" onclick={() => goTo("start")}>
      <span class="block truncate text-sm font-medium text-foreground">{d.title.trim() || "Untitled form"}</span>
      <span class="block truncate text-xs text-muted-foreground">
        {#if d.isSaving}Saving…{:else if d.saved && !d.dirty}Saved{:else if props.mode === "create"}New form, not created yet{:else if d.dirty}Unsaved changes{:else}All changes saved{/if}
      </span>
    </button>

    <div class="order-last flex w-full items-center justify-center gap-2 sm:order-none sm:w-auto sm:flex-1">
      <Tabs
        label="Page"
        value={page}
        onChange={(v) => (v === "after" ? goTo("after") : ((page = "form"), scroller?.scrollTo({ top: 0 })))}
        tabs={[
          { value: "form", label: "Questions" },
          { value: "after", label: "After sending" },
        ]}
      />
      <Tabs
        label="Mode"
        value={mode}
        onChange={(v) => {
          mode = v;
          active = null;
        }}
        tabs={[
          { value: "edit", label: "Edit", icon: IconPencilSimpleRegular },
          { value: "preview", label: "Try it", icon: IconEyeRegular },
        ]}
      />
    </div>

    <div class="ml-auto flex shrink-0 items-center gap-1.5 sm:ml-0">
      <IconButton label="Settings" onclick={() => (settingsOpen = true)} class="hidden sm:inline-flex">
        <IconGearRegular class="size-4" />
      </IconButton>
      <Button type="button" fullWidth={false} disabled={!d.canSave} class="py-2" onclick={save}>
        {#if d.isSaving}
          <Spinner aria-hidden="true" />{props.mode === "create" ? "Creating…" : "Saving…"}
        {:else}
          {props.mode === "create" ? "Create form" : "Save"}
        {/if}
      </Button>
    </div>
  </header>

  <div class="flex min-h-0 flex-1">
    <!-- Rail: numbers and icons on mid-size screens, full on wide ones -->
    <nav aria-label="Form outline" data-keep-active class="hidden w-16 shrink-0 flex-col border-r border-border md:flex lg:w-64">
      {@render rail(true)}
    </nav>

    <div bind:this={scroller} data-scroller class="thin-scroll min-w-0 flex-1 overflow-y-auto [overflow-anchor:none] bg-secondary/30">
      <div class="mx-auto max-w-3xl px-3 py-6 sm:px-6 sm:py-10">
        {#if d.saveError}
          <Alert tone="destructive" class="mb-4">{d.saveError}</Alert>
        {/if}

        {#if mode === "preview"}
          <!-- Usable: answers, files and checks work; sending stays here. -->
          <div class="rounded-2xl border border-border bg-background px-5 py-8 shadow-sm sm:px-10 sm:py-10">
            <p class="mb-6 flex items-center gap-2 text-xs text-muted-foreground">
              <IconEyeRegular class="size-4" />Try it out. Nothing you fill in here is sent or kept.
            </p>
            {#key page}
              <FormView form={d.previewForm} locale={d.lang} rehearse preview={page === "after" ? "sent" : undefined} />
            {/key}
          </div>
        {:else if page === "after"}
          <!-- After sending, edited where it shows -->
          <section data-block="after" class="py-4 sm:py-8">
            <Frame.Root>
              <Frame.Panel>
                <div class="space-y-3 text-center">
                  <div class="flex justify-center">
                    <div class="flex size-10 items-center justify-center rounded-full bg-success/15 text-success-foreground">
                      <IconCheckRegular class="size-5" />
                    </div>
                  </div>
                  <h2 class="text-lg font-medium text-foreground">{t.sentTitle}</h2>
                  <p class="text-sm text-muted-foreground">{t.sentBody(d.title.trim() || "you")}</p>
                  <textarea
                    use:autosize
                    id="sf-after"
                    aria-label="Thank-you note"
                    placeholder="Add a thank-you note: what happens next, or when they hear from you"
                    rows="1"
                    maxlength={PORTAL_THANKS_MAX}
                    value={d.thanks}
                    oninput={(e) => {
                      d.thanks = e.currentTarget.value;
                      d.thanksOn = d.thanks.trim().length > 0;
                    }}
                    class={cn(bare, "mx-auto text-center text-sm")}
                  ></textarea>
                  <p class="text-sm text-muted-foreground">{dep.reference}: <span class="font-mono text-foreground">7F3A-91C2</span></p>
                  <div class="flex flex-wrap justify-center gap-2 pt-2" inert>
                    <Button fullWidth={false}>{dep.saveConfirmation}</Button>
                    <Button variant="secondary" fullWidth={false}>{t.again}</Button>
                  </div>
                </div>
              </Frame.Panel>
            </Frame.Root>
            <p class="mt-6 text-center text-xs text-muted-foreground">
              Everything but your note is the same on every form: it tells people their answers arrived and gives them a
              reference to keep.
            </p>
          </section>
        {:else}
          <div class="rounded-2xl border border-border bg-background px-2 py-4 shadow-sm sm:px-4 sm:py-6">
            <!-- Start: name, welcome, logo -->
            <section
              id="sb-start"
              data-block="start"
              class={cn(blockClass(active === "start"), "scroll-mt-6")}
              onfocusin={() => activate("start")}
              onpointerdown={(e) => onBlockPointer(e, "start")}
            >
              {#if d.logoOn && d.logo}
                <img src={logoSrc(d.logo)} alt="Your logo" class="mb-4 max-h-14 max-w-[220px] object-contain object-left" />
              {/if}
              <textarea
                use:autosize
                id="sf-start"
                aria-label="Form name"
                placeholder="Your form's name"
                rows="1"
                maxlength={PORTAL_TITLE_MAX}
                bind:value={d.title}
                onkeydown={(e) => e.key === "Enter" && e.preventDefault()}
                class={cn(bare, "text-2xl sm:text-3xl font-semibold tracking-tight")}
              ></textarea>
              <Unfold open={active === "start" || d.message.length > 0}>
                <textarea
                  use:autosize
                  aria-label="Welcome message"
                  placeholder="Add a welcome message: what the form is for, and by when"
                  rows="1"
                  maxlength={PORTAL_MESSAGE_MAX}
                  value={d.message}
                  oninput={(e) => {
                    d.message = e.currentTarget.value;
                    d.messageOn = d.message.trim().length > 0;
                  }}
                  class={cn(bare, "mt-2")}
                ></textarea>
              </Unfold>
              {#if d.closeOn && d.settings.closesAt}
                <p class="mt-2 text-sm text-muted-foreground">
                  {t.openUntil(new Intl.DateTimeFormat(d.lang, { dateStyle: "long" }).format(new Date(d.settings.closesAt)))}
                </p>
              {/if}
              <Unfold open={active === "start"}>
                <div class="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-3 pb-1 text-sm">
                  <button type="button" class="text-muted-foreground hover:text-foreground" onclick={() => (settingsOpen = true)}>
                    {d.logo ? "Change logo" : "Add logo"}{d.brandLocked ? " (Max)" : ""}
                  </button>
                  <button type="button" class="text-muted-foreground hover:text-foreground" onclick={() => (settingsOpen = true)}>
                    Language: {dep.languageName}
                  </button>
                  <button type="button" class="text-muted-foreground hover:text-foreground" onclick={() => (settingsOpen = true)}>
                    {d.closeOn ? "Change closing date" : "Add closing date"}
                  </button>
                </div>
              </Unfold>
            </section>

            <!-- Questions -->
            <ol class="mt-2 space-y-1">
              {#each d.questions as q, i (q.id)}
                {@const on = active === q.id}
                {@const problem = d.triedSave ? d.problems[i] : null}
                {@const Icon = TYPE_ICON[q.type]}
                <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                <li
                  id="sb-{q.id}"
                  data-block={q.id}
                  class={cn(blockClass(on, !!problem), "scroll-mt-6")}
                  onfocusin={() => activate(q.id)}
                  onpointerdown={(e) => onBlockPointer(e, q.id)}
                  onkeydown={(e) => questionKeys(e, i)}
                >
                  <span
                    class={cn(
                      "absolute inset-y-4 left-0 w-1 rounded-full bg-primary transition-opacity duration-150",
                      on ? "opacity-100" : "opacity-0",
                    )}
                    aria-hidden="true"
                  ></span>

                  <div class="flex items-start gap-2">
                    <span class="pt-0.5 text-sm tabular-nums text-muted-foreground">{i + 1}.</span>
                    <textarea
                      use:autosize
                      id="sf-{q.id}"
                      aria-label="Question {i + 1}"
                      placeholder="Write the question"
                      rows="1"
                      maxlength={QUESTION_LABEL_MAX}
                      bind:value={q.label}
                      onkeydown={(e) => {
                        if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) {
                          e.preventDefault();
                          document.getElementById(hasOptions(q.type) ? `so-${q.id}-0` : `sh-${q.id}`)?.focus();
                        }
                      }}
                      class={cn(bare, fieldSizing ? "w-auto min-w-[3ch] max-w-full" : "", "text-sm font-medium")}
                    ></textarea>
                    {#if q.required}<span class="pt-0.5 text-sm text-destructive-foreground" aria-label="required">*</span>{/if}
                    <!-- Present at rest too, only hidden, so nothing moves when editing starts. -->
                    <div
                      class={cn("ml-auto -my-1 shrink-0 transition-opacity duration-150", on ? "opacity-100" : "pointer-events-none opacity-0")}
                      inert={!on}
                    >
                      <DropdownMenu label="Type of question {i + 1}" align="end">
                        {#snippet trigger()}
                          <span class="flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs text-foreground transition-colors duration-150 hover:bg-secondary">
                            <Icon class="size-3.5" />{typeLabel(q.type)}<IconCaretDownRegular class="size-3 text-muted-foreground" />
                          </span>
                        {/snippet}
                        {#snippet children(close)}
                          {#each QUESTION_TYPES_SHOWN as type (type.value)}
                            {@const TIcon = TYPE_ICON[type.value]}
                            <DropdownMenuItem
                              onSelect={() => {
                                close();
                                d.setType(i, type.value);
                              }}
                            >
                              <span class="flex items-center gap-2.5">
                                <TIcon class="size-4 text-muted-foreground" />{type.label}
                                {#if type.value === q.type}<IconCheckRegular class="ml-auto size-4" />{/if}
                              </span>
                            </DropdownMenuItem>
                          {/each}
                        {/snippet}
                      </DropdownMenu>
                    </div>
                  </div>
                  {#if problem}<p role="alert" class="mt-1 pl-6 text-xs text-destructive-foreground">{problem}</p>{/if}

                  <div class="pl-6">
                    <Unfold open={on || !!q.hint}>
                      <textarea
                        use:autosize
                        id="sh-{q.id}"
                        aria-label="Explanation under question {i + 1}"
                        placeholder="Add an explanation (optional)"
                        rows="1"
                        maxlength={QUESTION_HINT_MAX}
                        value={q.hint ?? ""}
                        oninput={(e) => (q.hint = e.currentTarget.value)}
                        onkeydown={(e) => e.key === "Enter" && !e.shiftKey && e.preventDefault()}
                        class={cn(bare, "mt-1 text-sm text-muted-foreground")}
                      ></textarea>
                    </Unfold>

                    <div class="pt-3">
                      {#if hasOptions(q.type)}
                        <div class="space-y-1">
                          {#each q.options ?? [] as _, j (j)}
                            <div class="flex items-center gap-3">
                              <span class={cn("size-4 shrink-0 border border-input", q.type === "choice" ? "rounded-full" : "rounded")}></span>
                              <input
                                id="so-{q.id}-{j}"
                                aria-label="Option {j + 1}"
                                placeholder="Option {j + 1}"
                                maxlength={QUESTION_OPTION_MAX}
                                value={q.options?.[j] ?? ""}
                                oninput={(e) => {
                                  if (q.options) q.options[j] = e.currentTarget.value;
                                }}
                                onkeydown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    if (j === (q.options ?? []).length - 1) void addOption(i);
                                    else document.getElementById(`so-${q.id}-${j + 1}`)?.focus();
                                  } else if (e.key === "Backspace" && !e.currentTarget.value && (q.options ?? []).length > 1) {
                                    e.preventDefault();
                                    d.removeOption(i, j);
                                    void tick().then(() => document.getElementById(`so-${q.id}-${Math.max(0, j - 1)}`)?.focus());
                                  }
                                }}
                                class={cn(bare, "mx-0 min-w-0 flex-1 text-sm")}
                              />
                              <span class={cn("transition-opacity duration-150", on ? "opacity-100" : "pointer-events-none opacity-0")} inert={!on}>
                                <IconButton
                                  label="Remove option {j + 1}"
                                  tabindex={-1}
                                  onclick={() => d.removeOption(i, j)}
                                  disabled={(q.options ?? []).length <= 1}
                                  class="p-1"
                                >
                                  <IconXRegular class="size-3.5" />
                                </IconButton>
                              </span>
                            </div>
                          {/each}
                          <Unfold open={on && (q.options ?? []).length < QUESTION_OPTIONS_MAX}>
                            <button
                              type="button"
                              class="flex items-center gap-3 rounded-md py-1 text-sm text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                              onclick={() => addOption(i)}
                            >
                              <span class={cn("size-4 border border-dashed border-input", q.type === "choice" ? "rounded-full" : "rounded")}></span>
                              Add option
                            </button>
                          </Unfold>
                        </div>
                      {:else if q.type === "yesno"}
                        <div class="flex gap-6 text-sm text-foreground">
                          <span class="flex items-center gap-3"><span class="size-4 rounded-full border border-input"></span>{t.yes}</span>
                          <span class="flex items-center gap-3"><span class="size-4 rounded-full border border-input"></span>{t.no}</span>
                        </div>
                      {:else if q.type === "file"}
                        <span class="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
                          <IconPaperclipRegular class="size-4" />{t.chooseFiles}
                        </span>
                      {:else}
                        <div
                          class={cn(
                            "rounded-md border border-input bg-background",
                            q.type === "long" ? "h-20" : "h-10",
                            q.type === "date" && "max-w-[14rem]",
                          )}
                        ></div>
                      {/if}
                    </div>
                  </div>

                  <Unfold open={on}>
                    <div class="mt-4 flex flex-wrap items-center gap-1 border-t border-border pt-3 pb-1">
                      <label class="mr-auto flex items-center gap-2.5 text-sm text-foreground">
                        <Switch checked={q.required ?? false} onChange={(v) => (q.required = v)} label="Required" />
                        Required
                      </label>
                      <IconButton label="Move up (Alt+↑)" onclick={() => move(i, -1)} disabled={i === 0}>
                        <IconArrowUpRegular class="size-4" />
                      </IconButton>
                      <IconButton label="Move down (Alt+↓)" onclick={() => move(i, 1)} disabled={i === d.questions.length - 1}>
                        <IconArrowDownRegular class="size-4" />
                      </IconButton>
                      <IconButton
                        label="Duplicate"
                        onclick={() => {
                          const id = d.duplicate(i);
                          if (id) void goTo(id);
                        }}
                        disabled={d.atLimit}
                      >
                        <IconCopyRegular class="size-4" />
                      </IconButton>
                      <IconButton label="Delete question" tone="destructive" onclick={() => remove(i)}>
                        <IconTrashRegular class="size-4" />
                      </IconButton>
                      {#if !d.atLimit}
                        <span class="mx-1 h-5 w-px bg-border"></span>
                        {@render typePicker(q.id, "Question below")}
                      {/if}
                    </div>
                  </Unfold>
                </li>
              {/each}
            </ol>

            <div class="px-4 pt-3 sm:px-6">
              {#if d.atLimit}
                <p class="text-sm text-muted-foreground">
                  {d.limit < FORM_QUESTIONS_MAX
                    ? `Your plan allows ${d.limit} questions per form.`
                    : `A form holds at most ${FORM_QUESTIONS_MAX} questions.`}
                </p>
              {:else if d.questions.length === 0}
                {@render typePicker(null, "Add your first question")}
              {:else}
                <div class="-mx-2">{@render typePicker(d.questions[d.questions.length - 1].id, "Add question")}</div>
              {/if}
            </div>

            <div class="mx-4 mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6 sm:mx-6">
              <span class="inline-flex rounded-md bg-primary/50 px-5 py-2.5 text-sm font-medium text-primary-foreground" aria-hidden="true">{t.send}</span>
              <button type="button" class="text-sm text-muted-foreground hover:text-foreground" onclick={() => goTo("after")}>
                Then: after sending →
              </button>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>

{#if mode === "edit" && page === "form" && !d.atLimit}
  <div class="fixed bottom-20 right-4 z-[46] md:hidden" data-keep-active>
    <Button type="button" fullWidth={false} onclick={() => add("short")} class="rounded-full shadow-lg">
      <IconPlusRegular class="size-4" /> Question
    </Button>
  </div>
{/if}

<!-- Phones: the outline as a sheet from the bottom -->
{#if sheetOpen}
  <div class="fixed inset-0 z-[47] md:hidden" data-keep-active>
    <button
      type="button"
      aria-label="Close outline"
      class="absolute inset-0 bg-black/40"
      onclick={() => (sheetOpen = false)}
      transition:fade={{ duration: 150 }}
    ></button>
    <div
      role="dialog"
      aria-label="Form outline"
      class="absolute inset-x-0 bottom-0 flex max-h-[80dvh] flex-col rounded-t-2xl bg-background shadow-xl"
      transition:fly={{ y: 400, duration: 220, easing: cubicOut }}
    >
      <div class="flex justify-center pt-2"><span class="h-1 w-10 rounded-full bg-border"></span></div>
      {@render rail(false)}
    </div>
  </div>
{/if}

<Drawer open={settingsOpen} title="Form settings" onClose={() => (settingsOpen = false)}>
  <div class="space-y-3">
    <DrawerSection title="Language of the page they see">
      <div class="flex flex-wrap gap-x-5 gap-y-2">
        {#each LOCALES as choice (choice)}
          <label class="flex items-center gap-2 text-sm text-foreground cursor-pointer">
            <input type="radio" name="studio-language" value={choice} bind:group={d.lang} class="size-4 accent-primary" />
            {depositStrings[choice].languageName}
          </label>
        {/each}
      </div>
    </DrawerSection>

    <DrawerSection>
      {@render switchRow("s-logo", "Your logo", "Shown above the name. Encrypted like the name.", d.logoOn, (v) => (d.logoOn = v), d.brandLocked)}
      <Reveal open={d.logoOn}>
        <input
          bind:this={logoInput}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          class="hidden"
          onchange={(e) => {
            const f = e.currentTarget.files?.[0];
            e.currentTarget.value = "";
            if (f) void d.pickLogo(f);
          }}
        />
        <div class="flex items-center gap-3">
          {#if d.logo}<img src={logoSrc(d.logo)} alt="Your logo" class="max-h-9 max-w-[140px] object-contain" />{/if}
          <Button type="button" variant="secondary" fullWidth={false} onclick={() => logoInput?.click()} disabled={d.logoBusy || !d.canBrand}>
            {d.logoBusy ? "Preparing…" : d.logo ? "Replace" : "Choose image"}
          </Button>
        </div>
        {#if d.logoError}<p role="alert" class="mt-1 text-xs text-destructive-foreground">{d.logoError}</p>{/if}
      </Reveal>
    </DrawerSection>

    <DrawerSection>
      {@render switchRow(
        "s-password",
        "Password",
        "Asked before the questions show. Pass it on separately from the link.",
        d.passwordOn,
        (v) => (d.passwordOn = v),
        d.passwordLocked,
      )}
      <Reveal open={d.passwordOn}>
        <PasswordInput
          id="studio-password"
          label={d.hadPassword ? "New password (leave empty to keep it)" : "Password"}
          autocomplete="new-password"
          minlength={PORTAL_PASSWORD_MIN}
          maxlength={PORTAL_PASSWORD_MAX}
          bind:value={d.newPassword}
          error={d.passwordShort ? `Use at least ${PORTAL_PASSWORD_MIN} characters.` : undefined}
        />
      </Reveal>
    </DrawerSection>

    <DrawerSection>
      {@render switchRow("s-close", "Closing date", "Takes answers up to and including this day.", d.closeOn, (v) => d.setClose(v))}
      <Reveal open={d.closeOn}>
        <TextInput id="studio-close" type="date" label="Last day" min={d.today} bind:value={d.closeDay} class="max-w-[14rem]" />
      </Reveal>
    </DrawerSection>

    <DrawerSection>
      {@render switchRow(
        "s-notify",
        "Email when a response arrives",
        "At most one per form per hour. It can't say what was answered.",
        d.notify,
        (v) => (d.notify = v),
      )}
    </DrawerSection>
  </div>
</Drawer>

<style>
  /* Scrollbars belong to the panes, thin and quiet until hovered. */
  .thin-scroll {
    scrollbar-width: thin;
    scrollbar-color: transparent transparent;
    transition: scrollbar-color 150ms ease-out;
  }
  .thin-scroll:hover,
  .thin-scroll:focus-within {
    scrollbar-color: color-mix(in oklab, var(--color-muted-foreground) 40%, transparent) transparent;
  }
</style>
