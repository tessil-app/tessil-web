// The portals page's text. See README.md in this folder.

import type { Locale } from "../locale";

const en = {
  title: "Portals - Tessil",
  description:
    "A link where people send you files that only you can open. Encrypted in their browser, deleted automatically after 30 days, or 90 on the larger plan, no account needed to send.",
  heading: "Portals.",
  sub: "Hand out one link. Files find their way to you, and nobody else.",

  sequence: [
    {
      title: "You hand out one link",
      text: "With a list of what you need, if you like. The link holds the key that lets a browser encrypt for you, and it never reaches us.",
    },
    {
      title: "They send, without an account",
      text: "They open the link, pick their files and press send. They see what is still missing, and get a confirmation with a reference.",
    },
    {
      title: "It arrives for you alone",
      text: "You open it with the key in your vault. After 30 days, or 90 on Max, it is gone automatically, so download what you want to keep.",
    },
  ],

  demo: {
    weHold: "What we would hold",
    itsName: "Its name",
    whatIsIn: "What is in it",
    whatWeRead: "Its size and when it came, which we can read",
    justNow: "just now",
    sizeJustNow: (size: string) => `${size}, just now`,
    stageLabel: "Drop a file into the portal, or press to choose one. Nothing is uploaded.",
    youGet: "What you would get",
    kept: (size: string) => `${size}, deleted after 30 days, or 90 on Max`,
    vault: "Opened with the key in your vault, which we never have.",
    done: "That was your file, encrypted in this page. Nothing was uploaded.",
    prompt: "Drop a file into it. Nothing leaves this page.",
    another: "Send another",
    sample: "Or use a sample",
    sampleText: "Signed on 14 November 2026.\n",
    sampleName: "contract-signed.pdf",
  },

  before: "Until now you could send files without us seeing them.",
  beforeAfter: "Now people can send files to you the same way.",

  seeNothing: "We see nothing. Still.",
  seeNothingBody:
    "Files are encrypted in the sender's browser, with a key that only your browser can unlock. It lives in your vault, not on our servers. We cannot read the files, their names, the notes people add, what you ask for, or even what you called the portal.",
  takeWord: "Don't take our word for it.",
  readHow: "Read how it works",
  or: "or",
  checkYourself: "check it yourself",

  askOnce: "Ask once.",
  watchArrive: "Watch it arrive.",
  askBody:
    "Add a short list of what you need. Everyone who opens your link sees it, ticks things off as they add files, and gets a confirmation with a reference. You get the same reference on your side.",
  askPoints: [
    "A confirmation for them, a record for you",
    "Search across everything that came in",
    "Share a portal with one colleague",
    "Switch a link off whenever you like",
  ],
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

  yours: "Make it yours.",
  yoursBody:
    "Every portal has its own switches. Turn on what this one needs, watch the page change beside you as you do, and change your mind later. The link stays the same.",
  options: [
    {
      name: "A welcome and a thank-you",
      about: "A few lines above the upload box, and a note after sending that says what happens next.",
    },
    {
      name: "A field of your own",
      about: "Ask for a name, a client number or an order reference. You see it with everything that person sends.",
    },
    {
      name: "A closing date",
      about: "The page says until when, and the portal closes by itself when the day ends.",
    },
    {
      name: "An email when files arrive",
      about: "One per portal per hour at most. It can't say what came in, because we can't read that.",
    },
    {
      name: "Your logo",
      about: "Above the name, so the page looks like yours and not like ours.",
      max: true,
    },
    {
      name: "Files going back",
      about: "Put a form, a quote or a finished report on the portal for the other side to download.",
      max: true,
    },
    {
      name: "A password",
      about: "The page shows nothing until it is entered. Change it whenever you like; the link stays.",
      max: true,
    },
    {
      name: "Duplicate",
      about: "Set one up the way you like it, then make the next one from it with a new link.",
    },
  ] as { name: string; about: string; max?: boolean }[],
  optionsNote: "Your texts, your logo and what you send back are encrypted like everything else. We can't read them.",

  open: "Open one.",
  openBody:
    "Portals are part of the paid plans. You set them up in your account, and it takes about as long as reading this sentence twice.",
  yourPortals: "Open your portals",
  plans: "See the plans",
  signIn: "Sign in",
  free: "Sending files stays free, with or without an account.",
  sendSomething: "Send something",
};

const nl: typeof en = {
  title: "Portalen - Tessil",
  description:
    "Een link waarmee mensen jou bestanden sturen die alleen jij kunt openen. Versleuteld in hun browser, automatisch verwijderd na 30 dagen, of na 90 bij het grotere abonnement, en geen account nodig om te versturen.",
  heading: "Portalen.",
  sub: "Geef één link. Bestanden vinden de weg naar jou, en naar niemand anders.",

  sequence: [
    {
      title: "Je geeft één link",
      text: "Met een lijstje van wat je nodig hebt, als je wilt. In de link zit de sleutel waarmee een browser voor jou versleutelt, en die komt nooit bij ons.",
    },
    {
      title: "Zij versturen, zonder account",
      text: "Ze openen de link, kiezen hun bestanden en drukken op versturen. Ze zien wat nog ontbreekt en krijgen een bevestiging met een referentie.",
    },
    {
      title: "Het komt alleen bij jou aan",
      text: "Je opent het met de sleutel in je kluis. Na 30 dagen, of 90 bij Max, is het vanzelf weg, dus download wat je wilt bewaren.",
    },
  ],

  demo: {
    weHold: "Wat wij zouden bewaren",
    itsName: "De naam",
    whatIsIn: "Wat erin zit",
    whatWeRead: "De grootte en wanneer het binnenkwam, dat kunnen wij lezen",
    justNow: "zojuist",
    sizeJustNow: (size: string) => `${size}, zojuist`,
    stageLabel: "Sleep een bestand in het portaal, of druk om er een te kiezen. Er wordt niets geüpload.",
    youGet: "Wat jij zou krijgen",
    kept: (size: string) => `${size}, verwijderd na 30 dagen, of 90 bij Max`,
    vault: "Geopend met de sleutel in je kluis, die wij nooit hebben.",
    done: "Dat was jouw bestand, versleuteld op deze pagina. Er is niets geüpload.",
    prompt: "Sleep er een bestand in. Er verlaat niets deze pagina.",
    another: "Nog een versturen",
    sample: "Of gebruik een voorbeeld",
    sampleText: "Getekend op 14 november 2026.\n",
    sampleName: "contract-getekend.pdf",
  },

  before: "Tot nu toe kon je bestanden versturen zonder dat wij ze zagen.",
  beforeAfter: "Nu kunnen mensen jou op dezelfde manier bestanden sturen.",

  seeNothing: "Wij zien niets. Nog steeds.",
  seeNothingBody:
    "Bestanden worden versleuteld in de browser van de afzender, met een sleutel die alleen jouw browser kan openen. Die staat in je kluis, niet op onze servers. Wij kunnen de bestanden niet lezen, hun namen niet, de notities die mensen toevoegen niet, wat je vraagt niet, en zelfs niet hoe je het portaal noemde.",
  takeWord: "Geloof ons niet op ons woord.",
  readHow: "Lees hoe het werkt",
  or: "of",
  checkYourself: "controleer het zelf",

  askOnce: "Eén keer vragen.",
  watchArrive: "Zien wat binnenkomt.",
  askBody:
    "Zet een kort lijstje neer van wat je nodig hebt. Iedereen die je link opent ziet het, vinkt af wat hij toevoegt en krijgt een bevestiging met een referentie. Jij krijgt dezelfde referentie aan jouw kant.",
  askPoints: [
    "Een bevestiging voor hen, een overzicht voor jou",
    "Zoeken in alles wat binnenkwam",
    "Deel een portaal met één collega",
    "Zet een link uit wanneer je wilt",
  ],
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

  yours: "Maak het van jou.",
  yoursBody:
    "Elk portaal heeft zijn eigen schakelaars. Zet aan wat dit portaal nodig heeft, zie de pagina ernaast meteen veranderen, en bedenk je later gerust. De link blijft dezelfde.",
  options: [
    {
      name: "Een welkom en een bedankje",
      about: "Een paar regels boven het uploadvak, en een notitie na het versturen over wat er nu gebeurt.",
    },
    {
      name: "Een eigen veld",
      about: "Vraag om een naam, een klantnummer of een ordernummer. Je ziet het bij alles wat die persoon stuurt.",
    },
    {
      name: "Een sluitingsdatum",
      about: "De pagina zegt tot wanneer, en het portaal sluit vanzelf aan het eind van die dag.",
    },
    {
      name: "Een e-mail als er bestanden binnenkomen",
      about: "Hooguit één per portaal per uur. Er staat niet in wat er binnenkwam, want dat kunnen wij niet lezen.",
    },
    {
      name: "Je logo",
      about: "Boven de naam, zodat de pagina eruitziet als die van jou en niet als die van ons.",
      max: true,
    },
    {
      name: "Bestanden terugsturen",
      about: "Zet een formulier, een offerte of een afgerond rapport op het portaal, zodat de ander het kan downloaden.",
      max: true,
    },
    {
      name: "Een wachtwoord",
      about: "De pagina toont niets tot het is ingevuld. Wijzig het wanneer je wilt; de link blijft.",
      max: true,
    },
    {
      name: "Dupliceren",
      about: "Richt er één in zoals je wilt, en maak de volgende ervan met een nieuwe link.",
    },
  ],
  optionsNote: "Je teksten, je logo en wat je terugstuurt worden versleuteld zoals al het andere. Wij kunnen ze niet lezen.",

  open: "Open er een.",
  openBody:
    "Portalen horen bij de betaalde abonnementen. Je richt ze in vanuit je account, en dat duurt ongeveer zo lang als deze zin twee keer lezen.",
  yourPortals: "Open je portalen",
  plans: "Bekijk de abonnementen",
  signIn: "Inloggen",
  free: "Bestanden versturen blijft gratis, met of zonder account.",
  sendSomething: "Verstuur iets",
};

export const portalsMessages: Record<Locale, typeof en> = { en, nl };
