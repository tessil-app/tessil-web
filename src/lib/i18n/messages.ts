// Locale-keyed UI strings. Long-form prose does not belong here: legal texts
// and comparison copy are documents and live in per-locale content files
// (see $lib/compare). This file is for chrome and short labels only.
//
// New user-facing labels go in here rather than inline in a component, so
// adding a locale stays a data change.

import type { Locale } from "./locale";

export interface HowItWorksStrings {
  heading: string;
  steps: { action: string; transparency: string }[];
}

export const howItWorksStrings: Record<Locale, HowItWorksStrings> = {
  en: {
    heading: "How it works",
    steps: [
      { action: "You drop a file.", transparency: "We never know what it's called." },
      { action: "Your browser encrypts it.", transparency: "We never have the key." },
      {
        action: "We store ciphertext.",
        transparency: "We can't read it. Not for police, not for ourselves.",
      },
      {
        action: "The recipient decrypts in their browser.",
        transparency: "The key never reaches our server.",
      },
    ],
  },
  nl: {
    heading: "Hoe het werkt",
    steps: [
      { action: "Je sleept een bestand naar de pagina.", transparency: "Wij weten nooit hoe het heet." },
      { action: "Je browser versleutelt het.", transparency: "Wij krijgen de sleutel nooit." },
      {
        action: "Wij bewaren alleen versleutelde data.",
        transparency: "Onleesbaar voor ons. Niet voor de politie, en niet voor onszelf.",
      },
      {
        action: "De ontvanger ontsleutelt in zijn eigen browser.",
        transparency: "De sleutel bereikt onze server nooit.",
      },
    ],
  },
};

export interface CompareStrings {
  breadcrumbHome: string;
  breadcrumbCompare: string;
  feature: string;
  yes: string;
  no: string;
  verdictHeading: string;
  faqHeading: string;
  moreHeading: string;
  ctaPrimary: string;
  ctaSecondary: string;
  otherLanguage: string;
  tableCaption: (competitor: string) => string;
  lastVerified: (competitor: string, date: string) => string;
}

export const compareStrings: Record<Locale, CompareStrings> = {
  en: {
    breadcrumbHome: "Home",
    breadcrumbCompare: "Compare",
    feature: "Feature",
    yes: "Yes",
    no: "No",
    verdictHeading: "The honest verdict",
    faqHeading: "Frequently asked questions",
    moreHeading: "More comparisons",
    ctaPrimary: "Send a file with Tessil - free",
    ctaSecondary: "How the encryption works",
    otherLanguage: "Nederlands",
    tableCaption: (competitor) =>
      `Feature comparison: Tessil versus ${competitor}`,
    lastVerified: (competitor, date) =>
      `${competitor} details last verified ${date}. Competitor features and pricing change often - check the provider's own site for current details.`,
  },
  nl: {
    breadcrumbHome: "Home",
    breadcrumbCompare: "Vergelijken",
    feature: "Functie",
    yes: "Ja",
    no: "Nee",
    verdictHeading: "Het eerlijke oordeel",
    faqHeading: "Veelgestelde vragen",
    moreHeading: "Meer vergelijkingen",
    ctaPrimary: "Verstuur een bestand met Tessil - gratis",
    ctaSecondary: "Zo werkt de versleuteling",
    otherLanguage: "English",
    tableCaption: (competitor) =>
      `Functievergelijking: Tessil versus ${competitor}`,
    lastVerified: (competitor, date) =>
      `Gegevens over ${competitor} voor het laatst gecontroleerd in ${date}. Functies en prijzen van aanbieders veranderen vaak - controleer de site van de aanbieder zelf voor de actuele stand.`,
  },
};

// ─── Portal deposit page ────────────────────────────────────────────────────
// The page a portal owner's clients land on. They did not choose Tessil and
// may never have heard of it, so the language follows the owner's choice
// and the visitor's browser, not the URL.

export interface DepositStrings {
  languageName: string;
  pageTitle: string;
  opening: string;
  sendTo: string;
  dropPrompt: string;
  addMore: string;
  maxTotal: (size: string) => string;
  takePhoto: string;
  filesCount: (count: number, size: string) => string;
  /** What a new extra field is called until the owner renames it. */
  fieldDefault: string;
  fieldMissing: (label: string) => string;
  noteLabel: string;
  notePlaceholderNamed: string;
  notePlaceholder: string;
  send: string;
  sendMany: (count: number) => string;
  cancel: string;
  reconnecting: string;
  remove: (name: string) => string;
  sentOne: string;
  sentMany: (count: number) => string;
  onlyRecipientOne: (title: string) => string;
  onlyRecipientMany: (title: string) => string;
  sendMore: string;
  checklistHeading: string;
  chooseFile: string;
  addAnother: string;
  otherFiles: string;
  checklistProgress: (provided: number, total: number) => string;
  checklistMissing: (labels: string[]) => string;
  reference: string;
  saveConfirmation: string;
  confirmationFilename: (reference: string) => string;
  closedTitle: string;
  closedBody: (title: string) => string;
  footnote: (title: string) => string;
  howItWorks: string;
  invalid: Record<"bad_link" | "not_found" | "untrusted" | "offline", { title: string; body: string }>;
  errors: {
    blockedScript: (name: string) => string;
    blockedExecutable: (name: string) => string;
    notAccepting: string;
    portalFull: string;
    fileTooLarge: (name: string) => string;
    transferTooLarge: string;
    rateLimited: string;
    gone: string;
    failed: string;
  };
}

export const depositStrings: Record<Locale, DepositStrings> = {
  en: {
    languageName: "English",
    pageTitle: "Send files securely - Tessil",
    opening: "Opening portal…",
    sendTo: "Send files to",
    dropPrompt: "Drop files here or tap to choose",
    addMore: "Add more files",
    maxTotal: (size) => `Up to ${size} in total`,
    takePhoto: "Take a photo",
    filesCount: (count, size) => `${count} ${count === 1 ? "file" : "files"} · ${size}`,
    fieldDefault: "Your name",
    fieldMissing: (label) => `Fill in "${label}" before sending.`,
    noteLabel: "Note (optional)",
    notePlaceholderNamed: "What these files are",
    notePlaceholder: "Your name, or what these files are",
    send: "Send",
    sendMany: (count) => `Send ${count} files`,
    cancel: "Cancel",
    reconnecting: "Connection lost. Sending continues as soon as it is back. Keep this page open.",
    remove: (name) => `Remove ${name}`,
    sentOne: "Your file was sent",
    sentMany: (count) => `Your ${count} files were sent`,
    onlyRecipientOne: (title) => `Only ${title} can open it. You can close this page.`,
    onlyRecipientMany: (title) => `Only ${title} can open them. You can close this page.`,
    sendMore: "Send more files",
    checklistHeading: "What's needed from you",
    chooseFile: "Choose file",
    addAnother: "Add another",
    otherFiles: "Anything else to send along",
    checklistProgress: (provided, total) => `${provided} of ${total} added`,
    checklistMissing: (labels) =>
      `Not added yet: ${labels.join(", ")}. You can send now and the rest later.`,
    reference: "Reference",
    saveConfirmation: "Save confirmation",
    confirmationFilename: (reference) => `tessil-confirmation-${reference}.txt`,
    closedTitle: "Not accepting files right now",
    closedBody: (title) =>
      `This portal has been switched off. Let ${title} know, and they can switch it back on.`,
    footnote: (title) =>
      `Your files are encrypted in this browser before they are uploaded. Only ${title} can open them. Tessil cannot, and neither can anyone else who sends files here.`,
    howItWorks: "How this works",
    invalid: {
      bad_link: {
        title: "This link doesn't work",
        body: "The link is incomplete. Ask the person who sent it to copy the whole link again, including everything after the # sign.",
      },
      not_found: {
        title: "This portal no longer exists",
        body: "It may have been deleted. Ask the person who sent you the link for a new one.",
      },
      untrusted: {
        title: "This link can't be verified",
        body: "What the server returned does not match this link, so nothing will be uploaded. Ask the person who sent it for a fresh link.",
      },
      offline: {
        title: "Couldn't open this portal",
        body: "Check your connection and reload the page.",
      },
    },
    errors: {
      blockedScript: (name) => `"${name}": scripts can't be sent here.`,
      blockedExecutable: (name) => `"${name}": programs can't be sent here.`,
      notAccepting: "This portal is not accepting files right now.",
      portalFull: "This portal is full. Let the person you are sending to know.",
      fileTooLarge: (name) => `"${name}" is too large for this portal.`,
      transferTooLarge: "These files are too large to send in one go. Try sending fewer at a time.",
      rateLimited: "Too many uploads right now. Try again in a little while.",
      gone: "This portal no longer exists.",
      failed: "The upload failed. Check your connection and try again.",
    },
  },
  nl: {
    languageName: "Nederlands",
    pageTitle: "Veilig bestanden versturen - Tessil",
    opening: "Portaal openen…",
    sendTo: "Bestanden versturen naar",
    dropPrompt: "Sleep bestanden hierheen of tik om te kiezen",
    addMore: "Meer bestanden toevoegen",
    maxTotal: (size) => `Maximaal ${size} in totaal`,
    takePhoto: "Foto maken",
    filesCount: (count, size) => `${count} ${count === 1 ? "bestand" : "bestanden"} · ${size}`,
    fieldDefault: "Je naam",
    fieldMissing: (label) => `Vul "${label}" in voordat je verstuurt.`,
    noteLabel: "Opmerking (optioneel)",
    notePlaceholderNamed: "Wat deze bestanden zijn",
    notePlaceholder: "Je naam, of wat deze bestanden zijn",
    send: "Versturen",
    sendMany: (count) => `${count} bestanden versturen`,
    cancel: "Annuleren",
    reconnecting: "Verbinding verbroken. Het versturen gaat verder zodra die terug is. Houd deze pagina open.",
    remove: (name) => `${name} verwijderen`,
    sentOne: "Je bestand is verstuurd",
    sentMany: (count) => `Je ${count} bestanden zijn verstuurd`,
    onlyRecipientOne: (title) => `Alleen ${title} kan het openen. Je kunt deze pagina sluiten.`,
    onlyRecipientMany: (title) => `Alleen ${title} kan ze openen. Je kunt deze pagina sluiten.`,
    sendMore: "Meer bestanden versturen",
    checklistHeading: "Wat er van je nodig is",
    chooseFile: "Bestand kiezen",
    addAnother: "Nog een toevoegen",
    otherFiles: "Nog iets anders meesturen",
    checklistProgress: (provided, total) => `${provided} van ${total} toegevoegd`,
    checklistMissing: (labels) =>
      `Nog niet toegevoegd: ${labels.join(", ")}. Je kunt nu versturen en de rest later.`,
    reference: "Referentie",
    saveConfirmation: "Bevestiging opslaan",
    confirmationFilename: (reference) => `tessil-bevestiging-${reference}.txt`,
    closedTitle: "Neemt nu geen bestanden aan",
    closedBody: (title) =>
      `Dit portaal is uitgezet. Laat het ${title} weten, dan kan het weer worden aangezet.`,
    footnote: (title) =>
      `Je bestanden worden in deze browser versleuteld voordat ze worden verstuurd. Alleen ${title} kan ze openen. Tessil niet, en ook niemand anders die hier bestanden instuurt.`,
    howItWorks: "Hoe dit werkt",
    invalid: {
      bad_link: {
        title: "Deze link werkt niet",
        body: "De link is niet compleet. Vraag de afzender om de hele link opnieuw te kopiëren, inclusief alles na het #-teken.",
      },
      not_found: {
        title: "Dit portaal bestaat niet meer",
        body: "Het is mogelijk verwijderd. Vraag de afzender om een nieuwe link.",
      },
      untrusted: {
        title: "Deze link kan niet worden gecontroleerd",
        body: "Wat de server teruggaf past niet bij deze link, dus er wordt niets verstuurd. Vraag de afzender om een nieuwe link.",
      },
      offline: {
        title: "Het portaal kon niet worden geopend",
        body: "Controleer je verbinding en laad de pagina opnieuw.",
      },
    },
    errors: {
      blockedScript: (name) => `"${name}": scripts kunnen hier niet worden verstuurd.`,
      blockedExecutable: (name) => `"${name}": programma's kunnen hier niet worden verstuurd.`,
      notAccepting: "Dit portaal neemt nu geen bestanden aan.",
      portalFull: "Dit portaal is vol. Laat het de ontvanger weten.",
      fileTooLarge: (name) => `"${name}" is te groot voor dit portaal.`,
      transferTooLarge: "Deze bestanden zijn samen te groot. Verstuur er minder tegelijk.",
      rateLimited: "Te veel uploads op dit moment. Probeer het zo meteen opnieuw.",
      gone: "Dit portaal bestaat niet meer.",
      failed: "Het versturen is mislukt. Controleer je verbinding en probeer het opnieuw.",
    },
  },
};
