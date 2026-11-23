<script lang="ts">
  import TextLink from "$lib/components/TextLink.svelte";
  import { goto } from "$app/navigation";
  import Alert from "$lib/components/Alert.svelte";
  import Button from "$lib/components/Button.svelte";
  import * as Frame from "$lib/components/frame";
  import Modal from "$lib/components/Modal.svelte";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import PageLayout from "$lib/components/PageLayout.svelte";
  import PasswordInput from "$lib/components/PasswordInput.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import { auth } from "$lib/stores/auth.svelte";
  import { api } from "$lib/api/client";
  import { enrollPasskey, PasskeyError } from "$lib/auth/passkey";
  import {
    canSetUpWithPasskey,
    prepareVaultSetup,
    prepareVaultSetupWith,
    type PreparedVaultSetup,
  } from "$lib/vault/client";
  import IconFingerprintRegular from "phosphor-icons-svelte/IconFingerprintRegular.svelte";
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
  import { appLocale } from "$lib/i18n/app.svelte";
  import { vaultMessages } from "$lib/i18n/messages/vault";

  const m = $derived(vaultMessages[appLocale()]);
  const t = $derived(m.setup);

  // "method" is only shown where a passkey can protect the vault: then the
  // user picks passkey or password. Elsewhere setup starts at "password".
  type Step = "loading" | "method" | "password" | "phrase";

  let step = $state<Step>("loading");
  let usedPasskey = $state(false);
  let isStartingPasskey = $state(false);
  let passkeyError = $state<string | null>(null);

  let methodChecked = false;
  $effect(() => {
    if (!auth.loaded || !auth.user || methodChecked) return;
    methodChecked = true;
    canSetUpWithPasskey()
      .then((can) => (step = can ? "method" : "password"))
      .catch(() => (step = "password"));
  });

  async function startWithPasskey() {
    if (!auth.user || isStartingPasskey) return;
    isStartingPasskey = true;
    passkeyError = null;
    try {
      // Use the passkeys the account has; make one if it has none.
      let { authenticators: passkeys } = await api.listPasskeys();
      if (passkeys.length === 0) {
        const created = await enrollPasskey(null);
        passkeys = [created.authenticator];
      }
      const result = await prepareVaultSetupWith(auth.user.id, { kind: "passkey", passkeys });
      if (!result.ok) {
        passkeyError =
          result.reason === "cancelled"
            ? t.dismissed
            : t.cannotProtect;
        return;
      }
      prepared = result.prepared;
      recoveryPhrase = result.prepared.recoveryPhrase;
      usedPasskey = true;
      step = "phrase";
    } catch (err) {
      passkeyError =
        err instanceof PasskeyError && err.kind === "cancelled"
          ? t.dismissed
          : err instanceof Error
            ? err.message
            : t.passkeyFailed;
    } finally {
      isStartingPasskey = false;
    }
  }

  let password = $state("");
  let passwordConfirm = $state("");
  let strength = $state<PasswordStrength>({
    score: 0,
    acceptable: false,
    warning: "",
    suggestions: [],
  });
  let isEvaluating = $state(false);
  let setupError = $state<string | null>(null);
  let isSubmittingSetup = $state(false);

  let recoveryPhrase = $state<string | null>(null);
  // Nothing is saved until the user confirms they have the phrase.
  let prepared: PreparedVaultSetup | null = null;
  let isFinishing = $state(false);
  let finishError = $state<string | null>(null);
  let phraseRevealed = $state(false);
  let phraseCopied = $state(false);
  let confirmOpen = $state(false);
  let confirmChecked = $state(false);

  $effect(() => {
    const value = password;
    isEvaluating = true;
    let cancelled = false;
    evaluatePassword(value)
      .then((result) => {
        if (!cancelled) strength = result;
      })
      .catch(() => {
        if (!cancelled) {
          strength = { score: 0, acceptable: false, warning: "", suggestions: [] };
        }
      })
      .finally(() => {
        if (!cancelled) isEvaluating = false;
      });
    return () => {
      cancelled = true;
    };
  });

  // Wait for auth.loaded; otherwise we'd bounce real users to /login on refresh.
  $effect(() => {
    if (!auth.loaded) return;
    if (!auth.isAuthenticated) {
      goto("/login", { replaceState: true });
      return;
    }
    if (auth.user?.vaultSetupCompletedAt) {
      goto("/dashboard", { replaceState: true });
    }
  });

  const passwordMatches = $derived(
    password.length > 0 && password === passwordConfirm,
  );
  const canSubmitPassword = $derived(
    strength.acceptable && passwordMatches && !isSubmittingSetup,
  );

  async function handleSubmitPassword(e: SubmitEvent) {
    e.preventDefault();
    if (!canSubmitPassword || !auth.user) return;
    setupError = null;
    isSubmittingSetup = true;
    try {
      prepared = await prepareVaultSetup(auth.user.id, password);
      recoveryPhrase = prepared.recoveryPhrase;
      step = "phrase";
    } catch (err) {
      setupError =
        err instanceof Error ? err.message : t.setupFailedBody;
    } finally {
      isSubmittingSetup = false;
    }
  }

  async function copyPhrase() {
    if (!recoveryPhrase) return;
    try {
      await navigator.clipboard.writeText(recoveryPhrase);
      phraseCopied = true;
      setTimeout(() => (phraseCopied = false), 2000);
    } catch {
      // Clipboard API can fail in insecure contexts; user can copy manually from the revealed words.
    }
  }

  function downloadPhrase() {
    if (!recoveryPhrase) return;
    const body = m.phrase.file(recoveryPhrase);
    const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tessil-recovery-phrase.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function finishSetup() {
    if (!prepared || isFinishing) return;
    isFinishing = true;
    finishError = null;
    try {
      await prepared.commit();
      confirmOpen = false;
      auth.markVaultSetupComplete(new Date().toISOString());
      goto("/dashboard", { replaceState: true });
    } catch (err) {
      finishError =
        err instanceof Error ? err.message : t.saveFailed;
    } finally {
      isFinishing = false;
    }
  }

  const words = $derived(recoveryPhrase ? recoveryPhrase.split(" ") : []);
  const strengthBarColor = $derived(
    [
      "bg-destructive",
      "bg-destructive",
      "bg-warning",
      "bg-success",
      "bg-success",
    ][strength.score],
  );
  const strengthBarWidth = $derived(`${((strength.score + 1) / 5) * 100}%`);
</script>

<Seo title={t.seoTitle} robots="noindex" />

<PageLayout>
  <PageHeader
    title={step === "phrase" ? t.phraseTitle : t.title}
    tagline={step === "phrase"
      ? usedPasskey
        ? t.taglinePhrasePasskey
        : t.taglinePhrasePassword
      : step === "password"
        ? t.taglinePassword
        : t.taglineMethod}
  />

  <Frame.Root>
    <Frame.Panel>
      {#if step === "loading"}
        <div role="status" aria-live="polite" class="flex justify-center py-8 text-info">
          <Spinner class="size-6" aria-hidden="true" />
        </div>
      {:else if step === "method"}
        <div class="space-y-5">
          <div class="space-y-2">
            <Button onclick={startWithPasskey} disabled={isStartingPasskey}>
              {#if isStartingPasskey}
                <Spinner aria-hidden="true" />
                {t.waitingPasskey}
              {:else}
                <IconFingerprintRegular class="size-4" />
                {t.withPasskey}
              {/if}
            </Button>
            <p class="text-xs text-muted-foreground text-center">
              {t.passkeyNote}
            </p>
          </div>

          {#if passkeyError}
            <Alert tone="destructive">{passkeyError}</Alert>
          {/if}

          <div class="flex items-center gap-3 text-xs text-muted-foreground" aria-hidden="true">
            <span class="h-px flex-1 bg-border"></span>
            {t.or}
            <span class="h-px flex-1 bg-border"></span>
          </div>

          <Button variant="secondary" onclick={() => (step = "password")} disabled={isStartingPasskey}>
            {t.usePassword}
          </Button>

          <p class="text-center text-xs text-muted-foreground">
            <TextLink
              href="/dashboard"
            >
              {t.notNow}
            </TextLink>
            · {t.later}
          </p>
        </div>
      {:else if step === "password"}
        <form onsubmit={handleSubmitPassword} class="space-y-5" novalidate>
          <div class="space-y-2">
            <PasswordInput
              id="vault-password"
              label={t.vaultPassword}
              autocomplete="new-password"
              required
              bind:value={password}
              disabled={isSubmittingSetup}
            />
            <div class="space-y-1">
              <div class="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  class="h-full transition-[width,background-color] duration-200 ease-out {strengthBarColor}"
                  style:width={password.length === 0 ? "0%" : strengthBarWidth}
                ></div>
              </div>
              <div class="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {#if password.length === 0}
                    {m.strength.hint(MIN_PASSWORD_LENGTH)}
                  {:else if isEvaluating}
                    {m.strength.checking}
                  {:else}
                    {m.strength.scores[strength.score]}
                    {#if password.length < MIN_PASSWORD_LENGTH}
                      · {m.strength.more(MIN_PASSWORD_LENGTH - password.length)}
                    {/if}
                  {/if}
                </span>
                {#if strength.acceptable}
                  <span class="inline-flex items-center gap-1 text-success-foreground">
                    <IconCheckRegular class="size-3.5" /> {m.strength.ok}
                  </span>
                {/if}
              </div>
              {#if password.length > 0 && !strength.acceptable && strength.warning}
                <p class="text-xs text-warning-foreground">{strength.warning}</p>
              {/if}
            </div>
          </div>

          <PasswordInput
            id="vault-password-confirm"
            label={t.confirmPassword}
            autocomplete="new-password"
            required
            bind:value={passwordConfirm}
            disabled={isSubmittingSetup}
            error={passwordConfirm.length > 0 && !passwordMatches
              ? m.strength.noMatch
              : undefined}
          />

          {#if setupError}
            <Alert tone="destructive" title={t.setupFailed}>{setupError}</Alert>
          {/if}

          <div class="rounded-md border border-border bg-muted/30 p-4 text-sm text-muted-foreground space-y-1">
            <p class="font-medium text-foreground">{t.noResetTitle}</p>
            <p>{t.noResetBody}</p>
          </div>

          <Button type="submit" disabled={!canSubmitPassword}>
            {#if isSubmittingSetup}
              <Spinner aria-hidden="true" />
              {t.settingUp}
            {:else}
              {t.continue}
            {/if}
          </Button>
          <p class="text-center text-xs text-muted-foreground">
            <TextLink
              href="/dashboard"
            >
              {t.notNow}
            </TextLink>
            · {t.later}
          </p>
        </form>
      {:else if recoveryPhrase}
        <div class="space-y-5">
          <Alert tone="warning" title={t.saveTitle}>{t.saveBody}</Alert>

          <div class="rounded-md border border-border bg-muted/30 p-4 relative">
            {#if !phraseRevealed}
              <div class="flex items-center justify-between">
                <p class="text-sm text-muted-foreground">
                  {m.phrase.hidden}
                </p>
                <Button
                  variant="secondary"
                  fullWidth={false}
                  onclick={() => (phraseRevealed = true)}
                >
                  <IconEyeRegular class="size-4" /> {m.phrase.reveal}
                </Button>
              </div>
            {:else}
              <ol class="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 mb-3">
                {#each words as word, i (i)}
                  <li class="flex items-baseline gap-2 font-mono text-sm">
                    <span class="text-xs text-muted-foreground tabular-nums w-5 text-right">
                      {i + 1}.
                    </span>
                    <span class="text-foreground">{word}</span>
                  </li>
                {/each}
              </ol>
              <div class="flex flex-wrap items-center gap-2 pt-3 border-t border-border">
                <Button variant="secondary" fullWidth={false} onclick={copyPhrase}>
                  {#if phraseCopied}
                    <IconCheckRegular class="size-4" /> {m.phrase.copied}
                  {:else}
                    <IconCopyRegular class="size-4" /> {m.phrase.copy}
                  {/if}
                </Button>
                <Button variant="secondary" fullWidth={false} onclick={downloadPhrase}>
                  <IconDownloadSimpleRegular class="size-4" /> {m.phrase.download}
                </Button>
                <Button
                  variant="ghost"
                  fullWidth={false}
                  onclick={() => (phraseRevealed = false)}
                >
                  <IconEyeSlashRegular class="size-4" /> {m.phrase.hide}
                </Button>
              </div>
            {/if}
          </div>

          <Button onclick={() => (confirmOpen = true)} disabled={!phraseRevealed}>
            {t.saved}
          </Button>
          {#if !phraseRevealed}
            <p class="text-xs text-muted-foreground text-center">
              {t.revealFirst}
            </p>
          {/if}
        </div>
      {/if}
    </Frame.Panel>
  </Frame.Root>
</PageLayout>

<Modal
  open={confirmOpen}
  title={t.modalTitle}
  description={t.modalBody}
  dismissible={!isFinishing}
  onClose={() => {
    confirmOpen = false;
    confirmChecked = false;
  }}
>
  <label class="flex items-start gap-3 cursor-pointer select-none">
    <input
      type="checkbox"
      bind:checked={confirmChecked}
      class="mt-0.5 size-4 rounded border-input focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    />
    <span class="text-sm text-foreground leading-relaxed">
      {t.modalCheck}
    </span>
  </label>

  {#if finishError}
    <div class="mt-4">
      <Alert tone="destructive">{finishError}</Alert>
    </div>
  {/if}

  {#snippet footer()}
    <Button
      variant="ghost"
      fullWidth={false}
      disabled={isFinishing}
      onclick={() => {
        confirmOpen = false;
        confirmChecked = false;
      }}
    >
      {m.phrase.notYet}
    </Button>
    <Button fullWidth={false} disabled={!confirmChecked || isFinishing} onclick={finishSetup}>
      {#if isFinishing}
        <Spinner aria-hidden="true" />
        {t.saving}
      {:else}
        {t.toTransfers}
      {/if}
    </Button>
  {/snippet}
</Modal>
