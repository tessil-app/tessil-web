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

  interface Props {
    open: boolean;
    userId: string;
    portalId: string;
    /** Null while it loads. */
    sharing: PortalSharing | null;
    onClose: () => void;
    /** Something changed on the server; the page reloads `sharing`. */
    onChanged: () => Promise<void>;
  }

  let { open, userId, portalId, sharing, onClose, onChanged }: Props = $props();

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
      error = err instanceof Error ? err.message : "That didn't work. Try again.";
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
        throw new Error("Unlock your vault, then give access again.");
      }
      throw new Error("This portal's keys could not be read from your vault.");
    });
  }
</script>

<Drawer {open} title="Sharing" {onClose}>
  <div class="space-y-3">
    {#if error}
      <Alert tone="destructive">{error}</Alert>
    {/if}

    {#if !sharing}
      <div class="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner aria-hidden="true" />
        Loading…
      </div>
    {:else if guest}
      <DrawerSection
        title="Shared with {guest.email}"
        description="They can see, download and delete what is sent to this portal. They can't change the portal or invite anyone."
      >
        <DetailList>
          <DetailItem label="Their key"><span class="font-mono text-xs">{guest.fingerprint ?? "unknown"}</span></DetailItem>
          <DetailItem label="Your key"><span class="font-mono text-xs">{sharing.myFingerprint ?? "unknown"}</span></DetailItem>
        </DetailList>
      </DrawerSection>

      <DrawerSection
        title="Remove access"
        description="They can no longer open this portal. Files they already downloaded stay with them."
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
              {busy === "remove" ? "Removing…" : "Confirm"}
            </Button>
            <Button variant="ghost" fullWidth={false} disabled={busy !== null} onclick={() => (confirmRemove = false)}>
              Cancel
            </Button>
          </div>
        {:else}
          <Button variant="destructive" fullWidth={false} onclick={() => (confirmRemove = true)}>
            Remove {guest.email}
          </Button>
        {/if}
      </DrawerSection>
    {:else if invite}
      {#if invite.ready}
        <DrawerSection
          title="{invite.email} is ready"
          description="Giving access hands them this portal's keys, encrypted so only their account can open them."
        >
          <DetailList>
            <DetailItem label="Their key"><span class="font-mono text-xs">{invite.ready.fingerprint}</span></DetailItem>
            <DetailItem label="Your key"><span class="font-mono text-xs">{sharing.myFingerprint ?? "unknown"}</span></DetailItem>
          </DetailList>
          <p class="text-xs text-muted-foreground">
            To be certain nobody sits in between, compare these two codes with them by phone or
            in person. They see the same two on their side. If you skip this, you trust our
            server for this one step.
          </p>
          <Button fullWidth={false} disabled={busy !== null} onclick={() => give(invite)}>
            {#if busy === "give"}
              <Spinner aria-hidden="true" />
              Giving access…
            {:else}
              Give access
            {/if}
          </Button>
        </DrawerSection>
      {:else}
        <DrawerSection
          title="Waiting for {invite.email}"
          description="Ask them to sign in at Tessil with this address and set up a vault. A free account is enough. When they have, come back here to give access."
        />
      {/if}
      <DrawerSection title="Changed your mind?">
        <Button
          variant="secondary"
          fullWidth={false}
          disabled={busy !== null}
          onclick={() => run("cancel", () => api.deletePortalInvite(portalId, invite.id))}
        >
          {busy === "cancel" ? "Cancelling…" : "Cancel the invite"}
        </Button>
      </DrawerSection>
    {:else}
      <DrawerSection
        title="Invite one person"
        description="They will be able to see, download and delete what is sent to this portal. They need a Tessil account with a vault; a free one is enough."
      >
        <form onsubmit={sendInvite} class="space-y-3" novalidate>
          <TextInput
            id="portal-invite-email"
            type="email"
            label="Their email address"
            placeholder="colleague@example.com"
            autocomplete="off"
            bind:value={email}
            disabled={busy !== null}
          />
          <Button type="submit" fullWidth={false} disabled={busy !== null || email.trim().length === 0}>
            {busy === "invite" ? "Inviting…" : "Invite"}
          </Button>
        </form>
        <p class="text-xs text-muted-foreground">
          We don't email them. Let them know yourself, then come back here to give access once
          they have signed in.
        </p>
      </DrawerSection>
    {/if}
  </div>

  {#snippet footer()}
    <Button type="button" variant="secondary" fullWidth={false} onclick={onClose}>Close</Button>
  {/snippet}
</Drawer>
