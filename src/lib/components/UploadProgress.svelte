<script lang="ts">
  import type { UploadStatus } from "$lib/stores/upload.types";
  import ProgressBar from "./ProgressBar.svelte";

  interface Props {
    status: UploadStatus;
    progress: number;
  }

  let { status, progress }: Props = $props();

  const statusLabels: Record<UploadStatus, string> = {
    idle: "Ready",
    validating: "Validating file...",
    encrypting: "Encrypting...",
    uploading: "Uploading...",
    complete: "Complete!",
    error: "Error",
  };
</script>

<div class="space-y-2">
  <ProgressBar {progress} label={statusLabels[status]} />
  {#if status === "encrypting"}
    <p class="text-xs text-gray-500">
      Your file is being encrypted in your browser
    </p>
  {:else if status === "uploading"}
    <p class="text-xs text-gray-500">Uploading encrypted file securely</p>
  {/if}
</div>
