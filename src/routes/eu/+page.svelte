<script lang="ts">
  import * as Frame from "$lib/components/frame";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import PageLayout from "$lib/components/PageLayout.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import SiteFooter from "$lib/components/SiteFooter.svelte";
  import { SITE_URL } from "$lib/config/site";

  const PAGE_TITLE = "EU hosting and GDPR: where your data lives - Tessil";
  const PAGE_DESCRIPTION =
    "Where every byte of a Tessil transfer is stored, which EU processors handle it, what Cloudflare can and cannot see, and what GDPR means for a zero-knowledge file transfer service.";

  const sectionClass = "space-y-3";
  const headingClass = "text-lg font-semibold text-foreground";
  const bodyClass = "text-muted-foreground";
  const linkClass = "text-primary underline underline-offset-2";
  const listClass = "list-disc pl-5 space-y-1.5 text-muted-foreground";

  const components = [
    {
      what: "Application server",
      who: "Hetzner",
      where: "Germany",
      holds: "Runs the API and its logs. Sees requests, never file contents.",
    },
    {
      what: "Database",
      who: "Scaleway Managed PostgreSQL",
      where: "Amsterdam, Netherlands",
      holds: "Account records, sessions, transfer metadata: size, expiry, download count.",
    },
    {
      what: "Encrypted file storage",
      who: "Cloudflare R2",
      where: "EU jurisdiction (objects stay in EU data centres)",
      holds: "Ciphertext only. Files, filenames and titles are encrypted before upload.",
    },
    {
      what: "Transactional email",
      who: "Scaleway",
      where: "France",
      holds: "Your email address and the sign-in link, if you have an account. Never marketing.",
    },
    {
      what: "CDN and DDoS protection",
      who: "Cloudflare",
      where: "Edge, worldwide",
      holds: "Request metadata and your session cookie. Never the decryption key, which is in the link fragment and is not transmitted.",
    },
  ];

  const faq = [
    {
      q: "Is Tessil GDPR compliant?",
      a: "Tessil is operated from the Netherlands and every processor is listed in the privacy policy with what it receives and where it sits. File contents never reach us in readable form, which keeps the personal data we hold down to account and transfer metadata. You can delete an account and everything attached to it from the dashboard at any time.",
    },
    {
      q: "Does EU hosting make a file transfer private?",
      a: "No. Hosting decides which laws and courts apply to the data a provider holds. Encryption decides whether that data is readable in the first place. A service can be hosted in the EU and still read every file you upload, and most of them can. Tessil does both: EU infrastructure, and encryption in your browser so the servers only ever store ciphertext.",
    },
    {
      q: "Cloudflare is a US company. Does that undo the EU hosting?",
      a: "Not for your files. R2 is pinned to the EU jurisdiction and only ever holds ciphertext encrypted in your browser with a key that never leaves the link. A legal order served on Cloudflare produces encrypted blobs and request metadata, not file contents. We say this plainly rather than claiming to be beyond the reach of US law, because we are not.",
    },
    {
      q: "Where is my data stored if I use Tessil from outside the EU?",
      a: "In the same places. There is one deployment, and it is in the EU regardless of where you upload from. The only thing that follows you is Cloudflare's edge, which terminates TLS close to you and forwards the request to the origin in Germany.",
    },
    {
      q: "Do I need to accept cookies?",
      a: "No banner, because there is nothing to consent to. Tessil sets one functional session cookie when you sign in and nothing else. There are no analytics, advertising or third-party scripts on any page.",
    },
  ];

  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Hosted in the EU", item: `${SITE_URL}/eu` },
        ],
      },
      {
        "@type": "FAQPage",
        inLanguage: "en",
        mainEntity: faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  }).replace(/</g, "\\u003c");
</script>

<Seo title={PAGE_TITLE} description={PAGE_DESCRIPTION} path="/eu" />

<svelte:head>
  {@html `<script type="application/ld+json">${jsonLd}</script>`}
</svelte:head>

<PageLayout width="3xl">
  <PageHeader
    title="Hosted in the EU, by design"
    tagline="Encryption keeps your files private. Jurisdiction decides what happens to everything else. Here is where each byte of a Tessil transfer lives, and what that does and does not protect you from."
  />

  <Frame.Root>
    <Frame.Panel>
      <div class="space-y-8">
        <section class={sectionClass}>
          <p class={bodyClass}>
            "EU-hosted" has become a checkbox on comparison sites, and like most
            checkboxes it hides more than it shows. A service can run entirely
            on European servers and still read every file that passes through
            it. Another can be hosted anywhere and be technically unable to.
            The two properties are independent, and you should want both.
          </p>
          <p class={bodyClass}>
            Tessil is an end-to-end encrypted file transfer service built and
            operated from the Netherlands. Files are encrypted in your browser
            before upload and the key stays in the share link, so our servers
            only ever hold ciphertext. That is the part that protects your
            files. This page is about the other part: the infrastructure, the
            companies behind it, and the metadata that encryption cannot hide.
          </p>
        </section>

        <section class={sectionClass}>
          <h2 class={headingClass}>Where each byte lives</h2>
          <p class={bodyClass}>
            There is one deployment, and it is in the EU no matter where you
            upload from. Every processor is named here and in the
            <a href="/privacy" class={linkClass}>privacy policy</a>, with what
            it receives.
          </p>
          <div class="overflow-x-auto rounded-md border border-border bg-muted/30">
            <table class="w-full border-collapse text-left text-sm">
              <caption class="sr-only">Tessil infrastructure components, providers and locations</caption>
              <thead>
                <tr class="border-b border-border">
                  <th scope="col" class="py-3 px-4 font-medium text-muted-foreground">Component</th>
                  <th scope="col" class="py-3 px-4 font-medium text-muted-foreground">Provider</th>
                  <th scope="col" class="py-3 px-4 font-medium text-muted-foreground">Location</th>
                  <th scope="col" class="py-3 px-4 font-medium text-muted-foreground">What it holds</th>
                </tr>
              </thead>
              <tbody>
                {#each components as c (c.what)}
                  <tr class="border-b border-border/50 last:border-0 align-top">
                    <th scope="row" class="py-3 px-4 font-normal text-foreground">{c.what}</th>
                    <td class="py-3 px-4 text-muted-foreground">{c.who}</td>
                    <td class="py-3 px-4 text-muted-foreground">{c.where}</td>
                    <td class="py-3 px-4 text-muted-foreground">{c.holds}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </section>

        <section class={sectionClass}>
          <h2 class={headingClass}>Encryption first, jurisdiction second</h2>
          <p class={bodyClass}>
            Most "secure" transfer services encrypt files in transit and at
            rest. That protects you against someone tapping the wire or
            stealing a disk. It does not protect you against the provider,
            because the provider holds the keys. Anyone who can compel the
            provider, or breach it, gets your files in the clear.
          </p>
          <p class={bodyClass}>
            Tessil moves the encryption into your browser. The key is generated
            on your device, used to encrypt every file, filename and title
            before the first byte is uploaded, and placed after the
            <code>#</code> in the share link. Browsers never send that part of
            a URL to any server. What arrives at our infrastructure is
            ciphertext, and what we can hand over is ciphertext.
          </p>
          <p class={bodyClass}>
            Jurisdiction still matters, for the data that encryption cannot
            hide. Our servers know that a transfer of a certain size was
            created at a certain time, how often it was downloaded and when it
            expired, and, for accounts, an email address. That metadata sits
            in Amsterdam and Germany, under GDPR, with retention periods
            written down in the privacy policy. That is what "hosted in the EU"
            buys you here: not secrecy for your files, which the maths already
            provides, but a known legal home for the little that remains.
          </p>
        </section>

        <section class={sectionClass}>
          <h2 class={headingClass}>The Cloudflare question</h2>
          <p class={bodyClass}>
            Cloudflare Inc. is headquartered in the United States. We use it
            for two things: R2 object storage for the encrypted files, and the
            CDN and DDoS layer in front of the site. Both deserve a plain
            answer rather than a footnote.
          </p>
          <ul class={listClass}>
            <li>
              R2 is restricted to the EU jurisdiction, so objects stay in EU
              data centres. It only ever holds ciphertext that was encrypted in
              your browser.
            </li>
            <li>
              The edge terminates TLS, so Cloudflare can see request metadata
              and your session cookie. It cannot see your decryption key,
              because the key is in the link fragment and is never transmitted.
            </li>
            <li>
              A legal order served on Cloudflare produces encrypted blobs and
              connection metadata. It does not produce file contents, filenames
              or titles, because nobody on the server side has the key.
            </li>
          </ul>
          <p class={bodyClass}>
            We do not claim to be beyond the reach of US law. We claim something
            narrower and checkable: your files are unreadable to every party in
            this table, including us.
          </p>
        </section>

        <section class={sectionClass}>
          <h2 class={headingClass}>What GDPR means for a zero-knowledge service</h2>
          <p class={bodyClass}>
            GDPR is about personal data a provider can read. Tessil is
            deliberately built to read as little as possible, which makes the
            compliance picture short.
          </p>
          <ul class={listClass}>
            <li>
              File contents, filenames and titles are never personal data in
              our hands, because they arrive encrypted with a key we do not
              have.
            </li>
            <li>
              What we do hold is listed in full on the
              <a href="/verify" class={linkClass}>verify page</a>: sizes,
              timestamps, download counts, expiry, and an email address if you
              created an account. We do not store IP addresses; sign-in events
              record only a derived country and network operator.
            </li>
            <li>
              Retention is fixed and short. Anonymous transfers are deleted
              after the window you chose, at most 72 hours. Accounts are deleted
              immediately and irreversibly from the dashboard, taking every
              transfer with them.
            </li>
            <li>
              No analytics, advertising or third-party scripts run on any page,
              so there is no cookie banner. One functional session cookie exists
              when you are signed in.
            </li>
            <li>
              Every processor is named with its location and what it receives.
              There are four. That list is the
              <a href="/privacy" class={linkClass}>privacy policy</a>, not an
              annex to it.
            </li>
          </ul>
        </section>

        <section class={sectionClass}>
          <h2 class={headingClass}>For businesses and practices</h2>
          <p class={bodyClass}>
            Tessil is free and has no business tier yet. If your organisation
            needs a data processing agreement, an EU hosting statement on
            letterhead, or an audit log of who sent what, say so at
            <a href="mailto:hello@tessil.app" class={linkClass}>hello@tessil.app</a>.
            Those requests are what shape the roadmap, and the answer today is
            an honest "not yet" rather than a promise.
          </p>
        </section>

        <section class={sectionClass}>
          <h2 class={headingClass}>Check it instead of trusting it</h2>
          <p class={bodyClass}>
            Everything above is a claim. The
            <a href="/verify" class={linkClass}>verify page</a> turns the
            important ones into four checks you can run against this site in
            about two minutes with your browser's developer tools: watch the key
            stay out of the network log, look at what we actually store, and
            see which domains the page talks to. The full source is public
            under AGPL-3.0.
          </p>
          <p class={bodyClass}>
            Wondering how the other European services handle this? The
            <a href="/compare/eu-encrypted-file-transfer" class={linkClass}
              >European encrypted file transfer comparison</a
            >
            sorts them by who encrypts in the browser and who holds the keys.
          </p>
        </section>

        <section class={sectionClass}>
          <h2 class={headingClass}>Frequently asked questions</h2>
          <div class="divide-y divide-border/60 border-y border-border/60 text-sm">
            {#each faq as item (item.q)}
              <details class="group py-4">
                <summary
                  class="flex cursor-pointer items-center justify-between gap-4 text-foreground font-medium list-none [&::-webkit-details-marker]:hidden"
                >
                  {item.q}
                  <span
                    class="text-muted-foreground transition-transform duration-200 ease-out group-open:rotate-45 shrink-0"
                    aria-hidden="true">+</span
                  >
                </summary>
                <p class="mt-2 text-muted-foreground leading-relaxed">{item.a}</p>
              </details>
            {/each}
          </div>
        </section>
      </div>
    </Frame.Panel>
  </Frame.Root>

  <SiteFooter />
</PageLayout>
