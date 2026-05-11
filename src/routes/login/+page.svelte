<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import Button from "$lib/components/Button.svelte";
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
    // If already signed in, bounce to dashboard.
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
  <meta
    name="robots"
    content="noindex, nofollow, noarchive, nosnippet"
  />
</svelte:head>

<PageLayout>
  <div class="bg-card border border-border rounded-2xl p-8">
    <h1 class="text-2xl font-semibold text-foreground mb-2">Sign in</h1>
    <p class="text-sm text-muted-foreground mb-6">
      We'll email you a one-time sign-in link. New here? We'll create your
      account on first sign-in — no password needed.
    </p>

    {#if submitted}
      <div
        role="status"
        aria-live="polite"
        class="bg-success/10 border border-success/30 rounded-[calc(var(--radius-2xl)-1px)] p-4 mb-4"
      >
        <p class="text-sm text-foreground font-medium">Check your inbox</p>
        <p class="text-sm text-muted-foreground mt-1">
          If <span class="text-foreground">{email}</span> is a valid email, a
          sign-in link is on its way. The link expires in 15 minutes.
        </p>
      </div>
      <Button variant="secondary" onclick={reset}>Send another link</Button>
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
  </div>
</PageLayout>
