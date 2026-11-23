<script lang="ts">
  // Owner's view of who else can open a portal: invite one account, hand
  // over the keys once they are ready, or take access away.

  import Alert from "$lib/components/Alert.svelte";
  import Button from "$lib/components/Button.svelte";
  import DetailItem from "$lib/components/DetailItem.svelte";
  import DetailList from "$lib/components/DetailList.svelte";
  import Drawer from "$lib/components/Drawer.svelte";
  import DrawerSection from "$lib/components/DrawerSection.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import TextInput from "$lib/components/TextInput.svelte";
  import { api } from "$lib/api/client";
  import { giveAccess, type PortalSharing, type SharingInvite } from "$lib/portal/sharing";
  import { unlockPrompt } from "$lib/vault/prompt.svelte";
  import { appLocale } from "$lib/i18n/app.svelte";
  import { portalsAppMessages } from "$lib/i18n/messages/portalsApp";

  interface Props {
    open: boolean;
    userId: string;
    portalId: string;
    /** Null while it loads. */
    sharing: PortalSharing | null;
    onClose: () => void;
    /** Something changed on the server; the page reloads `sharing`. */
    onChanged: () => Promise<void>;
    /** What the page calls the thing being shared. */
    noun?: "portal" | "form";
  }

  let { open, userId, portalId, sharing, onClose, onChanged, noun = "portal" }: Props = $props();
  // What arrives through it: files for a portal, responses for a form.
  const t = $derived(portalsAppMessages[appLocale()].sharing);
  const arrivals = $derived(t.arrivals[noun]);
  const word = $derived(t.nouns[noun]);

  let email = $state("");
  let busy = $state<string | null>(null);
  let error = $state<string | null>(null);
  let confirmRemove = $state(false);

  const guest = $derived(sharing?.guests[0] ?? null);
  const invite = $derived(sharing?.invites[0] ?? null);

  $effect(() => {
    if (!open) {
      error = null;
      confirmRemove = false;
    }
  });

  async function run(name: string, action: () => Promise<void>) {
    if (busy) return;
    busy = name;
    error = null;
    try {
      await action();
      await onChanged();
    } catch (err) {
      error = err instanceof Error ? err.message : t.failed;
    } finally {
      busy = null;
    }
  }

  function sendInvite(e: Event) {
    e.preventDefault();
    const address = email.trim();
    if (!address) return;
    void run("invite", async () => {
      await api.invitePortalGuest(portalId, address);
      email = "";
    });
  }

  function give(target: SharingInvite) {
    void run("give", async () => {
      const result = await giveAccess(userId, portalId, target);
      if (result.ok) return;
      if (result.reason === "locked") {
        unlockPrompt.request();
        throw new Error(t.unlockFirst);
      }
      throw new Error(t.unreadable(word));
    });
  }
</script>

<Drawer {open} title={t.title} {onClose}>
  <div class="space-y-3">
    {#if error}
      <Alert tone="destructive">{error}</Alert>
    {/if}

    {#if !sharing}
      <div class="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner aria-hidden="true" />
        {t.loading}
      </div>
    {:else if guest}
      <DrawerSection
        title={t.sharedWith(guest.email)}
        description={t.sharedBody(arrivals, word)}
      >
        <DetailList>
          <DetailItem label={t.theirKey}><span class="font-mono text-xs">{guest.fingerprint ?? t.unknown}</span></DetailItem>
          <DetailItem label={t.yourKey}><span class="font-mono text-xs">{sharing.myFingerprint ?? t.unknown}</span></DetailItem>
        </DetailList>
      </DrawerSection>

      <DrawerSection
        title={t.removeTitle}
        description={t.removeBody(word)}
        tone="danger"
      >
        {#if confirmRemove}
          <div class="flex flex-wrap gap-2">
            <Button
              variant="destructive"
              fullWidth={false}
              disabled={busy !== null}
              onclick={() =>
                run("remove", async () => {
                  await api.removePortalMember(portalId, guest.userId);
                  confirmRemove = false;
                })}
            >
              {busy === "remove" ? t.removing : t.confirm}
            </Button>
            <Button variant="ghost" fullWidth={false} disabled={busy !== null} onclick={() => (confirmRemove = false)}>
              {t.cancel}
            </Button>
          </div>
        {:else}
          <Button variant="destructive" fullWidth={false} onclick={() => (confirmRemove = true)}>
            {t.remove(guest.email)}
          </Button>
        {/if}
      </DrawerSection>
    {:else if invite}
      {#if invite.ready}
        <DrawerSection
          title={t.ready(invite.email)}
          description={t.readyBody(word)}
        >
          <DetailList>
            <DetailItem label={t.theirKey}><span class="font-mono text-xs">{invite.ready.fingerprint}</span></DetailItem>
            <DetailItem label={t.yourKey}><span class="font-mono text-xs">{sharing.myFingerprint ?? t.unknown}</span></DetailItem>
          </DetailList>
          <p class="text-xs text-muted-foreground">
            {t.compare}
          </p>
          <Button fullWidth={false} disabled={busy !== null} onclick={() => give(invite)}>
            {#if busy === "give"}
              <Spinner aria-hidden="true" />
              {t.giving}
            {:else}
              {t.give}
            {/if}
          </Button>
        </DrawerSection>
      {:else}
        <DrawerSection
          title={t.waitingFor(invite.email)}
          description={t.waitingBody}
        />
      {/if}
      <DrawerSection title={t.changedMind}>
        <Button
          variant="secondary"
          fullWidth={false}
          disabled={busy !== null}
          onclick={() => run("cancel", () => api.deletePortalInvite(portalId, invite.id))}
        >
          {busy === "cancel" ? t.cancelling : t.cancelInvite}
        </Button>
      </DrawerSection>
    {:else}
      <DrawerSection
        title={t.inviteTitle}
        description={t.inviteBody(arrivals)}
      >
        <form onsubmit={sendInvite} class="space-y-3" novalidate>
          <TextInput
            id="portal-invite-email"
            type="email"
            label={t.email}
            placeholder={t.emailPlaceholder}
            autocomplete="off"
            bind:value={email}
            disabled={busy !== null}
          />
          <Button type="submit" fullWidth={false} disabled={busy !== null || email.trim().length === 0}>
            {busy === "invite" ? t.inviting : t.invite}
          </Button>
        </form>
        <p class="text-xs text-muted-foreground">
          {t.howItGoes(word)}
        </p>
      </DrawerSection>
    {/if}
  </div>

  {#snippet footer()}
    <Button type="button" variant="secondary" fullWidth={false} onclick={onClose}>{t.close}</Button>
  {/snippet}
</Drawer>
