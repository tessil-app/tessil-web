<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import Alert from "$lib/components/Alert.svelte";
  import Button from "$lib/components/Button.svelte";
  import * as Frame from "$lib/components/frame";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import PageLayout from "$lib/components/PageLayout.svelte";
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
      errorMessage =
        "That sign-in link has expired or been used. Request a new one below.";
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
          err instanceof Error ? err.message : "Passkey sign-in failed.";
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
        err instanceof Error ? err.message : "Something went wrong. Try again.";
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
          : "That code didn't match. Try again or request a new link.";
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

<svelte:head>
  <title>Sign in — Tessil</title>
  <meta name="robots" content="noindex, nofollow, noarchive, nosnippet" />
</svelte:head>

<PageLayout>
  <PageHeader
    title="Sign in"
    tagline="We'll email you a one-time link. First time here? Your account is created on first sign-in — no password needed."
  />

  <Frame.Root>
    <Frame.Panel>
      {#if submitted}
        <div class="space-y-6">
          <Alert tone="success" title="Check your inbox">
            If <span class="text-foreground">{email}</span> is a valid email, a
            sign-in link is on its way. The link expires in 15 minutes.
            Don't see it after a minute or two? Check your spam or junk folder.
          </Alert>

          <div class="space-y-3 border-t pt-6">
            <div class="space-y-1">
              <div class="text-sm font-medium text-foreground">
                Opened the link on a different device?
              </div>
              <p class="text-sm text-muted-foreground">
                The other device will show you a 6-digit code. Enter it here
                to sign in on this device.
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
                  Verifying…
                {:else}
                  Sign in with code
                {/if}
              </Button>
            </form>
          </div>

          <div class="flex">
            <Button variant="ghost" fullWidth={false} onclick={reset}>
              Send another link
            </Button>
          </div>
        </div>
      {:else}
        <div class="space-y-6">
          {#if passkeySupported}
            <div class="space-y-3">
              {#if passkeyError}
                <Alert tone="destructive" title="Passkey sign-in failed">
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
                  Waiting for passkey…
                {:else}
                  Sign in with passkey
                {/if}
              </Button>
              <p class="text-sm text-muted-foreground">
                Use a passkey saved on this device, or pick one from another
                device.
              </p>
            </div>

            <div class="relative">
              <div class="absolute inset-0 flex items-center" aria-hidden="true">
                <div class="w-full border-t"></div>
              </div>
              <div class="relative flex justify-center">
                <span class="bg-background px-2 text-xs uppercase tracking-wide text-muted-foreground">
                  or
                </span>
              </div>
            </div>
          {/if}

          <form onsubmit={handleSubmit} class="space-y-4" novalidate>
            <TextInput
              id="email"
              type="email"
              label="Email"
              placeholder="you@example.com"
              autocomplete="email webauthn"
              required
              bind:value={email}
              disabled={isSubmitting}
              error={errorMessage ?? undefined}
            />
            <Button type="submit" disabled={isSubmitting || email.length === 0}>
              {#if isSubmitting}
                <Spinner aria-hidden="true" />
                Sending…
              {:else}
                Send sign-in link
              {/if}
            </Button>
          </form>
        </div>
      {/if}
    </Frame.Panel>
  </Frame.Root>
</PageLayout>
