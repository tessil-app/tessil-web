<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import FeatureAccordion, { type Feature } from "$lib/components/FeatureAccordion.svelte";
  import PlanCards from "$lib/components/PlanCards.svelte";
  import SendPanel from "$lib/components/SendPanel.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import SiteFooter from "$lib/components/SiteFooter.svelte";
  import SupportModal from "$lib/components/SupportModal.svelte";
  import TextLink from "$lib/components/TextLink.svelte";
  import { ACCESS_KEYS_ANNOUNCED, FORMS_ANNOUNCED, PORTALS_ANNOUNCED } from "$lib/config/launch";
  import { SITE_URL } from "$lib/config/site";
  import { auth } from "$lib/stores/auth.svelte";
  import { uploadStore } from "$lib/stores/upload.svelte";
  import { hasDismissedPrompt, markPromptDismissed, shouldAutoOpenPrompt } from "$lib/support/prompt";
  import { cn } from "$lib/utils";
  import IconCheckRegular from "phosphor-icons-svelte/IconCheckRegular.svelte";
  import { onMount } from "svelte";

  const PAGE_TITLE = "Tessil - Send anything. We see nothing.";
  const PAGE_DESCRIPTION =
    "End-to-end encrypted file transfer. Your browser encrypts before upload - we never see your files or the key.";

  const homeSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: "Tessil",
        url: SITE_URL,
        description: PAGE_DESCRIPTION,
      },
      {
        "@type": "WebApplication",
        name: "Tessil",
        applicationCategory: "SecurityApplication",
        operatingSystem: "Any",
        browserRequirements: "Requires JavaScript and modern browser APIs",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "EUR",
        },
        featureList: [
          "End-to-end encrypted file transfer",
          "Client-side encryption in browser",
          "Temporary links with expiration",
          "Optional password protection",
        ],
        url: SITE_URL,
      },
    ],
  };


  // The question behind "Or ask an AI". Written to invite criticism, not praise.
  const ASK_PROMPT =
    "I am considering Tessil (https://tessil.app) for sending files. Read its security page (https://tessil.app/security), its verification page (https://tessil.app/verify) and its source code (https://github.com/tessil-app). Explain in plain language how its encryption works and what the service can and cannot see. Then be critical: what are its weaknesses and limits, what do I still have to trust, and how does it compare with WeTransfer, Proton Drive and Tresorit? Say clearly which claims you could not verify.";
  const askLinks = [
    { label: "ChatGPT", href: `https://chatgpt.com/?q=${encodeURIComponent(ASK_PROMPT)}` },
    { label: "Claude", href: `https://claude.ai/new?q=${encodeURIComponent(ASK_PROMPT)}` },
    { label: "Perplexity", href: `https://www.perplexity.ai/search?q=${encodeURIComponent(ASK_PROMPT)}` },
  ];
  let askCopied = $state(false);
  async function copyAskPrompt() {
    try {
      await navigator.clipboard.writeText(ASK_PROMPT);
      askCopied = true;
      setTimeout(() => (askCopied = false), 2000);
    } catch {
      // Clipboard refused; the text is on the page to select by hand.
    }
  }

  // What Tessil does besides sending, each shown once it is announced.
  const features: Feature[] = [
    ...(PORTALS_ANNOUNCED
      ? [
          {
            id: "portals" as const,
            name: "Portals",
            fresh: true,
            line: "A link where people send you files. Only you can open them.",
            href: "/portals",
            link: "Meet portals",
            pill: "Now you can receive files too",
          },
        ]
      : []),
    ...(FORMS_ANNOUNCED
      ? [
          {
            id: "forms" as const,
            name: "Forms",
            fresh: true,
            line: "Ask your questions with one link. Only you can read the answers.",
            href: "/forms",
            link: "Meet forms",
            pill: "Forms only you can read",
          },
        ]
      : []),
    ...(ACCESS_KEYS_ANNOUNCED
      ? [
          {
            id: "cli" as const,
            name: "Terminal",
            fresh: true,
            line: "Send and receive from your terminal, or let your AI assistant do it.",
            href: "/cli",
            link: "Meet the tool",
            pill: "Tessil in your terminal",
          },
        ]
      : []),
  ];

  // Plays a film only while it is on screen, and not at all for people who asked for less motion.
  function playInView(node: HTMLVideoElement) {
    if (typeof IntersectionObserver === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      node.controls = true;
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) void node.play().catch(() => {});
          else node.pause();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(node);
    return { destroy: () => observer.disconnect() };
  }

  // Written without findLast, which older Safari does not have.
  const newest = [...features].reverse().find((f) => f.fresh) ?? null;

  const steps: { title: string; body: string; link?: { href: string; label: string } }[] = [
    {
      title: "Encrypted before it leaves",
      body: "Your browser scrambles every file, its name included. What reaches us is unreadable.",
    },
    {
      title: "The key is never ours",
      body: PORTALS_ANNOUNCED
        ? "It travels in the part of the link browsers don't send to servers. For portals it stays in your vault."
        : "It travels in the part of the link browsers don't send to servers.",
    },
    {
      title: "Gone when it should be",
      body: PORTALS_ANNOUNCED
        ? "Transfers expire in hours or days. What arrives in a portal is deleted after 30 days, or 90 on Max."
        : "Transfers expire in hours or days, and the files are deleted with them.",
    },
    {
      title: "Check it yourself",
      body: "Four checks in your own browser, about two minutes.",
      link: { href: "/verify", label: "Verify it" },
    },
  ];

  type FeaturedItem = {
    slug: string;
    src: string;
    title: string;
    artist: string;
    artistUrl: string | null;
    tone?: "light" | "dark";
  };

  let featured = $state<FeaturedItem | null>(null);

  // What the send panel holds, for the layout around it.
  const hasFiles = $derived(uploadStore.files.length > 0);
  const isSuccess = $derived(uploadStore.status === "complete" && !!uploadStore.shareUrl);

  // Gates the modal out of the prerendered homepage; its copy would
  // otherwise ship in a closed <dialog> on the primary SEO target.
  let supportMounted = $state(false);
  let supportOpen = $state(false);
  let supportPillVisible = $state(false);

  onMount(async () => {
    try {
      const res = await fetch("/featured/manifest.json", { cache: "no-cache" });
      if (!res.ok) return;
      const data = (await res.json()) as { items: FeaturedItem[] };
      if (Array.isArray(data.items) && data.items.length > 0) {
        const idx = Math.floor(Math.random() * data.items.length);
        featured = data.items[idx];
      }
    } catch {
      // Manifest fetch is best-effort; page renders fine without art.
    }
  });

  // Read once on mount so the ask lands on a visit after a completed
  // transfer, never on top of the share link the user came to copy.
  onMount(() => {
    supportMounted = true;
    // Asking for support and offering paid plans at once sends two
    // messages. Once the plans are announced, the ask moves to the footer.
    supportOpen = !PORTALS_ANNOUNCED && shouldAutoOpenPrompt();
    supportPillVisible = !PORTALS_ANNOUNCED && hasDismissedPrompt();
  });

  // Dismissing and clicking through both mean "do not ask again"; the pill
  // stays as the way back in.
  function closeSupport() {
    markPromptDismissed();
    supportOpen = false;
    supportPillVisible = true;
  }


</script>

<Seo
  title={PAGE_TITLE}
  description={PAGE_DESCRIPTION}
  path="/"
  alternates={[
    { locale: "en", path: "/" },
    { locale: "nl", path: "/nl" },
  ]}
/>

<svelte:head>
  {@html `<script type="application/ld+json">${JSON.stringify(homeSchema).replace(/</g, "\\u003c")}</script>`}
</svelte:head>

<!-- -mt-14 pulls the image behind the sticky nav so the glass effect actually sees through to artwork. -->

<section class="relative -mt-14 overflow-hidden">

  <!-- Empty, the whole hero is one screen: words, wall and label, no scrolling.
       With files queued the panel is taller and the page may grow. -->
  <div
    class={cn(
      "relative max-w-6xl mx-auto px-4 sm:px-6 pt-[4.5rem] sm:pt-20 pb-3 flex flex-col min-h-[100svh]",
      !hasFiles && !isSuccess && "sm:h-[100svh] sm:min-h-[38rem]",
    )}
  >
    <div class="mx-auto flex max-w-2xl shrink-0 flex-col items-center gap-2.5 sm:gap-3 text-center">
        <!-- On a phone the panes below sit under the fold, so the newest thing is named up here. -->
        {#if newest}
          <a
            href={newest.href}
            class="inline-flex sm:hidden items-center gap-2.5 rounded-full border border-border bg-card py-1 pl-1 pr-3.5 text-sm text-foreground transition-colors duration-200 ease-out hover:bg-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <span class="rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary-foreground">New</span>
            {newest.pill}
          </a>
        {/if}
        {#if supportPillVisible}
          <div class="flex justify-center">
            <button
              type="button"
              onclick={() => (supportOpen = true)}
              class="inline-flex items-center gap-2 rounded-full bg-background/85 backdrop-blur-md border border-border/70 px-3.5 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-background hover:cursor-pointer transition-colors duration-200 ease-out focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span class="size-1.5 rounded-full bg-primary" aria-hidden="true"></span>
              Keep Tessil alive
            </button>
          </div>
        {/if}
        <h1 class="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-foreground leading-none" style="letter-spacing: -0.035em">
          Send anything.
          <br />
          We see nothing.
        </h1>
        <p class="max-w-lg text-base text-muted-foreground leading-snug">
          End-to-end encrypted in your browser. The key never
          reaches our server.
        </p>
        <p class="hidden sm:block text-sm text-muted-foreground/80">
          Drop a file in the panel - or anywhere on this page.
        </p>
    </div>

    <!-- The wall: this month's artwork, with the panel hung on it. -->
    <div
      class={cn(
        "relative mt-5 sm:mt-6 flex flex-1 flex-wrap items-start justify-between gap-4 sm:gap-6 rounded-2xl bg-muted bg-cover bg-center p-3 sm:p-6 lg:p-8",
        (hasFiles || isSuccess) && "sm:min-h-[39rem]",
      )}
      style={featured ? `background-image: url('${featured.src}')` : undefined}
    >

      <SendPanel />

      {#if features.length > 0 && !hasFiles}
        <FeatureAccordion {features} class="self-end w-full sm:w-[30rem]" />
      {/if}
    </div>

    {#if featured}
      <div class="mt-2 flex shrink-0 flex-wrap justify-between gap-x-6 gap-y-0.5 px-1 text-xs text-muted-foreground">
        <p>
          <span class="font-medium text-foreground">{featured.artist}</span>, from
          {#if featured.artistUrl}
            <TextLink href={featured.artistUrl} target="_blank" rel="noopener noreferrer">{featured.title}</TextLink>
          {:else}
            {featured.title}
          {/if}
        </p>
        <p>On this wall this month.</p>
      </div>
    {/if}
  </div>

</section>

<div class="bg-background">
  <section aria-labelledby="how-title" class="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
    <h2 id="how-title" class="sr-only">How it works</h2>
    <ul class="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
      {#each steps as step (step.title)}
        <li class="space-y-2 border-t border-border pt-5">
          <h3 class="text-lg font-semibold tracking-tight text-foreground">{step.title}</h3>
          <p class="text-sm leading-relaxed text-muted-foreground">
            {step.body}
            {#if step.link}
              <TextLink href={step.link.href} class="text-primary">{step.link.label}</TextLink>
            {/if}
          </p>
        </li>
      {/each}
    </ul>
  </section>

  {#if PORTALS_ANNOUNCED}
    <section
      id="portals"
      aria-labelledby="portals-title"
      class="border-t border-border scroll-mt-20"
    >
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 grid gap-12 lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-center">
        <div class="space-y-5">
          <h2 id="portals-title" class="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground leading-[1.08]">
            Now it works both ways.
          </h2>
          <p class="max-w-xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            A portal is a link you hand to the people you work with. They see what you need
            and send it, without an account. It is encrypted in their browser, so what arrives
            can be opened by you and nobody else, us included.
          </p>
          <ul class="space-y-2.5 text-sm text-foreground">
            {#each ["A checklist that shows what is still missing", "Works on a phone, no account for the sender", "Deleted automatically after 30 days, or 90 on Max"] as point (point)}
              <li class="flex items-center gap-2.5">
                <IconCheckRegular class="size-4 shrink-0 text-primary" />
                {point}
              </li>
            {/each}
          </ul>
          <div class="flex flex-wrap items-center gap-x-4 gap-y-3 pt-2">
            <Button href={auth.user ? "/dashboard/portals" : "/pricing"} fullWidth={false}>
              {auth.user ? "Open your portals" : "See the plans"}
            </Button>
            <p class="text-sm text-muted-foreground">
              You set portals up in your account. Sending stays free.
              <TextLink href="/portals">Take the tour</TextLink>
            </p>
          </div>
        </div>

        <!-- What the sender sees. An illustration, not a control. -->
        <div aria-hidden="true" class="rounded-xl border border-border bg-card p-6 shadow-sm space-y-3.5">
          <p class="text-xs text-muted-foreground">Send files to</p>
          <p class="text-xl font-semibold tracking-tight text-foreground">Studio North</p>
          <div class="flex justify-between border-t border-border pt-3.5 text-xs text-muted-foreground">
            <span>What is needed</span>
            <span>2 of 3 added</span>
          </div>
          {#each [{ label: "Signed contract", file: "contract-signed.pdf" }, { label: "Logo files", file: "logo.zip" }] as row (row.label)}
            <div class="flex items-center gap-2.5 rounded-md border border-border px-3.5 py-2.5 text-sm">
              <IconCheckRegular class="size-4 shrink-0 text-success-foreground" />
              <span class="flex-1 text-foreground">{row.label}</span>
              <span class="text-xs text-muted-foreground">{row.file}</span>
            </div>
          {/each}
          <div class="flex items-center gap-2.5 rounded-md border border-dashed border-border px-3.5 py-2.5 text-sm text-muted-foreground">
            <span class="size-4 shrink-0 rounded-full border border-dashed border-warning"></span>
            <span class="flex-1">Invoice details</span>
            <span class="text-xs font-medium text-foreground">Choose file</span>
          </div>
          <div class="rounded-md bg-primary py-2.5 text-center text-sm font-medium text-primary-foreground">
            Send 2 files
          </div>
        </div>
      </div>
    </section>
  {/if}

  {#if FORMS_ANNOUNCED}
    <section id="forms" aria-labelledby="forms-title" class="border-t border-border scroll-mt-20">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 grid gap-12 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:items-center">
        <!-- The editor at work, recorded. Plays while it is in view. -->
        <div class="order-last overflow-hidden rounded-xl border border-border bg-card shadow-sm lg:order-first">
          <video
            use:playInView
            class="block h-auto w-full"
            poster="/featured/forms-editor.jpg"
            width="1600"
            height="1000"
            muted
            loop
            playsinline
            preload="none"
            aria-label="The form editor: questions are added, then the form is filled in and sent."
          >
            <source src="/featured/forms-editor.mp4" type="video/mp4" />
          </video>
        </div>
        <div class="space-y-5">
          <h2 id="forms-title" class="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground leading-[1.08]">
            Ask anything. Only you read the answers.
          </h2>
          <p class="max-w-xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            A form is a link with your questions on it. The questions are encrypted in your
            browser and each answer in theirs, so we can read neither. Together the answers add
            up to a summary only you see.
          </p>
          <ul class="space-y-2.5 text-sm text-foreground">
            {#each ["Seven kinds of question, files among them", "A summary per question, and an export to a spreadsheet", "No account for the people who answer"] as point (point)}
              <li class="flex items-center gap-2.5">
                <IconCheckRegular class="size-4 shrink-0 text-primary" />
                {point}
              </li>
            {/each}
          </ul>
          <div class="flex flex-wrap items-center gap-x-4 gap-y-3 pt-2">
            <Button href="/forms/try" fullWidth={false}>Try the editor</Button>
            <p class="text-sm text-muted-foreground">
              No account needed to try it.
              <TextLink href="/forms">Take the tour</TextLink>
            </p>
          </div>
        </div>
      </div>
    </section>
  {/if}

  {#if ACCESS_KEYS_ANNOUNCED}
    <section id="terminal" aria-labelledby="terminal-title" class="border-t border-border scroll-mt-20">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center">
        <div class="space-y-5">
          <h2 id="terminal-title" class="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground leading-[1.08]">
            No browser needed.
          </h2>
          <p class="max-w-xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            The same encrypted transfers and portals from your terminal, your scripts and your
            AI assistant. The tool signs in with a key of its own, never your password, and an
            assistant that sends a file for you never sees the link.
          </p>
          <ul class="space-y-2.5 text-sm text-foreground">
            {#each ["Open source, on macOS and Linux", "Pull what arrived in a portal into folders", "One access key with every account, the free one too"] as point (point)}
              <li class="flex items-center gap-2.5">
                <IconCheckRegular class="size-4 shrink-0 text-primary" />
                {point}
              </li>
            {/each}
          </ul>
          <div class="flex flex-wrap items-center gap-x-4 gap-y-3 pt-2">
            <Button href="/cli" fullWidth={false}>Meet the tool</Button>
            <p class="text-sm text-muted-foreground">
              <code class="font-mono text-foreground">brew install tessil-app/tap/tessil</code>
            </p>
          </div>
        </div>

        <!-- The tool at work. An illustration, not a control. -->
        <div aria-hidden="true" class="overflow-x-auto rounded-xl bg-[#07080d] p-5 font-mono text-[0.8125rem] leading-relaxed shadow-sm sm:p-6 sm:text-sm">
          <p class="whitespace-pre text-white"><span class="pr-[1ch] text-white/40">$</span>tessil send report.pdf</p>
          <p class="whitespace-pre text-emerald-300">Sent report.pdf (2.4 MB), encrypted on this machine.</p>
          <p class="whitespace-pre text-white/80">The link works for 7 days.</p>
          <p class="whitespace-pre text-[#9db4ff]">https://tessil.app/d/8sKq2ZpLw4…#rT9c…</p>
          <p class="mt-4 whitespace-pre text-white"><span class="pr-[1ch] text-white/40">$</span>tessil pull "Tax 2025"</p>
          <p class="whitespace-pre text-white/80">Tax 2025/7F3A-91C2/passport.jpg</p>
          <p class="whitespace-pre text-white/80">Tax 2025/7F3A-91C2/annual-statement.pdf</p>
          <p class="whitespace-pre text-emerald-300">Tax 2025: 1 delivery saved to ./Tax 2025, 4 already there.</p>
        </div>
      </div>
    </section>
  {/if}

  {#if PORTALS_ANNOUNCED}
    <section aria-labelledby="pricing-title" class="border-t border-border">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 space-y-10">
        <div class="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
          <div class="max-w-xl space-y-3">
            <h2 id="pricing-title" class="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground leading-[1.08]">
              Pay for more. Never for privacy.
            </h2>
            <p class="text-base sm:text-lg leading-relaxed text-muted-foreground">
              Sending is free, encrypted, and stays that way. A plan adds
              {FORMS_ANNOUNCED ? "portals and forms" : "portals"}.
            </p>
          </div>
          <TextLink href="/pricing" class="text-primary">See what each plan includes</TextLink>
        </div>
        <PlanCards compact />
      </div>
    </section>
  {/if}

  <div class="max-w-6xl mx-auto px-4 sm:px-6 pb-16 sm:pb-20 border-t border-border pt-16 sm:pt-24">
    <!-- A heading on the left, the text in a readable column on the right. -->
    <section class="grid gap-x-12 gap-y-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <h2 class="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground leading-tight">
        Tessil, explained
      </h2>
      <div class="max-w-2xl space-y-4 text-base text-muted-foreground leading-relaxed">
        <p>
          Tessil is an end-to-end encrypted file transfer service.
          Files are scrambled in your browser before they leave your
          device. The decryption key lives in the URL fragment of the
          share link, the part after <code>#</code> that browsers
          don't send to servers. We never see your files, your
          filenames, or your keys.
        </p>
        <p>
          You don't have to take that on faith.
          <a href="/verify" class="text-primary underline underline-offset-2">Verify it yourself</a>
          walks through four checks you can run against this site in about two
          minutes, using the developer tools already in your browser.
        </p>
        <p>
          Anonymous transfers expire in hours; signed-in transfers
          can run longer and stay in your list of transfers. Password
          protection adds a second factor independent of the link.
          Read more about the security model on the
          <a href="/security" class="text-primary underline underline-offset-2">security page</a>.
        </p>
        <p>
          New to encrypted transfer? See how Tessil compares to
          <a href="/compare" class="text-primary underline underline-offset-2">WeTransfer, Proton Drive, and other tools</a>.
        </p>
        <p>
          {#if PORTALS_ANNOUNCED}
            Built and run by one person. Sending is free; the paid plans, for receiving, are
            what keeps it running.
          {:else}
            Built and run by one person, and free to use. If Tessil saves you a
            headache, you can support the project. The link's in the footer below.
          {/if}
        </p>
      </div>
    </section>

    <section class="mt-16 sm:mt-24 pt-16 sm:pt-24 border-t border-border grid gap-x-12 gap-y-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <h2 class="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground leading-tight">
        Questions
      </h2>
      <div class="max-w-2xl space-y-10">
        <div class="divide-y divide-border border-y border-border text-base">
        <details class="group py-5">
          <summary class="flex cursor-pointer items-center justify-between gap-4 text-foreground font-medium list-none [&::-webkit-details-marker]:hidden">
            Is Tessil really end-to-end encrypted?
            <span class="text-muted-foreground transition-transform duration-200 ease-out group-open:rotate-45 shrink-0" aria-hidden="true">+</span>
          </summary>
          <p class="mt-3 text-muted-foreground leading-relaxed">
            Yes. Your files are encrypted in your browser with AES-GCM before they upload, and the decryption key lives in the share link, never on our servers. We can't read your files, your filenames, or your keys.
          </p>
        </details>
        <details class="group py-5">
          <summary class="flex cursor-pointer items-center justify-between gap-4 text-foreground font-medium list-none [&::-webkit-details-marker]:hidden">
            Do I need an account to send files?
            <span class="text-muted-foreground transition-transform duration-200 ease-out group-open:rotate-45 shrink-0" aria-hidden="true">+</span>
          </summary>
          <p class="mt-3 text-muted-foreground leading-relaxed">
            No. You can send and receive files anonymously. A free account is optional and just adds a list to manage the transfers you create. It doesn't change how files are encrypted.
          </p>
        </details>
        <details class="group py-5">
          <summary class="flex cursor-pointer items-center justify-between gap-4 text-foreground font-medium list-none [&::-webkit-details-marker]:hidden">
            How is Tessil different from WeTransfer or Dropbox?
            <span class="text-muted-foreground transition-transform duration-200 ease-out group-open:rotate-45 shrink-0" aria-hidden="true">+</span>
          </summary>
          <p class="mt-3 text-muted-foreground leading-relaxed">
            Those services can read what you upload. Tessil can't, because encryption happens in your browser before anything is sent. Tessil is also open source, EU-hosted, and shows no ads.
            <a href="/compare" class="text-primary underline underline-offset-2">See the full comparison</a>.
          </p>
        </details>
        <details class="group py-5">
          <summary class="flex cursor-pointer items-center justify-between gap-4 text-foreground font-medium list-none [&::-webkit-details-marker]:hidden">
            How large can the files be?
            <span class="text-muted-foreground transition-transform duration-200 ease-out group-open:rotate-45 shrink-0" aria-hidden="true">+</span>
          </summary>
          <p class="mt-3 text-muted-foreground leading-relaxed">
            Large files are supported through multi-part uploads, so big transfers stay reliable even on slower connections. Signed-in transfers allow larger sizes than anonymous ones.
          </p>
        </details>
        <details class="group py-5">
          <summary class="flex cursor-pointer items-center justify-between gap-4 text-foreground font-medium list-none [&::-webkit-details-marker]:hidden">
            Is Tessil free?
            <span class="text-muted-foreground transition-transform duration-200 ease-out group-open:rotate-45 shrink-0" aria-hidden="true">+</span>
          </summary>
          <p class="mt-3 text-muted-foreground leading-relaxed">
{#if PORTALS_ANNOUNCED}
              Sending is free, with or without an account, and stays that way. Paid plans add ways to receive: {FORMS_ANNOUNCED ? "portals for files and forms for answers" : "portals, links where people send files to you"}. No ads and no selling of data on any plan, and the code is open under the AGPL-3.0 licence.
              <a href="/pricing" class="text-primary underline underline-offset-2">See the plans</a>.
            {:else}
              Yes, completely free, with no ads and no selling of data. Tessil is open source under the AGPL-3.0 licence, so anyone can audit exactly how it handles encryption.
            {/if}
          </p>
        </details>
        <details class="group py-5">
          <summary class="flex cursor-pointer items-center justify-between gap-4 text-foreground font-medium list-none [&::-webkit-details-marker]:hidden">
            How long do transfers last?
            <span class="text-muted-foreground transition-transform duration-200 ease-out group-open:rotate-45 shrink-0" aria-hidden="true">+</span>
          </summary>
          <p class="mt-3 text-muted-foreground leading-relaxed">
            Transfers expire automatically based on the time limit and download count you choose. Once a transfer expires, the encrypted data is deleted.
          </p>
        </details>
      </div>

        <!-- A second opinion. Plain outbound links; the question is shown in full. -->
        <div class="space-y-4">
          <h3 class="text-lg font-semibold tracking-tight text-foreground">Or ask an AI</h3>
          <p class="text-base leading-relaxed text-muted-foreground">
            You don't have to take our answers. Put the question to an assistant that has no
            stake in it. This is the exact wording it gets, and you can change it first:
          </p>
          <blockquote class="rounded-lg bg-card p-4 text-sm leading-relaxed text-foreground">
            {ASK_PROMPT}
          </blockquote>
          <div class="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            {#each askLinks as link (link.label)}
              <TextLink href={link.href} target="_blank" rel="noopener noreferrer" class="text-primary">
                Ask {link.label}
              </TextLink>
            {/each}
            <TextLink onclick={copyAskPrompt} class="text-muted-foreground">
              {askCopied ? "Copied" : "Copy the question"}
            </TextLink>
          </div>
          <p class="text-xs text-muted-foreground">
            These open another company's site with the question filled in. Nothing about you
            is sent along by us.
          </p>
        </div>
      </div>
    </section>

    <div class="pt-16">
      <SiteFooter current="home" />
    </div>
  </div>
</div>

{#if supportMounted}
  <SupportModal open={supportOpen} onClose={closeSupport} />
{/if}

