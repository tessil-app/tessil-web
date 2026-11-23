<script lang="ts">
  import { goto } from "$app/navigation";
  import Alert from "$lib/components/Alert.svelte";
  import Button from "$lib/components/Button.svelte";
  import DividerRow from "$lib/components/DividerRow.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import TextInput from "$lib/components/TextInput.svelte";
  import { api } from "$lib/api/client";
  import { auth } from "$lib/stores/auth.svelte";
  import PlanRow from "./PlanRow.svelte";
  import LanguageRow from "./LanguageRow.svelte";

  import { appLocale } from "$lib/i18n/app.svelte";
  import { settingsMessages } from "$lib/i18n/messages/settings";
  const t = $derived(settingsMessages[appLocale()].account);
  let isExporting = $state(false);
  let exportError = $state<string | null>(null);

  let confirming = $state(false);
  let confirmEmail = $state("");
  let isDeleting = $state(false);
  let errorMessage = $state<string | null>(null);

  async function exportAccount() {
    if (isExporting) return;
    isExporting = true;
    exportError = null;
    try {
      const { blob, filename } = await api.exportMyAccount();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      exportError = err instanceof Error ? err.message : t.exportFailed;
    } finally {
      isExporting = false;
    }
  }

  function startConfirm() {
    confirming = true;
    confirmEmail = "";
    errorMessage = null;
  }

  function cancelConfirm() {
    confirming = false;
    confirmEmail = "";
    errorMessage = null;
  }

  async function deleteAccount() {
    if (isDeleting) return;
    isDeleting = true;
    errorMessage = null;
    try {
      await api.deleteMyAccount(confirmEmail);
      auth.user = null;
      await goto("/?deleted=1", { replaceState: true });
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : t.deleteFailed;
    } finally {
      isDeleting = false;
    }
  }
</script>

<PlanRow />

<LanguageRow />

<DividerRow
  title={t.dataTitle}
  body={t.dataBody}
>
  {#snippet actions()}
    <Button
      variant="secondary"
      fullWidth={false}
      onclick={exportAccount}
      disabled={isExporting}
    >
      {#if isExporting}
        <Spinner aria-hidden="true" />
        {t.preparing}
      {:else}
        {t.export}
      {/if}
    </Button>
  {/snippet}

  {#snippet expanded()}
    {#if exportError}
      <Alert tone="destructive">
        {exportError}
        {#snippet action()}
          <Button variant="secondary" fullWidth={false} onclick={exportAccount}>
            {t.retry}
          </Button>
        {/snippet}
      </Alert>
    {/if}
  {/snippet}
</DividerRow>

<DividerRow
  title={t.dangerTitle}
  body={t.dangerBody}
>
  {#snippet actions()}
    {#if !confirming}
      <Button variant="ghost" fullWidth={false} onclick={startConfirm}>
        {t.deleteAccount}
      </Button>
    {/if}
  {/snippet}

  {#snippet expanded()}
    {#if confirming && auth.user}
      <div class="flex flex-wrap items-end gap-2">
        <div class="flex-1 basis-64 min-w-0">
          <TextInput
            id="confirm-email"
            type="email"
            label={t.typeToConfirm(auth.user.email)}
            bind:value={confirmEmail}
            autocomplete="off"
            autocapitalize="off"
            spellcheck={false}
            error={errorMessage ?? undefined}
            disabled={isDeleting}
          />
        </div>
        <Button
          variant="secondary"
          fullWidth={false}
          onclick={cancelConfirm}
          disabled={isDeleting}
        >
          {t.cancel}
        </Button>
        <Button
          variant="destructive"
          fullWidth={false}
          onclick={deleteAccount}
          disabled={isDeleting || confirmEmail.trim() !== auth.user.email}
        >
          {#if isDeleting}
            <Spinner aria-hidden="true" />
            {t.deleting}
          {:else}
            {t.permanently}
          {/if}
        </Button>
      </div>
    {/if}
  {/snippet}
</DividerRow>
