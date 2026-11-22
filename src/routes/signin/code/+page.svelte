<script lang="ts">
  // Code arrives in the URL fragment; never sent to the server.
  import Alert from "$lib/components/Alert.svelte";
  import Button from "$lib/components/Button.svelte";
  import * as Frame from "$lib/components/frame";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import PageLayout from "$lib/components/PageLayout.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import IconCopySimpleRegular from "phosphor-icons-svelte/IconCopySimpleRegular.svelte";
  import IconCheckRegular from "phosphor-icons-svelte/IconCheckRegular.svelte";
  import { onMount } from "svelte";
  import { appLocale } from "$lib/i18n/app.svelte";
  import { signinMessages } from "$lib/i18n/messages/signin";

  const t = $derived(signinMessages[appLocale()].code);

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
    if (secondsRemaining <= 0) return t.expired;
    return t.left(Math.floor(secondsRemaining / 60), secondsRemaining % 60);
  });

  onMount(() => {
    const fragment = window.location.hash.replace(/^#/, "");
    if (!fragment) return;

    const params = new URLSearchParams(fragment);
    const rawCode = params.get("code");
    const rawExp = params.get("exp");

    // Strip fragment so Back/Forward or shared snapshots don't re-expose the code.
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
      // Clipboard API can fail in insecure contexts; user can type the code manually.
    }
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
      {#if code === null}
        <Alert tone="warning" title={t.noneTitle}>
          {t.none}
          {#snippet action()}
            <Button variant="secondary" fullWidth={false} href="/login">
              {t.back}
            </Button>
          {/snippet}
        </Alert>
      {:else if expired}
        <Alert tone="warning" title={t.expiredTitle}>
          {t.expiredBody}
          {#snippet action()}
            <Button variant="secondary" fullWidth={false} href="/login">
              {t.newLink}
            </Button>
          {/snippet}
        </Alert>
      {:else}
        <div class="space-y-6">
          <div class="space-y-2">
            <div
              class="text-xs font-medium uppercase tracking-wider text-muted-foreground"
            >
              {t.sixDigits}
            </div>
            <div
              class="rounded-md border bg-muted/30 py-6 text-center font-mono text-4xl sm:text-5xl font-semibold tabular-nums tracking-[0.25em] text-foreground select-all"
              aria-label={t.codeLabel}
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
              {t.copied}
            {:else}
              <IconCopySimpleRegular class="size-4" />
              {t.copy}
            {/if}
          </Button>

          <Alert tone="info" title={t.nextTitle}>
            {t.next}
          </Alert>
        </div>
      {/if}
    </Frame.Panel>
  </Frame.Root>
</PageLayout>
