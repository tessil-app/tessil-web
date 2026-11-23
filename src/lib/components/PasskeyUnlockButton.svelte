<script lang="ts">
  // "Unlock with passkey", for the vault unlock dialogs. Renders nothing
  // unless this account has a passkey that can unlock its vault.

  import Alert from "$lib/components/Alert.svelte";
  import Button from "$lib/components/Button.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import { auth } from "$lib/stores/auth.svelte";
  import { passkeysThatUnlock, unlockWithPasskey } from "$lib/vault/client";
  import { passkeyUnlockPossible } from "$lib/vault/passkeyUnlock";
  import IconFingerprintRegular from "phosphor-icons-svelte/IconFingerprintRegular.svelte";

  import { appLocale } from "$lib/i18n/app.svelte";
  import { chromeMessages } from "$lib/i18n/messages/chrome";
  interface Props {
    /** Set while the dialog is open, so the check runs when it is needed. */
    active: boolean;
    disabled?: boolean;
    onUnlocked: () => void;
  }

  let { active, disabled = false, onUnlocked }: Props = $props();

  const words = $derived(chromeMessages[appLocale()].common);

  let available = $state(false);
  let busy = $state(false);
  let error = $state<string | null>(null);

  $effect(() => {
    if (!active || !auth.user || !passkeyUnlockPossible()) {
      available = false;
      return;
    }
    error = null;
    let cancelled = false;
    passkeysThatUnlock()
      .then((wraps) => {
        if (!cancelled) available = wraps.length > 0;
      })
      .catch(() => {
        if (!cancelled) available = false;
      });
    return () => {
      cancelled = true;
    };
  });

  async function unlock() {
    if (!auth.user || busy) return;
    busy = true;
    error = null;
    try {
      const result = await unlockWithPasskey(auth.user.id);
      if (result.ok) {
        onUnlocked();
      } else if (result.reason === "no_prf") {
        error = words.passkeyNoPrf;
      } else if (result.reason === "wrong_passkey") {
        error = words.passkeyWrong;
      } else if (result.reason !== "cancelled") {
        error = words.passkeyFailed;
      }
    } catch {
      error = words.passkeyFailed;
    } finally {
      busy = false;
    }
  }
</script>

{#if available}
  <div class="space-y-3">
    <Button type="button" variant="secondary" onclick={unlock} disabled={disabled || busy}>
      {#if busy}
        <Spinner aria-hidden="true" />
        {words.passkeyWaiting}
      {:else}
        <IconFingerprintRegular class="size-4" />
        {words.passkeyUnlock}
      {/if}
    </Button>
    {#if error}
      <Alert tone="destructive">{error}</Alert>
    {/if}
    <div class="flex items-center gap-3 text-xs text-muted-foreground" aria-hidden="true">
      <span class="h-px flex-1 bg-border"></span>
      {words.or}
      <span class="h-px flex-1 bg-border"></span>
    </div>
  </div>
{/if}
