<script lang="ts">
  import Alert from "$lib/components/Alert.svelte";
  import Button from "$lib/components/Button.svelte";
  import * as Frame from "$lib/components/frame";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import PageLayout from "$lib/components/PageLayout.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import SiteFooter from "$lib/components/SiteFooter.svelte";
  import TextInput from "$lib/components/TextInput.svelte";
  import Textarea from "$lib/components/Textarea.svelte";
  import IconCheckRegular from "phosphor-icons-svelte/IconCheckRegular.svelte";
  import { page } from "$app/state";
  import { localeFromPath } from "$lib/i18n/locale";
  import { abuseMessages } from "$lib/i18n/messages/abuse";

  const t = $derived(abuseMessages[localeFromPath(page.url.pathname)]);

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
      const subject = encodeURIComponent(t.mailSubject);
      const body = encodeURIComponent(t.mailBody(transferUrl, reason, contact));
      window.location.href = `mailto:abuse@tessil.app?subject=${subject}&body=${body}`;
      submitted = true;
    } catch {
      error = t.failed;
    } finally {
      submitting = false;
    }
  }
</script>

<Seo
  title={t.seoTitle}
  description={t.description}
  path="/abuse"
/>

<PageLayout width="3xl">
  <PageHeader
    title={t.title}
    tagline={t.tagline}
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
          <h2 class="text-xl font-semibold text-foreground">{t.doneTitle}</h2>
          <p class="text-muted-foreground max-w-md text-balance">
            {t.doneBody}
          </p>
          <p class="text-sm text-muted-foreground max-w-md text-balance">
            {t.noClient}
            <a
              href="mailto:abuse@tessil.app"
              class="text-primary underline underline-offset-2"
              >abuse@tessil.app</a
            >.
          </p>
        </div>
      {:else}
        <div class="space-y-6">
          <div class="space-y-3 text-muted-foreground">
            <p>{t.intro1}</p>
            <p>{t.intro2}</p>
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
              label={t.url}
              required
              placeholder="https://tessil.app/d/..."
              bind:value={transferUrl}
            />

            <Textarea
              id="reason"
              label={t.reason}
              required
              placeholder={t.reasonHint}
              bind:value={reason}
            />

            <TextInput
              id="contact"
              type="email"
              label={t.contact}
              placeholder={t.contactHint}
              bind:value={contact}
            />

            {#if error}
              <Alert tone="destructive">{error}</Alert>
            {/if}

            <Button
              type="submit"
              disabled={!transferUrl.trim() || !reason.trim() || submitting}
            >
              {submitting ? t.submitting : t.submit}
            </Button>
          </form>

          <p class="text-sm text-muted-foreground">
            {t.orEmail}
            <a href="mailto:abuse@tessil.app" class="text-primary underline underline-offset-2">abuse@tessil.app</a>{t.directly}
          </p>
        </div>
      {/if}
    </Frame.Panel>
  </Frame.Root>

  <SiteFooter current="abuse" />
</PageLayout>
