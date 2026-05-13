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
  import { onMount } from "svelte";

  let email = $state("");
  let isSubmitting = $state(false);
  let submitted = $state(false);
  let errorMessage = $state<string | null>(null);

  onMount(() => {
    if (page.url.searchParams.get("error") === "link-invalid") {
      errorMessage =
        "That sign-in link has expired or been used. Request a new one below.";
    }
    if (auth.isAuthenticated) {
      goto("/dashboard", { replaceState: true });
    }
  });

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

  function reset() {
    submitted = false;
    email = "";
  }
</script>

<svelte:head>
  <title>Sign in — JTransfer</title>
  <meta name="robots" content="noindex, nofollow, noarchive, nosnippet" />
</svelte:head>

<PageLayout>
  <PageHeader
    title="Sign in"
    tagline="We'll email you a one-time sign-in link. New here? We'll create your account on first sign-in — no password needed."
  />

  <Frame.Root>
    <Frame.Panel>
      {#if submitted}
        <div class="space-y-4">
          <Alert tone="success" title="Check your inbox">
            If <span class="text-foreground">{email}</span> is a valid email, a
            sign-in link is on its way. The link expires in 15 minutes.
            Don't see it after a minute or two? Check your spam or junk folder.
          </Alert>
          <div class="flex">
            <Button variant="secondary" fullWidth={false} onclick={reset}>
              Send another link
            </Button>
          </div>
        </div>
      {:else}
        <form onsubmit={handleSubmit} class="space-y-4" novalidate>
          <TextInput
            id="email"
            type="email"
            label="Email"
            placeholder="you@example.com"
            autocomplete="email"
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
      {/if}
    </Frame.Panel>
  </Frame.Root>
</PageLayout>
