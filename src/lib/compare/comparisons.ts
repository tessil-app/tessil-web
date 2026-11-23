// Data for the /compare SEO pages. Tessil's column is exact; competitor
// columns use well-established facts and are stamped with LAST_VERIFIED - the
// pages show a "verify on the provider's site" note because rivals change
// pricing/features often. Keep claims fair and checkable: this is a
// privacy-principled, AGPL project, not a hit piece.

import { FORMS_ANNOUNCED, PORTALS_ANNOUNCED } from "$lib/config/launch";
import { RECEIVING_VERIFIED, RECEIVING_VERIFIED_ISO, receivingComparisons } from "./receiving";

/** A cell is a yes/no (rendered as a check/cross) or a short string. */
export type Cell = boolean | string;

export type FeatureRow = {
  label: string;
  tessil: Cell;
  competitor: Cell;
};

export type Faq = { q: string; a: string };

export type Comparison = {
  slug: string;
  /** Full competitor name. */
  competitor: string;
  /** Short label for cards + the table header. */
  shortName: string;
  /** <title> + og:title. */
  metaTitle: string;
  /** meta description + og:description. */
  metaDescription: string;
  /** H1. */
  heading: string;
  /** One-line summary for cards + the page tagline. */
  summary: string;
  /** Intro paragraphs. */
  intro: string[];
  /** Feature comparison rows. */
  rows: FeatureRow[];
  /** Honest verdict paragraphs. */
  verdict: string[];
  faq: Faq[];
  /** What is compared: sending (the default), portals or forms. */
  kind?: "send" | "portal" | "form";
  /** The main button, when it is not "send a file". `href` is the English address. */
  cta?: { label: string; href: string };
  /** When the competitor's details were last checked, when not LAST_VERIFIED. */
  verified?: string;
  /** The same date for structured data, as YYYY-MM-DD. */
  verifiedIso?: string;
};

/** Shown on every page so competitor facts are dated, not presented as eternal truth. */
export const LAST_VERIFIED = "November 2026";
/** The same, for structured data. */
export const LAST_VERIFIED_ISO = "2026-11-23";

// Tessil's column is identical across comparisons.
const TESSIL = {
  e2e: true,
  keyServer: true,
  noAccount: true,
  openSource: "Yes (AGPL-3.0)",
  hosting: "EU (Germany + Netherlands)",
  tracking: "None",
  price: "Free",
  expiry: true,
  password: true,
};

const sendComparisons: Comparison[] = [
  {
    slug: "wetransfer-alternative",
    competitor: "WeTransfer",
    shortName: "WeTransfer",
    metaTitle: "Encrypted WeTransfer alternative - Tessil",
    metaDescription:
      "Looking for a private, encrypted WeTransfer alternative? Tessil encrypts files in your browser and never sees your files or the key. Open source, EU-hosted, free.",
    heading: "Tessil vs WeTransfer",
    summary:
      "A private, end-to-end encrypted alternative to WeTransfer. Your files are unreadable to us by design.",
    intro: [
      "WeTransfer is the default way most people send big files: drop them in, share a link. It's convenient, but on the free and standard plans it isn't end-to-end encrypted - WeTransfer holds the keys, so the service (and anyone who compels it) can in principle access what you upload. WeTransfer lists end-to-end encryption on its Enterprise plan only, which starts at 50 seats. The free plan allows 3 GB or 10 transfers per 30 days with links that last 3 days, shows ads and runs analytics, and its terms drew criticism in 2025 over language that appeared to grant broad rights over uploaded content (later revised).",
      "Tessil is built for the case where that matters. Files are encrypted in your browser with AES-GCM before they ever leave your device, and the decryption key lives in the share link's URL fragment - the part after the # that browsers never send to a server. We store only ciphertext we can't read.",
      "It's open source (AGPL-3.0), hosted entirely in the EU, free, and needs no account to send.",
    ],
    rows: [
      { label: "End-to-end encrypted", tessil: TESSIL.e2e, competitor: "Enterprise plan only (50+ seats)" },
      { label: "Key never reaches the server", tessil: TESSIL.keyServer, competitor: "Not on free or standard plans" },
      { label: "Works without an account", tessil: TESSIL.noAccount, competitor: true },
      { label: "Free limits", tessil: "1 GB per transfer, 2 GB a month, links up to 7 days", competitor: "3 GB or 10 transfers per 30 days, links 3 days" },
      { label: "Open source", tessil: TESSIL.openSource, competitor: false },
      { label: "Hosting / jurisdiction", tessil: TESSIL.hosting, competitor: "EU (NL); owned by Bending Spoons" },
      { label: "Ads & third-party tracking", tessil: TESSIL.tracking, competitor: "Ads on the free tier" },
      { label: "Price", tessil: TESSIL.price, competitor: "Free tier + paid plans" },
      { label: "Link expiry & download limits", tessil: TESSIL.expiry, competitor: true },
      { label: "Password protection", tessil: TESSIL.password, competitor: true },
    ],
    verdict: [
      "If you just want to lob a file at someone and privacy isn't a concern, WeTransfer is fine and frictionless. If you'd rather the service physically can't read what you send - for client work, documents, anything sensitive - Tessil gives you that without giving up the simple link-based flow.",
      "The free limits are now close: WeTransfer allows 3 GB per 30 days, Tessil 1 GB per transfer and 2 GB a month. WeTransfer's paid plans send far larger files; Tessil's answer is end-to-end encryption on every plan, including the free one, and no ads.",
    ],
    faq: [
      {
        q: "Is WeTransfer end-to-end encrypted?",
        a: "Not on its free or standard paid plans: files are encrypted in transit and at rest with keys WeTransfer controls, so the service can access them. WeTransfer lists end-to-end encryption as a feature of its Enterprise plan, which needs at least 50 seats. Tessil encrypts in your browser and never receives the key, on every plan.",
      },
      {
        q: "Can Tessil send large files like WeTransfer?",
        a: "Up to 1 GB per transfer for free and 5 GB per file on paid plans. WeTransfer's paid plans go much larger; its free plan allows 3 GB in total per 30 days.",
      },
      {
        q: "Do I need an account to use Tessil?",
        a: "No. You can send anonymously. An optional free account adds a list of the transfers you create, where you can manage them - it doesn't change how files are encrypted.",
      },
    ],
  },
  {
    slug: "boomerang-alternative",
    competitor: "Boomerang",
    shortName: "Boomerang",
    metaTitle: "Encrypted, open-source Boomerang alternative - Tessil",
    metaDescription:
      "Boomerang is a clean, ad-free transfer tool, but it isn't end-to-end encrypted. Tessil encrypts files in your browser, keeps the key out of the server, and is open source. EU-hosted, free.",
    heading: "Tessil vs Boomerang",
    summary:
      "Like Boomerang: no-login, ad-free, EU-hosted. Unlike Boomerang: truly end-to-end encrypted and open source.",
    intro: [
      "Boomerang (bmrng.me) is a clean, ad-free file transfer service from one of WeTransfer's co-founders. It needs no login, keeps your data in the EU, and explicitly doesn't run ads or train AI on your files. For privacy-minded sending it's a real step up from the typical big-name tools.",
      "Where it stops short is encryption. Boomerang describes files as encrypted in transit and at rest, which means Boomerang holds the keys and can in principle read what you upload. That's ordinary secure file sharing, not end-to-end encryption.",
      "Tessil closes that gap. Files are encrypted in your browser before upload and the key lives in the share link's URL fragment, so we only ever store ciphertext we can't read. The whole thing is open source under AGPL-3.0, so the claim is auditable rather than asserted.",
    ],
    rows: [
      { label: "End-to-end encrypted", tessil: TESSIL.e2e, competitor: false },
      { label: "Key never reaches the server", tessil: TESSIL.keyServer, competitor: false },
      { label: "Works without an account", tessil: TESSIL.noAccount, competitor: true },
      { label: "Open source", tessil: TESSIL.openSource, competitor: false },
      { label: "Hosting / jurisdiction", tessil: TESSIL.hosting, competitor: "EU data (on Cloudflare)" },
      { label: "Ads & third-party tracking", tessil: TESSIL.tracking, competitor: "None (ad-free)" },
      { label: "Price", tessil: TESSIL.price, competitor: "Free + paid (~EUR 6.99/mo)" },
      { label: "Link expiry & download limits", tessil: TESSIL.expiry, competitor: true },
      { label: "Password protection", tessil: TESSIL.password, competitor: "Paid only" },
    ],
    verdict: [
      "Boomerang is one of the nicer mainstream transfer tools: no ads, no AI training, EU-hosted, no login. If your concern is 'I don't want an ad-funded platform mining my uploads,' it does that job well.",
      "Tessil is for the next step: when you want the service to be technically unable to read your files, not just promising not to. Browser-side encryption plus open-source code is the difference between trusting a policy and verifying it.",
    ],
    faq: [
      {
        q: "Is Boomerang end-to-end encrypted?",
        a: "Based on its public description, no. Boomerang encrypts files in transit and at rest, which means it controls the keys and can access your files. Tessil encrypts in your browser and never receives the key, so it only stores ciphertext it can't read. Encryption claims change, so verify on each provider's site.",
      },
      {
        q: "What does Boomerang cost compared to Tessil?",
        a: "Boomerang has a free tier and a paid plan around EUR 6.99/month for more storage and larger files. Sending with Tessil is free, with or without an account; paid plans add portals and forms for receiving. Check Boomerang's site for up-to-date pricing.",
      },
      {
        q: "Is Tessil also made in the Netherlands?",
        a: "Yes. Tessil is built in the Netherlands and hosted entirely in the EU (Germany and the Netherlands). Like Boomerang it needs no account to send, and it adds browser-side end-to-end encryption and fully open-source code.",
      },
    ],
  },
  {
    slug: "proton-drive-alternative",
    competitor: "Proton Drive",
    shortName: "Proton Drive",
    metaTitle: "Proton Drive alternative for quick encrypted transfers - Tessil",
    metaDescription:
      "Proton Drive is a full encrypted cloud. Tessil is a focused, no-account, end-to-end encrypted file transfer - share a link, the key never leaves your browser. Open source, EU-hosted.",
    heading: "Tessil vs Proton Drive",
    summary:
      "Proton Drive is encrypted cloud storage; Tessil is a focused, no-account encrypted file transfer.",
    intro: [
      "Proton Drive is an excellent end-to-end encrypted cloud drive from the Proton team in Switzerland. If you want a place to store files long-term with encrypted sync across devices, it's a strong choice - but it's storage-first, and using it means creating a Proton account.",
      "Tessil solves a narrower problem: send this file to this person, encrypted, right now, without anyone signing up. Files are encrypted in your browser, the key rides in the link's URL fragment, and the transfer expires on your terms. No account needed to send or receive.",
      "Both keep your data zero-knowledge. The difference is shape: a drive you live in versus a transfer you fire and forget.",
    ],
    rows: [
      { label: "End-to-end encrypted", tessil: TESSIL.e2e, competitor: true },
      { label: "Key never reaches the server", tessil: TESSIL.keyServer, competitor: true },
      { label: "Works without an account", tessil: TESSIL.noAccount, competitor: false },
      { label: "Open source", tessil: TESSIL.openSource, competitor: "Apps open source" },
      { label: "Hosting / jurisdiction", tessil: TESSIL.hosting, competitor: "Switzerland" },
      { label: "Ads & third-party tracking", tessil: TESSIL.tracking, competitor: "None" },
      { label: "Built for", tessil: "One-off encrypted transfers", competitor: "Encrypted cloud storage" },
      { label: "Price", tessil: TESSIL.price, competitor: "Free tier + paid" },
      { label: "Link expiry & download limits", tessil: TESSIL.expiry, competitor: true },
      { label: "Password protection", tessil: TESSIL.password, competitor: true },
    ],
    verdict: [
      "Pick Proton Drive if you want an encrypted home for your files with sync and long-term storage, and don't mind an account. Pick Tessil when you just need to hand someone a file securely without either of you signing up.",
      "Many people use both: Proton Drive to keep things, Tessil to send them.",
    ],
    faq: [
      {
        q: "Is Tessil a Proton Drive replacement?",
        a: "Not exactly - Proton Drive is cloud storage, Tessil is one-off transfer. Tessil replaces the 'share a link to a file' part without requiring an account or long-term storage.",
      },
      {
        q: "Do I need an account for Tessil like I do for Proton?",
        a: "No. Tessil works fully anonymously. An account is optional and only adds a list of the transfers you create, where you can manage them.",
      },
      {
        q: "Are both end-to-end encrypted?",
        a: "Yes. Both encrypt client-side so the service can't read your files. Tessil additionally publishes its full source under AGPL-3.0.",
      },
    ],
  },
  {
    slug: "tresorit-send-alternative",
    competitor: "Tresorit Send",
    shortName: "Tresorit Send",
    metaTitle: "Open-source Tresorit Send alternative - Tessil",
    metaDescription:
      "A free, open-source alternative to Tresorit Send. End-to-end encrypted file transfer, the key never reaches the server, EU-hosted, no account required.",
    heading: "Tessil vs Tresorit Send",
    summary:
      "Like Tresorit Send, but open source and EU-hosted. Encrypted, link-based, no account needed.",
    intro: [
      "Tresorit Send is the free transfer tool from Tresorit, a well-regarded Swiss encryption company. It's genuinely end-to-end encrypted and link-based - a close match to what Tessil does. The main catch is that Tresorit is closed source, so you take its encryption claims on trust.",
      "Tessil offers the same model - browser-side encryption, key in the link fragment, no account to send - and publishes every line of its source under AGPL-3.0, so the zero-knowledge claim is auditable rather than asserted.",
      "Hosting is fully in the EU, and there are no ads or third-party trackers anywhere.",
    ],
    rows: [
      { label: "End-to-end encrypted", tessil: TESSIL.e2e, competitor: true },
      { label: "Key never reaches the server", tessil: TESSIL.keyServer, competitor: true },
      { label: "Works without an account", tessil: TESSIL.noAccount, competitor: true },
      { label: "Open source", tessil: TESSIL.openSource, competitor: false },
      { label: "Largest transfer, free", tessil: "1 GB", competitor: "5 GB" },
      { label: "Hosting / jurisdiction", tessil: TESSIL.hosting, competitor: "Switzerland (Tresorit / Swiss Post)" },
      { label: "Ads & third-party tracking", tessil: TESSIL.tracking, competitor: "None" },
      { label: "Price", tessil: TESSIL.price, competitor: "Free Send + paid Tresorit" },
      { label: "Link expiry & download limits", tessil: TESSIL.expiry, competitor: true },
      { label: "Password protection", tessil: TESSIL.password, competitor: true },
    ],
    verdict: [
      "Tresorit Send is a solid, trustworthy option, especially if you're already in the Tresorit ecosystem. Tessil gives you the same encrypted, link-based experience with the added assurances that come from being fully open source and EU-hosted - and sending is free.",
      "If auditability matters to you, that's the deciding line: Tessil's code is public.",
    ],
    faq: [
      {
        q: "How is Tessil different from Tresorit Send?",
        a: "They're very similar - both are end-to-end encrypted, link-based, and need no account to send. Tessil is open source (AGPL-3.0) and EU-hosted; Tresorit Send is closed source and Swiss-hosted.",
      },
      {
        q: "Is Tessil really free?",
        a: "Sending is free and stays free, with or without an account. Paid plans add portals and forms for receiving. There are no ads and no third-party trackers.",
      },
      {
        q: "Can I verify Tessil's encryption?",
        a: "Yes - the entire codebase is published under AGPL-3.0, so anyone can audit how encryption and key handling work.",
      },
    ],
  },
  {
    slug: "wormhole-alternative",
    competitor: "Wormhole",
    shortName: "Wormhole",
    metaTitle: "Wormhole (wormhole.app) alternative - Tessil",
    metaDescription:
      "Like Wormhole, Tessil keeps the decryption key in the link so we can't read your files. Unlike Wormhole, Tessil is open source, EU-hosted, and adds optional accounts.",
    heading: "Tessil vs Wormhole",
    summary:
      "The same key-in-the-link model as Wormhole, plus open source, EU hosting, and optional accounts.",
    intro: [
      "Wormhole (wormhole.app) popularised the clean, modern take on encrypted sending: files are encrypted in the browser and the key lives in the link, so the service can't read them. Transfers auto-expire quickly. It's a great tool and the closest in spirit to Tessil.",
      "Tessil uses the same core idea - browser-side encryption with the key in the URL fragment - and differs on the things around it. It's open source under AGPL-3.0, hosted in the EU rather than the US, and offers an optional free account with a list of your transfers, so you can manage and re-share your transfers instead of every send being purely ephemeral.",
      "You also get to choose expiry windows rather than being limited to a fixed short lifetime.",
    ],
    rows: [
      { label: "End-to-end encrypted", tessil: TESSIL.e2e, competitor: true },
      { label: "Key never reaches the server", tessil: TESSIL.keyServer, competitor: true },
      { label: "Works without an account", tessil: TESSIL.noAccount, competitor: true },
      { label: "Open source", tessil: TESSIL.openSource, competitor: false },
      { label: "Largest transfer, free", tessil: "1 GB", competitor: "10 GB" },
      { label: "Hosting / jurisdiction", tessil: TESSIL.hosting, competitor: "United States (Socket)" },
      { label: "Ads & third-party tracking", tessil: TESSIL.tracking, competitor: "None" },
      { label: "Optional accounts / list of transfers", tessil: true, competitor: false },
      { label: "Configurable link expiry", tessil: TESSIL.expiry, competitor: "Fixed: 24 hours or 100 downloads" },
      { label: "Price", tessil: TESSIL.price, competitor: "Free" },
    ],
    verdict: [
      "Wormhole and Tessil share the part that matters most - neither service can read your files. If you want the most ephemeral, fire-and-forget experience, Wormhole is great. If you'd prefer open-source code you can audit, EU hosting, and the option to keep an account that tracks your transfers, Tessil leans that way.",
      "Both are free, so it's mostly a question of jurisdiction, openness, and whether you want optional persistence.",
    ],
    faq: [
      {
        q: "Is Tessil the same as Wormhole?",
        a: "The encryption model is the same - files are encrypted client-side and the key stays in the link. Tessil differs by being open source (AGPL-3.0), EU-hosted, and offering optional accounts with configurable expiry.",
      },
      {
        q: "Does Tessil delete transfers automatically like Wormhole?",
        a: "Yes - transfers expire based on the time and download limits you set. You can choose the window rather than being fixed to one short lifetime.",
      },
      {
        q: "Where is each service hosted?",
        a: "Tessil is hosted entirely in the EU (Germany and the Netherlands). Wormhole is operated from the United States.",
      },
    ],
  },
  {
    slug: "swisstransfer-alternative",
    competitor: "SwissTransfer",
    shortName: "SwissTransfer",
    metaTitle: "End-to-end encrypted SwissTransfer alternative - Tessil",
    metaDescription:
      "SwissTransfer is free and keeps files in Switzerland, but it is not end-to-end encrypted. Tessil encrypts in your browser so we cannot read your files. Open source, EU-hosted, free.",
    heading: "Tessil vs SwissTransfer",
    summary:
      "Both are free and need no account. SwissTransfer sends bigger files; Tessil encrypts them so the service cannot read them.",
    intro: [
      "SwissTransfer, from the Swiss host Infomaniak, is a generous free transfer service: up to 50 GB per transfer, no account, an optional password, and files stored only in Infomaniak's own data centres in Switzerland. Infomaniak describes the files as encrypted in transit and at rest. It does not describe them as end-to-end encrypted, which means the encryption keys are on its side.",
      "Tessil encrypts each file in your browser before it is uploaded, and the key travels in the link's fragment, the part after the # that browsers never send to a server. We store only ciphertext we cannot open, in the EU, and the code is open source under AGPL-3.0.",
    ],
    rows: [
      { label: "End-to-end encrypted", tessil: TESSIL.e2e, competitor: "No; encrypted in transit and at rest" },
      { label: "Key never reaches the server", tessil: TESSIL.keyServer, competitor: false },
      { label: "Works without an account", tessil: TESSIL.noAccount, competitor: true },
      { label: "Largest transfer, free", tessil: "1 GB", competitor: "50 GB" },
      { label: "Hosting / jurisdiction", tessil: TESSIL.hosting, competitor: "Switzerland (Infomaniak's data centres)" },
      { label: "Open source", tessil: TESSIL.openSource, competitor: "No public server code found" },
      { label: "Password protection", tessil: TESSIL.password, competitor: true },
      { label: "Price", tessil: TESSIL.price, competitor: "Free" },
    ],
    verdict: [
      "For large files that are not sensitive, SwissTransfer is hard to beat: 50 GB, free, no account, and a host that runs its own Swiss data centres.",
      "For documents you would not want anyone else to read, the deciding difference is end-to-end encryption. With Tessil the service never has the key; with SwissTransfer it does. Tessil's free transfers are smaller, which is the trade.",
    ],
    faq: [
      {
        q: "Is SwissTransfer end-to-end encrypted?",
        a: "Not according to Infomaniak's own description: files are encrypted in transit and at rest, not in your browser. Tessil encrypts in your browser and never receives the key.",
      },
      {
        q: "Can I send 50 GB with Tessil?",
        a: "No. Free transfers on Tessil go up to 1 GB, and paid plans to 5 GB per file. If you need to send 50 GB of non-sensitive files, SwissTransfer is the better fit.",
      },
      {
        q: "Is Switzerland or the EU better for privacy?",
        a: "Both have strong data-protection law. Jurisdiction decides who can demand the data a provider holds; end-to-end encryption decides whether that data is readable at all. Tessil is EU-hosted and holds only data it cannot read.",
      },
    ],
    verified: "November 2026",
    verifiedIso: "2026-11-23",
  },
  {
    slug: "smash-alternative",
    competitor: "Smash",
    shortName: "Smash",
    metaTitle: "Smash alternative with end-to-end encryption - Tessil",
    metaDescription:
      "Smash sends files of any size for free. Tessil encrypts files in your browser so the service cannot read them. Open source, EU-hosted, no account needed.",
    heading: "Tessil vs Smash",
    summary:
      "Smash sends files of any size. Tessil sends smaller files that only the recipient can read.",
    intro: [
      "Smash is a French transfer service known for having no size limit on free transfers, which last up to 7 days. Its security page describes files as encrypted with AES-256 at rest and with TLS in transit, stored on Amazon Web Services in several regions around the world, with hosting in France as an option for business customers. Some of Smash's pages call its free plan end-to-end encrypted; its security description is of encryption at rest and in transit, which the service itself can undo.",
      "Tessil encrypts each file in your browser before upload, and the key stays in the link's fragment, which is never sent to a server. We store ciphertext we cannot read, in the EU, and the code is open source under AGPL-3.0.",
    ],
    rows: [
      { label: "Encrypted in your browser, key never on the server", tessil: TESSIL.keyServer, competitor: "Not as its security page describes it" },
      { label: "Works without an account", tessil: TESSIL.noAccount, competitor: true },
      { label: "Largest transfer, free", tessil: "1 GB", competitor: "No limit" },
      { label: "Hosting / jurisdiction", tessil: TESSIL.hosting, competitor: "AWS, several regions; France on business plans" },
      { label: "Open source", tessil: TESSIL.openSource, competitor: false },
      { label: "Password protection", tessil: TESSIL.password, competitor: true },
      { label: "Price", tessil: TESSIL.price, competitor: "Free tier + paid plans" },
    ],
    verdict: [
      "If you send huge video or design files and the content is not confidential, Smash's unlimited free transfers are the practical choice.",
      "If what you send should stay between you and the recipient, Tessil's browser-side encryption means the service cannot read it, whatever its policies say. Tessil's free transfers are smaller in return.",
    ],
    faq: [
      {
        q: "Is Smash end-to-end encrypted?",
        a: "Its pages differ. Its security page describes AES-256 encryption at rest and TLS in transit on AWS storage, which is encryption the service holds the keys to. Tessil encrypts in your browser and never receives the key. Check Smash's current security page for its own wording.",
      },
      {
        q: "Does Tessil have a file size limit?",
        a: "Yes: 1 GB per transfer on the free plan and 5 GB per file on paid plans. That is the honest cost of encrypting everything in the browser.",
      },
      {
        q: "Where are files stored?",
        a: "Tessil stores encrypted files in the EU only. Smash says it stores files on AWS in several regions, close to the user, with France as an option for business customers.",
      },
    ],
    verified: "November 2026",
    verifiedIso: "2026-11-23",
  },
];

// Portal and form comparisons appear once those products are announced.
export const comparisons: Comparison[] = [
  ...sendComparisons,
  ...receivingComparisons
    .filter((c) => (c.kind === "form" ? FORMS_ANNOUNCED : PORTALS_ANNOUNCED))
    .map((c) => ({ ...c, verified: RECEIVING_VERIFIED, verifiedIso: RECEIVING_VERIFIED_ISO })),
];

export function getComparison(slug: string): Comparison | undefined {
  return comparisons.find((c) => c.slug === slug);
}
