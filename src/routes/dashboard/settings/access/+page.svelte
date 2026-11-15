<script lang="ts">
  // Access keys: programs outside the browser that may act for this
  // account. A program shows a code; here its owner checks who is asking,
  // chooses what it may do, and approves. See
  // docs/adr/0015-access-keys-cli-and-mcp.md.

  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import Alert from "$lib/components/Alert.svelte";
  import Badge from "$lib/components/Badge.svelte";
  import Button from "$lib/components/Button.svelte";
  import Checkbox from "$lib/components/Checkbox.svelte";
  import DetailItem from "$lib/components/DetailItem.svelte";
  import DetailList from "$lib/components/DetailList.svelte";
  import * as Frame from "$lib/components/frame";
  import Modal from "$lib/components/Modal.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import TextInput from "$lib/components/TextInput.svelte";
  import TextLink from "$lib/components/TextLink.svelte";
  import { api, ApiError, type AccessKey } from "$lib/api/client";
  import { base64UrlToBytes } from "$lib/crypto/base64url";
  import { grantPortalToKey } from "$lib/portal/accessKeys";
  import { loadMyPortals, type MyPortal } from "$lib/portal/client";
  import { auth } from "$lib/stores/auth.svelte";
  import { subscribeToVaultState } from "$lib/vault/client";
  import { publicKeyFingerprint } from "$lib/vault/keypair";
  import { unlockPrompt } from "$lib/vault/prompt.svelte";
  import { onDestroy, onMount } from "svelte";

  let portalsAllowed = $state(false);

  // What a key can be allowed. The portal one is offered on plans with portals.
  const TRANSFER_PERMISSIONS = [
    { id: "transfers:send", label: "Send files", about: "Create transfers on your account, within your plan's limits." },
    { id: "transfers:read", label: "See what it sent", about: "List its own transfers and how often they were downloaded." },
    { id: "transfers:delete", label: "Delete what it sent", about: "Remove its own transfers before they expire." },
  ] as const;
  const PORTAL_PERMISSION = {
    id: "portals:read",
    label: "Read portals you pick",
    about: "List and download what people sent to the portals you hand it. You choose which after approving.",
  } as const;
  const PERMISSIONS = $derived(portalsAllowed ? [...TRANSFER_PERMISSIONS, PORTAL_PERMISSION] : [...TRANSFER_PERMISSIONS]);
  const LABELS: Record<string, string> = Object.fromEntries(
    [...TRANSFER_PERMISSIONS, PORTAL_PERMISSION].map((p) => [p.id, p.label]),
  );

  let keys = $state<AccessKey[]>([]);
  let maxKeys = $state(0);
  let loading = $state(true);
  let loadError = $state<string | null>(null);

  const activeCount = $derived(keys.filter((k) => k.active).length);
  const shown = $derived(keys.filter((k) => !k.revokedAt));

  async function load() {
    try {
      const res = await api.listAccessKeys();
      keys = res.devices;
      maxKeys = res.maxDevices;
      portalsAllowed = res.portalsAllowed;
      loadError = null;
    } catch (err) {
      loadError = err instanceof Error ? err.message : "Couldn't load your access keys.";
    } finally {
      loading = false;
    }
  }

  // ─── approving a program ──────────────────────────────────────────────────
  let code = $state("");
  let looking = $state(false);
  let lookError = $state<string | null>(null);
  let pending = $state<{ name: string; fingerprint: string } | null>(null);
  let pendingName = $state("");
  let chosen = $state<Record<string, boolean>>({
    "transfers:send": true,
    "transfers:read": true,
    "transfers:delete": false,
    "portals:read": false,
  });
  let approving = $state(false);
  let approveError = $state<string | null>(null);
  let approved = $state<string | null>(null);

  const chosenList = $derived(PERMISSIONS.map((p) => p.id).filter((id) => chosen[id]));

  async function lookUp(e?: Event) {
    e?.preventDefault();
    if (looking || code.trim().length === 0) return;
    looking = true;
    lookError = null;
    approved = null;
    pending = null;
    try {
      const found = await api.getPendingAccessKey(code.trim());
      pending = {
        name: found.name,
        fingerprint: await publicKeyFingerprint(base64UrlToBytes(found.publicKey)),
      };
      pendingName = found.name;
    } catch (err) {
      lookError =
        err instanceof ApiError && err.status === 404
          ? "No program is waiting under that code. Codes last ten minutes; start again in the program."
          : err instanceof Error
            ? err.message
            : "Couldn't look that code up.";
    } finally {
      looking = false;
    }
  }

  async function approve() {
    if (!pending || approving || chosenList.length === 0) return;
    approving = true;
    approveError = null;
    try {
      const key = await api.approveAccessKey({
        code: code.trim(),
        name: pendingName.trim() || undefined,
        permissions: chosenList,
      });
      approved = key.name;
      pending = null;
      code = "";
      await load();
    } catch (err) {
      approveError = err instanceof Error ? err.message : "Couldn't approve. Try again.";
    } finally {
      approving = false;
    }
  }

  function cancelApprove() {
    pending = null;
    approveError = null;
  }

  // ─── keys that exist ──────────────────────────────────────────────────────
  let busyId = $state<string | null>(null);
  let rowError = $state<string | null>(null);
  let revokeId = $state<string | null>(null);
  const revokeKey = $derived(keys.find((k) => k.id === revokeId) ?? null);

  async function renew(key: AccessKey) {
    if (busyId) return;
    busyId = key.id;
    rowError = null;
    try {
      const next = await api.updateAccessKey(key.id, { renew: true });
      keys = keys.map((k) => (k.id === key.id ? next : k));
    } catch (err) {
      rowError = err instanceof Error ? err.message : "Couldn't renew this key.";
    } finally {
      busyId = null;
    }
  }

  async function confirmRevoke() {
    if (!revokeId || busyId) return;
    busyId = revokeId;
    rowError = null;
    try {
      await api.revokeAccessKey(revokeId);
      await load();
    } catch (err) {
      rowError = err instanceof Error ? err.message : "Couldn't revoke this key.";
    } finally {
      busyId = null;
      revokeId = null;
    }
  }

  // ─── which portals a key may open ─────────────────────────────────────────
  let portalsFor = $state<AccessKey | null>(null);
  let myPortals = $state<MyPortal[]>([]);
  let granted = $state<Set<string>>(new Set());
  let portalsLoading = $state(false);
  let portalsError = $state<string | null>(null);
  let togglingPortal = $state<string | null>(null);
  let vaultLocked = $state(false);

  async function openPortals(key: AccessKey) {
    if (!auth.user) return;
    portalsFor = key;
    portalsError = null;
    portalsLoading = true;
    try {
      const [mine, grants] = await Promise.all([
        loadMyPortals(auth.user.id, window.location.origin),
        api.listAccessKeyPortals(key.id),
      ]);
      // Only portals whose keys this browser can open can be handed on.
      myPortals = mine.portals.filter((p) => p.state === "open" || p.state === "locked");
      vaultLocked = mine.portals.some((p) => p.state === "locked");
      granted = new Set(grants.portals.map((g) => g.portalId));
    } catch (err) {
      portalsError = err instanceof Error ? err.message : "Couldn't load your portals.";
    } finally {
      portalsLoading = false;
    }
  }

  async function togglePortal(portal: MyPortal) {
    if (!auth.user || !portalsFor || togglingPortal) return;
    togglingPortal = portal.id;
    portalsError = null;
    try {
      if (granted.has(portal.id)) {
        await api.revokeAccessKeyPortal(portalsFor.id, portal.id);
        granted.delete(portal.id);
      } else {
        const result = await grantPortalToKey(auth.user.id, portalsFor, portal.id);
        if (!result.ok) {
          portalsError =
            result.reason === "locked"
              ? "Your vault is locked. Unlock it to hand over a portal: its keys are sealed for this access key here in your browser."
              : "This portal's keys could not be opened with your vault.";
          if (result.reason === "locked") unlockPrompt.request();
          return;
        }
        granted.add(portal.id);
      }
      granted = new Set(granted);
    } catch (err) {
      portalsError = err instanceof Error ? err.message : "Couldn't change that. Try again.";
    } finally {
      togglingPortal = null;
    }
  }

  const unsubscribeVault = subscribeToVaultState(() => {
    if (portalsFor) void openPortals(portalsFor);
  });
  onDestroy(unsubscribeVault);

  const dayFmt = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" });

  function daysLeft(iso: string | null): number {
    return iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000) : 0;
  }

  onMount(() => {
    void load();
    // A program opens this page with its code already in the address.
    const fromLink = page.url.searchParams.get("code");
    if (fromLink) {
      code = fromLink;
      void goto(page.url.pathname, { replaceState: true, keepFocus: true });
      void lookUp();
    }
  });
</script>

<div class="space-y-6">
  <Frame.Root>
    <Frame.Panel>
      <div class="space-y-4">
        <div class="space-y-1">
          <h2 class="text-xl font-semibold text-foreground">Access keys</h2>
          <p class="text-sm text-muted-foreground">
            A key lets a program on your own computer, such as the Tessil command-line tool, send
            files as you. It never gets your vault, your password or this session, and it cannot
            reach your account settings or billing. It opens a portal only if you hand it that
            portal.
          </p>
        </div>

        {#if approved}
          <Alert tone="success">"{approved}" is approved. The program can continue.</Alert>
        {/if}

        {#if !pending}
          <form onsubmit={lookUp} class="flex flex-wrap items-end gap-2">
            <TextInput
              id="pairing-code"
              label="Code shown by the program"
              placeholder="ABCD-EFGH"
              mono
              autocomplete="off"
              autocapitalize="characters"
              spellcheck={false}
              maxlength={12}
              bind:value={code}
              disabled={looking}
              class="w-48"
            />
            <Button type="submit" variant="secondary" fullWidth={false} disabled={looking || code.trim().length === 0}>
              {#if looking}
                <Spinner aria-hidden="true" />
                Looking…
              {:else}
                Continue
              {/if}
            </Button>
          </form>
          {#if lookError}
            <Alert tone="destructive">{lookError}</Alert>
          {/if}
        {:else}
          <div class="space-y-4 rounded-lg border border-border p-4">
            <div class="space-y-1">
              <h3 class="text-sm font-medium text-foreground">A program is asking for access</h3>
              <p class="text-sm text-muted-foreground">
                Compare the code below with the one the program shows. If they differ, or you did
                not start this yourself, do not approve.
              </p>
            </div>
            <DetailList>
              <DetailItem label="Calls itself">{pending.name}</DetailItem>
              <DetailItem label="Its key">
                <span class="font-mono text-xs">{pending.fingerprint}</span>
              </DetailItem>
            </DetailList>

            <TextInput id="key-name" label="Name it" maxlength={80} bind:value={pendingName} disabled={approving} />

            <fieldset class="space-y-3" disabled={approving}>
              <legend class="text-sm font-medium text-foreground">It may</legend>
              {#each PERMISSIONS as permission (permission.id)}
                <div>
                  <Checkbox bind:checked={chosen[permission.id]}>{permission.label}</Checkbox>
                  <p class="ml-7 text-xs text-muted-foreground">{permission.about}</p>
                </div>
              {/each}
            </fieldset>

            <p class="text-xs text-muted-foreground">
              It works for 90 days and can be renewed or revoked here at any time.
            </p>

            {#if approveError}
              <Alert tone="destructive">{approveError}</Alert>
            {/if}

            <div class="flex flex-wrap gap-2">
              <Button fullWidth={false} onclick={approve} disabled={approving || chosenList.length === 0}>
                {#if approving}
                  <Spinner aria-hidden="true" />
                  Approving…
                {:else}
                  Approve
                {/if}
              </Button>
              <Button variant="ghost" fullWidth={false} onclick={cancelApprove} disabled={approving}>
                Don't approve
              </Button>
            </div>
          </div>
        {/if}
      </div>
    </Frame.Panel>
  </Frame.Root>

  <Frame.Root>
    <Frame.Panel>
      <div class="space-y-4">
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <h2 class="text-xl font-semibold text-foreground">Your keys</h2>
          {#if !loading && maxKeys > 0}
            <span class="text-sm text-muted-foreground">{activeCount} of {maxKeys} on your plan</span>
          {/if}
        </div>

        {#if loadError}
          <Alert tone="destructive">{loadError}</Alert>
        {:else if loading}
          <div class="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner aria-hidden="true" />
            Loading…
          </div>
        {:else if shown.length === 0}
          <p class="text-sm text-muted-foreground">No keys yet.</p>
        {:else}
          {#if rowError}
            <Alert tone="destructive">{rowError}</Alert>
          {/if}
          <ul class="divide-y divide-border">
            {#each shown as key (key.id)}
              {@const left = daysLeft(key.expiresAt)}
              <li class="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                <div class="min-w-0 space-y-1">
                  <p class="flex flex-wrap items-center gap-2 font-medium text-foreground">
                    <span class="break-words">{key.name}</span>
                    {#if !key.active}
                      <Badge tone="muted">Expired</Badge>
                    {:else if left <= 14}
                      <Badge tone="warning">{left === 1 ? "1 day left" : `${left} days left`}</Badge>
                    {/if}
                  </p>
                  <p class="text-xs text-muted-foreground">
                    {key.permissions.map((p) => LABELS[p] ?? p).join(" · ")}
                  </p>
                  <p class="text-xs text-muted-foreground">
                    {key.lastUsedAt ? `Last used ${dayFmt.format(new Date(key.lastUsedAt))}` : "Not used yet"}
                    {#if key.expiresAt}
                      · {key.active ? "works until" : "stopped on"} {dayFmt.format(new Date(key.expiresAt))}
                    {/if}
                  </p>
                </div>
                <div class="flex shrink-0 items-center gap-3">
                  {#if key.active && key.permissions.includes("portals:read")}
                    <TextLink class="text-sm" onclick={() => openPortals(key)} disabled={busyId !== null}>
                      Portals
                    </TextLink>
                  {/if}
                  <TextLink class="text-sm" onclick={() => renew(key)} disabled={busyId !== null}>
                    {busyId === key.id && !revokeId ? "Renewing…" : "Renew"}
                  </TextLink>
                  <Button
                    variant="secondary"
                    fullWidth={false}
                    class="py-2 px-3 text-sm"
                    onclick={() => (revokeId = key.id)}
                    disabled={busyId !== null}
                  >
                    Revoke
                  </Button>
                </div>
              </li>
            {/each}
          </ul>
        {/if}

        <p class="text-xs text-muted-foreground">
          "Sign out everywhere" under Security also revokes every key here.
        </p>
      </div>
    </Frame.Panel>
  </Frame.Root>
</div>

<Modal
  open={revokeKey !== null}
  title="Revoke this key?"
  description={`"${revokeKey?.name ?? ""}" stops working at once and cannot be brought back; the program has to be approved again. What it already sent stays until it expires or you delete it.`}
  onClose={() => (revokeId = null)}
>
  {#snippet footer()}
    <Button type="button" variant="ghost" fullWidth={false} onclick={() => (revokeId = null)} disabled={busyId !== null}>
      Keep it
    </Button>
    <Button type="button" fullWidth={false} onclick={confirmRevoke} disabled={busyId !== null}>
      {busyId ? "Revoking…" : "Revoke key"}
    </Button>
  {/snippet}
</Modal>

<Modal
  open={portalsFor !== null}
  title="Portals for {portalsFor?.name ?? ''}"
  description="Tick a portal to hand its keys to this access key. They are sealed for it here in your browser; we cannot read them. Untick to take the portal back."
  onClose={() => (portalsFor = null)}
>
  <div class="space-y-3">
    {#if portalsLoading}
      <div class="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner aria-hidden="true" />
        Loading…
      </div>
    {:else if myPortals.length === 0}
      <p class="text-sm text-muted-foreground">You have no portals yet.</p>
    {:else}
      {#if vaultLocked}
        <Alert tone="warning">
          Your vault is locked, so portal names are hidden and none can be handed over.
          <TextLink onclick={() => unlockPrompt.request()}>Unlock vault</TextLink>
        </Alert>
      {/if}
      <ul class="divide-y divide-border rounded-md border border-border">
        {#each myPortals as portal (portal.id)}
          <li class="px-3 py-2.5">
            <Checkbox
              checked={granted.has(portal.id)}
              onchange={() => togglePortal(portal)}
              disabled={togglingPortal !== null || (portal.state !== "open" && !granted.has(portal.id))}
            >
              {portal.title ?? "Locked portal"}
              {#if togglingPortal === portal.id}
                <span class="text-muted-foreground"> · saving…</span>
              {/if}
            </Checkbox>
          </li>
        {/each}
      </ul>
    {/if}
    {#if portalsError}
      <Alert tone="destructive">{portalsError}</Alert>
    {/if}
    <p class="text-xs text-muted-foreground">
      The key can list and download what was sent to these portals. It cannot change or delete
      anything, and it loses a portal when you leave or delete it.
    </p>
  </div>
  {#snippet footer()}
    <Button type="button" fullWidth={false} onclick={() => (portalsFor = null)}>Done</Button>
  {/snippet}
</Modal>
