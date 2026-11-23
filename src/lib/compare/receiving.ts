// Comparisons for receiving: portals against file-request tools, forms
// against form builders. Same rules as comparisons.ts: competitor claims are
// what their own pages state, dated, and fair. Sources: docs/audit/38.

import type { Comparison } from "./comparisons";

export const RECEIVING_VERIFIED = "November 2026";
export const RECEIVING_VERIFIED_ISO = "2026-11-22";

const PORTAL = {
  e2e: true,
  noAccount: "Yes, and we ask nothing about them",
  openSource: "Yes (AGPL-3.0)",
  hosting: "EU (Germany + Netherlands)",
  price: "From €9 a month for 3 portals, not per user",
  checklist: true,
  deleted: "After 30 days, or 90 on Max",
};

const FORM = {
  e2e: "Always, questions and answers",
  noAccount: true,
  openSource: "Yes (AGPL-3.0)",
  hosting: "EU (Germany + Netherlands)",
  price: "From €9 a month for 3 forms",
  deleted: "After 30 days, or 90 on Max",
};

export const receivingComparisons: Comparison[] = [
  {
    slug: "zivver-alternative",
    kind: "portal",
    competitor: "Zivver",
    shortName: "Zivver",
    metaTitle: "Zivver alternative for receiving client files - Tessil",
    metaDescription:
      "Receive documents from clients through one encrypted link, without per-user pricing. How Tessil portals compare to Zivver for collecting files.",
    heading: "Tessil vs Zivver",
    summary:
      "Zivver is secure email for whole organisations. A Tessil portal does one thing: a link where clients send you files only you can open.",
    intro: [
      "Zivver is a Dutch secure email service used widely by care providers, municipalities and law firms. It sits inside Outlook and Gmail, encrypts messages and attachments, warns before data goes to the wrong person, and lets outside parties reply securely or send files through a link on your website. Zivver states it holds no keys to read messages and files.",
      "A Tessil portal is narrower. You hand a client one link, with a list of the documents you need if you like. Their browser encrypts each file before it leaves their device, with a key that only your browser can use. They need no account and no verification code, and get a confirmation with a reference. You open what arrived in your browser; we cannot.",
      "If you need email encryption for a whole office, that is Zivver's field, not ours. If what you need is a simple way for clients to send you documents, a portal does that without a per-user subscription.",
    ],
    rows: [
      { label: "Encrypted so the provider cannot read it", tessil: PORTAL.e2e, competitor: "Yes, per Zivver" },
      { label: "Clients send without an account", tessil: PORTAL.noAccount, competitor: "Yes, after a code, SMS or email check" },
      { label: "How clients send", tessil: "One link per request", competitor: "Reply to a Zivver email, or a link on your site" },
      { label: "List of the documents you need", tessil: PORTAL.checklist, competitor: false },
      { label: "Works inside Outlook and Gmail", tessil: false, competitor: true },
      { label: "Encrypted email", tessil: false, competitor: true },
      { label: "Open source", tessil: PORTAL.openSource, competitor: false },
      { label: "Price", tessil: PORTAL.price, competitor: "Per user per month, billed yearly" },
    ],
    verdict: [
      "Zivver is the more complete tool for an organisation that sends a lot of sensitive email: it covers outgoing mail, checks recipients and fits the email client people already use. Tessil does none of that.",
      "For receiving files from clients, a portal is simpler. One link, no code for the client to type, a checklist of what is missing, and a price per account rather than per colleague. Many small practices need exactly that and nothing more.",
    ],
    faq: [
      {
        q: "Is a Tessil portal a replacement for Zivver?",
        a: "Only for receiving files. Tessil does not encrypt email. If you use Zivver for outgoing mail, a portal can sit next to it for collecting documents from clients.",
      },
      {
        q: "Do my clients need an account or a code?",
        a: "No. They open the link, add their files and send. The link itself carries what their browser needs to encrypt for you. You can add a password to a portal on the Max plan.",
      },
      {
        q: "Can Tessil read what my clients send?",
        a: "No. Files, their names and the notes clients add are encrypted in the client's browser with a key that only your browser has, kept in your vault. We store only what we cannot open.",
      },
    ],
    cta: { label: "See how portals work", href: "/portals" },
  },
  {
    slug: "dropbox-file-request-alternative",
    kind: "portal",
    competitor: "Dropbox file requests",
    shortName: "Dropbox",
    metaTitle: "Encrypted alternative to Dropbox file requests - Tessil",
    metaDescription:
      "Collect files from anyone through a link, encrypted in their browser so the service cannot read them. How Tessil portals compare to Dropbox file requests.",
    heading: "Tessil vs Dropbox file requests",
    summary:
      "Both give you a link where anyone can upload files to you. With Tessil, the files are encrypted before they leave the sender's device.",
    intro: [
      "Dropbox file requests let you send someone a link to upload files straight into a folder in your Dropbox, without a Dropbox account of their own. It is convenient and handles very large files. Uploaders give their name and email address, and the files land in your Dropbox storage, which Dropbox encrypts with keys it manages.",
      "A Tessil portal is also a link anyone can send files through. The difference is where the encryption happens: in the sender's browser, with a key that only your browser can use. We never have a readable copy, and neither does anyone who could compel us. We do not ask senders who they are; you can add a field of your own if you need a name or a client number.",
      "Files sent to a portal are not meant to stay. They are deleted after 30 days, or 90 on Max, so you download what you need to keep.",
    ],
    rows: [
      { label: "Encrypted so the provider cannot read it", tessil: PORTAL.e2e, competitor: "Not by default" },
      { label: "Senders need no account", tessil: PORTAL.noAccount, competitor: "Yes, with name and email" },
      { label: "List of the documents you need", tessil: PORTAL.checklist, competitor: false },
      { label: "Confirmation with a reference for the sender", tessil: true, competitor: false },
      { label: "Largest upload", tessil: "10 GB at once", competitor: "Up to 250 GB per file on paid plans" },
      { label: "What arrives is deleted", tessil: PORTAL.deleted, competitor: "Kept in your Dropbox" },
      { label: "Open source", tessil: PORTAL.openSource, competitor: false },
      { label: "Company", tessil: "Made in the Netherlands, hosted in the EU", competitor: "United States" },
      { label: "Price", tessil: PORTAL.price, competitor: "Included with Dropbox plans" },
    ],
    verdict: [
      "If you already pay for Dropbox and the files are not sensitive, file requests are hard to beat: they are already there and take very large files.",
      "If the files are tax returns, IDs, medical letters or contracts, the question is who else can read them once they arrive. With a portal the answer is nobody but you, and they do not pile up in storage for years.",
    ],
    faq: [
      {
        q: "Are Dropbox file requests end-to-end encrypted?",
        a: "Dropbox encrypts stored files with keys it manages, so Dropbox can read them. It offers end-to-end encrypted folders on some business plans; we found no statement that file requests use them.",
      },
      {
        q: "Do senders need a Tessil account?",
        a: "No. They open your link, add their files and press send. We do not ask for their name or email address.",
      },
      {
        q: "Where do the files go?",
        a: "Into your portal, encrypted. You open and download them in your browser, where your vault holds the key. They are deleted automatically after 30 days, or 90 on Max.",
      },
    ],
    cta: { label: "See how portals work", href: "/portals" },
  },
  {
    slug: "google-forms-alternative",
    kind: "form",
    competitor: "Google Forms",
    shortName: "Google Forms",
    metaTitle: "Private Google Forms alternative, end-to-end encrypted - Tessil",
    metaDescription:
      "A form builder where questions and answers are encrypted in the browser, so only you can read the responses. How Tessil forms compare to Google Forms.",
    heading: "Tessil vs Google Forms",
    summary:
      "Google Forms is free and easy. Tessil forms are encrypted end to end, so nobody but you can read the answers, including us.",
    intro: [
      "Google Forms is the form builder most people know: free, quick to set up, and tied into Sheets. Responses are stored in your Google account, which Google can read, and a file upload question asks respondents to sign in with a Google account.",
      "Tessil forms work differently. Your questions and every answer are encrypted in the browser, with a key that only you have. People answering need no account, also when they add a file. The summary and the export to a spreadsheet are made in your browser, after your vault has opened the answers.",
      "That makes Tessil the better fit when the answers are personal: client intake, applications, anything you would not want sitting readable on someone else's server.",
    ],
    rows: [
      { label: "Answers encrypted so the provider cannot read them", tessil: FORM.e2e, competitor: false },
      { label: "People answer without an account", tessil: FORM.noAccount, competitor: true },
      { label: "Files as answers without an account", tessil: true, competitor: "Respondents must sign in to Google" },
      { label: "Summary and export to a spreadsheet", tessil: true, competitor: true },
      { label: "Logic, quizzes and add-ons", tessil: false, competitor: true },
      { label: "Responses deleted automatically", tessil: FORM.deleted, competitor: "Kept until you delete them" },
      { label: "Open source", tessil: FORM.openSource, competitor: false },
      { label: "Company", tessil: "Made in the Netherlands, hosted in the EU", competitor: "United States" },
      { label: "Price", tessil: FORM.price, competitor: "Free" },
    ],
    verdict: [
      "For a lunch poll or a sign-up sheet, Google Forms is free and does more: branching, quizzes, add-ons. Tessil does not try to match that.",
      "For questions whose answers are personal, Google Forms puts them in a place Google can read. A Tessil form keeps them readable to you alone, and asks nobody to sign in to send you a file.",
    ],
    faq: [
      {
        q: "Are Google Forms responses encrypted?",
        a: "Google encrypts stored data, but with keys it manages, so Google can read responses. Tessil encrypts questions and answers in the browser with a key that never reaches us.",
      },
      {
        q: "Can I export Tessil form responses to a spreadsheet?",
        a: "Yes, as CSV. The export is made in your browser after your vault opens the answers, so the readable version never passes through our servers.",
      },
      {
        q: "Do people need an account to answer?",
        a: "No, not even to add a file.",
      },
    ],
    cta: { label: "Try the form editor", href: "/forms/try" },
  },
  {
    slug: "typeform-alternative",
    kind: "form",
    competitor: "Typeform",
    shortName: "Typeform",
    metaTitle: "Encrypted Typeform alternative for sensitive answers - Tessil",
    metaDescription:
      "Forms where only you can read the answers: encrypted in the respondent's browser, hosted in the EU. How Tessil forms compare to Typeform.",
    heading: "Tessil vs Typeform",
    summary:
      "Typeform makes beautiful forms. Tessil makes forms whose answers nobody else can read.",
    intro: [
      "Typeform is known for forms that ask one question at a time and feel like a conversation, with logic, design themes and many integrations. It encrypts responses on its servers with keys it manages, so Typeform can read them, and keeping data in the EU is offered on its higher plans.",
      "Tessil forms are plainer and private by design. Questions and answers are encrypted in the browser with a key only you have, on every plan, and everything is hosted in the EU. People answering need no account.",
    ],
    rows: [
      { label: "Answers encrypted so the provider cannot read them", tessil: FORM.e2e, competitor: false },
      { label: "Data kept in the EU", tessil: "Always", competitor: "On higher plans" },
      { label: "People answer without an account", tessil: FORM.noAccount, competitor: true },
      { label: "One question at a time, with logic", tessil: false, competitor: true },
      { label: "Integrations", tessil: false, competitor: true },
      { label: "Responses deleted automatically", tessil: FORM.deleted, competitor: "Kept until you delete them" },
      { label: "Open source", tessil: FORM.openSource, competitor: false },
      { label: "Price", tessil: FORM.price, competitor: "Limited free plan + paid plans" },
    ],
    verdict: [
      "For marketing surveys and lead forms, Typeform's design and integrations are worth it, and Tessil will not compete on either.",
      "For intake forms and anything with personal data, the deciding question is who can read the answers. With Tessil it is only you, on every plan, without paying extra to keep data in the EU.",
    ],
    faq: [
      {
        q: "Is Typeform end-to-end encrypted?",
        a: "No. Typeform encrypts data at rest and in transit with keys it manages. Tessil encrypts in the respondent's browser with a key that never reaches us.",
      },
      {
        q: "Does Tessil have conditional logic?",
        a: "Not yet. Tessil forms have seven kinds of question, required answers, a welcome and a thank-you text, a closing date and file uploads.",
      },
    ],
    cta: { label: "Try the form editor", href: "/forms/try" },
  },
  {
    slug: "jotform-alternative",
    kind: "form",
    competitor: "Jotform",
    shortName: "Jotform",
    metaTitle: "Jotform alternative with encryption on every form - Tessil",
    metaDescription:
      "Every Tessil form is encrypted end to end, with no setting to forget. How Tessil forms compare to Jotform and its encrypted forms option.",
    heading: "Tessil vs Jotform",
    summary:
      "Jotform can encrypt a form if you switch it on. On Tessil, every form is encrypted, always.",
    intro: [
      "Jotform is a large form builder with thousands of templates, payments, workflows and an option for EU servers. It also offers encrypted forms: switch encryption on for a form and its submissions can only be read with your access code. Fair to say: that is real end-to-end encryption, and it is a per-form choice.",
      "On Tessil there is no switch. Every question and every answer is encrypted in the browser, with a key held in your vault. The form's own name and questions are encrypted too. The trade-off is scope: Tessil does far less than Jotform.",
    ],
    rows: [
      { label: "Answers encrypted so the provider cannot read them", tessil: FORM.e2e, competitor: "Optional, per form" },
      { label: "Questions and form name encrypted too", tessil: true, competitor: false },
      { label: "People answer without an account", tessil: FORM.noAccount, competitor: true },
      { label: "Payments, workflows and templates", tessil: false, competitor: true },
      { label: "Data kept in the EU", tessil: "Always", competitor: "EU servers available" },
      { label: "Responses deleted automatically", tessil: FORM.deleted, competitor: "Kept until you delete them" },
      { label: "Open source", tessil: FORM.openSource, competitor: false },
      { label: "Company", tessil: "Made in the Netherlands, hosted in the EU", competitor: "United States" },
      { label: "Price", tessil: FORM.price, competitor: "Free plan + paid plans" },
    ],
    verdict: [
      "If you need payments, approvals or a template for every occasion, Jotform does far more, and its encrypted forms are a good option when you remember to use them.",
      "If you want privacy to be the default rather than a setting, and a short, plain tool around it, Tessil is the simpler choice.",
    ],
    faq: [
      {
        q: "Does Jotform have end-to-end encryption?",
        a: "Yes, as an option per form. Encrypted submissions need your access code to read. Forms without it are stored with encryption Jotform manages.",
      },
      {
        q: "What does Tessil encrypt?",
        a: "Everything a form holds: its name, questions, options, your texts, every answer and every file. We see that a form exists, when responses arrive and how large they are.",
      },
    ],
    cta: { label: "Try the form editor", href: "/forms/try" },
  },
  {
    slug: "formdesk-alternative",
    kind: "form",
    competitor: "Formdesk",
    shortName: "Formdesk",
    metaTitle: "Formdesk alternative with end-to-end encrypted answers - Tessil",
    metaDescription:
      "Dutch, EU-hosted forms where only you can read the answers. How Tessil forms compare to Formdesk.",
    heading: "Tessil vs Formdesk",
    summary:
      "Both are Dutch and keep data in the EU. Tessil adds end-to-end encryption, so even we cannot read the answers.",
    intro: [
      "Formdesk is a Dutch form builder with a long track record, used by many Dutch organisations. It hosts all data in the Netherlands, states ISO 27001 and NEN 7510 certification, and has features for payments, workflows and integrations.",
      "Tessil forms are newer and smaller. The difference that matters is end-to-end encryption: questions and answers are encrypted in the respondent's browser with a key only you have, so we could not read them if we tried. We found no such statement from Formdesk.",
    ],
    rows: [
      { label: "Answers encrypted so the provider cannot read them", tessil: FORM.e2e, competitor: "Not stated by Formdesk" },
      { label: "Data kept in the Netherlands or EU", tessil: FORM.hosting, competitor: "Netherlands" },
      { label: "ISO 27001 / NEN 7510", tessil: false, competitor: "Yes, per Formdesk" },
      { label: "People answer without an account", tessil: FORM.noAccount, competitor: true },
      { label: "Payments, workflows and integrations", tessil: false, competitor: true },
      { label: "Open source", tessil: FORM.openSource, competitor: false },
      { label: "Price", tessil: FORM.price, competitor: "Paid plans" },
    ],
    verdict: [
      "For an organisation that needs certifications, payments and workflows, Formdesk is the established Dutch choice, and Tessil does not have its certifications.",
      "If what matters most is that nobody but you can read the answers, not even the company that runs the forms, Tessil gives you that, with the code open for anyone to check.",
    ],
    faq: [
      {
        q: "Is Tessil certified?",
        a: "Not yet. Instead, the code is open source and the encryption can be checked by anyone; see the verify page. What we can see is listed in full on the security page.",
      },
      {
        q: "Where is Tessil hosted?",
        a: "In the EU: servers in Germany, the database in Amsterdam, encrypted files on storage restricted to the EU.",
      },
    ],
    cta: { label: "Try the form editor", href: "/forms/try" },
  },
  {
    slug: "tresorit-file-request-alternative",
    kind: "portal",
    competitor: "Tresorit file requests",
    shortName: "Tresorit",
    metaTitle: "Tresorit file request alternative, open source - Tessil",
    metaDescription:
      "Collect files from clients through an end-to-end encrypted link, without asking for their email address. How Tessil portals compare to Tresorit file requests.",
    heading: "Tessil vs Tresorit file requests",
    summary:
      "Both collect files through an end-to-end encrypted link. Tessil asks senders nothing, is open source, and is priced per account.",
    intro: [
      "Tresorit, a Swiss encrypted storage company, offers file requests on its Solo, Business and Enterprise plans: a link through which anyone can upload files into a folder in your Tresorit, end-to-end encrypted. Uploaders need no Tresorit account but give an email address, an upload session holds up to 5 GB, and a folder has one request link at a time. It is a serious, well-regarded product, and the encryption is real.",
      "A Tessil portal does the same core job with a different shape. Senders give nothing about themselves unless you add a field for it, you can list the documents you need so you see what is missing, and every sender gets a confirmation with a reference. The code is open source, so the encryption can be checked rather than taken on trust.",
    ],
    rows: [
      { label: "Encrypted so the provider cannot read it", tessil: PORTAL.e2e, competitor: true },
      { label: "Senders need no account", tessil: PORTAL.noAccount, competitor: "Yes, but they give an email address" },
      { label: "List of the documents you need", tessil: PORTAL.checklist, competitor: false },
      { label: "Encrypted storage and sync for your own files", tessil: false, competitor: true },
      { label: "Open source", tessil: PORTAL.openSource, competitor: false },
      { label: "Hosting", tessil: PORTAL.hosting, competitor: "Swiss company" },
      { label: "Price", tessil: PORTAL.price, competitor: "Part of its Solo, Business and Enterprise plans" },
    ],
    verdict: [
      "If your team already keeps its files in Tresorit, its file requests are the natural choice: what clients send lands next to everything else, end-to-end encrypted.",
      "If you only need clients to send you documents, a portal is lighter: no email address asked of them, a checklist of what is still missing, open-source code, and a price that does not depend on storage plans.",
    ],
    faq: [
      {
        q: "Are both end-to-end encrypted?",
        a: "Yes. Tresorit encrypts file request uploads end to end, and so does Tessil. The difference is that Tessil's code is public, so anyone can check how it is done.",
      },
      {
        q: "Do senders have to give their email address?",
        a: "On Tresorit file requests, yes. On a Tessil portal, no: we ask senders nothing, and you can add one field of your own, such as a name or client number, which is encrypted like the files.",
      },
      {
        q: "Is a portal a replacement for Tresorit?",
        a: "Only for receiving. Tessil is not storage: files are kept for 30 days, or 90 on Max, and then deleted. Download what you need to keep.",
      },
    ],
    cta: { label: "See how portals work", href: "/portals" },
  },
  {
    slug: "cryptpad-form-alternative",
    kind: "form",
    competitor: "CryptPad Form",
    shortName: "CryptPad",
    metaTitle: "CryptPad Form alternative for encrypted intake forms - Tessil",
    metaDescription:
      "Two open-source, end-to-end encrypted form builders. How Tessil forms compare to CryptPad Form, and when to pick each.",
    heading: "Tessil vs CryptPad Form",
    summary:
      "Both are open source and end-to-end encrypted. CryptPad is a free office suite with forms; Tessil is a form and file tool for clients.",
    intro: [
      "CryptPad is an open-source, end-to-end encrypted office suite made in France, free to use on its cryptpad.fr instance and possible to host yourself. Its Form app encrypts questions and answers so only the form's owners can read them, lets people answer anonymously, and offers roles for who edits, who reads responses and who answers. It is the closest thing to Tessil forms in principle, and an excellent project.",
      "Tessil forms share the principle and differ in purpose. They are built for collecting answers and documents from clients: a file question encrypted like the rest, a summary per question and a CSV export made in your browser, and templates, all hosted for you in the EU. People answering need no account.",
    ],
    rows: [
      { label: "Answers encrypted so the provider cannot read them", tessil: FORM.e2e, competitor: true },
      { label: "Open source", tessil: FORM.openSource, competitor: "Yes (AGPL-3.0)" },
      { label: "People answer without an account", tessil: FORM.noAccount, competitor: true },
      { label: "File question", tessil: true, competitor: "Not in its documentation" },
      { label: "Documents, sheets and other office apps", tessil: false, competitor: true },
      { label: "Self-hosting", tessil: false, competitor: true },
      { label: "Price", tessil: FORM.price, competitor: "Free on cryptpad.fr" },
    ],
    verdict: [
      "If you want a free, encrypted suite of documents, sheets and forms, or want to host it yourself, CryptPad is the better fit, and its forms are good.",
      "If you collect personal answers and documents from clients, Tessil is built for exactly that: file questions, a checklist-style flow, a confirmation with a reference, and nothing for you to run.",
    ],
    faq: [
      {
        q: "Are both really end-to-end encrypted?",
        a: "Yes. CryptPad encrypts forms and answers in the browser, as Tessil does, and both publish their code under AGPL-3.0.",
      },
      {
        q: "Can people send files through a CryptPad form?",
        a: "We found no file question in CryptPad's form documentation. In a Tessil form, a file question is encrypted in the respondent's browser like every other answer.",
      },
      {
        q: "Why pay for Tessil when CryptPad is free?",
        a: "You may not need to. If CryptPad's forms do what you need, use them. Tessil's paid plans add file questions, portals for receiving documents, and storage that is run and kept for you.",
      },
    ],
    cta: { label: "Try the form editor", href: "/forms/try" },
  },
];
