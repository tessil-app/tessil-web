// Data for the /compare SEO pages. Tessil's column is exact; competitor
// columns use well-established facts and are stamped with LAST_VERIFIED - the
// pages show a "verify on the provider's site" note because rivals change
// pricing/features often. Keep claims fair and checkable: this is a
// privacy-principled, AGPL project, not a hit piece.

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
};

/** Shown on every page so competitor facts are dated, not presented as eternal truth. */
export const LAST_VERIFIED = "June 2026";

// Tessil's column is identical across comparisons.
const TESSIL = {
  e2e: true,
  keyServer: true,
  noAccount: true,
  openSource: "Yes (AGPL-3.0)",
  hosting: "EU (Germany + Netherlands)",
  tracking: "None",
  price: "EUR 1 per transfer or EUR 5/mo",
  expiry: true,
  password: true,
};

export const comparisons: Comparison[] = [
  {
    slug: "wetransfer-alternative",
    competitor: "WeTransfer",
    shortName: "WeTransfer",
    metaTitle: "Encrypted WeTransfer alternative - Tessil",
    metaDescription:
      "Looking for a private, encrypted WeTransfer alternative? Tessil encrypts files in your browser and never sees your files or the key. Open source, EU-hosted, no ads.",
    heading: "Tessil vs WeTransfer",
    summary:
      "A private, end-to-end encrypted alternative to WeTransfer. Your files are unreadable to us by design.",
    intro: [
      "WeTransfer is the default way most people send big files: drop them in, share a link. It's convenient, but it isn't end-to-end encrypted - WeTransfer holds the keys, so the service (and anyone who compels it) can in principle access what you upload. The free tier also shows ads and runs analytics, and its terms drew criticism in 2025 over language that appeared to grant broad rights over uploaded content (later revised).",
      "Tessil is built for the case where that matters. Files are encrypted in your browser with AES-GCM before they ever leave your device, and the decryption key lives in the share link's URL fragment - the part after the # that browsers never send to a server. We store only ciphertext we can't read.",
      "It's open source (AGPL-3.0), hosted entirely in the EU, and needs no account to send. Sending costs EUR 1 per transfer or EUR 5 a month; receiving is free.",
    ],
    rows: [
      { label: "End-to-end encrypted", tessil: TESSIL.e2e, competitor: false },
      { label: "Key never reaches the server", tessil: TESSIL.keyServer, competitor: false },
      { label: "Works without an account", tessil: TESSIL.noAccount, competitor: true },
      { label: "Open source", tessil: TESSIL.openSource, competitor: false },
      { label: "Hosting / jurisdiction", tessil: TESSIL.hosting, competitor: "EU (NL); owned by Bending Spoons" },
      { label: "Ads & third-party tracking", tessil: TESSIL.tracking, competitor: "Ads on the free tier" },
      { label: "Price", tessil: TESSIL.price, competitor: "Free tier + paid plans" },
      { label: "Link expiry & download limits", tessil: TESSIL.expiry, competitor: true },
      { label: "Password protection", tessil: TESSIL.password, competitor: true },
    ],
    verdict: [
      "If you just want to lob a file at someone and privacy isn't a concern, WeTransfer is fine and frictionless. If you'd rather the service physically can't read what you send - for client work, documents, anything sensitive - Tessil gives you that without giving up the simple link-based flow.",
      "WeTransfer has a free tier and Tessil does not: sending costs EUR 1 per transfer or EUR 5 a month. That price, rather than ads or your data, is what pays for zero-knowledge encryption.",
    ],
    faq: [
      {
        q: "Is WeTransfer end-to-end encrypted?",
        a: "No. WeTransfer encrypts files in transit and at rest, but it controls the keys, so the service can access your files. Tessil encrypts in your browser and never receives the key.",
      },
      {
        q: "Can Tessil send large files like WeTransfer?",
        a: "Tessil supports multi-part uploads up to its current per-transfer limit. The cap is smaller than WeTransfer's paid plans, in exchange for true end-to-end encryption and no ads.",
      },
      {
        q: "Do I need an account to use Tessil?",
        a: "No. A one-time EUR 1 pass sends a transfer with no account. An account is only needed for the EUR 5 monthly plan, and adds a dashboard to manage the transfers you create - it doesn't change how files are encrypted.",
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
        a: "Boomerang has a free tier and a paid plan around EUR 6.99/month for more storage and larger files. Tessil has no free tier: sending costs EUR 1 per transfer or EUR 5 a month. Check Boomerang's site for up-to-date pricing.",
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
        a: "No. Tessil works fully anonymously. An account is optional and only adds a dashboard for managing transfers you create.",
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
      "An open-source alternative to Tresorit Send. End-to-end encrypted file transfer, the key never reaches the server, EU-hosted, no account required.",
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
      { label: "Hosting / jurisdiction", tessil: TESSIL.hosting, competitor: "Switzerland (Tresorit / Swiss Post)" },
      { label: "Ads & third-party tracking", tessil: TESSIL.tracking, competitor: "None" },
      { label: "Price", tessil: TESSIL.price, competitor: "Free Send + paid Tresorit" },
      { label: "Link expiry & download limits", tessil: TESSIL.expiry, competitor: true },
      { label: "Password protection", tessil: TESSIL.password, competitor: true },
    ],
    verdict: [
      "Tresorit Send is a solid, trustworthy option, especially if you're already in the Tresorit ecosystem. Tessil gives you the same encrypted, link-based experience with the added assurances that come from being fully open source and EU-hosted. Tresorit Send is free to use; Tessil charges EUR 1 per transfer or EUR 5 a month.",
      "If auditability matters to you, that's the deciding line: Tessil's code is public.",
    ],
    faq: [
      {
        q: "How is Tessil different from Tresorit Send?",
        a: "They're very similar - both are end-to-end encrypted, link-based, and need no account to send. Tessil is open source (AGPL-3.0) and EU-hosted; Tresorit Send is closed source and Swiss-hosted.",
      },
      {
        q: "What does Tessil cost?",
        a: "Sending costs EUR 1 per transfer with no account, or EUR 5 a month. Receiving is free. There are no ads and no third-party trackers.",
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
      "Tessil uses the same core idea - browser-side encryption with the key in the URL fragment - and differs on the things around it. It's open source under AGPL-3.0, hosted in the EU rather than the US, and offers an optional account with a dashboard so you can manage and re-share your transfers instead of every send being purely ephemeral.",
      "You also get to choose expiry windows rather than being limited to a fixed short lifetime.",
    ],
    rows: [
      { label: "End-to-end encrypted", tessil: TESSIL.e2e, competitor: true },
      { label: "Key never reaches the server", tessil: TESSIL.keyServer, competitor: true },
      { label: "Works without an account", tessil: TESSIL.noAccount, competitor: true },
      { label: "Open source", tessil: TESSIL.openSource, competitor: false },
      { label: "Hosting / jurisdiction", tessil: TESSIL.hosting, competitor: "United States (Socket)" },
      { label: "Ads & third-party tracking", tessil: TESSIL.tracking, competitor: "None" },
      { label: "Optional accounts / dashboard", tessil: true, competitor: false },
      { label: "Configurable link expiry", tessil: TESSIL.expiry, competitor: "Fixed short lifetime" },
      { label: "Price", tessil: TESSIL.price, competitor: "Free" },
    ],
    verdict: [
      "Wormhole and Tessil share the part that matters most - neither service can read your files. If you want the most ephemeral, fire-and-forget experience, Wormhole is great. If you'd prefer open-source code you can audit, EU hosting, and the option to keep an account that tracks your transfers, Tessil leans that way.",
      "Wormhole is free and Tessil charges EUR 1 per transfer or EUR 5 a month, so weigh that against jurisdiction, openness, and whether you want optional persistence.",
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
];

export function getComparison(slug: string): Comparison | undefined {
  return comparisons.find((c) => c.slug === slug);
}
