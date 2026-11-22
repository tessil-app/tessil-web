<script lang="ts">
  // The account's language: the pages after sign-in follow it as they are
  // translated, and so will emails. Saved on the account, so it holds on
  // every device.

  import Alert from "$lib/components/Alert.svelte";
  import DividerRow from "$lib/components/DividerRow.svelte";
  import Select from "$lib/components/Select.svelte";
  import { appLocale, chooseLocale } from "$lib/i18n/app.svelte";
  import { isLocale, LANGUAGE_NAME, LOCALES } from "$lib/i18n/locale";

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
      error = "Couldn't save the language. Try again.";
    }
  }
</script>

<DividerRow
  title="Language / Taal"
  body="For the pages after you sign in, on every device. Parts not yet translated stay in English."
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
      <p class="text-sm text-muted-foreground" role="status">Saved.</p>
    {/if}
  {/snippet}
</DividerRow>
