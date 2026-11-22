<script lang="ts">
  // The account's language: the pages after sign-in follow it as they are
  // translated, and so will emails. Saved on the account, so it holds on
  // every device.

  import Alert from "$lib/components/Alert.svelte";
  import DividerRow from "$lib/components/DividerRow.svelte";
  import Select from "$lib/components/Select.svelte";
  import { appLocale, chooseLocale } from "$lib/i18n/app.svelte";
  import { isLocale, LANGUAGE_NAME, LOCALES } from "$lib/i18n/locale";

  import { settingsMessages } from "$lib/i18n/messages/settings";
  const t = $derived(settingsMessages[appLocale()].language);
  let value = $state<string>(appLocale());
  let error = $state<string | null>(null);
  let saved = $state(false);

  async function save(next: string) {
    if (!isLocale(next)) return;
    error = null;
    saved = false;
    try {
      await chooseLocale(next);
      saved = true;
    } catch {
      error = t.failed;
    }
  }
</script>

<DividerRow
  title="Language / Taal"
  body={t.body}
>
  {#snippet actions()}
    <Select
      id="account-language"
      aria-label="Language / Taal"
      bind:value
      onchange={() => void save(value)}
      options={LOCALES.map((l) => ({ value: l, label: LANGUAGE_NAME[l] }))}
      class="w-40"
    />
  {/snippet}
  {#snippet expanded()}
    {#if error}
      <Alert tone="destructive">{error}</Alert>
    {:else if saved}
      <p class="text-sm text-muted-foreground" role="status">{t.saved}</p>
    {/if}
  {/snippet}
</DividerRow>
