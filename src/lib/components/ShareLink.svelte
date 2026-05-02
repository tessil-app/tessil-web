<script lang="ts">
  import * as Frame from "$lib/components/frame";

  interface Props {
    url: string;
    onReset: () => void;
    expiresInHours: number;
    maxDownloads: number | null;
  }

  let { url, onReset, expiresInHours, maxDownloads }: Props = $props();
  let copied = $state(false);

  function formatExpiry(hours: number): string {
    if (hours < 24) return `${hours}h`;
    const days = hours / 24;
    return `${days} day${days !== 1 ? 's' : ''}`;
  }

  function formatDownloads(max: number | null): string {
    if (max === null) return 'Unlimited downloads';
    return `Max ${max} download${max !== 1 ? 's' : ''}`;
  }

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(url);
      copied = true;
      setTimeout(() => {
        copied = false;
      }, 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      copied = true;
      setTimeout(() => {
        copied = false;
      }, 2000);
    }
  }
</script>

<div class="space-y-4">
  <Frame.Header class="m-0">
    <div class="flex items-center gap-2 text-success-foreground">
      <svg
        class="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span class="font-medium">File encrypted and uploaded!</span>
    </div>
  </Frame.Header>
  <Frame.Panel>
    <p class="text-sm text-muted-foreground mb-2">Share this link:</p>
    <p class="text-xs text-muted-foreground mb-3">
      Expires in {formatExpiry(expiresInHours)} · {formatDownloads(maxDownloads)}
    </p>
    <div class="flex gap-2">
      <input
        type="text"
        readonly
        value={url}
        class="flex-1 px-3 py-2 bg-background border border-input rounded-[calc(var(--radius-2xl)-1px)] text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <button
        type="button"
        onclick={copyToClipboard}
        class="hover:cursor-pointer px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-[calc(var(--radius-2xl)-1px)] transition-colors flex items-center gap-2"
      >
        {#if copied}
          <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
          Copied!
        {:else}
          <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          Copy
        {/if}
      </button>
    </div>
  </Frame.Panel>

  <div
    class="p-3 bg-warning/10 border border-warning/30 rounded-[calc(var(--radius-2xl)-1px)]"
  >
    <p class="text-sm text-warning-foreground">
      <strong>Important:</strong> The decryption key is in the URL fragment (#).
      Only share this complete link with intended recipients.
    </p>
  </div>

  <button
    type="button"
    onclick={onReset}
    class="w-full hover:cursor-pointer py-3 px-4 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-[calc(var(--radius-2xl)-1px)] transition-colors"
  >
    Upload another file
  </button>
</div>
