<script lang="ts">
  // English or Dutch. On a public page it is a link to the same page in the
  // other language, shown only when that page exists. Elsewhere it sets the
  // account's language, or this device's when signed out.

  import { page } from "$app/state";
  import { chooseLocale, isAppPath, rememberLocale, uiLocale } from "$lib/i18n/app.svelte";
  import { HTML_LANG, LANGUAGE_NAME, LOCALES, type Locale } from "$lib/i18n/locale";
import { canonicalPath, localizedPath } from "$lib/i18n/paths";
  import { cn } from "$lib/utils";
  import IconGlobeSimpleRegular from "phosphor-icons-svelte/IconGlobeSimpleRegular.svelte";

  interface Props {
    class?: string;
  }

  let { class: className }: Props = $props();

  const pathname = $derived(page.url.pathname);
  const current = $derived(uiLocale(pathname));
  const app = $derived(isAppPath(pathname));
  // On a public page: the other languages this page exists in.
  const targets = $derived(
    LOCALES.map((locale) => ({ locale, path: localizedPath(canonicalPath(pathname), locale) })),
  );
  const visible = $derived(app || targets.filter((t) => t.path).length > 1);

  // A small segmented control: the language being read is the filled segment.
  const itemClass =
    "inline-flex h-6 min-w-8 items-center justify-center rounded-full px-2 text-xs font-medium uppercase tracking-wide transition-[background-color,color,box-shadow] duration-150 ease-out focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring";
  const onClass = "bg-background text-foreground shadow-sm ring-1 ring-border";
  const offClass = "text-muted-foreground hover:text-foreground";

  async function pick(locale: Locale) {
    if (locale !== current) await chooseLocale(locale).catch(() => {});
  }
</script>

{#if visible}
  <div
    class={cn("inline-flex items-center gap-0.5 rounded-full border border-border bg-card/70 p-0.5", className)}
    role="group"
    aria-label="Language / Taal"
  >
    <span class="hidden pl-1.5 pr-0.5 text-muted-foreground sm:inline-flex" aria-hidden="true">
      <IconGlobeSimpleRegular class="size-3.5" />
    </span>
    {#each LOCALES as locale (locale)}
      {@const on = locale === current}
      {#if app}
        <button
          type="button"
          lang={HTML_LANG[locale]}
          aria-pressed={on}
          aria-label={LANGUAGE_NAME[locale]}
          title={LANGUAGE_NAME[locale]}
          onclick={() => pick(locale)}
          class={cn(itemClass, "hover:cursor-pointer", on ? onClass : offClass)}
        >
          {locale}
        </button>
      {:else}
        {@const target = targets.find((t) => t.locale === locale)?.path}
        {#if on || !target}
          <span class={cn(itemClass, onClass)} aria-current="true" title={LANGUAGE_NAME[locale]}>{locale}</span>
        {:else}
          <a
            href={target}
            hreflang={HTML_LANG[locale]}
            lang={HTML_LANG[locale]}
            aria-label={LANGUAGE_NAME[locale]}
            title={LANGUAGE_NAME[locale]}
            onclick={() => rememberLocale(locale)}
            class={cn(itemClass, offClass)}
          >
            {locale}
          </a>
        {/if}
      {/if}
    {/each}
  </div>
{/if}
