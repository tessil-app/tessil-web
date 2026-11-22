<script lang="ts">
  // English or Dutch. On a public page it is a link to the same page in the
  // other language, shown only when that page exists. Elsewhere it sets the
  // account's language, or this device's when signed out.

  import { page } from "$app/state";
  import { chooseLocale, isAppPath, rememberLocale, uiLocale } from "$lib/i18n/app.svelte";
  import { HTML_LANG, LANGUAGE_NAME, LOCALES, type Locale } from "$lib/i18n/locale";
import { canonicalPath, localizedPath } from "$lib/i18n/paths";
  import { cn } from "$lib/utils";

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

  const itemClass =
    "rounded px-1.5 py-0.5 transition-colors duration-150 ease-out focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

  async function pick(locale: Locale) {
    if (locale !== current) await chooseLocale(locale).catch(() => {});
  }
</script>

{#if visible}
  <div class={cn("inline-flex items-center gap-0.5 text-xs", className)} role="group" aria-label="Language / Taal">
    {#each LOCALES as locale (locale)}
      {@const on = locale === current}
      {#if app}
        <button
          type="button"
          lang={HTML_LANG[locale]}
          aria-pressed={on}
          title={LANGUAGE_NAME[locale]}
          onclick={() => pick(locale)}
          class={cn(itemClass, "hover:cursor-pointer uppercase", on ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground")}
        >
          {locale}
        </button>
      {:else}
        {@const target = targets.find((t) => t.locale === locale)?.path}
        {#if on || !target}
          <span class={cn(itemClass, "uppercase text-foreground font-medium")} aria-current="true">{locale}</span>
        {:else}
          <a
            href={target}
            hreflang={HTML_LANG[locale]}
            lang={HTML_LANG[locale]}
            title={LANGUAGE_NAME[locale]}
            onclick={() => rememberLocale(locale)}
            class={cn(itemClass, "uppercase text-muted-foreground hover:text-foreground")}
          >
            {locale}
          </a>
        {/if}
      {/if}
    {/each}
  </div>
{/if}
