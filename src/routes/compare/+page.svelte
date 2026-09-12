<script lang="ts">
  import PageLayout from "$lib/components/PageLayout.svelte";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import SiteFooter from "$lib/components/SiteFooter.svelte";
  import { comparisons } from "$lib/compare/comparisons";
</script>

<Seo
  title="Tessil vs other encrypted file transfer tools"
  description="How Tessil compares to WeTransfer, Boomerang, Proton Drive, Tresorit Send, and Wormhole for private, end-to-end encrypted file transfer."
  path="/compare"
/>

<PageLayout width="5xl">
  <PageHeader
    title="How Tessil compares"
    tagline="Tessil is end-to-end encrypted file transfer: your browser encrypts before upload, and the key never reaches our servers. Here's how that stacks up against the tools people use today."
  />

  <a
    href="/compare/eu-encrypted-file-transfer"
    class="group mb-6 block rounded-xl border border-border bg-card/60 p-5 transition-[border-color,background-color] duration-200 ease-out hover:border-border hover:bg-card focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
  >
    <h2 class="text-lg font-semibold text-foreground">
      Encrypted file transfer in Europe: twelve services compared
    </h2>
    <p class="mt-1.5 text-sm text-muted-foreground leading-relaxed">
      WeTransfer, SwissTransfer, Smash, TransferNow, Tresorit Send, Proton Drive,
      Internxt Send and more, sorted by who encrypts in the browser and who holds
      the keys.
    </p>
    <span class="mt-3 inline-block text-sm font-medium text-primary underline underline-offset-2">
      Read the roundup →
    </span>
  </a>

  <ul class="grid gap-4 sm:grid-cols-2">
    {#each comparisons as c (c.slug)}
      <li>
        <a
          href="/compare/{c.slug}"
          class="group block h-full rounded-xl border border-border bg-card/60 p-5 transition-[border-color,background-color] duration-200 ease-out hover:border-border hover:bg-card focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <h2 class="text-lg font-semibold text-foreground">
            {c.heading}
          </h2>
          <p class="mt-1.5 text-sm text-muted-foreground leading-relaxed">
            {c.summary}
          </p>
          <span class="mt-3 inline-block text-sm font-medium text-primary underline underline-offset-2">
            Read the comparison →
          </span>
        </a>
      </li>
    {/each}
  </ul>

  <p class="mt-10 text-sm text-muted-foreground">
    New to Tessil? <a href="/" class="text-primary underline underline-offset-2">Send a file</a>
 - no account needed - or read the
    <a href="/security" class="text-primary underline underline-offset-2">security overview</a>.
  </p>

  <SiteFooter />
</PageLayout>
