<script lang="ts">
  // The form for a portal's name, list and switches, with a live preview of
  // the page visitors get. Used to create a portal and to change one.

  import { beforeNavigate } from "$app/navigation";
  import Alert from "$lib/components/Alert.svelte";
  import Badge from "$lib/components/Badge.svelte";
  import Button from "$lib/components/Button.svelte";
  import DepositView from "$lib/components/portal/DepositView.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import Reveal from "$lib/components/Reveal.svelte";
  import Switch from "$lib/components/Switch.svelte";
  import Textarea from "$lib/components/Textarea.svelte";
  import TextInput from "$lib/components/TextInput.svelte";
  import TextLink from "$lib/components/TextLink.svelte";
  import { DEFAULT_LOCALE, LOCALES, type Locale } from "$lib/i18n/locale";
  import { depositStrings } from "$lib/i18n/messages";
  import type { OpenedPortal } from "$lib/portal/deposit";
  import {
    CHECKLIST_LABEL_MAX,
    CHECKLIST_MAX_ITEMS,
    PORTAL_FIELD_LABEL_MAX,
    PORTAL_MESSAGE_MAX,
    PORTAL_THANKS_MAX,
    PORTAL_TITLE_MAX,
    newChecklistItemId,
    type ChecklistItem,
    logoSrc,
    type PortalLogo,
    type PortalSettings,
  } from "$lib/portal/keys";
  import { prepareLogo } from "$lib/portal/logo";
  import { cn } from "$lib/utils";
  import { untrack } from "svelte";

  interface Props {
    initial: PortalSettings;
    mode: "create" | "edit";
    /** Throws with a message fit to show when it fails. */
    onSave: (settings: PortalSettings) => Promise<void>;
    cancelHref: string;
    /** Most that one delivery may hold on the owner's plan, for the preview. */
    maxTotalSize?: number;
    /** The plan includes the Max options: a logo and sending files back. */
    canBrand?: boolean;
  }

  let { initial, mode, onSave, cancelHref, maxTotalSize = 0, canBrand = false }: Props = $props();

  const start = untrack(() => initial);
  let title = $state(start.title);
  let lang = $state<Locale>(start.lang ?? DEFAULT_LOCALE);
  let checklist = $state<ChecklistItem[]>(start.checklist);
  let messageOn = $state(start.message.length > 0);
  let message = $state(start.message);
  let thanksOn = $state(start.thanks.length > 0);
  let thanks = $state(start.thanks);
  let fieldOn = $state(start.fieldLabel.length > 0);
  let fieldLabel = $state(start.fieldLabel);
  let logoOn = $state(start.logo !== null);
  let logo = $state<PortalLogo | null>(start.logo);
  let logoError = $state<string | null>(null);
  let logoBusy = $state(false);
  let logoInput = $state<HTMLInputElement | null>(null);
  // A logo set on a higher plan stays and can be removed, not replaced.
  const brandLocked = $derived(!canBrand && start.logo === null);

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

  let twoWay = $state(start.twoWay);
  // Files already sent back stay; a plan without the option cannot switch it on.
  const twoWayLocked = $derived(!canBrand && !start.twoWay);

  let closeOn = $state(start.closesAt !== null);
  // The day in the owner's own time zone; the portal closes when it ends.
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

  let newLabel = $state("");
  let isSaving = $state(false);
  let saveError = $state<string | null>(null);
  let saved = $state(false);
  let view = $state<"form" | "sent">("form");

  const settings = $derived<PortalSettings>({
    title: title.trim(),
    lang,
    checklist,
    message: messageOn ? message.trim() : "",
    thanks: thanksOn ? thanks.trim() : "",
    fieldLabel: fieldOn ? fieldLabel.trim() || depositStrings[lang].fieldDefault : "",
    logo: logoOn ? logo : null,
    twoWay,
    returns: start.returns,
    closesAt: closeOn ? endOfDay(closeDay) : null,
    notifyOnDelivery: notify,
  });

  // What was last saved; in create mode, what the form opened with.
  let baseline = $state(untrack(() => JSON.stringify(settings)));
  const dirty = $derived(JSON.stringify(settings) !== baseline);
  const canSave = $derived(settings.title.length > 0 && (mode === "create" || dirty) && !isSaving);

  $effect(() => {
    if (dirty) saved = false;
  });

  let leaving = false;
  beforeNavigate(({ cancel }) => {
    if (leaving || !dirty) return;
    if (!confirm("Leave without saving your changes?")) cancel();
  });

  function addItem(e?: Event) {
    e?.preventDefault();
    const label = newLabel.trim().slice(0, CHECKLIST_LABEL_MAX);
    if (!label || checklist.length >= CHECKLIST_MAX_ITEMS) return;
    checklist = [...checklist, { id: newChecklistItemId(), label }];
    newLabel = "";
  }

  async function save(e?: Event) {
    e?.preventDefault();
    if (!canSave) return;
    isSaving = true;
    saveError = null;
    try {
      // A create ends by leaving this page.
      leaving = mode === "create";
      await onSave(settings);
      baseline = JSON.stringify(settings);
      saved = true;
    } catch (err) {
      leaving = false;
      saveError = err instanceof Error ? err.message : "Couldn't save. Try again.";
    } finally {
      isSaving = false;
    }
  }

  // The preview is the real page, fed from the form instead of a link.
  const previewPortal = $derived<OpenedPortal>({
    id: "preview",
    title: settings.title || "Your portal's name",
    publicKey: new Uint8Array(),
    linkKey: new Uint8Array(),
    accepting: true,
    maxTotalSize,
    lang,
    checklist,
    message: settings.message,
    thanks: settings.thanks,
    fieldLabel: settings.fieldLabel,
    closesAt: settings.closesAt,
    logo: settings.logo,
    twoWay,
    returns: [],
  });

  const card = "rounded-lg bg-card p-4 sm:p-5";
</script>

{#snippet option(
  id: string,
  name: string,
  about: string,
  on: boolean,
  set: (v: boolean) => void,
  locked: boolean = false,
)}
  <div class="flex items-start justify-between gap-4">
    <div class="min-w-0 space-y-0.5">
      <p id="{id}-name" class="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
        {name}
        {#if locked}
          <a href="/pricing" class="focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded-full">
            <Badge tone="info">Max plan</Badge>
          </a>
        {/if}
      </p>
      <p id="{id}-about" class="text-sm text-muted-foreground">{about}</p>
    </div>
    <Switch
      checked={on}
      onChange={set}
      labelledby="{id}-name"
      describedby="{id}-about"
      disabled={isSaving || locked}
    />
  </div>
{/snippet}

<div class="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
  <form onsubmit={save} class="space-y-4" novalidate>
    <section class={cn(card, "space-y-4")}>
      <TextInput
        id="portal-title"
        label="Name"
        placeholder="For example: Documents for Jansen Administratie"
        maxlength={PORTAL_TITLE_MAX}
        required
        bind:value={title}
        disabled={isSaving}
      />
      <p class="-mt-2 text-xs text-muted-foreground">
        People who open the link see this name, so they know who they're sending to. It is
        encrypted, like everything else on this page: we can't read it.
      </p>

      <fieldset class="space-y-2" disabled={isSaving}>
        <legend class="text-sm font-medium text-foreground">Language of the page they see</legend>
        <div class="flex flex-wrap gap-x-5 gap-y-2">
          {#each LOCALES as choice (choice)}
            <label class="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input
                type="radio"
                name="portal-language"
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

    <section class={cn(card, "space-y-3")} aria-labelledby="ask-heading">
      <div class="space-y-0.5">
        <h2 id="ask-heading" class="text-sm font-medium text-foreground">What you ask for</h2>
        <p class="text-sm text-muted-foreground">
          A list of things to send. People attach a file to each item, so you see at a glance
          what is still missing. Leave it empty to accept anything.
        </p>
      </div>

      {#if checklist.length > 0}
        <ul class="divide-y divide-border rounded-md border border-border">
          {#each checklist as item (item.id)}
            <li class="flex items-center justify-between gap-3 px-3 py-2">
              <span class="min-w-0 break-words text-sm text-foreground">{item.label}</span>
              <TextLink
                onclick={() => (checklist = checklist.filter((i) => i.id !== item.id))}
                disabled={isSaving}
                class="shrink-0 text-xs text-muted-foreground"
              >
                Remove<span class="sr-only"> {item.label}</span>
              </TextLink>
            </li>
          {/each}
        </ul>
      {/if}

      {#if checklist.length < CHECKLIST_MAX_ITEMS}
        <div class="flex items-end gap-2">
          <div class="min-w-0 flex-1">
            <TextInput
              id="checklist-new"
              label="Add an item"
              placeholder="For example: Copy of your ID"
              maxlength={CHECKLIST_LABEL_MAX}
              bind:value={newLabel}
              disabled={isSaving}
              onkeydown={(e) => {
                if (e.key === "Enter") addItem(e);
              }}
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            fullWidth={false}
            class="whitespace-nowrap"
            onclick={() => addItem()}
            disabled={isSaving || newLabel.trim().length === 0}
          >
            Add
          </Button>
        </div>
      {/if}
    </section>

    <section class={cn(card, "space-y-4")} aria-labelledby="options-heading">
      <h2 id="options-heading" class="text-sm font-medium text-foreground">Options</h2>

      <div>
        {@render option(
          "opt-message",
          "Welcome message",
          "A few lines under the name: what to send, and by when.",
          messageOn,
          (v) => {
            messageOn = v;
            if (v) view = "form";
          },
        )}
        <Reveal open={messageOn}>
          <Textarea
            id="portal-message"
            aria-labelledby="opt-message-name"
            placeholder="For example: Please send the documents for your 2025 tax return before 1 April."
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
          "opt-field",
          "Extra field",
          "One thing they fill in before sending, such as their name or client number. You see it with each delivery.",
          fieldOn,
          (v) => {
            fieldOn = v;
            if (v) {
              view = "form";
              if (!fieldLabel.trim()) fieldLabel = depositStrings[lang].fieldDefault;
            }
          },
        )}
        <Reveal open={fieldOn}>
          <TextInput
            id="portal-field"
            label="What the field is called"
            placeholder={depositStrings[lang].fieldDefault}
            maxlength={PORTAL_FIELD_LABEL_MAX}
            bind:value={fieldLabel}
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
            id="portal-thanks"
            aria-labelledby="opt-thanks-name"
            placeholder="For example: Thank you. You will hear from us within five working days."
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
          "Shown above the name on the upload page. Encrypted like the name: we can't see it.",
          logoOn,
          (v) => {
            logoOn = v;
            if (v) view = "form";
          },
          brandLocked,
        )}
        <Reveal open={logoOn}>
          <input
            bind:this={logoInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            class="hidden"
            onchange={pickLogo}
          />
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
              <TextLink
                onclick={() => (logo = null)}
                disabled={isSaving}
                class="text-sm text-muted-foreground"
              >
                Remove
              </TextLink>
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
          "opt-twoway",
          "Send files back",
          "You can put files on the portal for the other side to download, such as a finished report.",
          twoWay,
          (v) => {
            twoWay = v;
            if (v) view = "form";
          },
          twoWayLocked,
        )}
        <Reveal open={twoWay}>
          <Alert tone="warning">
            Everyone who has this portal's link can download what you put on it. Use it for a
            portal you give to one person or one client.
          </Alert>
        </Reveal>
      </div>

      <div class="border-t border-border pt-5">
        {@render option(
          "opt-close",
          "Closing date",
          "The portal takes files up to and including this day, then closes by itself.",
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
            id="portal-close"
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
          "Email when files arrive",
          "One email per portal per hour at most, to you and whoever you share the portal with. It can't say what was sent: we can't read that.",
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
          {mode === "create" ? "Create portal" : "Save changes"}
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
        {#each [{ id: "form", label: "Upload page" }, { id: "sent", label: "After sending" }] as const as tab (tab.id)}
          <button
            type="button"
            aria-pressed={view === tab.id}
            onclick={() => (view = tab.id)}
            class={cn(
              "rounded-full px-3 py-1.5 transition-colors duration-150 ease-out hover:cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              view === tab.id
                ? "bg-background text-foreground"
                : "text-muted-foreground hover:text-foreground",
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
        <DepositView portal={previewPortal} locale={lang} preview={view} />
      </div>
    </div>
  </aside>
</div>
