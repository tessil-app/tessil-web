<script lang="ts">
  import Alert from "$lib/components/Alert.svelte";
  import Button from "$lib/components/Button.svelte";
  import * as Frame from "$lib/components/frame";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import PageLayout from "$lib/components/PageLayout.svelte";
  import SiteFooter from "$lib/components/SiteFooter.svelte";
  import TextInput from "$lib/components/TextInput.svelte";
  import Textarea from "$lib/components/Textarea.svelte";
  import IconCheckRegular from "phosphor-icons-svelte/IconCheckRegular.svelte";

  let transferUrl = $state("");
  let reason = $state("");
  let contact = $state("");
  let submitted = $state(false);
  let submitting = $state(false);
  let error = $state<string | null>(null);

  async function handleSubmit() {
    if (!transferUrl.trim() || !reason.trim()) return;

    submitting = true;
    error = null;

    try {
      const subject = encodeURIComponent("JTransfer Abuse Report");
      const body = encodeURIComponent(
        `Transfer URL: ${transferUrl}\n\nReason: ${reason}\n\nReporter contact: ${contact || "Not provided"}`
      );
      window.location.href = `mailto:abuse@jimmyverburgt.com?subject=${subject}&body=${body}`;
      submitted = true;
    } catch {
      error = "Failed to submit report. Please email abuse@jimmyverburgt.com directly.";
    } finally {
      submitting = false;
    }
  }
</script>

<svelte:head>
  <title>Report Abuse - JTransfer</title>
  <meta
    name="description"
    content="Report illegal or abusive content on JTransfer quickly. Submit transfer links for review and action."
  />
  <meta name="robots" content="index, follow" />
  <meta property="og:title" content="Report Abuse - JTransfer" />
  <meta
    property="og:description"
    content="Abuse reporting page for JTransfer secure file sharing."
  />
</svelte:head>

<PageLayout width="3xl">
  <PageHeader
    title="Report Abuse"
    tagline="For JTransfer transfers and related misuse reports."
  />

  <Frame.Root>
    <Frame.Panel>
      {#if submitted}
        <div class="flex flex-col items-center text-center py-6 space-y-4">
          <span
            class="inline-flex items-center justify-center size-10 rounded-full bg-success/15 text-success-foreground"
          >
            <IconCheckRegular class="size-5" />
          </span>
          <h2 class="text-xl font-semibold text-foreground">Report submitted</h2>
          <p class="text-muted-foreground max-w-md text-balance">
            Thank you for your report. We will review it and take appropriate
            action as quickly as possible.
          </p>
          <p class="text-sm text-muted-foreground max-w-md text-balance">
            If your email client did not open, please send your report directly
            to
            <a
              href="mailto:abuse@jimmyverburgt.com"
              class="text-primary hover:underline"
              >abuse@jimmyverburgt.com</a
            >.
          </p>
        </div>
      {:else}
        <div class="space-y-6">
          <div class="space-y-3 text-muted-foreground">
            <p>
              If you believe a transfer on JTransfer contains illegal or
              abusive content, please report it below. We take all reports
              seriously and will act in accordance with applicable law.
            </p>
            <p>
              Due to our end-to-end encryption, we cannot view file contents.
              However, upon receiving a valid report, we can delete the
              transfer and associated data, and cooperate with law enforcement
              authorities.
            </p>
          </div>

          <form
            onsubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            class="space-y-4"
          >
            <TextInput
              id="transfer-url"
              label="Transfer URL"
              required
              placeholder="https://jtransfer.jimmyverburgt.com/d/..."
              bind:value={transferUrl}
            />

            <Textarea
              id="reason"
              label="Reason for report"
              required
              placeholder="Please describe why you are reporting this transfer"
              bind:value={reason}
            />

            <TextInput
              id="contact"
              type="email"
              label="Your email (optional)"
              placeholder="For follow-up if needed"
              bind:value={contact}
            />

            {#if error}
              <Alert tone="destructive">{error}</Alert>
            {/if}

            <Button
              type="submit"
              disabled={!transferUrl.trim() || !reason.trim() || submitting}
            >
              {submitting ? "Submitting…" : "Submit report"}
            </Button>
          </form>

          <p class="text-sm text-muted-foreground">
            You can also contact us directly at
            <a
              href="mailto:abuse@jimmyverburgt.com"
              class="text-primary hover:underline"
              >abuse@jimmyverburgt.com</a
            >. For urgent matters involving child safety, please also contact
            your local law enforcement.
          </p>
        </div>
      {/if}
    </Frame.Panel>
  </Frame.Root>

  <SiteFooter current="abuse" />
</PageLayout>
