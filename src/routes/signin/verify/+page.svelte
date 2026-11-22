<script lang="ts">
  // Landing page for the emailed sign-in link. The token arrives in the URL
  // fragment, so it is never sent to the server by the click itself and cannot
  // be consumed by a mail scanner prefetching the URL. This page reads it and
  // POSTs it to the API.
  import { goto } from "$app/navigation";
  import { api } from "$lib/api/client";
  import Alert from "$lib/components/Alert.svelte";
  import Button from "$lib/components/Button.svelte";
  import * as Frame from "$lib/components/frame";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import PageLayout from "$lib/components/PageLayout.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import { auth } from "$lib/stores/auth.svelte";
  import { onMount } from "svelte";
  import { appLocale } from "$lib/i18n/app.svelte";
  import { signinMessages } from "$lib/i18n/messages/signin";

  const t = $derived(signinMessages[appLocale()].verify);

  let failed = $state(false);

  onMount(() => {
    const fragment = window.location.hash.replace(/^#/, "");
    const token = new URLSearchParams(fragment).get("token");

    // Strip the fragment so Back/Forward, screenshots, or a shared tab cannot
    // re-expose the token.
    history.replaceState(null, "", window.location.pathname);

    if (!token) {
      failed = true;
      return;
    }

    void redeem(token);
  });

  async function redeem(token: string) {
    try {
      const result = await api.verifyMagicLink(token);

      if (result.action === "code_issued" && result.code) {
        // Opened on a different device. Hand the code to /signin/code via the
        // fragment, matching what the old GET redirect did.
        const params = new URLSearchParams({
          code: result.code,
          exp: String(result.expiresIn ?? 0),
        });
        await goto(`/signin/code#${params.toString()}`, { replaceState: true });
        return;
      }

      await auth.refresh();
      await goto("/dashboard", { replaceState: true });
    } catch {
      // Consumed, expired, and not-found are deliberately indistinguishable.
      failed = true;
    }
  }
</script>

<Seo title={t.seoTitle} robots="noindex" />

<PageLayout>
  <PageHeader
    title={failed ? t.failedTitle : t.title}
    tagline={failed ? t.failedTagline : t.tagline}
  />

  <Frame.Root>
    <Frame.Panel>
      {#if failed}
        <Alert tone="warning" title={t.freshTitle}>
          {t.fresh}
          {#snippet action()}
            <Button variant="secondary" fullWidth={false} href="/login">
              {t.back}
            </Button>
          {/snippet}
        </Alert>
      {:else}
        <div
          class="flex items-center justify-center gap-3 py-8 text-muted-foreground"
          aria-live="polite"
        >
          <Spinner />
          <span>{t.checking}</span>
        </div>
      {/if}
    </Frame.Panel>
  </Frame.Root>
</PageLayout>
