<script lang="ts">
  // Send files from inside the account: the same panel as the homepage,
  // without the homepage around it.

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
      tagline="Drop files in the panel, or anywhere on this page. They are encrypted here before any of it leaves."
      back={{ href: "/dashboard", label: "Transfers" }}
      align="left"
    />

    <!-- The panel's own ground, as the artwork is on the homepage. -->
    <div class="flex flex-wrap items-start rounded-2xl bg-muted p-3 sm:min-h-[30rem] sm:p-6">
      <SendPanel returnTo="/dashboard/new" emptyClass="sm:h-[420px]" />
    </div>

    {#if sent}
      <p class="mt-4 text-sm text-muted-foreground">
        Copy the link before you leave this page.
        <TextLink href="/dashboard">Back to your transfers</TextLink>
      </p>
    {/if}
  {/if}
</PageLayout>
