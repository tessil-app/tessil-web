<script lang="ts">
  // "Prove it's you" for anything that changes how the vault opens. Offers
  // whichever of password, recovery phrase and passkey this vault has and
  // the caller allows, and hands back the chosen proof.

  import PasswordInput from "$lib/components/PasswordInput.svelte";
  import Textarea from "$lib/components/Textarea.svelte";
  import {
    passkeysThatUnlock,
    vaultHasPassword,
    type VaultAccess,
  } from "$lib/vault/client";
  import { passkeyUnlockPossible } from "$lib/vault/passkeyUnlock";
  import { onMount } from "svelte";

  type Kind = VaultAccess["kind"];

  interface Props {
    /** The proof as entered so far; null while incomplete. */
    access: VaultAccess | null;
    /** Which kinds this action accepts. */
    allow?: Kind[];
    idPrefix: string;
    disabled?: boolean;
    /** Label for the password field, e.g. "Current password". */
    passwordLabel?: string;
  }

  let {
    access = $bindable(null),
    allow = ["password", "phrase", "passkey"],
    idPrefix,
    disabled = false,
    passwordLabel = "Vault password",
  }: Props = $props();

  let available = $state<Kind[]>([]);
  let kind = $state<Kind | null>(null);
  let password = $state("");
  let phrase = $state("");

  const LABELS: Record<Kind, string> = {
    password: "your vault password",
    phrase: "your recovery phrase",
    passkey: "a passkey",
  };

  onMount(async () => {
    const [hasPassword, passkeys] = await Promise.all([
      vaultHasPassword(true).catch(() => false),
      passkeysThatUnlock().catch(() => []),
    ]);
    const found: Kind[] = [];
    if (hasPassword) found.push("password");
    if (passkeys.length > 0 && passkeyUnlockPossible()) found.push("passkey");
    found.push("phrase");
    available = found.filter((k) => allow.includes(k));
    kind = available[0] ?? null;
  });

  $effect(() => {
    if (kind === "password") access = password.length > 0 ? { kind, password } : null;
    else if (kind === "phrase") access = phrase.trim().length > 0 ? { kind, phrase } : null;
    else if (kind === "passkey") access = { kind };
    else access = null;
  });

  /** Clears what was typed, after a successful action. */
  export function reset() {
    password = "";
    phrase = "";
  }
</script>

{#if kind === "password"}
  <PasswordInput
    id="{idPrefix}-password"
    label={passwordLabel}
    autocomplete="current-password"
    required
    bind:value={password}
    {disabled}
  />
{:else if kind === "phrase"}
  <Textarea
    id="{idPrefix}-phrase"
    label="Recovery phrase"
    placeholder="word word word …"
    rows={3}
    bind:value={phrase}
    {disabled}
  />
{:else if kind === "passkey"}
  <p class="text-sm text-muted-foreground">
    You'll confirm with your passkey when you continue.
  </p>
{/if}

{#if available.length > 1}
  <p class="text-xs text-muted-foreground">
    {#each available.filter((k) => k !== kind) as other, i (other)}
      {#if i > 0}<span> · </span>{/if}
      <button
        type="button"
        onclick={() => (kind = other)}
        {disabled}
        class="underline underline-offset-2 hover:text-foreground hover:cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded"
      >
        Use {LABELS[other]} instead
      </button>
    {/each}
  </p>
{/if}
