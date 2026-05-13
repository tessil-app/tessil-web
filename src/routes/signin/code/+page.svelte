<script lang="ts">
  // Cross-device sign-in code display. Reached by redirect from
  // /api/auth/verify when the magic-link click happens on a device that does
  // NOT carry the pending-login cookie (audit doc 21, smart-detection variant).
  // The code arrives in the URL fragment and is never sent to the server.

  import Alert from "$lib/components/Alert.svelte";
  import Button from "$lib/components/Button.svelte";
  import * as Frame from "$lib/components/frame";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import PageLayout from "$lib/components/PageLayout.svelte";
  import IconCopySimpleRegular from "phosphor-icons-svelte/IconCopySimpleRegular.svelte";
  import IconCheckRegular from "phosphor-icons-svelte/IconCheckRegular.svelte";
  import { onMount } from "svelte";

  let code = $state<string | null>(null);
  let secondsRemaining = $state<number | null>(null);
  let copied = $state(false);
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const formattedCode = $derived(
    code ? `${code.slice(0, 3)} ${code.slice(3, 6)}` : "",
  );

  const expired = $derived(
    secondsRemaining !== null && secondsRemaining <= 0,
  );

  const timeLabel = $derived.by(() => {
    if (secondsRemaining === null) return "";
    if (secondsRemaining <= 0) return "expired";
    const m = Math.floor(secondsRemaining / 60);
    const s = secondsRemaining % 60;
    if (m === 0) return `${s}s left`;
    return `${m}m ${s.toString().padStart(2, "0")}s left`;
  });

  onMount(() => {
    const fragment = window.location.hash.replace(/^#/, "");
    if (!fragment) return;

    const params = new URLSearchParams(fragment);
    const rawCode = params.get("code");
    const rawExp = params.get("exp");

    // Strip the fragment from history so a Back/Forward navigation or shared
    // tab snapshot doesn't re-expose the code.
    history.replaceState(null, "", window.location.pathname);

    if (!rawCode || !/^\d{6}$/.test(rawCode)) return;
    code = rawCode;

    const expSeconds = rawExp ? parseInt(rawExp, 10) : NaN;
    if (Number.isFinite(expSeconds) && expSeconds > 0) {
      const expiresAt = Date.now() + expSeconds * 1000;
      const tick = () => {
        secondsRemaining = Math.max(
          0,
          Math.round((expiresAt - Date.now()) / 1000),
        );
        if (secondsRemaining <= 0 && intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      };
      tick();
      intervalId = setInterval(tick, 1000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  });

  async function handleCopy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      copied = true;
      setTimeout(() => {
        copied = false;
      }, 2000);
    } catch {
      // Clipboard API can fail on insecure contexts or denied permissions —
      // the user can always read and type the code manually.
    }
  }
</script>

<svelte:head>
  <title>Your sign-in code — JTransfer</title>
  <meta name="robots" content="noindex, nofollow, noarchive, nosnippet" />
</svelte:head>

<PageLayout>
  <PageHeader
    title="Your sign-in code"
    tagline="It looks like you opened the link on a different device. Type this code on the device where you started signing in — we won't sign you in here."
  />

  <Frame.Root>
    <Frame.Panel>
      {#if code === null}
        <Alert tone="warning" title="No code to show">
          This page only works when reached from a sign-in email link. Head
          back to your other device and request a fresh link.
          {#snippet action()}
            <Button variant="secondary" fullWidth={false} href="/login">
              Back to sign-in
            </Button>
          {/snippet}
        </Alert>
      {:else if expired}
        <Alert tone="warning" title="This code has expired">
          Sign-in codes are valid for 15 minutes. Start over from the device
          where you began.
          {#snippet action()}
            <Button variant="secondary" fullWidth={false} href="/login">
              Request a new link
            </Button>
          {/snippet}
        </Alert>
      {:else}
        <div class="space-y-6">
          <div class="space-y-2">
            <div
              class="text-xs font-medium uppercase tracking-wider text-muted-foreground"
            >
              Six-digit code
            </div>
            <div
              class="rounded-[calc(var(--radius-2xl)-1px)] border bg-muted/30 py-6 text-center font-mono text-4xl sm:text-5xl font-semibold tabular-nums tracking-[0.25em] text-foreground select-all"
              aria-label="Sign-in code"
            >
              {formattedCode}
            </div>
            {#if secondsRemaining !== null}
              <div
                class="text-xs text-muted-foreground text-center"
                aria-live="polite"
              >
                {timeLabel}
              </div>
            {/if}
          </div>

          <Button variant="secondary" onclick={handleCopy}>
            {#if copied}
              <IconCheckRegular class="size-4" />
              Copied
            {:else}
              <IconCopySimpleRegular class="size-4" />
              Copy code
            {/if}
          </Button>

          <Alert tone="info" title="What to do next">
            Switch back to the device where you started signing in and enter
            this code. Closing this tab won't lose anything — the code stays
            valid on the other device until it's used or expires.
          </Alert>
        </div>
      {/if}
    </Frame.Panel>
  </Frame.Root>
</PageLayout>
