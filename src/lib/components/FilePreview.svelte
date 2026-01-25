<script lang="ts">
  interface Props {
    file: File;
    onRemove: () => void;
    disabled?: boolean;
  }

  let { file, onRemove, disabled = false }: Props = $props();

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  function getFileIcon(type: string): string {
    if (type.startsWith("image/")) return "image";
    if (type.startsWith("video/")) return "video";
    if (type.startsWith("audio/")) return "audio";
    if (type.includes("pdf")) return "pdf";
    if (type.includes("zip") || type.includes("rar") || type.includes("7z"))
      return "archive";
    return "file";
  }
</script>

<div
  class="flex items-center gap-4 p-4 bg-gray-800 rounded-[calc(var(--radius-2xl)-1px)] border border-gray-700"
>
  <div
    class="shrink-0 w-12 h-12 flex items-center justify-center bg-gray-700 rounded-lg"
  >
    <svg
      class="w-6 h-6 text-gray-400"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.5"
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  </div>
  <div class="flex-1 min-w-0">
    <p class="text-white font-medium truncate">{file.name}</p>
    <p class="text-sm text-gray-400">{formatSize(file.size)}</p>
  </div>
  {#if !disabled}
    <button
      type="button"
      onclick={onRemove}
      class="shrink-0 p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors hover:cursor-pointer"
      aria-label="Remove file"
    >
      <svg
        class="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    </button>
  {/if}
</div>
