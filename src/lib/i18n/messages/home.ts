// The homepage's text. See README.md in this folder.

import type { Locale } from "../locale";

const en = {
  pageTitle: "End-to-end encrypted file transfer, hosted in the EU - Tessil",
  pageDescription:
    "Send files end-to-end encrypted, hosted in the EU. Your browser encrypts before upload and the key stays in the link. Free, open source, no account needed.",
  schemaFeatures: [
    "End-to-end encrypted file transfer",
    "Client-side encryption in browser",
    "Temporary links with expiration",
    "Optional password protection",
  ],

  newTag: "New",
  heroLine1: "Send anything.",
  heroLine2: "We see nothing.",
  heroSub: "End-to-end encrypted in your browser. The key never reaches our server.",
  heroDrop: "Drop a file in the panel - or anywhere on this page.",
  artFrom: ", from",
  artWall: "On this wall this month.",

  features: {
    portals: {
      name: "Portals",
      line: "A link where people send you files. Only you can open them.",
      link: "Meet portals",
      pill: "Now you can receive files too",
    },
    forms: {
      name: "Forms",
      line: "Ask your questions with one link. Only you can read the answers.",
      link: "Meet forms",
      pill: "Forms only you can read",
    },
    cli: {
      name: "Terminal",
      line: "Send and receive from your terminal, or let your AI assistant do it.",
      link: "Meet the tool",
      pill: "Tessil in your terminal",
    },
  },

  howTitle: "How it works",
  steps: {
    encrypted: {
      title: "Encrypted before it leaves",
      body: "Your browser scrambles every file, its name included. What reaches us is unreadable.",
    },
    key: {
      title: "The key is never ours",
      body: "It travels in the part of the link browsers don't send to servers.",
      bodyPortals:
        "It travels in the part of the link browsers don't send to servers. For portals it stays in your vault.",
    },
    gone: {
      title: "Gone when it should be",
      body: "Transfers expire in hours or days, and the files are deleted with them.",
      bodyPortals:
        "Transfers expire in hours or days. What arrives in a portal is deleted after 30 days, or 90 on Max.",
    },
    check: {
      title: "Check it yourself",
      body: "Four checks in your own browser, about two minutes.",
      link: "Verify it",
    },
  },

  portals: {
    title: "Now it works both ways.",
    body: "A portal is a link you hand to the people you work with. They see what you need and send it, without an account. It is encrypted in their browser, so what arrives can be opened by you and nobody else, us included.",
    points: [
      "A checklist that shows what is still missing",
      "Works on a phone, no account for the sender",
      "Deleted automatically after 30 days, or 90 on Max",
    ],
    open: "Open your portals",
    plans: "See the plans",
    note: "You set portals up in your account. Sending stays free.",
    tour: "Take the tour",
    mock: {
      sendTo: "Send files to",
      needed: "What is needed",
      progress: "2 of 3 added",
      contract: "Signed contract",
      logos: "Logo files",
      invoice: "Invoice details",
      choose: "Choose file",
      send: "Send 2 files",
    },
  },

  forms: {
    title: "Ask anything. Only you read the answers.",
    body: "A form is a link with your questions on it. The questions are encrypted in your browser and each answer in theirs, so we can read neither. Together the answers add up to a summary only you see.",
    points: [
      "Seven kinds of question, files among them",
      "A summary per question, and an export to a spreadsheet",
      "No account for the people who answer",
    ],
    video: "The form editor: questions are added, then the form is filled in and sent.",
    try: "Try the editor",
    note: "No account needed to try it.",
    tour: "Take the tour",
  },

  terminal: {
    title: "No browser needed.",
    body: "The same encrypted transfers and portals from your terminal, your scripts and your AI assistant. The tool signs in with a key of its own, never your password, and an assistant that sends a file for you never sees the link.",
    points: [
      "Open source, on macOS and Linux",
      "Pull what arrived in a portal into folders",
      "One access key with every account, the free one too",
    ],
    meet: "Meet the tool",
  },

  pricing: {
    title: "Pay for more. Never for privacy.",
    body: "Sending is free, encrypted, and stays that way. A plan adds",
    adds: "portals",
    addsWithForms: "portals and forms",
    link: "See what each plan includes",
  },

  explained: {
    title: "Tessil, explained",
    p1: "Tessil is an end-to-end encrypted file transfer service. Files are scrambled in your browser before they leave your device. The decryption key lives in the URL fragment of the share link, the part after # that browsers don't send to servers. We never see your files, your filenames, or your keys.",
    p2Before: "You don't have to take that on faith.",
    p2Link: "Verify it yourself",
    p2After:
      "walks through four checks you can run against this site in about two minutes, using the developer tools already in your browser.",
    p3Before:
      "Without an account a link lasts up to three days; with a free account up to a week, and it stays in your list of transfers. Password protection adds a second factor independent of the link. Read more about the security model on the",
    p3Link: "security page",
    p4Before: "New to encrypted transfer? See how Tessil compares to",
    p4Link: "WeTransfer, Proton Drive, and other tools",
    p5Paid:
      "Built and run by one person. Sending is free; the paid plans, for receiving, are what keeps it running.",
    p5Free:
      "Built and run by one person, and free to use.",
  },

  faq: {
    title: "Questions",
    e2eQ: "Is Tessil really end-to-end encrypted?",
    e2eA: "Yes. Your files are encrypted in your browser with AES-GCM before they upload, and the decryption key lives in the share link, never on our servers. We can't read your files, your filenames, or your keys.",
    accountQ: "Do I need an account to send files?",
    accountA:
      "No. You can send and receive files anonymously. A free account is optional and just adds a list to manage the transfers you create. It doesn't change how files are encrypted.",
    differentQ: "How is Tessil different from WeTransfer or Dropbox?",
    differentA:
      "Those services can read what you upload. Tessil can't, because encryption happens in your browser before anything is sent. Tessil is also open source, EU-hosted, and shows no ads.",
    differentLink: "See the full comparison",
    sizeQ: "How large can the files be?",
    sizeA:
      "Large files are supported through multi-part uploads, so big transfers stay reliable even on slower connections. Signed-in transfers allow larger sizes than anonymous ones.",
    freeQ: "Is Tessil free?",
    freeA: (withForms: boolean) =>
      `Sending is free, with or without an account, and stays that way. Paid plans add ways to receive: ${withForms ? "portals for files and forms for answers" : "portals, links where people send files to you"}. No ads and no selling of data on any plan, and the code is open under the AGPL-3.0 licence.`,
    freeLink: "See the plans",
    freeAFree:
      "Yes, completely free, with no ads and no selling of data. Tessil is open source under the AGPL-3.0 licence, so anyone can audit exactly how it handles encryption.",
    lastQ: "How long do transfers last?",
    lastA:
      "Transfers expire automatically based on the time limit and download count you choose. Once a transfer expires, the encrypted data is deleted.",
  },

  ask: {
    title: "Or ask an AI",
    body: "You don't have to take our answers. Put the question to an assistant that has no stake in it. This is the exact wording it gets, and you can change it first:",
    prompt:
      "I am considering Tessil (https://tessil.app) for sending files. Read its security page (https://tessil.app/security), its verification page (https://tessil.app/verify) and its source code (https://github.com/tessil-app). Explain in plain language how its encryption works and what the service can and cannot see. Then be critical: what are its weaknesses and limits, what do I still have to trust, and how does it compare with WeTransfer, Proton Drive and Tresorit? Say clearly which claims you could not verify.",
    askWith: (name: string) => `Ask ${name}`,
    copy: "Copy the question",
    copied: "Copied",
    note: "These open another company's site with the question filled in. Nothing about you is sent along by us.",
  },
};

const nl: typeof en = {
  // What Dutch searchers type, ahead of the slogan.
  pageTitle: "Bestanden versleuteld versturen, gehost in de EU - Tessil",
  pageDescription:
    "Verstuur bestanden end-to-end versleuteld, gehost in de EU. Je browser versleutelt voor de upload en de sleutel blijft in de link. Gratis, open source, zonder account.",
  schemaFeatures: [
    "End-to-end versleuteld bestanden versturen",
    "Versleuteling in je eigen browser",
    "Tijdelijke links die verlopen",
    "Optionele beveiliging met een wachtwoord",
  ],

  newTag: "Nieuw",
  heroLine1: "Verstuur alles.",
  heroLine2: "Wij zien niets.",
  heroSub: "End-to-end versleuteld in je browser. De sleutel komt nooit op onze server.",
  heroDrop: "Sleep een bestand in het paneel, of ergens op deze pagina.",
  artFrom: ", uit",
  artWall: "Deze maand aan de muur.",

  features: {
    portals: {
      name: "Portalen",
      line: "Een link waarmee mensen jou bestanden sturen. Alleen jij kunt ze openen.",
      link: "Bekijk portalen",
      pill: "Je kunt nu ook bestanden ontvangen",
    },
    forms: {
      name: "Formulieren",
      line: "Stel je vragen met één link. Alleen jij kunt de antwoorden lezen.",
      link: "Bekijk formulieren",
      pill: "Formulieren die alleen jij kunt lezen",
    },
    cli: {
      name: "Terminal",
      line: "Verstuur en ontvang vanuit je terminal, of laat je AI-assistent het doen.",
      link: "Bekijk de tool",
      pill: "Tessil in je terminal",
    },
  },

  howTitle: "Zo werkt het",
  steps: {
    encrypted: {
      title: "Versleuteld voordat het vertrekt",
      body: "Je browser versleutelt elk bestand, ook de naam. Wat bij ons aankomt is onleesbaar.",
    },
    key: {
      title: "De sleutel is nooit van ons",
      body: "Die zit in het deel van de link dat browsers niet naar servers sturen.",
      bodyPortals:
        "Die zit in het deel van de link dat browsers niet naar servers sturen. Bij portalen blijft hij in je kluis.",
    },
    gone: {
      title: "Weg wanneer het moet",
      body: "Transfers verlopen na uren of dagen, en de bestanden worden dan verwijderd.",
      bodyPortals:
        "Transfers verlopen na uren of dagen. Wat in een portaal binnenkomt wordt na 30 dagen verwijderd, of na 90 bij Max.",
    },
    check: {
      title: "Controleer het zelf",
      body: "Vier controles in je eigen browser, in ongeveer twee minuten.",
      link: "Controleer het",
    },
  },

  portals: {
    title: "Nu werkt het twee kanten op.",
    body: "Een portaal is een link die je geeft aan de mensen met wie je werkt. Zij zien wat je nodig hebt en sturen het, zonder account. Het wordt in hun browser versleuteld, dus wat binnenkomt kun alleen jij openen, wij ook niet.",
    points: [
      "Een checklist die laat zien wat nog ontbreekt",
      "Werkt op een telefoon, geen account nodig voor de afzender",
      "Automatisch verwijderd na 30 dagen, of na 90 bij Max",
    ],
    open: "Open je portalen",
    plans: "Bekijk de abonnementen",
    note: "Je richt portalen in vanuit je account. Versturen blijft gratis.",
    tour: "Bekijk hoe het werkt",
    mock: {
      sendTo: "Stuur bestanden naar",
      needed: "Wat er nodig is",
      progress: "2 van 3 toegevoegd",
      contract: "Getekend contract",
      logos: "Logobestanden",
      invoice: "Factuurgegevens",
      choose: "Kies bestand",
      send: "Verstuur 2 bestanden",
    },
  },

  forms: {
    title: "Vraag wat je wilt. Alleen jij leest de antwoorden.",
    body: "Een formulier is een link met jouw vragen erop. De vragen worden in jouw browser versleuteld en elk antwoord in die van de invuller, dus wij kunnen geen van beide lezen. Samen vormen de antwoorden een overzicht dat alleen jij ziet.",
    points: [
      "Zeven soorten vragen, waaronder bestanden",
      "Een overzicht per vraag, en een export naar een spreadsheet",
      "Geen account nodig voor wie antwoordt",
    ],
    video: "De formuliereditor: er worden vragen toegevoegd, daarna wordt het formulier ingevuld en verstuurd.",
    try: "Probeer de editor",
    note: "Geen account nodig om het te proberen.",
    tour: "Bekijk hoe het werkt",
  },

  terminal: {
    title: "Geen browser nodig.",
    body: "Dezelfde versleutelde transfers en portalen vanuit je terminal, je scripts en je AI-assistent. De tool logt in met een eigen sleutel, nooit met je wachtwoord, en een assistent die een bestand voor je verstuurt ziet de link nooit.",
    points: [
      "Open source, op macOS en Linux",
      "Haal wat in een portaal binnenkwam op in mappen",
      "Eén toegangssleutel bij elk account, ook het gratis account",
    ],
    meet: "Bekijk de tool",
  },

  pricing: {
    title: "Betaal voor meer. Nooit voor privacy.",
    body: "Versturen is gratis, versleuteld, en blijft dat. Een abonnement voegt toe:",
    adds: "portalen",
    addsWithForms: "portalen en formulieren",
    link: "Bekijk wat elk abonnement bevat",
  },

  explained: {
    title: "Tessil, uitgelegd",
    p1: "Tessil is een dienst om end-to-end versleuteld bestanden te versturen. Bestanden worden in je browser versleuteld voordat ze je apparaat verlaten. De sleutel staat in het deel van de deellink na de #, dat browsers niet naar servers sturen. Wij zien nooit je bestanden, je bestandsnamen of je sleutels.",
    p2Before: "Je hoeft ons niet op ons woord te geloven.",
    p2Link: "Controleer het zelf",
    p2After:
      "laat je in ongeveer twee minuten vier controles doen op deze site, met de ontwikkelaarstools die al in je browser zitten.",
    p3Before:
      "Zonder account blijft een link tot drie dagen geldig, met een gratis account tot een week, en hij blijft dan in je lijst met transfers staan. Een wachtwoord voegt een tweede slot toe, los van de link. Lees meer over hoe de beveiliging werkt op de",
    p3Link: "beveiligingspagina",
    p4Before: "Nieuw met versleuteld versturen? Bekijk hoe Tessil zich verhoudt tot",
    p4Link: "WeTransfer, Proton Drive en andere diensten",
    p5Paid:
      "Gebouwd en onderhouden door één persoon. Versturen is gratis; de betaalde abonnementen, om te ontvangen, houden het draaiende.",
    p5Free:
      "Gebouwd en onderhouden door één persoon, en gratis te gebruiken.",
  },

  faq: {
    title: "Vragen",
    e2eQ: "Is Tessil echt end-to-end versleuteld?",
    e2eA: "Ja. Je bestanden worden in je browser met AES-GCM versleuteld voordat ze worden geüpload, en de sleutel staat in de deellink, nooit op onze servers. Wij kunnen je bestanden, bestandsnamen en sleutels niet lezen.",
    accountQ: "Heb ik een account nodig om bestanden te versturen?",
    accountA:
      "Nee. Je kunt anoniem bestanden versturen en ontvangen. Een gratis account is optioneel en geeft je een lijst met je transfers. Aan de versleuteling verandert het niets.",
    differentQ: "Wat is het verschil met WeTransfer of Dropbox?",
    differentA:
      "Die diensten kunnen lezen wat je uploadt. Tessil niet, want de versleuteling gebeurt in je browser voordat er iets wordt verstuurd. Tessil is daarnaast open source, gehost in de EU en zonder advertenties.",
    differentLink: "Bekijk de volledige vergelijking",
    sizeQ: "Hoe groot mogen de bestanden zijn?",
    sizeA:
      "Grote bestanden worden in delen geüpload, zodat grote transfers ook op een tragere verbinding goed aankomen. Met een account mogen transfers groter zijn dan zonder.",
    freeQ: "Is Tessil gratis?",
    freeA: (withForms: boolean) =>
      `Versturen is gratis, met of zonder account, en blijft dat. Betaalde abonnementen voegen manieren toe om te ontvangen: ${withForms ? "portalen voor bestanden en formulieren voor antwoorden" : "portalen, links waarmee mensen jou bestanden sturen"}. Geen advertenties en geen verkoop van gegevens, bij geen enkel abonnement, en de code is open onder de AGPL-3.0-licentie.`,
    freeLink: "Bekijk de abonnementen",
    freeAFree:
      "Ja, helemaal gratis, zonder advertenties en zonder verkoop van gegevens. Tessil is open source onder de AGPL-3.0-licentie, dus iedereen kan precies nagaan hoe de versleuteling werkt.",
    lastQ: "Hoe lang blijven transfers bestaan?",
    lastA:
      "Transfers verlopen vanzelf, na de tijd en het aantal downloads dat je kiest. Zodra een transfer verloopt, worden de versleutelde gegevens verwijderd.",
  },

  ask: {
    title: "Of vraag het een AI",
    body: "Je hoeft onze antwoorden niet te geloven. Leg de vraag voor aan een assistent die er geen belang bij heeft. Dit is precies wat hij te lezen krijgt, en je kunt het eerst aanpassen:",
    prompt:
      "Ik overweeg Tessil (https://tessil.app) om bestanden te versturen. Lees de beveiligingspagina (https://tessil.app/security), de controlepagina (https://tessil.app/verify) en de broncode (https://github.com/tessil-app). Leg in gewone taal uit hoe de versleuteling werkt en wat de dienst wel en niet kan zien. Wees daarna kritisch: wat zijn de zwakke punten en beperkingen, wat moet ik nog steeds vertrouwen, en hoe verhoudt het zich tot WeTransfer, Proton Drive en Tresorit? Zeg duidelijk welke beweringen je niet kon controleren.",
    askWith: (name: string) => `Vraag het ${name}`,
    copy: "Kopieer de vraag",
    copied: "Gekopieerd",
    note: "Deze links openen de site van een ander bedrijf met de vraag al ingevuld. Wij sturen niets over jou mee.",
  },
};

export const homeMessages: Record<Locale, typeof en> = { en, nl };
