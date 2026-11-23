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
  import SegmentedControl from "$lib/components/SegmentedControl.svelte";
  import {
    readVaultHoldDays,
    setVaultHoldDays,
    subscribeToVaultState,
    vaultOpenUntil,
    VAULT_HOLD_DAYS,
    type VaultHoldDays,
  } from "$lib/vault/session";
  import { onMount } from "svelte";
  import { appLocale } from "$lib/i18n/app.svelte";
  import { vaultMessages } from "$lib/i18n/messages/vault";

  const m = $derived(vaultMessages[appLocale()]);
  const t = $derived(m.settings);
  import {
    evaluatePassword,
    MIN_PASSWORD_LENGTH,
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
        err instanceof Error ? err.message : t.changeFailedBody;
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
        err instanceof Error ? err.message : t.regenFailedBody;
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
    const body = m.phrase.file(regenNewPhrase);
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

  // ─── how long the vault stays open on this device ─────────────────────────
  let holdDays = $state<VaultHoldDays>(1);
  let openUntil = $state<Date | null>(null);
  const untilFmt = $derived(new Intl.DateTimeFormat(appLocale() === "nl" ? "nl-NL" : undefined, { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }));

  async function refreshOpenUntil() {
    openUntil = auth.user ? await vaultOpenUntil(auth.user.id) : null;
  }

  onMount(() => {
    holdDays = readVaultHoldDays();
    void refreshOpenUntil();
    return subscribeToVaultState(() => void refreshOpenUntil());
  });

  async function chooseHold(days: VaultHoldDays) {
    holdDays = days;
    await setVaultHoldDays(days);
    await refreshOpenUntil();
  }
</script>

<Frame.Root>
  <Frame.Header>
    <Frame.Title class="text-base">{t.holdTitle}</Frame.Title>
    <Frame.Description class="mt-1 block">{t.holdBody}</Frame.Description>
  </Frame.Header>
  <Frame.Panel>
    <div class="space-y-3">
      <SegmentedControl
        label={t.holdLabel}
        options={VAULT_HOLD_DAYS.map((d) => ({ value: d, label: t.days(d) }))}
        value={holdDays}
        onChange={(v: VaultHoldDays) => void chooseHold(v)}
        class="max-w-sm"
      />
      <p class="text-sm text-muted-foreground" aria-live="polite">
        {#if openUntil}
          {t.openUntil(untilFmt.format(openUntil))}
        {:else}
          {t.locked}
        {/if}
      </p>
    </div>
  </Frame.Panel>
</Frame.Root>

<Frame.Root>
  <Frame.Header>
    <Frame.Title class="text-base">
      {hasPassword ? t.changeTitle : t.addTitle}
    </Frame.Title>
    <Frame.Description class="mt-1 block">
      {#if hasPassword}
        {t.changeBody}
      {:else}
        {t.addBody}
      {/if}
    </Frame.Description>
  </Frame.Header>

  <Frame.Panel>
    <form onsubmit={handleChangePassword} class="space-y-5" novalidate>
      <VaultProof
        bind:this={pwProofField}
        bind:access={pwProof}
        idPrefix="vault-current"
        passwordLabel={t.currentPassword}
        disabled={isChangingPassword}
      />

      <div class="space-y-2">
        <PasswordInput
          id="vault-new-password"
          label={t.newPassword}
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
                {m.strength.hint(MIN_PASSWORD_LENGTH)}
              {:else if isEvaluatingPw}
                {m.strength.checking}
              {:else}
                {m.strength.scores[pwStrength.score]}
                {#if pwNew.length < MIN_PASSWORD_LENGTH}
                  · {m.strength.more(MIN_PASSWORD_LENGTH - pwNew.length)}
                {/if}
              {/if}
            </span>
            {#if pwStrength.acceptable}
              <span class="inline-flex items-center gap-1 text-success-foreground">
                <IconCheckRegular class="size-3.5" /> {m.strength.ok}
              </span>
            {/if}
          </div>
          {#if pwNew.length > 0 && !pwStrength.acceptable && pwStrength.warning}
            <p class="text-xs text-warning-foreground">{pwStrength.warning}</p>
          {/if}
          {#if pwSameAsCurrent}
            <p class="text-xs text-warning-foreground">
              {t.sameAsCurrent}
            </p>
          {/if}
        </div>
      </div>

      <PasswordInput
        id="vault-confirm-password"
        label={t.confirmNew}
        autocomplete="new-password"
        required
        bind:value={pwConfirm}
        disabled={isChangingPassword}
        error={pwConfirm.length > 0 && !pwMatches
          ? m.strength.noMatch
          : undefined}
      />

      {#if changePwError}
        <Alert tone="destructive" title={t.changeFailed}>{changePwError}</Alert>
      {/if}
      {#if changePwSuccess}
        <Alert tone="success" title={t.updatedTitle}>{t.updatedBody}</Alert>
      {/if}

      <Button type="submit" disabled={!canChangePassword}>
        {#if isChangingPassword}
          <Spinner aria-hidden="true" />
          {t.updating}
        {:else}
          {hasPassword ? t.update : t.add}
        {/if}
      </Button>
    </form>
  </Frame.Panel>
</Frame.Root>

<Frame.Root>
  <Frame.Header>
    <Frame.Title class="text-base">{t.phraseTitle}</Frame.Title>
    <Frame.Description class="mt-1 block">{t.phraseBody}</Frame.Description>
  </Frame.Header>

  <Frame.Panel>
    {#if regenNewPhrase === null}
      <form onsubmit={handleRegenerate} class="space-y-4" novalidate>
        <VaultProof
          bind:this={regenProofField}
          bind:access={regenProof}
          allow={["password", "passkey"]}
          idPrefix="regen-current"
          passwordLabel={t.confirmPassword}
          disabled={isRegenerating}
        />
        {#if regenError}
          <Alert tone="destructive" title={t.regenFailed}>{regenError}</Alert>
        {/if}
        <Button
          type="submit"
          variant="secondary"
          fullWidth={false}
          disabled={!canRegenerate}
        >
          {#if isRegenerating}
            <Spinner aria-hidden="true" />
            {t.generating}
          {:else}
            {t.generate}
          {/if}
        </Button>
      </form>
    {:else}
      <div class="space-y-4">
        <Alert tone="warning" title={t.saveNewTitle}>{t.saveNewBody}</Alert>

        <div class="rounded-md border border-border bg-muted/30 p-4">
          {#if !regenRevealed}
            <div class="flex items-center justify-between">
              <p class="text-sm text-muted-foreground">
                {m.phrase.hidden}
              </p>
              <Button
                variant="secondary"
                fullWidth={false}
                onclick={() => (regenRevealed = true)}
              >
                <IconEyeRegular class="size-4" /> {m.phrase.reveal}
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
                  <IconCheckRegular class="size-4" /> {m.phrase.copied}
                {:else}
                  <IconCopyRegular class="size-4" /> {m.phrase.copy}
                {/if}
              </Button>
              <Button variant="secondary" fullWidth={false} onclick={downloadRegenPhrase}>
                <IconDownloadSimpleRegular class="size-4" /> {m.phrase.download}
              </Button>
              <Button
                variant="ghost"
                fullWidth={false}
                onclick={() => (regenRevealed = false)}
              >
                <IconEyeSlashRegular class="size-4" /> {m.phrase.hide}
              </Button>
            </div>
          {/if}
        </div>

        <Button
          onclick={() => (regenDoneModalOpen = true)}
          disabled={!regenRevealed}
        >
          {t.savedNew}
        </Button>
        {#if !regenRevealed}
          <p class="text-xs text-muted-foreground text-center">
            {t.revealFirst}
          </p>
        {/if}
      </div>
    {/if}
  </Frame.Panel>
</Frame.Root>

<Modal
  open={regenDoneModalOpen}
  title={t.modalTitle}
  description={t.modalBody}
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
      {t.modalCheck}
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
      {m.phrase.notYet}
    </Button>
    <Button fullWidth={false} disabled={!regenDoneChecked} onclick={finishRegen}>
      {t.done}
    </Button>
  {/snippet}
</Modal>
