<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import * as Frame from "$lib/components/frame";
  import PageLayout from "$lib/components/PageLayout.svelte";
  import TextInput from "$lib/components/TextInput.svelte";
  import Textarea from "$lib/components/Textarea.svelte";

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
      // Send abuse report via mailto link
      const subject = encodeURIComponent("JTransfer Abuse Report");
      const body = encodeURIComponent(
        `Transfer URL: ${transferUrl}\n\nReason: ${reason}\n\nReporter contact: ${contact || "Not provided"}`
      );
      window.location.href = `mailto:abuse@jimmyverburgt.com?subject=${subject}&body=${body}`;
      submitted = true;
    } catch (err) {
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
  <div class="text-center mb-8">
      <a href="/" class="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">JTransfer</a>
      <h1 class="text-3xl font-bold mb-2 mt-1">Report Abuse</h1>
      <p class="text-muted-foreground">For JTransfer transfers and related misuse reports</p>
    </div>

    <Frame.Root>
      <Frame.Panel>
        {#if submitted}
          <div class="text-center py-8 space-y-4">
            <div class="w-16 h-16 mx-auto text-success-foreground">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 class="text-xl font-semibold">Report Submitted</h2>
            <p class="text-muted-foreground">
              Thank you for your report. We will review it and take appropriate action as quickly as possible.
            </p>
            <p class="text-sm text-muted-foreground">
              If your email client did not open, please send your report directly to
              <a href="mailto:abuse@jimmyverburgt.com" class="text-primary hover:underline">abuse@jimmyverburgt.com</a>.
            </p>
          </div>
        {:else}
          <div class="space-y-6">
            <div class="space-y-3">
              <p class="text-muted-foreground">
                If you believe a transfer on JTransfer contains illegal or abusive content, please report it below.
                We take all reports seriously and will act in accordance with applicable law.
              </p>
              <p class="text-muted-foreground">
                Due to our end-to-end encryption, we cannot view file contents. However, upon receiving a valid report,
                we can delete the transfer and associated data, and cooperate with law enforcement authorities.
              </p>
            </div>

            <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
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
                <p class="text-sm text-destructive-foreground">{error}</p>
              {/if}

              <Button
                type="submit"
                disabled={!transferUrl.trim() || !reason.trim() || submitting}
              >
                {submitting ? "Submitting..." : "Submit Report"}
              </Button>
            </form>

            <p class="text-sm text-muted-foreground">
              You can also contact us directly at
              <a href="mailto:abuse@jimmyverburgt.com" class="text-primary hover:underline">abuse@jimmyverburgt.com</a>.
              For urgent matters involving child safety, please also contact your local law enforcement.
            </p>
          </div>
        {/if}
      </Frame.Panel>
    </Frame.Root>

    <div class="mt-8 text-center text-sm text-muted-foreground">
      <div class="flex items-center justify-center gap-3">
        <a href="/" class="hover:text-foreground transition-colors">Home</a>
        <span>·</span>
        <a href="/security" class="hover:text-foreground transition-colors">Security</a>
        <span>·</span>
        <a href="/privacy" class="hover:text-foreground transition-colors">Privacy Policy</a>
        <span>·</span>
        <a href="/terms" class="hover:text-foreground transition-colors">Terms of Service</a>
      </div>
    </div>
</PageLayout>
