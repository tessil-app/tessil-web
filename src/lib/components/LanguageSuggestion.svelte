<script lang="ts">
  // On an English page that also exists in Dutch, a reader whose browser asks
  // for Dutch is offered the Dutch page once. Nothing happens by itself: a
  // redirect would hide pages from search engines, which visit without a
  // language. Picking either language, or closing this, ends the offer.

  import { page } from "$app/state";
  import { readChosenLocale, rememberLocale } from "$lib/i18n/app.svelte";
  import { localeFromPath } from "$lib/i18n/locale";
import { canonicalPath, localizedPath } from "$lib/i18n/paths";
  import { chromeMessages } from "$lib/i18n/messages/chrome";
  import IconXRegular from "phosphor-icons-svelte/IconXRegular.svelte";
  import { afterNavigate } from "$app/navigation";
  import { onMount } from "svelte";

  let wantsDutch = $state(false);
  let decided = $state(true);

  onMount(() => {
    decided = readChosenLocale() !== null;
    const first = (navigator.languages ?? [navigator.language])[0]?.toLowerCase() ?? "";
    wantsDutch = first.startsWith("nl");
  });
  // The layout stays mounted between pages, so a choice made on another page
  // (the language switch, or this offer) is read again after each move.
  afterNavigate(() => {
    decided = readChosenLocale() !== null;
  });

  const pathname = $derived(page.url.pathname);
  const dutchPath = $derived(
    localeFromPath(pathname) === "en" ? localizedPath(canonicalPath(pathname), "nl") : null,
  );
  const t = chromeMessages.nl;
</script>

{#if dutchPath && wantsDutch && !decided}
  <div class="border-b border-border bg-secondary" lang="nl">
    <div class="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 text-sm sm:px-6">
      <p class="text-foreground">
        {t.suggestion}
        <a
          href={dutchPath}
          hreflang="nl"
          onclick={() => {
            rememberLocale("nl");
            decided = true;
          }}
          class="font-medium text-primary underline underline-offset-2">
          {t.suggestionLink}
        </a>
      </p>
      <button
        type="button"
        aria-label={t.dismiss}
        onclick={() => {
          rememberLocale("en");
          decided = true;
        }}
        class="shrink-0 rounded p-1 text-muted-foreground transition-colors duration-150 ease-out hover:cursor-pointer hover:text-foreground focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <IconXRegular class="size-4" />
      </button>
    </div>
  </div>
{/if}
