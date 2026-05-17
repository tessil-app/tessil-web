<script lang="ts">
  // First-time vault setup wizard (ADR-0004). Two steps:
  //   1. Pick password (length >= 14 AND zxcvbn score >= 3).
  //   2. Show 12-word recovery phrase + Copy / Download .txt, then a
  //      blocking confirmation modal before we let the user leave.
  //
  // Setup is one-shot — once the API records `vault_setup_completed_at` the
  // user has to use change-password / regenerate-phrase from settings instead.

  import { goto } from "$app/navigation";
  import Alert from "$lib/components/Alert.svelte";
  import Button from "$lib/components/Button.svelte";
  import * as Frame from "$lib/components/frame";
  import Modal from "$lib/components/Modal.svelte";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import PageLayout from "$lib/components/PageLayout.svelte";
  import PasswordInput from "$lib/components/PasswordInput.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import { auth } from "$lib/stores/auth.svelte";
  import { setupVault } from "$lib/vault/client";
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

  type Step = "password" | "phrase";

  let step = $state<Step>("password");

  // Step 1 state
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

  // Step 2 state
  let recoveryPhrase = $state<string | null>(null);
  let phraseRevealed = $state(false);
  let phraseCopied = $state(false);
  let confirmOpen = $state(false);
  let confirmChecked = $state(false);

  // Drive zxcvbn (lazy-loaded). Only one in-flight evaluation at a time —
  // each new keystroke replaces the pending result, no debounce needed
  // because evaluatePassword resolves in <10ms once dictionaries are warm.
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

  // Auth + already-set-up guard. Don't redirect away while the auth state
  // is still loading or we'll bounce real users back to /login on refresh.
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
      const { recoveryPhrase: phrase } = await setupVault(auth.user.id, password);
      recoveryPhrase = phrase;
      // Hold the local "setup complete" flip until finishSetup() — otherwise
      // the guard $effect sees vaultSetupCompletedAt go truthy and redirects
      // to /dashboard before the phrase view ever paints.
      step = "phrase";
    } catch (err) {
      setupError =
        err instanceof Error ? err.message : "Couldn't set up the vault. Try again.";
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
      // Clipboard API can fail in insecure contexts; user can still copy
      // manually from the revealed words.
    }
  }

  function downloadPhrase() {
    if (!recoveryPhrase) return;
    const body =
      "JTransfer recovery phrase\n" +
      "Keep this somewhere safe. If you forget your vault password, this\n" +
      "is the only way to recover access to your files.\n\n" +
      recoveryPhrase +
      "\n";
    const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "jtransfer-recovery-phrase.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  function finishSetup() {
    confirmOpen = false;
    auth.markVaultSetupComplete(new Date().toISOString());
    goto("/dashboard", { replaceState: true });
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

<svelte:head>
  <title>Set up your vault — JTransfer</title>
  <meta name="robots" content="noindex, nofollow, noarchive, nosnippet" />
</svelte:head>

<PageLayout>
  <PageHeader
    title={step === "password" ? "Set up your vault" : "Save your recovery phrase"}
    tagline={step === "password"
      ? "Your vault password unlocks the encryption key that protects everything you upload. Pick something long and memorable — we can't reset it."
      : "Write these 12 words down somewhere safe. They're the only way back in if you forget your password."}
  />

  <Frame.Root>
    <Frame.Panel>
      {#if step === "password"}
        <form onsubmit={handleSubmitPassword} class="space-y-5" novalidate>
          <div class="space-y-2">
            <PasswordInput
              id="vault-password"
              label="Vault password"
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
                    At least {MIN_PASSWORD_LENGTH} characters · zxcvbn score ≥ {MIN_PASSWORD_SCORE}
                  {:else if isEvaluating}
                    Checking…
                  {:else}
                    {scoreLabel(strength.score)}
                    {#if password.length < MIN_PASSWORD_LENGTH}
                      · {MIN_PASSWORD_LENGTH - password.length} more character{MIN_PASSWORD_LENGTH - password.length === 1 ? "" : "s"}
                    {/if}
                  {/if}
                </span>
                {#if strength.acceptable}
                  <span class="inline-flex items-center gap-1 text-success-foreground">
                    <IconCheckRegular class="size-3.5" /> OK
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
            label="Confirm password"
            autocomplete="new-password"
            required
            bind:value={passwordConfirm}
            disabled={isSubmittingSetup}
            error={passwordConfirm.length > 0 && !passwordMatches
              ? "Passwords don't match yet."
              : undefined}
          />

          {#if setupError}
            <Alert tone="destructive" title="Setup failed">{setupError}</Alert>
          {/if}

          <div class="rounded-[calc(var(--radius-2xl)-1px)] border border-border bg-muted/30 p-4 text-sm text-muted-foreground space-y-1">
            <p class="font-medium text-foreground">Pick wisely — there's no reset link.</p>
            <p>
              Your password never leaves this browser. We can't email you a
              reset because we never see it. If you forget it, the recovery
              phrase on the next screen is your only way back in.
            </p>
          </div>

          <Button type="submit" disabled={!canSubmitPassword}>
            {#if isSubmittingSetup}
              <Spinner aria-hidden="true" />
              Setting up your vault…
            {:else}
              Continue
            {/if}
          </Button>
        </form>
      {:else if recoveryPhrase}
        <div class="space-y-5">
          <Alert tone="warning" title="Save this phrase before continuing">
            We won't show it again. Anyone with these 12 words can unlock your
            vault — keep them somewhere only you can reach.
          </Alert>

          <div class="rounded-[calc(var(--radius-2xl)-1px)] border border-border bg-muted/30 p-4 relative">
            {#if !phraseRevealed}
              <div class="flex items-center justify-between">
                <p class="text-sm text-muted-foreground">
                  Phrase is hidden. Reveal it when you're ready to write it down.
                </p>
                <Button
                  variant="secondary"
                  fullWidth={false}
                  onclick={() => (phraseRevealed = true)}
                >
                  <IconEyeRegular class="size-4" /> Reveal
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
                    <IconCheckRegular class="size-4" /> Copied
                  {:else}
                    <IconCopyRegular class="size-4" /> Copy
                  {/if}
                </Button>
                <Button variant="secondary" fullWidth={false} onclick={downloadPhrase}>
                  <IconDownloadSimpleRegular class="size-4" /> Download .txt
                </Button>
                <Button
                  variant="ghost"
                  fullWidth={false}
                  onclick={() => (phraseRevealed = false)}
                >
                  <IconEyeSlashRegular class="size-4" /> Hide
                </Button>
              </div>
            {/if}
          </div>

          <Button onclick={() => (confirmOpen = true)} disabled={!phraseRevealed}>
            I've saved my recovery phrase
          </Button>
          {#if !phraseRevealed}
            <p class="text-xs text-muted-foreground text-center">
              Reveal the phrase first — we need you to look at it before you continue.
            </p>
          {/if}
        </div>
      {/if}
    </Frame.Panel>
  </Frame.Root>
</PageLayout>

<Modal
  open={confirmOpen}
  title="Have you saved your recovery phrase?"
  description="We won't show it again. Without it, a forgotten password means losing access to every file in your vault."
  dismissible={!isSubmittingSetup}
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
      I've written down or stored my 12-word recovery phrase somewhere I can
      get back to. I understand JTransfer can't recover it for me.
    </span>
  </label>

  {#snippet footer()}
    <Button
      variant="ghost"
      fullWidth={false}
      onclick={() => {
        confirmOpen = false;
        confirmChecked = false;
      }}
    >
      Not yet
    </Button>
    <Button fullWidth={false} disabled={!confirmChecked} onclick={finishSetup}>
      Continue to dashboard
    </Button>
  {/snippet}
</Modal>
