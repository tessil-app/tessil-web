<script lang="ts">
  import { onDestroy } from "svelte";
  import * as Frame from "$lib/components/frame";

  type OutputItem = {
    id: string;
    name: string;
    size: number;
    type: string;
    url: string;
    sourceName: string;
  };

  type SelectedItem = {
    id: string;
    file: File;
    format: (typeof outputFormats)[number]["value"];
  };

  const outputFormats = [
    { label: "JPEG", value: "image/jpeg", ext: "jpg" },
    { label: "PNG", value: "image/png", ext: "png" },
    { label: "WEBP", value: "image/webp", ext: "webp" },
  ] as const;

  const actionOptions = [
    { label: "Convert (show downloads)", value: "convert" },
    { label: "Convert + Download", value: "download" },
    { label: "Convert + Download ZIP", value: "zip" },
  ] as const;

  const globalFormatOptions = [
    { label: "JPEG", value: "image/jpeg" },
    { label: "PNG", value: "image/png" },
    { label: "WEBP", value: "image/webp" },
    { label: "Individual", value: "individual" },
  ] as const;

  const MAX_FILES = 10;

  const supportedExtensions = new Set([
    "jpg",
    "jpeg",
    "png",
    "webp",
    "gif",
    "bmp",
    "tif",
    "tiff",
    "heic",
    "heif",
  ]);

  const supportedMimeTypes = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/bmp",
    "image/tiff",
    "image/heic",
    "image/heif",
  ]);

  let selectedFiles = $state<SelectedItem[]>([]);
  let outputFormat = $state<
    (typeof globalFormatOptions)[number]["value"]
  >("image/jpeg");
  let outputs = $state<OutputItem[]>([]);
  let action = $state<(typeof actionOptions)[number]["value"]>("convert");
  let error = $state<string | null>(null);
  let warning = $state<string | null>(null);
  let isConverting = $state(false);
  let isDragging = $state(false);

  function handleInputChange(event: Event) {
    const target = event.currentTarget as HTMLInputElement;
    if (!target.files) return;
    handleFiles(target.files);
    target.value = "";
  }

  function handleFiles(fileList: FileList) {
    const files = Array.from(fileList);
    const unsupported = files.filter((file) => !isSupportedFile(file));

    if (unsupported.length > 0) {
      error = `Unsupported file type: ${unsupported[0].name}`;
      return;
    }

    const shouldReset = outputs.length > 0;
    const currentCount = shouldReset ? 0 : selectedFiles.length;

    if (currentCount + files.length > MAX_FILES) {
      error = `You can convert up to ${MAX_FILES} files at a time.`;
      return;
    }

    const initialFormat =
      outputFormat === "individual" ? "image/jpeg" : outputFormat;

    const nextItems = files.map((file, index) => ({
      id: `${file.name}-${file.size}-${index}-${Date.now()}`,
      file,
      format: initialFormat,
    }));
    if (shouldReset) {
      selectedFiles = nextItems;
      revokeOutputs();
    } else {
      selectedFiles = [...selectedFiles, ...nextItems];
    }
    error = null;
    warning = files.some((file) => isGif(file))
      ? "Animated GIFs will be flattened to a single frame."
      : null;
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    if (!event.dataTransfer?.files?.length) return;
    isDragging = false;
    handleFiles(event.dataTransfer.files);
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    isDragging = true;
  }

  function handleDragLeave(event: DragEvent) {
    event.preventDefault();
    isDragging = false;
  }

  function resetAll() {
    selectedFiles = [];
    error = null;
    warning = null;
    revokeOutputs();
  }

  function revokeOutputs() {
    outputs.forEach((item) => URL.revokeObjectURL(item.url));
    outputs = [];
  }

  function isSupportedFile(file: File) {
    if (supportedMimeTypes.has(file.type)) return true;
    const ext = file.name.split(".").pop()?.toLowerCase();
    return ext ? supportedExtensions.has(ext) : false;
  }

  function isHeic(file: File) {
    return (
      file.type === "image/heic" ||
      file.type === "image/heif" ||
      /\.(heic|heif)$/i.test(file.name)
    );
  }

  function isGif(file: File) {
    return file.type === "image/gif" || /\.gif$/i.test(file.name);
  }

  function getBaseName(name: string) {
    const parts = name.split(".");
    if (parts.length <= 1) return name;
    parts.pop();
    return parts.join(".");
  }

  function getEffectiveFormat(item: SelectedItem) {
    return outputFormat === "individual" ? item.format : outputFormat;
  }

  function updateGlobalFormat(value: (typeof globalFormatOptions)[number]["value"]) {
    outputFormat = value;
    if (value !== "individual") {
      selectedFiles = selectedFiles.map((item) => ({
        ...item,
        format: value,
      }));
    }
  }

  function updateItemFormat(id: string, value: SelectedItem["format"]) {
    selectedFiles = selectedFiles.map((item) =>
      item.id === id ? { ...item, format: value } : item
    );
  }

  async function convertAll() {
    if (selectedFiles.length === 0 || isConverting) return;
    isConverting = true;
    error = null;
    warning = null;
    revokeOutputs();

    try {
      const zipEntries: { name: string; blob: Blob }[] = [];

      for (const item of selectedFiles) {
        const file = item.file;
        let sourceBlob: Blob = file;

        if (isHeic(file)) {
          const heic2any = (await import("heic2any")).default;
          const heicResult = await heic2any({
            blob: file,
            toType: "image/png",
          });
          sourceBlob = Array.isArray(heicResult) ? heicResult[0] : heicResult;
        }

        const effectiveFormat = getEffectiveFormat(item);
        const bitmap = await createImageBitmap(sourceBlob);
        const canvas = document.createElement("canvas");
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas not supported in this browser.");
        ctx.drawImage(bitmap, 0, 0);
        bitmap.close?.();

        const formatMeta = outputFormats.find(
          (format) => format.value === effectiveFormat
        );
        if (!formatMeta) throw new Error("Unsupported output format.");

        const quality =
          effectiveFormat === "image/jpeg" || effectiveFormat === "image/webp"
            ? 0.92
            : undefined;

        const outBlob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else reject(new Error("Failed to export image."));
            },
            effectiveFormat,
            quality
          );
        });

        const outName = `${getBaseName(file.name)}.${formatMeta.ext}`;
        const outUrl = URL.createObjectURL(outBlob);
        zipEntries.push({ name: outName, blob: outBlob });
        outputs = [
          ...outputs,
          {
            id: `${file.name}-${effectiveFormat}-${Date.now()}`,
            name: outName,
            size: outBlob.size,
            type: outBlob.type,
            url: outUrl,
            sourceName: file.name,
          },
        ];
      }

      if (action === "download" && outputs.length > 0) {
        outputs.forEach((item) => {
          triggerDownload(item.url, item.name);
        });
      }

      if (action === "zip" && zipEntries.length > 0) {
        const JSZip = (await import("jszip")).default;
        const zip = new JSZip();
        zipEntries.forEach((entry) => zip.file(entry.name, entry.blob));
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const zipUrl = URL.createObjectURL(zipBlob);
        const timestamp = formatTimestamp(new Date());
        triggerDownload(zipUrl, `jtransfer-converted-${timestamp}.zip`);
        URL.revokeObjectURL(zipUrl);
      }
    } catch (err) {
      error = err instanceof Error ? err.message : "Conversion failed.";
    } finally {
      isConverting = false;
    }
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  function triggerDownload(url: string, name: string) {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  function formatTimestamp(date: Date) {
    const pad = (value: number) => value.toString().padStart(2, "0");
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(
      date.getDate()
    )}-${pad(date.getHours())}${pad(date.getMinutes())}`;
  }

  onDestroy(() => {
    revokeOutputs();
  });
</script>

<svelte:head>
  <title>Image Converter - JTransfer</title>
  <meta
    name="description"
    content="Convert images between JPG, PNG, and WEBP locally in your browser. No uploads."
  />
</svelte:head>

<div>
  <div class="min-h-screen">
    <div class="max-w-3xl mx-auto px-4 py-10">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold mb-2">Image Converter</h1>
        <p class="text-muted-foreground">
          Convert images locally in your browser. Nothing gets uploaded.
        </p>
      </div>

      <Frame.Root>
        <div class="space-y-6">
          <Frame.Header>
            <div class="space-y-1">
              <Frame.Title>Drop images or browse</Frame.Title>
              <Frame.Description>
                Supports JPG, PNG, WEBP, GIF, BMP, TIFF, and HEIC.
              </Frame.Description>
            </div>
          </Frame.Header>

          <Frame.Panel>
            <label
              for="image-upload"
              class="not-last:mb-4 w-full p-12 border-2 border-dashed rounded-[calc(var(--radius-2xl)-1px)] transition-all duration-200 cursor-pointer block text-center
							{isDragging
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-muted-foreground'}"
              ondragover={handleDragOver}
              ondrop={handleDrop}
              ondragleave={handleDragLeave}
            >
              <input
                id="image-upload"
                type="file"
                multiple
                accept="image/*,.heic,.heif"
                class="hidden"
                onchange={handleInputChange}
              />
              <div class="flex flex-col items-center gap-4 text-primary">
                <svg
                  class="w-12 h-12"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.5"
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <div>
                  <p class="text-lg font-medium text-foreground">
                    Drop images here or click to browse
                  </p>
                  <p class="text-sm mt-1 text-muted-foreground">
                    Up to {MAX_FILES} files at a time
                  </p>
                </div>
              </div>
            </label>

            {#if selectedFiles.length > 0}
              <div class="space-y-4 pt-4">
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div class="text-sm text-muted-foreground">
                    {selectedFiles.length} file{selectedFiles.length !== 1 ? "s" : ""} selected
                  </div>
                  <div class="flex flex-wrap items-center gap-3 text-sm">
                    <label for="format" class="text-muted-foreground"
                      >Convert to</label
                    >
                    <select
                      id="format"
                      value={outputFormat}
                      onchange={(event) =>
                        updateGlobalFormat(
                          (event.currentTarget as HTMLSelectElement).value as
                            (typeof globalFormatOptions)[number]["value"]
                        )}
                      class="py-2 px-3 bg-secondary border border-input rounded-[calc(var(--radius-2xl)-1px)] text-secondary-foreground hover:bg-accent transition-colors hover:cursor-pointer"
                    >
                      {#each globalFormatOptions as format}
                        <option value={format.value}>{format.label}</option>
                      {/each}
                    </select>

                    <label for="action" class="text-muted-foreground"
                      >Action</label
                    >
                    <select
                      id="action"
                      bind:value={action}
                      class="py-2 px-3 bg-secondary border border-input rounded-[calc(var(--radius-2xl)-1px)] text-secondary-foreground hover:bg-accent transition-colors hover:cursor-pointer"
                    >
                      {#each actionOptions as option}
                        <option value={option.value}>{option.label}</option>
                      {/each}
                    </select>
                  </div>
                </div>

                <ul class="space-y-2 text-sm">
                  {#each selectedFiles as item}
                    <li class="flex flex-wrap items-center justify-between gap-3">
                      <div class="flex flex-col">
                        <span class="text-foreground">{item.file.name}</span>
                        <span class="text-muted-foreground text-xs"
                          >{formatSize(item.file.size)}</span
                        >
                      </div>
                      <div class="flex items-center gap-2">
                        <select
                          value={item.format}
                          disabled={outputFormat !== "individual"}
                          onchange={(event) =>
                            updateItemFormat(
                              item.id,
                              (event.currentTarget as HTMLSelectElement).value as
                                SelectedItem["format"]
                            )}
                          class="py-1.5 px-2 bg-secondary border border-input rounded-[calc(var(--radius-2xl)-1px)] text-secondary-foreground hover:bg-accent transition-colors hover:cursor-pointer disabled:opacity-60"
                        >
                          {#each outputFormats as format}
                            <option value={format.value}>{format.label}</option>
                          {/each}
                        </select>
                      </div>
                    </li>
                  {/each}
                </ul>

                <div class="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onclick={convertAll}
                    disabled={isConverting}
                    class="hover:cursor-pointer px-4 py-2 bg-primary text-primary-foreground rounded-[calc(var(--radius-2xl)-1px)] disabled:bg-muted disabled:cursor-not-allowed transition-colors"
                  >
                    {isConverting ? "Converting..." : "Convert"}
                  </button>
                  <button
                    type="button"
                    onclick={resetAll}
                    class="hover:cursor-pointer px-4 py-2 bg-secondary text-secondary-foreground rounded-[calc(var(--radius-2xl)-1px)] hover:bg-accent transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>
            {/if}

            {#if warning}
              <div
                class="mt-4 p-3 bg-warning/10 border border-warning/30 rounded-[calc(var(--radius-2xl)-1px)] text-sm text-warning-foreground"
              >
                {warning}
              </div>
            {/if}

            {#if error}
              <div
                class="mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-[calc(var(--radius-2xl)-1px)] text-sm text-destructive-foreground"
              >
                {error}
              </div>
            {/if}

            {#if outputs.length > 0}
              <div class="mt-6 space-y-3">
                <h2 class="text-sm font-medium">Converted files</h2>
                <ul class="space-y-2 text-sm">
                  {#each outputs as output}
                    <li class="flex flex-wrap items-center justify-between gap-3">
                      <div class="flex flex-col">
                        <span class="text-foreground">{output.name}</span>
                        <span class="text-muted-foreground text-xs"
                          >from {output.sourceName}</span
                        >
                      </div>
                      <div class="flex items-center gap-3">
                        <span class="text-muted-foreground"
                          >{formatSize(output.size)}</span
                        >
                        <a
                          href={output.url}
                          download={output.name}
                          class="text-primary hover:text-primary/80 transition-colors"
                          >Download</a
                        >
                      </div>
                    </li>
                  {/each}
                </ul>
              </div>
            {/if}
          </Frame.Panel>
        </div>
      </Frame.Root>

      <div class="mt-8 text-center text-sm text-muted-foreground space-y-1">
        <p>Conversions happen locally in your browser.</p>
        <p>No files are uploaded or stored on our servers.</p>
      </div>
    </div>
  </div>

  <section
    class="max-w-3xl mx-auto px-4 pb-12 pt-10 border-t border-border/60 text-sm text-muted-foreground leading-relaxed space-y-3"
  >
    <h2 class="text-base font-semibold text-foreground">
      Fast image converter, explained
    </h2>
    <p>
      This browser-based image converter turns JPG, PNG, WEBP, and more into the
      format you need without uploads. Everything runs locally, so your images
      stay private and never leave your device.
    </p>
    <p>
      Convert single files or batch multiple images, choose a global format, or
      set individual outputs per file. It is quick, lightweight, and optimized
      for clean results.
    </p>
    <p>
      Perfect for preparing assets for the web, reducing file sizes, or
      standardizing images for a project without sending data to a server.
    </p>
  </section>
</div>
