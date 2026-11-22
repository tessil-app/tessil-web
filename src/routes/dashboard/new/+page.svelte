<script lang="ts">
  // Send files from inside the account: the homepage's send flow, laid out
  // as a page of its own with files on one side and the link on the other.

  import PageHeader from "$lib/components/PageHeader.svelte";
  import PageLayout from "$lib/components/PageLayout.svelte";
  import SendPanel from "$lib/components/SendPanel.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import TextLink from "$lib/components/TextLink.svelte";
  import { auth } from "$lib/stores/auth.svelte";
  import { uploadStore } from "$lib/stores/upload.svelte";

  import { appLocale } from "$lib/i18n/app.svelte";
  import { transfersMessages } from "$lib/i18n/messages/transfers";
  const locale = $derived(appLocale());
  const t = $derived(transfersMessages[locale]);
  const sent = $derived(uploadStore.status === "complete" && !!uploadStore.shareUrl);
</script>

<Seo title={t.newPage.seoTitle} robots="noindex" />

<PageLayout width="5xl">
  {#if !auth.loaded}
    <div role="status" aria-live="polite" class="flex flex-col items-center gap-4 py-16 text-info">
      <Spinner class="size-8" aria-hidden="true" />
      <p class="text-muted-foreground">{t.loading}</p>
    </div>
  {:else if auth.user}
    <PageHeader
      title={t.newPage.title}
      tagline={t.newPage.tagline}
      back={{ href: "/dashboard", label: t.newPage.back }}
      align="left"
    />

    <SendPanel layout="page" returnTo="/dashboard/new" {locale} />

    {#if sent}
      <p class="mt-4 text-sm text-muted-foreground">
        {t.newPage.copyFirst}
        <TextLink href="/dashboard">{t.newPage.backToList}</TextLink>
      </p>
    {/if}
  {/if}
</PageLayout>
