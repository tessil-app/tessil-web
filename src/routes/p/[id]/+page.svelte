<script lang="ts">
  // A portal's deposit page: what someone sees when they open a portal
  // link. No account. Files are encrypted here, to the portal's public
  // key, before anything is uploaded.

  import TextLink from "$lib/components/TextLink.svelte";
  import { page } from "$app/stores";
  import Button from "$lib/components/Button.svelte";
  import EmptyState from "$lib/components/EmptyState.svelte";
  import PasswordInput from "$lib/components/PasswordInput.svelte";
  import PageLayout from "$lib/components/PageLayout.svelte";
  import DepositView from "$lib/components/portal/DepositView.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import { openPortalFromLink, type OpenedPortal } from "$lib/portal/deposit";
  import { DEFAULT_LOCALE, HTML_LANG, LOCALES, type Locale } from "$lib/i18n/locale";
  import { depositStrings } from "$lib/i18n/messages";
  import { onDestroy, onMount } from "svelte";

  type Phase = "loading" | "invalid" | "locked" | "ready";

  let phase = $state<Phase>("loading");
  let portal = $state<OpenedPortal | null>(null);
  let invalidReason = $state<"bad_link" | "not_found" | "untrusted" | "offline">("bad_link");

  // The visitor did not choose this site, so its language follows, in
  // order: what they pick here, what the portal's owner chose, and what
  // their browser asks for.
  let chosenLocale = $state<Locale | null>(null);
  let browserLocale = $state<Locale>(DEFAULT_LOCALE);
  const locale = $derived<Locale>(chosenLocale ?? portal?.lang ?? browserLocale);
  const t = $derived(depositStrings[locale]);

  let previousLang: string | null = null;
  $effect(() => {
    if (typeof document === "undefined") return;
    previousLang ??= document.documentElement.lang;
    document.documentElement.lang = HTML_LANG[locale];
  });
  onDestroy(() => {
    if (typeof document !== "undefined" && previousLang !== null) {
      document.documentElement.lang = previousLang;
    }
  });

  let password = $state("");
  let passwordError = $state<"wrong" | "wait" | null>(null);
  let unlocking = $state(false);

  async function open(withPassword?: string) {
    try {
      const result = await openPortalFromLink($page.params.id ?? "", window.location.hash, withPassword);
      if (result.ok) {
        portal = result.portal;
        password = "";
        phase = "ready";
        return;
      }
      if (result.reason === "password_required") {
        phase = "locked";
        return;
      }
      if (result.reason === "password_wrong" || result.reason === "password_wait") {
        passwordError = result.reason === "password_wrong" ? "wrong" : "wait";
        phase = "locked";
        return;
      }
      // "untrusted": do not offer an upload. The key we were given cannot be trusted.
      invalidReason = result.reason;
      phase = "invalid";
    } catch {
      invalidReason = "offline";
      phase = "invalid";
    }
  }

  async function unlock(e: Event) {
    e.preventDefault();
    if (unlocking || password.length === 0) return;
    unlocking = true;
    passwordError = null;
    await open(password);
    unlocking = false;
  }

  onMount(() => {
    const wanted = (navigator.languages ?? [navigator.language]).map((l) => l.toLowerCase().slice(0, 2));
    browserLocale = LOCALES.find((l) => wanted.includes(l)) ?? DEFAULT_LOCALE;
    void open();
  });
</script>

<Seo title={t.pageTitle} robots="noindex" />

<PageLayout width="2xl">
  {#if phase === "loading"}
    <div role="status" aria-live="polite" class="flex flex-col items-center gap-4 py-16 text-info">
      <Spinner class="size-8" aria-hidden="true" />
      <p class="text-muted-foreground">{t.opening}</p>
    </div>
  {:else if phase === "invalid"}
    <EmptyState title={t.invalid[invalidReason].title} level={1}>
      <p>{t.invalid[invalidReason].body}</p>
    </EmptyState>
  {:else if phase === "locked"}
    <EmptyState title={t.password.title} level={1}>
      <p>{t.password.body}</p>
      <form onsubmit={unlock} class="mx-auto mt-2 w-full max-w-xs space-y-3 text-left">
        <PasswordInput
          id="portal-password"
          label={t.password.label}
          autocomplete="off"
          bind:value={password}
          disabled={unlocking}
          error={passwordError ? t.password[passwordError] : undefined}
        />
        <Button type="submit" disabled={unlocking || password.length === 0}>
          {unlocking ? t.password.opening : t.password.open}
        </Button>
      </form>
    </EmptyState>
  {:else if portal}
    <DepositView {portal} {locale} />
  {/if}

  {#if phase !== "loading"}
    <p class="mt-8 text-center text-xs text-muted-foreground">
      {#each LOCALES as option, i (option)}
        {#if i > 0}<span aria-hidden="true"> · </span>{/if}
        {#if option === locale}
          <span class="text-foreground" aria-current="true">{depositStrings[option].languageName}</span>
        {:else}
          <TextLink
            lang={HTML_LANG[option]}
            onclick={() => (chosenLocale = option)}
          >
            {depositStrings[option].languageName}
          </TextLink>
        {/if}
      {/each}
    </p>
  {/if}
</PageLayout>
