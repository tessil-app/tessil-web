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

  const sent = $derived(uploadStore.status === "complete" && !!uploadStore.shareUrl);
</script>

<Seo title="New transfer - Tessil" robots="noindex" />

<PageLayout width="5xl">
  {#if !auth.loaded}
    <div role="status" aria-live="polite" class="flex flex-col items-center gap-4 py-16 text-info">
      <Spinner class="size-8" aria-hidden="true" />
      <p class="text-muted-foreground">Loading…</p>
    </div>
  {:else if auth.user}
    <PageHeader
      title="New transfer"
      tagline="Add files, set how the link behaves, and share it. Everything is encrypted in your browser first."
      back={{ href: "/dashboard", label: "Transfers" }}
      align="left"
    />

    <SendPanel layout="page" returnTo="/dashboard/new" />

    {#if sent}
      <p class="mt-4 text-sm text-muted-foreground">
        Copy the link before you leave this page.
        <TextLink href="/dashboard">Back to your transfers</TextLink>
      </p>
    {/if}
  {/if}
</PageLayout>
