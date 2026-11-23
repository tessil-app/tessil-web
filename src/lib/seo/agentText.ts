// Plain-text versions of what the site says, for AI agents and answer
// engines: /llms.txt (an index), /llms-full.txt (everything in one file) and
// a Markdown copy of every comparison. Built from the same data as the pages,
// so they cannot drift from them.

import type { Choose } from "$lib/compare/choose";
import { CHOOSE } from "$lib/compare/choose";
import { LAST_VERIFIED, LAST_VERIFIED_ISO, comparisons, type Cell, type Comparison } from "$lib/compare/comparisons";
import { LAST_VERIFIED_NL, comparisonsNl } from "$lib/compare/comparisons.nl";
import { RECEIVING_VERIFIED_ISO } from "$lib/compare/receiving";
import { FORMS_ANNOUNCED, PORTALS_ANNOUNCED } from "$lib/config/launch";
import { PLANS } from "$lib/config/plans";
import { SITE_URL } from "$lib/config/site";
import type { Locale } from "$lib/i18n/locale";

const url = (path: string) => `${SITE_URL}${path}`;

/** Where a comparison's Markdown copy lives. */
export function comparisonMarkdownPath(slug: string): string {
  return `/compare/${slug}.md`;
}

function cell(v: Cell, locale: Locale): string {
  if (typeof v === "boolean") return v ? (locale === "nl" ? "Ja" : "Yes") : locale === "nl" ? "Nee" : "No";
  return v.replace(/\|/g, "/");
}

const WORDS = {
  en: {
    feature: "Feature",
    verified: (who: string, date: string) =>
      `Details about ${who} were last checked in ${date}, from its own pages. Check its site for anything that may have changed.`,
    choose: (who: string) => `Choose ${who} if`,
    chooseTessil: "Choose Tessil if",
    verdict: "The honest verdict",
    faq: "Frequently asked questions",
    page: "Web page",
    checked: "Last verified",
  },
  nl: {
    feature: "Kenmerk",
    verified: (who: string, date: string) =>
      `Gegevens over ${who} zijn voor het laatst gecontroleerd in ${date}, op de eigen pagina's. Kijk op de site voor wat er sindsdien veranderd kan zijn.`,
    choose: (who: string) => `Kies ${who} als`,
    chooseTessil: "Kies Tessil als",
    verdict: "Het eerlijke oordeel",
    faq: "Veelgestelde vragen",
    page: "Webpagina",
    checked: "Laatst gecontroleerd",
  },
};

/** One comparison as Markdown, in the language of its data. */
export function comparisonMarkdown(
  c: Comparison,
  opts: { locale: Locale; pagePath: string; enSlug: string; verified: string; depth?: number },
): string {
  const w = WORDS[opts.locale];
  // Heading levels, one deeper when nested in llms-full.txt.
  const h = (n: number) => "#".repeat(n + (opts.depth ?? 0));
  const choose: Choose | undefined = CHOOSE[opts.enSlug]?.[opts.locale];
  const iso = c.kind && c.kind !== "send" ? RECEIVING_VERIFIED_ISO : LAST_VERIFIED_ISO;
  return [
    `${h(1)} ${c.heading}`,
    "",
    `> ${c.summary}`,
    "",
    `${w.page}: ${url(opts.pagePath)}  `,
    `${w.checked}: ${iso}`,
    "",
    ...c.intro.flatMap((p) => [p, ""]),
    `| ${w.feature} | Tessil | ${c.competitor} |`,
    "| --- | --- | --- |",
    ...c.rows.map((r) => `| ${r.label} | ${cell(r.tessil, opts.locale)} | ${cell(r.competitor, opts.locale)} |`),
    "",
    w.verified(c.competitor, opts.verified),
    "",
    ...(choose
      ? [
          `${h(2)} ${w.choose(c.competitor)}`,
          "",
          ...choose.them.map((x) => `- ${x}`),
          "",
          `${h(2)} ${w.chooseTessil}`,
          "",
          ...choose.tessil.map((x) => `- ${x}`),
          "",
        ]
      : []),
    `${h(2)} ${w.verdict}`,
    "",
    ...c.verdict.flatMap((p) => [p, ""]),
    `${h(2)} ${w.faq}`,
    "",
    ...c.faq.flatMap((f) => [`${h(3)} ${f.q}`, "", f.a, ""]),
  ].join("\n");
}

/** Every comparison the build shows, in both languages, with its addresses. */
export function allComparisonDocs() {
  const en = comparisons.map((c) => ({
    slug: c.slug,
    locale: "en" as const,
    comparison: c,
    pagePath: `/compare/${c.slug}`,
    enSlug: c.slug,
    verified: c.verified ?? LAST_VERIFIED,
  }));
  const nl = comparisonsNl.map((c) => ({
    slug: c.slug,
    locale: "nl" as const,
    comparison: c,
    pagePath: `/nl/vergelijken/${c.slug}`,
    enSlug: c.enSlug,
    verified: c.verified ?? LAST_VERIFIED_NL,
  }));
  return [...en, ...nl];
}

function planLines(): string[] {
  return PLANS.map((p) => {
    const price = p.price ? `€${p.price.monthly} a month or €${p.price.annual} a year` : "free";
    return `- **${p.name}** (${price}): ${p.features.join("; ")}.`;
  });
}

const ABOUT = [
  "Tessil is end-to-end encrypted file transfer, built and hosted in the EU. Files are encrypted in the sender's browser before upload; the key for a transfer lives in the link's fragment (the part after #), which browsers never send to a server. Tessil stores only ciphertext it cannot read.",
  "",
  "Key facts:",
  "",
  "- Sending is free, with or without an account. Without an account a link lasts up to 3 days; with a free account up to 7.",
  "- Encryption: AES-256-GCM in 1 MiB chunks, in the browser. An optional password wraps the key in the link.",
  "- The server never sees file contents, file names, transfer titles, portal or form names, notes, questions or answers.",
  "- Hosting: Hetzner in Germany (application), Scaleway in the Netherlands (database), encrypted files on Cloudflare R2 restricted to the EU jurisdiction, email via Scaleway (France). Cloudflare is a US company and also runs the CDN; it only ever holds ciphertext and never the key.",
  "- No analytics, no ads, no third-party scripts on pages that carry a key. One functional cookie when signed in.",
  "- Open source under AGPL-3.0: https://github.com/tessil-app",
  "- Built in the Netherlands. The site is in English and Dutch.",
  ...(PORTALS_ANNOUNCED
    ? [
        "- Portals (paid plans): a lasting link where clients send you files, encrypted in their browser to a key only the portal's members hold. Optional checklist, closing date, password, logo, and files sent back. Senders need no account.",
      ]
    : []),
  ...(FORMS_ANNOUNCED
    ? [
        "- Forms (paid plans): questions people answer through a link; questions and answers are encrypted end to end, including file answers. Summary and CSV export are made in the owner's browser.",
      ]
    : []),
  "- A command-line tool and MCP server (`npx tessil`) send and fetch files without a browser; it never gives an AI assistant the link.",
  "",
  "What Tessil does not do: general file storage, editing or previewing files, organisations or seats. Limits: up to 1 GB per transfer on Free, 5 GB per file on paid plans; uploads must finish within 4 hours.",
];

const PAGES: { title: string; path: string; about: string }[] = [
  { title: "Send a file", path: "/", about: "the homepage, which is also the sending tool" },
  { title: "Security", path: "/security", about: "how the encryption works and what the server can see" },
  { title: "Verify it yourself", path: "/verify", about: "how to check the claims in the browser and the source" },
  { title: "What we store", path: "/what-we-store", about: "every piece of data an account or transfer leaves on the server" },
  { title: "Pricing", path: "/pricing", about: "plans, limits and cancelling" },
  ...(PORTALS_ANNOUNCED ? [{ title: "Portals", path: "/portals", about: "receiving files from clients" }] : []),
  ...(FORMS_ANNOUNCED ? [{ title: "Forms", path: "/forms", about: "end-to-end encrypted forms" }] : []),
  { title: "Command-line tool", path: "/cli", about: "the CLI and MCP server" },
  { title: "Privacy policy", path: "/privacy", about: "" },
  { title: "Terms", path: "/terms", about: "" },
];

export function llmsTxt(): string {
  const docs = allComparisonDocs();
  return [
    "# Tessil",
    "",
    "> End-to-end encrypted file transfer, hosted in the EU. Send files, receive them through portals, and collect answers with forms, all encrypted in the browser so the service cannot read them. Open source (AGPL-3.0), free to send.",
    "",
    ...ABOUT,
    "",
    "## Pages",
    "",
    ...PAGES.map((p) => `- [${p.title}](${url(p.path)})${p.about ? `: ${p.about}` : ""}`),
    "",
    "## Plans",
    "",
    ...planLines(),
    "",
    "## Comparisons",
    "",
    "Each comparison has a Markdown copy with the same content as the page.",
    "",
    ...docs
      .filter((d) => d.locale === "en")
      .map((d) => `- [${d.comparison.heading}](${url(comparisonMarkdownPath(d.slug))}): ${d.comparison.summary}`),
    "",
    "## In Dutch",
    "",
    `- [Tessil in het Nederlands](${url("/nl")})`,
    ...docs
      .filter((d) => d.locale === "nl")
      .map((d) => `- [${d.comparison.heading}](${url(comparisonMarkdownPath(d.slug))}): ${d.comparison.summary}`),
    "",
    "## Optional",
    "",
    `- [Everything above, with every comparison in full](${url("/llms-full.txt")})`,
    "",
  ].join("\n");
}

export function llmsFullTxt(): string {
  return [
    "# Tessil",
    "",
    ...ABOUT,
    "",
    "## Plans",
    "",
    ...planLines(),
    "",
    ...allComparisonDocs().flatMap((d) => [
      "---",
      "",
      comparisonMarkdown(d.comparison, { ...d, depth: 1 }),
      "",
    ]),
  ].join("\n");
}
