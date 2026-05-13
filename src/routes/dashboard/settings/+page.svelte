<script lang="ts">
  import { goto } from "$app/navigation";
  import Alert from "$lib/components/Alert.svelte";
  import Button from "$lib/components/Button.svelte";
  import * as Frame from "$lib/components/frame";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import PageLayout from "$lib/components/PageLayout.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import TextInput from "$lib/components/TextInput.svelte";
  import { api } from "$lib/api/client";
  import { auth } from "$lib/stores/auth.svelte";
  import { onMount } from "svelte";

  let confirming = $state(false);
  let confirmEmail = $state("");
  let isDeleting = $state(false);
  let errorMessage = $state<string | null>(null);

  let isExporting = $state(false);
  let exportError = $state<string | null>(null);

  onMount(() => {
    if (auth.loaded && !auth.isAuthenticated) {
      goto("/login", { replaceState: true });
    }
  });

  $effect(() => {
    if (!auth.loaded) return;
    if (!auth.isAuthenticated) {
      goto("/login", { replaceState: true });
    }
  });

  function startConfirm() {
    confirming = true;
    confirmEmail = "";
    errorMessage = null;
  }

  function cancelConfirm() {
    confirming = false;
    confirmEmail = "";
    errorMessage = null;
  }

  async function exportAccount() {
    if (isExporting) return;
    isExporting = true;
    exportError = null;
    try {
      const { blob, filename } = await api.exportMyAccount();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      exportError = err instanceof Error ? err.message : "Couldn't export your data.";
    } finally {
      isExporting = false;
    }
  }

  async function deleteAccount() {
    if (isDeleting) return;
    isDeleting = true;
    errorMessage = null;
    try {
      await api.deleteMyAccount(confirmEmail);
      // Server cleared the cookie; clear local store and bounce home.
      auth.user = null;
      await goto("/?deleted=1", { replaceState: true });
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : "Couldn't delete your account.";
    } finally {
      isDeleting = false;
    }
  }

  const dateFmt = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
</script>

<svelte:head>
  <title>Settings — JTransfer</title>
  <meta name="robots" content="noindex, nofollow, noarchive, nosnippet" />
</svelte:head>

<PageLayout>
  {#if !auth.loaded}
    <div
      role="status"
      aria-live="polite"
      class="flex flex-col items-center gap-4 py-16 text-info"
    >
      <Spinner class="size-8" aria-hidden="true" />
      <p class="text-muted-foreground">Loading…</p>
    </div>
  {:else if auth.user}
    <PageHeader title="Settings" align="left">
      {#snippet actions()}
        <a
          href="/dashboard"
          class="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded"
        >
          Back to dashboard
        </a>
      {/snippet}
    </PageHeader>

    <div class="space-y-8">
      <section class="space-y-3">
        <h2 class="text-lg font-medium text-foreground">Account</h2>
        <Frame.Root>
          <Frame.Panel>
            <dl class="grid grid-cols-1 sm:grid-cols-3 gap-y-3 gap-x-6 text-sm">
              <dt class="text-muted-foreground">Email</dt>
              <dd class="sm:col-span-2 text-foreground break-all">{auth.user.email}</dd>

              <dt class="text-muted-foreground">Plan</dt>
              <dd class="sm:col-span-2 text-foreground capitalize">{auth.user.tier}</dd>

              <dt class="text-muted-foreground">Member since</dt>
              <dd class="sm:col-span-2 text-foreground">{dateFmt.format(new Date(auth.user.createdAt))}</dd>
            </dl>
          </Frame.Panel>
        </Frame.Root>
      </section>

      <section class="space-y-3">
        <h2 class="text-lg font-medium text-foreground">Your data</h2>
        <Frame.Root>
          <Frame.Panel>
            <div class="space-y-4">
              <div class="space-y-1">
                <h3 class="text-base font-medium text-foreground">Download a copy</h3>
                <p class="text-sm text-muted-foreground">
                  Download a JSON file containing your account record, recent
                  sign-in activity, and the metadata of transfers you own. The
                  contents of your files are not included — they were never
                  readable to us.
                </p>
              </div>

              {#if exportError}
                <Alert tone="destructive">{exportError}</Alert>
              {/if}

              <div class="flex sm:justify-end">
                <Button
                  variant="primary"
                  fullWidth={false}
                  onclick={exportAccount}
                  disabled={isExporting}
                >
                  {#if isExporting}
                    <Spinner aria-hidden="true" />
                    Preparing…
                  {:else}
                    Download my data
                  {/if}
                </Button>
              </div>
            </div>
          </Frame.Panel>
        </Frame.Root>
      </section>

      <section class="space-y-3">
        <h2 class="text-lg font-medium text-foreground">Danger zone</h2>
        <Frame.Root>
          <Frame.Panel>
            <div class="space-y-4">
              <div class="space-y-1">
                <h3 class="text-base font-medium text-foreground">Delete account</h3>
                <p class="text-sm text-muted-foreground">
                  This permanently deletes your account and all of your
                  transfers. This cannot be undone. We'll send a confirmation
                  to
                  <span class="text-foreground break-all">{auth.user.email}</span>
                  once the deletion completes.
                </p>
              </div>

              {#if !confirming}
                <div class="flex sm:justify-end">
                  <Button
                    variant="destructive"
                    fullWidth={false}
                    onclick={startConfirm}
                  >
                    Delete account
                  </Button>
                </div>
              {:else}
                <div class="space-y-3 pt-2 border-t border-border">
                  <TextInput
                    id="confirm-email"
                    type="email"
                    label="Type your email to confirm"
                    bind:value={confirmEmail}
                    autocomplete="off"
                    autocapitalize="off"
                    spellcheck={false}
                    error={errorMessage ?? undefined}
                    disabled={isDeleting}
                  />
                  <div class="flex flex-col sm:flex-row sm:justify-end gap-2">
                    <Button
                      variant="secondary"
                      fullWidth={false}
                      onclick={cancelConfirm}
                      disabled={isDeleting}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      fullWidth={false}
                      onclick={deleteAccount}
                      disabled={isDeleting || confirmEmail.trim().length === 0}
                    >
                      {#if isDeleting}
                        <Spinner aria-hidden="true" />
                        Deleting…
                      {:else}
                        Permanently delete
                      {/if}
                    </Button>
                  </div>
                </div>
              {/if}
            </div>
          </Frame.Panel>
        </Frame.Root>
      </section>
    </div>
  {/if}
</PageLayout>
