<script lang="ts">
  import * as Frame from "$lib/components/frame";

  const SITE_URL = "https://jtransfer.jimmyverburgt.com";
  const PAGE_URL = `${SITE_URL}/pdf-tools`;
  const PAGE_TITLE = "PDF Tools - JTransfer";
  const PAGE_DESCRIPTION =
    "Choose a PDF workflow on JTransfer: merge, split, rotate, or remove pages. Processing stays local in your browser.";

  const tools = [
    {
      title: "Merge PDFs",
      description: "Combine up to 10 PDFs and control the order before exporting.",
      href: "/pdf-tools/merge",
      accent: "from-emerald-500/18 to-emerald-500/3 border-emerald-500/25",
      cta: "Open Merge",
    },
    {
      title: "Split PDF",
      description: "Extract a page range or split every page into separate files.",
      href: "/pdf-tools/split",
      accent: "from-blue-500/18 to-blue-500/3 border-blue-500/25",
      cta: "Open Split",
    },
    {
      title: "Rotate Pages",
      description: "Rotate specific page ranges by 90, 180, or 270 degrees.",
      href: "/pdf-tools/rotate",
      accent: "from-amber-500/18 to-amber-500/3 border-amber-500/25",
      cta: "Open Rotate",
    },
    {
      title: "Remove Pages",
      description: "Remove page ranges and keep only what you need.",
      href: "/pdf-tools/remove",
      accent: "from-rose-500/18 to-rose-500/3 border-rose-500/25",
      cta: "Open Remove",
    },
  ] as const;

  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: PAGE_URL,
    hasPart: tools.map((tool) => ({
      "@type": "WebPage",
      name: tool.title,
      url: `${SITE_URL}${tool.href}`,
    })),
  };
</script>

<svelte:head>
  <title>{PAGE_TITLE}</title>
  <meta name="description" content={PAGE_DESCRIPTION} />
  <meta
    name="robots"
    content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
  />
  <meta property="og:title" content={PAGE_TITLE} />
  <meta property="og:description" content={PAGE_DESCRIPTION} />
  <meta property="og:url" content={PAGE_URL} />
  <meta property="og:type" content="website" />
  <meta name="twitter:title" content={PAGE_TITLE} />
  <meta name="twitter:description" content={PAGE_DESCRIPTION} />
  <script type="application/ld+json">
    {JSON.stringify(schema)}
  </script>
</svelte:head>

<div class="min-h-screen">
  <div class="max-w-5xl mx-auto px-4 py-10">
    <div class="text-center mb-10">
      <p class="text-sm font-medium text-muted-foreground mb-2">JTransfer</p>
      <h1 class="text-4xl font-bold tracking-tight mb-3">PDF Tools</h1>
      <p class="text-muted-foreground max-w-2xl mx-auto">
        Pick a workflow. Every tool runs in your browser, with no server-side PDF
        processing.
      </p>
    </div>

    <Frame.Root>
      <Frame.Panel>
        <div class="grid gap-4 md:grid-cols-2">
          {#each tools as tool}
            <a
              href={tool.href}
              class="group block rounded-[calc(var(--radius-2xl)-1px)] border bg-gradient-to-br {tool.accent} p-5 transition-[transform,border-color] duration-200 ease-out hover:-translate-y-0.5"
            >
              <div class="flex items-start justify-between gap-4">
                <div>
                  <h2 class="text-lg font-semibold text-foreground">{tool.title}</h2>
                  <p class="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {tool.description}
                  </p>
                </div>
                <span
                  class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-input bg-secondary text-secondary-foreground"
                >
                  →
                </span>
              </div>
              <p class="mt-4 text-sm text-foreground/90">{tool.cta}</p>
            </a>
          {/each}
        </div>
      </Frame.Panel>
    </Frame.Root>

    <div class="mt-8 text-center text-sm text-muted-foreground space-y-1">
      <p>PDF processing happens locally in your browser.</p>
      <p>No files are uploaded or stored on our servers.</p>
      <div class="flex items-center justify-center gap-3 pt-2">
        <a href="/security" class="hover:text-foreground transition-colors">Security</a>
        <span>·</span>
        <a href="/privacy" class="hover:text-foreground transition-colors">Privacy Policy</a>
      </div>
    </div>
  </div>
</div>
