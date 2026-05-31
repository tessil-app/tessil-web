<script lang="ts">
  import { goto } from "$app/navigation";
  import Alert from "$lib/components/Alert.svelte";
  import Button from "$lib/components/Button.svelte";
  import DividerRow from "$lib/components/DividerRow.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import TextInput from "$lib/components/TextInput.svelte";
  import { api } from "$lib/api/client";
  import { auth } from "$lib/stores/auth.svelte";

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
      exportError = err instanceof Error ? err.message : "Couldn't export your data.";
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
      errorMessage = err instanceof Error ? err.message : "Couldn't delete your account.";
    } finally {
      isDeleting = false;
    }
  }
</script>

<DividerRow
  title="Your data"
  body="Export everything we have on you as JSON: your account, transfers, and recent sign-in activity. File contents aren't included — we never had them."
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
        Preparing export
      {:else}
        Export
      {/if}
    </Button>
  {/snippet}

  {#snippet expanded()}
    {#if exportError}
      <Alert tone="destructive">
        {exportError}
        {#snippet action()}
          <Button variant="secondary" fullWidth={false} onclick={exportAccount}>
            Retry
          </Button>
        {/snippet}
      </Alert>
    {/if}
  {/snippet}
</DividerRow>

<DividerRow
  title="Danger zone"
  body="Permanently delete your account and all transfers. This can't be undone."
>
  {#snippet actions()}
    {#if !confirming}
      <Button variant="ghost" fullWidth={false} onclick={startConfirm}>
        Delete account
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
            label={`Type ${auth.user.email} to confirm`}
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
          Cancel
        </Button>
        <Button
          variant="destructive"
          fullWidth={false}
          onclick={deleteAccount}
          disabled={isDeleting || confirmEmail.trim() !== auth.user.email}
        >
          {#if isDeleting}
            <Spinner aria-hidden="true" />
            Deleting
          {:else}
            Permanently delete
          {/if}
        </Button>
      </div>
    {/if}
  {/snippet}
</DividerRow>
