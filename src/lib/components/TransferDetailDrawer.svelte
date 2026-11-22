<script lang="ts">
  import { api, type OwnedTransferSummary } from "$lib/api/client";
  import Alert from "$lib/components/Alert.svelte";
  import Badge from "$lib/components/Badge.svelte";
  import Button from "$lib/components/Button.svelte";
  import DetailItem from "$lib/components/DetailItem.svelte";
  import DetailList from "$lib/components/DetailList.svelte";
  import Drawer from "$lib/components/Drawer.svelte";
  import DrawerSection from "$lib/components/DrawerSection.svelte";
  import FileRow from "$lib/components/FileRow.svelte";
  import Spinner from "$lib/components/Spinner.svelte";
  import TextInput from "$lib/components/TextInput.svelte";
  import { encryptString } from "$lib/crypto/encrypt";
  import { formatSize } from "$lib/utils";
  import { appLocale } from "$lib/i18n/app.svelte";
  import { HTML_LANG } from "$lib/i18n/locale";
  import { transfersMessages } from "$lib/i18n/messages/transfers";
  import {
    importTransferKey,
    transferKeyToFragment,
    unwrapTransferKey,
  } from "$lib/vault/client";

  export type VaultRowState =
    | { status: "locked" }
    | { status: "unlocking" }
    | { status: "unlocked"; names: string[]; sizes?: number[]; title: string | null }
    | { status: "blind-error" };

  interface Props {
    open: boolean;
    userId: string | null;
    transfer: OwnedTransferSummary | null;
    vaultState: VaultRowState | undefined;
    onClose: () => void;
    /** Parent removes the row from its list. */
    onDeleted: (id: string) => void;
    /** Parent updates its cached title + ciphertext for the row. */
    onTitleSaved: (
      id: string,
      decryptedTitle: string | null,
      encryptedTitle: string | null,
      encryptedTitleIv: string | null,
    ) => void;
  }

  const TITLE_MAX = 200;

  let {
    open,
    userId,
    transfer,
    vaultState,
    onClose,
    onDeleted,
    onTitleSaved,
  }: Props = $props();

  let originalTitle = $state("");
  let titleInput = $state("");
  let titleSaving = $state(false);
  let titleError = $state<string | null>(null);

  let shareUrl = $state<string | null>(null);
  let recovering = $state(false);
  let recoverError = $state<string | null>(null);
  let copied = $state(false);

  let confirmingDelete = $state(false);
  let deleting = $state(false);
  let deleteError = $state<string | null>(null);

  // Re-seed transient state every time the open transfer changes.
  let lastSeededId = $state<string | null>(null);
  $effect(() => {
    if (!open || !transfer) return;
    if (lastSeededId === transfer.id) return;
    lastSeededId = transfer.id;
    const decrypted =
      vaultState?.status === "unlocked" ? vaultState.title ?? "" : "";
    originalTitle = decrypted;
    titleInput = decrypted;
    titleError = null;
    shareUrl = null;
    recovering = false;
    recoverError = null;
    copied = false;
    confirmingDelete = false;
    deleting = false;
    deleteError = null;
  });

  // Pick up a freshly-decrypted title when the vault unlocks mid-drawer, unless the user is editing.
  $effect(() => {
    if (!open || !transfer) return;
    if (vaultState?.status !== "unlocked") return;
    if (titleInput !== originalTitle) return;
    const fresh = vaultState.title ?? "";
    if (fresh !== originalTitle) {
      originalTitle = fresh;
      titleInput = fresh;
    }
  });

  const trimmedTitle = $derived(titleInput.trim());
  const titleDirty = $derived(trimmedTitle !== originalTitle.trim());
  const titleOverLimit = $derived(titleInput.length > TITLE_MAX);
  const canSaveTitle = $derived(
    titleDirty &&
      !titleOverLimit &&
      !titleSaving &&
      vaultState?.status === "unlocked",
  );

  async function saveTitle() {
    if (!transfer || !userId) return;
    if (!canSaveTitle) return;
    titleSaving = true;
    titleError = null;
    try {
      let encryptedTitle: string | null = null;
      let encryptedTitleIv: string | null = null;

      if (trimmedTitle.length > 0) {
        const raw = await unwrapTransferKey(userId, transfer.wrappedKey ?? "");
        if (!raw) {
          titleError = m.errors.key;
          return;
        }
        const transferKey = await importTransferKey(raw);
        const { ciphertext, iv } = await encryptString(trimmedTitle, transferKey);
        encryptedTitle = ciphertext;
        encryptedTitleIv = iv;
      }

      await api.setMyTransferTitle(transfer.id, encryptedTitle, encryptedTitleIv);
      const newDecrypted = trimmedTitle.length > 0 ? trimmedTitle : null;
      onTitleSaved(transfer.id, newDecrypted, encryptedTitle, encryptedTitleIv);
      originalTitle = trimmedTitle;
      titleInput = trimmedTitle;
    } catch (err) {
      titleError = err instanceof Error ? err.message : m.errors.save;
    } finally {
      titleSaving = false;
    }
  }

  function cancelTitleEdit() {
    titleInput = originalTitle;
    titleError = null;
  }

  async function recoverShareLink() {
    if (!transfer || !userId || !transfer.wrappedKey || recovering) return;
    recovering = true;
    recoverError = null;
    try {
      const raw = await unwrapTransferKey(userId, transfer.wrappedKey);
      if (!raw) {
        recoverError =
          m.errors.rebuildBlind;
        return;
      }
      const fragment = transferKeyToFragment(raw);
      shareUrl = `${window.location.origin}/d/${transfer.id}#${fragment}`;
    } catch {
      recoverError = m.errors.rebuild;
    } finally {
      recovering = false;
    }
  }

  async function copyShareLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      const input = document.createElement("input");
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
    copied = true;
    setTimeout(() => {
      copied = false;
    }, 2000);
  }

  async function performDelete() {
    if (!transfer || deleting) return;
    deleting = true;
    deleteError = null;
    try {
      await api.deleteMyTransfer(transfer.id);
      onDeleted(transfer.id);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : list.errors.delete;
      if (msg === "Transfer not found.") {
        // Treat as already-gone so the row clears.
        onDeleted(transfer.id);
        onClose();
        return;
      }
      deleteError = msg;
    } finally {
      deleting = false;
    }
  }

  const locale = $derived(appLocale());
  const list = $derived(transfersMessages[locale]);
  const m = $derived(list.drawer);

  function statusOf(t: OwnedTransferSummary): {
    label: string;
    tone: "success" | "warning" | "muted";
  } {
    const expired = new Date(t.expiresAt) < new Date();
    if (expired) return { label: list.status.expired, tone: "muted" };
    if (!t.isCompleted) return { label: list.status.inProgress, tone: "warning" };
    return { label: list.status.active, tone: "success" };
  }

  const dateFmt = $derived(
    new Intl.DateTimeFormat(HTML_LANG[locale], {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
  );

  function relativeExpiry(iso: string): string {
    const ms = new Date(iso).getTime() - Date.now();
    if (ms <= 0) return list.expired;
    const mins = Math.round(ms / 60000);
    if (mins < 60) return list.inMinutes(mins);
    const hours = Math.round(mins / 60);
    if (hours < 24) return list.inHours(hours);
    return list.inDays(Math.round(hours / 24));
  }
</script>

<Drawer {open} {onClose} title={m.title}>
  {#if transfer}
    {@const status = statusOf(transfer)}
    {@const canRecover = vaultState?.status === "unlocked"}
    {@const decryptedNames = vaultState?.status === "unlocked" ? vaultState.names : null}
    {@const decryptedSizes = vaultState?.status === "unlocked" ? vaultState.sizes : undefined}

    <div class="space-y-3">
      <DrawerSection>
        <label
          for="transfer-title-input"
          class="block text-sm font-medium text-foreground"
        >
          {m.name}
        </label>
        {#if vaultState?.status === "unlocked"}
          <TextInput
            id="transfer-title-input"
            bind:value={titleInput}
            placeholder={m.namePlaceholder}
            maxlength={TITLE_MAX + 32}
            disabled={titleSaving}
          />
          <p class="text-xs text-muted-foreground">
            {m.nameHint}
          </p>
          {#if titleOverLimit}
            <p class="text-xs text-destructive-foreground">
              {m.tooLong(titleInput.length, TITLE_MAX)}
            </p>
          {/if}
          {#if titleError}
            <Alert tone="destructive">{titleError}</Alert>
          {/if}
        {:else if vaultState?.status === "locked"}
          <p class="text-sm text-muted-foreground">
            {m.unlockToName}
          </p>
        {:else if vaultState?.status === "unlocking"}
          <p class="text-sm text-muted-foreground">{m.unlocking}</p>
        {:else if vaultState?.status === "blind-error"}
          <p class="text-sm text-muted-foreground">
            {m.blind}
          </p>
        {:else}
          <p class="text-sm text-muted-foreground">
            {m.noWrap}
          </p>
        {/if}
      </DrawerSection>

      <DrawerSection title={m.files}>
        {#snippet aside()}
          <span class="text-xs text-muted-foreground">
            {list.files(transfer.fileCount)} · {formatSize(transfer.totalBytes)}
          </span>
        {/snippet}
        {#if decryptedNames}
          {#if decryptedNames.length > 0}
            <!-- Same rows as a delivery's files; a sender has nothing to download here. -->
            <ul class="space-y-2">
              {#each decryptedNames as name, i (`${transfer.id}-${i}`)}
                <li>
                  <FileRow
                    {name}
                    size={decryptedSizes?.[i] !== undefined ? formatSize(decryptedSizes[i]) : undefined}
                    kind="download"
                    trailingHidden
                  />
                </li>
              {/each}
            </ul>
          {:else}
            <p class="text-sm text-muted-foreground">{m.noFilesIn}</p>
          {/if}
        {:else}
          <p class="text-sm text-muted-foreground">
            {m.namesEncrypted}
          </p>
        {/if}
      </DrawerSection>

      <DrawerSection title={m.details}>
        <DetailList>
          <DetailItem label={m.status}><Badge tone={status.tone}>{status.label}</Badge></DetailItem>
          <DetailItem label={m.created}>{dateFmt.format(new Date(transfer.createdAt))}</DetailItem>
          <DetailItem label={m.expires}>
            {dateFmt.format(new Date(transfer.expiresAt))}
            <span class="text-muted-foreground">({relativeExpiry(transfer.expiresAt)})</span>
          </DetailItem>
          <DetailItem label={m.downloads}>{transfer.downloadCount}</DetailItem>
          <DetailItem label={m.password}>{transfer.hasPassword ? m.required : m.none}</DetailItem>
        </DetailList>
      </DrawerSection>

      <DrawerSection title={m.shareLink}>
        {#if recoverError}
          <Alert tone="warning">{recoverError}</Alert>
        {/if}
        {#if shareUrl}
          <p class="text-xs text-muted-foreground">
            {m.anyone}
          </p>
          <input
            type="text"
            readonly
            value={shareUrl}
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            onclick={(e) => (e.currentTarget as HTMLInputElement).select()}
          />
          <div class="flex gap-2">
            <Button variant="secondary" fullWidth={false} onclick={copyShareLink}>
              {copied ? m.copied : m.copy}
            </Button>
            <Button
              variant="ghost"
              fullWidth={false}
              onclick={() => {
                shareUrl = null;
                copied = false;
              }}
            >
              {m.hide}
            </Button>
          </div>
        {:else if canRecover && transfer.wrappedKey}
          <p class="text-xs text-muted-foreground">
            {m.rebuildHint}
          </p>
          <Button
            variant="secondary"
            fullWidth={false}
            onclick={recoverShareLink}
            disabled={recovering}
          >
            {#if recovering}
              <Spinner aria-hidden="true" />
              {m.rebuilding}
            {:else}
              {m.getLink}
            {/if}
          </Button>
        {:else if !transfer.wrappedKey}
          <p class="text-sm text-muted-foreground">
            {m.noWrapLink}
          </p>
        {:else}
          <p class="text-sm text-muted-foreground">
            {m.unlockToLink}
          </p>
        {/if}
      </DrawerSection>

      <DrawerSection
        title={m.delete}
        description={m.deleteHint}
        tone="danger"
      >
        {#if deleteError}
          <Alert tone="destructive">{deleteError}</Alert>
        {/if}
        {#if confirmingDelete}
          <div class="flex flex-col sm:flex-row gap-2">
            <Button
              variant="destructive"
              fullWidth={false}
              onclick={performDelete}
              disabled={deleting}
            >
              {#if deleting}
                <Spinner aria-hidden="true" />
                {m.deleting}
              {:else}
                {m.confirm}
              {/if}
            </Button>
            <Button
              variant="ghost"
              fullWidth={false}
              onclick={() => (confirmingDelete = false)}
              disabled={deleting}
            >
              {m.cancel}
            </Button>
          </div>
        {:else}
          <Button
            variant="destructive"
            fullWidth={false}
            onclick={() => (confirmingDelete = true)}
          >
            {list.deleteTransfer}
          </Button>
        {/if}
      </DrawerSection>
    </div>
  {/if}

  {#snippet footer()}
    {#if titleDirty}
      <Button
        type="button"
        variant="ghost"
        fullWidth={false}
        onclick={cancelTitleEdit}
        disabled={titleSaving}
      >
        {m.cancel}
      </Button>
      <Button
        type="button"
        variant="primary"
        fullWidth={false}
        onclick={saveTitle}
        disabled={!canSaveTitle}
      >
        {#if titleSaving}
          <Spinner aria-hidden="true" />
          {m.saving}
        {:else}
          {m.save}
        {/if}
      </Button>
    {:else}
      <Button type="button" variant="secondary" fullWidth={false} onclick={onClose}>
        {m.close}
      </Button>
    {/if}
  {/snippet}
</Drawer>
