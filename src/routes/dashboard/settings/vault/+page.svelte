<script lang="ts">
  // Both operations ask for proof again. The password can be set with the
  // old password, the recovery phrase (a forgotten password) or a passkey
  // (a vault that has none yet). A new phrase needs the password or a
  // passkey, not the phrase it replaces.
  import Alert from "$lib/components/Alert.svelte";
  import Button from "$lib/components/Button.svelte";
  import * as Frame from "$lib/components/frame";
  import Modal from "$lib/components/Modal.svelte";
  import PasswordInput from "$lib/components/PasswordInput.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import { auth } from "$lib/stores/auth.svelte";
  import VaultProof from "$lib/components/VaultProof.svelte";
  import {
    regeneratePhrase,
    setVaultPassword,
    vaultHasPassword,
    type VaultAccess,
  } from "$lib/vault/client";
  import { vaultFailureMessage } from "$lib/vault/messages";
  import { onMount } from "svelte";
  import {
    evaluatePassword,
    MIN_PASSWORD_LENGTH,
    MIN_PASSWORD_SCORE,
    scoreLabel,
    type PasswordStrength,
  } from "$lib/vault/strength";
  import IconCheckRegular from "phosphor-icons-svelte/IconCheckRegular.svelte";
  import IconCopyRegular from "phosphor-icons-svelte/IconCopyRegular.svelte";
  import IconDownloadSimpleRegular from "phosphor-icons-svelte/IconDownloadSimpleRegular.svelte";
  import IconEyeRegular from "phosphor-icons-svelte/IconEyeRegular.svelte";
  import IconEyeSlashRegular from "phosphor-icons-svelte/IconEyeSlashRegular.svelte";

  // ─── Change password ──────────────────────────────────────────────────────

  let hasPassword = $state(true);
  let pwProof = $state<VaultAccess | null>(null);
  let pwProofField = $state<{ reset: () => void } | null>(null);
  let pwNew = $state("");

  onMount(async () => {
    hasPassword = await vaultHasPassword(true).catch(() => true);
  });
  let pwConfirm = $state("");
  let pwStrength = $state<PasswordStrength>({
    score: 0,
    acceptable: false,
    warning: "",
    suggestions: [],
  });
  let isEvaluatingPw = $state(false);
  let isChangingPassword = $state(false);
  let changePwError = $state<string | null>(null);
  let changePwSuccess = $state(false);

  $effect(() => {
    const value = pwNew;
    isEvaluatingPw = true;
    let cancelled = false;
    evaluatePassword(value)
      .then((r) => {
        if (!cancelled) pwStrength = r;
      })
      .catch(() => {
        if (!cancelled) {
          pwStrength = { score: 0, acceptable: false, warning: "", suggestions: [] };
        }
      })
      .finally(() => {
        if (!cancelled) isEvaluatingPw = false;
      });
    return () => {
      cancelled = true;
    };
  });

  const pwMatches = $derived(pwNew.length > 0 && pwNew === pwConfirm);
  const pwSameAsCurrent = $derived(
    pwNew.length > 0 && pwProof?.kind === "password" && pwNew === pwProof.password,
  );
  const canChangePassword = $derived(
    !isChangingPassword &&
      pwProof !== null &&
      pwStrength.acceptable &&
      pwMatches &&
      !pwSameAsCurrent,
  );

  async function handleChangePassword(e: SubmitEvent) {
    e.preventDefault();
    if (!canChangePassword || !auth.user) return;
    changePwError = null;
    changePwSuccess = false;
    isChangingPassword = true;
    try {
      const result = await setVaultPassword(auth.user.id, pwNew, pwProof!);
      if (!result.ok) {
        changePwError = vaultFailureMessage(result.reason);
        return;
      }
      changePwSuccess = true;
      hasPassword = true;
      pwProofField?.reset();
      pwNew = "";
      pwConfirm = "";
    } catch (err) {
      changePwError =
        err instanceof Error ? err.message : "Couldn't change your password.";
    } finally {
      isChangingPassword = false;
    }
  }

  const pwStrengthBarColor = $derived(
    [
      "bg-destructive",
      "bg-destructive",
      "bg-warning",
      "bg-success",
      "bg-success",
    ][pwStrength.score],
  );
  const pwStrengthBarWidth = $derived(
    `${((pwStrength.score + 1) / 5) * 100}%`,
  );

  // ─── Regenerate recovery phrase ───────────────────────────────────────────

  let regenProof = $state<VaultAccess | null>(null);
  let regenProofField = $state<{ reset: () => void } | null>(null);
  let isRegenerating = $state(false);
  let regenError = $state<string | null>(null);
  let regenNewPhrase = $state<string | null>(null);
  let regenRevealed = $state(false);
  let regenCopied = $state(false);
  let regenDoneModalOpen = $state(false);
  let regenDoneChecked = $state(false);

  const canRegenerate = $derived(
    !isRegenerating && regenProof !== null && regenNewPhrase === null,
  );

  async function handleRegenerate(e: SubmitEvent) {
    e.preventDefault();
    if (!canRegenerate || !auth.user) return;
    regenError = null;
    isRegenerating = true;
    try {
      const result = await regeneratePhrase(auth.user.id, regenProof!);
      if (!result.ok) {
        regenError = vaultFailureMessage(result.reason);
        return;
      }
      regenNewPhrase = result.recoveryPhrase;
      regenProofField?.reset();
      regenRevealed = false;
    } catch (err) {
      regenError =
        err instanceof Error ? err.message : "Couldn't regenerate the phrase.";
    } finally {
      isRegenerating = false;
    }
  }

  async function copyRegenPhrase() {
    if (!regenNewPhrase) return;
    try {
      await navigator.clipboard.writeText(regenNewPhrase);
      regenCopied = true;
      setTimeout(() => (regenCopied = false), 2000);
    } catch {
      // ignore - user can copy manually
    }
  }

  function downloadRegenPhrase() {
    if (!regenNewPhrase) return;
    const body =
      "Tessil recovery phrase\n" +
      "Keep this somewhere safe. If you forget your vault password, this\n" +
      "is the only way to recover access to your files.\n\n" +
      regenNewPhrase +
      "\n";
    const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tessil-recovery-phrase.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  function finishRegen() {
    regenDoneModalOpen = false;
    regenDoneChecked = false;
    regenNewPhrase = null;
    regenRevealed = false;
  }

  const regenWords = $derived(regenNewPhrase ? regenNewPhrase.split(" ") : []);
</script>

<Frame.Root>
  <Frame.Header>
    <Frame.Title class="text-base">
      {hasPassword ? "Change vault password" : "Add a vault password"}
    </Frame.Title>
    <Frame.Description class="mt-1 block">
      {#if hasPassword}
        Your recovery phrase and any passkeys keep working after this. Forgot the
        password? Use your recovery phrase below to set a new one.
      {:else}
        Your vault opens with a passkey and your recovery phrase. A password is
        optional: it gives you another way in on a device without your passkey.
      {/if}
    </Frame.Description>
  </Frame.Header>

  <Frame.Panel>
    <form onsubmit={handleChangePassword} class="space-y-5" novalidate>
      <VaultProof
        bind:this={pwProofField}
        bind:access={pwProof}
        idPrefix="vault-current"
        passwordLabel="Current password"
        disabled={isChangingPassword}
      />

      <div class="space-y-2">
        <PasswordInput
          id="vault-new-password"
          label="New password"
          autocomplete="new-password"
          required
          bind:value={pwNew}
          disabled={isChangingPassword}
        />
        <div class="space-y-1">
          <div class="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              class="h-full transition-[width,background-color] duration-200 ease-out {pwStrengthBarColor}"
              style:width={pwNew.length === 0 ? "0%" : pwStrengthBarWidth}
            ></div>
          </div>
          <div class="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {#if pwNew.length === 0}
                At least {MIN_PASSWORD_LENGTH} characters · zxcvbn score ≥ {MIN_PASSWORD_SCORE}
              {:else if isEvaluatingPw}
                Checking…
              {:else}
                {scoreLabel(pwStrength.score)}
                {#if pwNew.length < MIN_PASSWORD_LENGTH}
                  · {MIN_PASSWORD_LENGTH - pwNew.length} more
                {/if}
              {/if}
            </span>
            {#if pwStrength.acceptable}
              <span class="inline-flex items-center gap-1 text-success-foreground">
                <IconCheckRegular class="size-3.5" /> OK
              </span>
            {/if}
          </div>
          {#if pwNew.length > 0 && !pwStrength.acceptable && pwStrength.warning}
            <p class="text-xs text-warning-foreground">{pwStrength.warning}</p>
          {/if}
          {#if pwSameAsCurrent}
            <p class="text-xs text-warning-foreground">
              That's the same as your current password.
            </p>
          {/if}
        </div>
      </div>

      <PasswordInput
        id="vault-confirm-password"
        label="Confirm new password"
        autocomplete="new-password"
        required
        bind:value={pwConfirm}
        disabled={isChangingPassword}
        error={pwConfirm.length > 0 && !pwMatches
          ? "Passwords don't match yet."
          : undefined}
      />

      {#if changePwError}
        <Alert tone="destructive" title="Couldn't change password">{changePwError}</Alert>
      {/if}
      {#if changePwSuccess}
        <Alert tone="success" title="Password updated">
          Your new password is now in effect on every device. The old one no
          longer works.
        </Alert>
      {/if}

      <Button type="submit" disabled={!canChangePassword}>
        {#if isChangingPassword}
          <Spinner aria-hidden="true" />
          Updating password…
        {:else}
          {hasPassword ? "Update password" : "Add password"}
        {/if}
      </Button>
    </form>
  </Frame.Panel>
</Frame.Root>

<Frame.Root>
  <Frame.Header>
    <Frame.Title class="text-base">Recovery phrase</Frame.Title>
    <Frame.Description class="mt-1 block">
      Regenerating retires the old 12-word phrase immediately. Use this if
      you think the previous phrase was seen by someone else.
    </Frame.Description>
  </Frame.Header>

  <Frame.Panel>
    {#if regenNewPhrase === null}
      <form onsubmit={handleRegenerate} class="space-y-4" novalidate>
        <VaultProof
          bind:this={regenProofField}
          bind:access={regenProof}
          allow={["password", "passkey"]}
          idPrefix="regen-current"
          passwordLabel="Confirm your password"
          disabled={isRegenerating}
        />
        {#if regenError}
          <Alert tone="destructive" title="Couldn't regenerate phrase">{regenError}</Alert>
        {/if}
        <Button
          type="submit"
          variant="secondary"
          fullWidth={false}
          disabled={!canRegenerate}
        >
          {#if isRegenerating}
            <Spinner aria-hidden="true" />
            Generating…
          {:else}
            Generate a new phrase
          {/if}
        </Button>
      </form>
    {:else}
      <div class="space-y-4">
        <Alert tone="warning" title="Save the new phrase before leaving this page">
          The old phrase no longer works. If you lose this one and forget your
          password, your vault is unrecoverable.
        </Alert>

        <div class="rounded-md border border-border bg-muted/30 p-4">
          {#if !regenRevealed}
            <div class="flex items-center justify-between">
              <p class="text-sm text-muted-foreground">
                Phrase is hidden. Reveal it when you're ready to write it down.
              </p>
              <Button
                variant="secondary"
                fullWidth={false}
                onclick={() => (regenRevealed = true)}
              >
                <IconEyeRegular class="size-4" /> Reveal
              </Button>
            </div>
          {:else}
            <ol class="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 mb-3">
              {#each regenWords as word, i (i)}
                <li class="flex items-baseline gap-2 font-mono text-sm">
                  <span class="text-xs text-muted-foreground tabular-nums w-5 text-right">
                    {i + 1}.
                  </span>
                  <span class="text-foreground">{word}</span>
                </li>
              {/each}
            </ol>
            <div class="flex flex-wrap items-center gap-2 pt-3 border-t border-border">
              <Button variant="secondary" fullWidth={false} onclick={copyRegenPhrase}>
                {#if regenCopied}
                  <IconCheckRegular class="size-4" /> Copied
                {:else}
                  <IconCopyRegular class="size-4" /> Copy
                {/if}
              </Button>
              <Button variant="secondary" fullWidth={false} onclick={downloadRegenPhrase}>
                <IconDownloadSimpleRegular class="size-4" /> Download .txt
              </Button>
              <Button
                variant="ghost"
                fullWidth={false}
                onclick={() => (regenRevealed = false)}
              >
                <IconEyeSlashRegular class="size-4" /> Hide
              </Button>
            </div>
          {/if}
        </div>

        <Button
          onclick={() => (regenDoneModalOpen = true)}
          disabled={!regenRevealed}
        >
          I've saved the new phrase
        </Button>
        {#if !regenRevealed}
          <p class="text-xs text-muted-foreground text-center">
            Reveal the phrase first - we need you to look at it before confirming.
          </p>
        {/if}
      </div>
    {/if}
  </Frame.Panel>
</Frame.Root>

<Modal
  open={regenDoneModalOpen}
  title="Have you saved the new phrase?"
  description="The old phrase is already retired. Without this new one, a forgotten password means losing access to your vault."
  onClose={() => {
    regenDoneModalOpen = false;
    regenDoneChecked = false;
  }}
>
  <label class="flex items-start gap-3 cursor-pointer select-none">
    <input
      type="checkbox"
      bind:checked={regenDoneChecked}
      class="mt-0.5 size-4 rounded border-input focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    />
    <span class="text-sm text-foreground leading-relaxed">
      I've written down or stored the new 12-word recovery phrase somewhere I
      can get back to. I understand Tessil can't recover it for me.
    </span>
  </label>

  {#snippet footer()}
    <Button
      variant="ghost"
      fullWidth={false}
      onclick={() => {
        regenDoneModalOpen = false;
        regenDoneChecked = false;
      }}
    >
      Not yet
    </Button>
    <Button fullWidth={false} disabled={!regenDoneChecked} onclick={finishRegen}>
      Done
    </Button>
  {/snippet}
</Modal>
