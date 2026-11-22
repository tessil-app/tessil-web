<script lang="ts">
  import TextLink from "$lib/components/TextLink.svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import Alert from "$lib/components/Alert.svelte";
  import Button from "$lib/components/Button.svelte";
  import * as Frame from "$lib/components/frame";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import PageLayout from "$lib/components/PageLayout.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import TextInput from "$lib/components/TextInput.svelte";
  import { api } from "$lib/api/client";
  import { auth } from "$lib/stores/auth.svelte";
  import {
    conditionalUiAvailable,
    isPasskeySupported,
    PasskeyError,
    signInWithPasskey,
  } from "$lib/auth/passkey";
  import { onMount } from "svelte";
  import { appLocale } from "$lib/i18n/app.svelte";
  import { signinMessages } from "$lib/i18n/messages/signin";
  import { hrefFor } from "$lib/i18n/paths";

  const locale = $derived(appLocale());
  const t = $derived(signinMessages[locale].login);

  let email = $state("");
  let isSubmitting = $state(false);
  let submitted = $state(false);
  let errorMessage = $state<string | null>(null);

  let code = $state("");
  let isVerifyingCode = $state(false);
  let codeError = $state<string | null>(null);

  let passkeySupported = $state(false);
  let isPasskeySigningIn = $state(false);
  let passkeyError = $state<string | null>(null);

  const codeDigits = $derived(code.replace(/\D/g, ""));
  const codeReady = $derived(codeDigits.length === 6);

  onMount(() => {
    if (page.url.searchParams.get("error") === "link-invalid") {
      errorMessage = t.linkInvalid;
    }
    if (auth.isAuthenticated) {
      goto("/dashboard", { replaceState: true });
      return;
    }

    passkeySupported = isPasskeySupported();
    if (!passkeySupported) return;

    // Fire-and-forget autofill passkey picker; cancels are silent.
    void (async () => {
      const supportsAutofill = await conditionalUiAvailable();
      if (!supportsAutofill || auth.isAuthenticated) return;
      try {
        await signInWithPasskey("conditional");
        await auth.refresh();
        goto("/dashboard", { replaceState: true });
      } catch {
        // Conditional UI cancels are no-ops.
      }
    })();
  });

  async function handlePasskeyClick() {
    if (isPasskeySigningIn) return;
    passkeyError = null;
    isPasskeySigningIn = true;
    try {
      await signInWithPasskey("required");
      await auth.refresh();
      goto("/dashboard", { replaceState: true });
    } catch (err) {
      if (err instanceof PasskeyError) {
        if (err.kind !== "cancelled") {
          passkeyError = err.message;
        }
      } else {
        passkeyError =
          err instanceof Error ? err.message : t.passkeyFailed;
      }
    } finally {
      isPasskeySigningIn = false;
    }
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (isSubmitting) return;
    errorMessage = null;
    isSubmitting = true;
    try {
      await api.requestMagicLink(email);
      submitted = true;
    } catch (err) {
      errorMessage =
        err instanceof Error ? err.message : t.genericError;
    } finally {
      isSubmitting = false;
    }
  }

  async function handleVerifyCode(e: SubmitEvent) {
    e.preventDefault();
    if (isVerifyingCode || !codeReady) return;
    codeError = null;
    isVerifyingCode = true;
    try {
      await api.verifyCode(codeDigits);
      await auth.refresh();
      goto("/dashboard", { replaceState: true });
    } catch (err) {
      codeError =
        err instanceof Error
          ? err.message
          : t.codeMismatch;
    } finally {
      isVerifyingCode = false;
    }
  }

  function reset() {
    submitted = false;
    email = "";
    code = "";
    codeError = null;
  }
</script>

<Seo title={t.seoTitle} robots="noindex" />

<PageLayout>
  <PageHeader
    title={t.title}
    tagline={t.tagline}
  />

  <Frame.Root>
    <Frame.Panel>
      {#if submitted}
        <div class="space-y-6">
          <Alert tone="success" title={t.inboxTitle}>
            {t.inboxBefore} <span class="text-foreground">{email}</span> {t.inboxAfter}
          </Alert>

          <div class="space-y-3 border-t pt-6">
            <div class="space-y-1">
              <div class="text-sm font-medium text-foreground">
                {t.otherDevice}
              </div>
              <p class="text-sm text-muted-foreground">
                {t.otherDeviceBody}
              </p>
            </div>
            <form onsubmit={handleVerifyCode} class="space-y-3" novalidate>
              <TextInput
                id="code"
                type="text"
                inputmode="numeric"
                autocomplete="one-time-code"
                placeholder="000000"
                maxlength={7}
                mono
                bind:value={code}
                disabled={isVerifyingCode}
                error={codeError ?? undefined}
              />
              <Button
                type="submit"
                variant="secondary"
                disabled={isVerifyingCode || !codeReady}
              >
                {#if isVerifyingCode}
                  <Spinner aria-hidden="true" />
                  {t.verifying}
                {:else}
                  {t.withCode}
                {/if}
              </Button>
            </form>
          </div>

          <div class="flex">
            <Button variant="ghost" fullWidth={false} onclick={reset}>
              {t.another}
            </Button>
          </div>
        </div>
      {:else}
        <div class="space-y-6">
          {#if passkeySupported}
            <div class="space-y-3">
              {#if passkeyError}
                <Alert tone="destructive" title={t.passkeyFailedTitle}>
                  {passkeyError}
                </Alert>
              {/if}
              <Button
                type="button"
                variant="secondary"
                onclick={handlePasskeyClick}
                disabled={isPasskeySigningIn}
              >
                {#if isPasskeySigningIn}
                  <Spinner aria-hidden="true" />
                  {t.waitingPasskey}
                {:else}
                  {t.withPasskey}
                {/if}
              </Button>
              <p class="text-sm text-muted-foreground">
                {t.passkeyHint}
              </p>
            </div>

            <div class="relative">
              <div class="absolute inset-0 flex items-center" aria-hidden="true">
                <div class="w-full border-t"></div>
              </div>
              <div class="relative flex justify-center">
                <span class="bg-background px-2 text-xs uppercase tracking-wide text-muted-foreground">
                  {t.or}
                </span>
              </div>
            </div>
          {/if}

          <form onsubmit={handleSubmit} class="space-y-4" novalidate>
            <TextInput
              id="email"
              type="email"
              label={t.email}
              placeholder={t.emailPlaceholder}
              autocomplete="email webauthn"
              required
              bind:value={email}
              disabled={isSubmitting}
              error={errorMessage ?? undefined}
            />
            <Button type="submit" disabled={isSubmitting || email.length === 0}>
              {#if isSubmitting}
                <Spinner aria-hidden="true" />
                {t.sending}
              {:else}
                {t.send}
              {/if}
            </Button>
          </form>

          <!-- What signing up costs, for those deciding whether to. -->
          <div class="rounded-lg bg-secondary px-4 py-3 text-sm text-muted-foreground">
            <p class="font-medium text-foreground">{t.storesTitle}</p>
            <p class="mt-1">
              {t.stores}
              <TextLink href={hrefFor("/what-we-store", locale)}>{t.storesLink}</TextLink>
            </p>
          </div>
        </div>
      {/if}
    </Frame.Panel>
  </Frame.Root>
</PageLayout>
