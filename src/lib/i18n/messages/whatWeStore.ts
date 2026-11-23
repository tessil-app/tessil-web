// The text of /what-we-store. Binding detail lives in the privacy policy;
// keep both languages saying the same. See README.md in this folder.

import type { Locale } from "../locale";

const en = {
  seoTitle: "What an account stores - Tessil",
  description:
    "An account on Tessil is optional. Here is everything it stores, what we can never read, and how to delete it all.",
  title: "What an account stores",
  tagline: "An account is optional. This is everything it adds, and what we cannot read either way.",
  updated: "November 22, 2026",

  shortTitle: "In short",
  short:
    "You can send files without an account: links then last up to three days. An account makes that a week, keeps a list of what you sent, and lets you sign in with a passkey. Your files are encrypted in your browser the same way, signed in or not.",

  storedTitle: "What we store with an account",
  stored: [
    {
      what: "Your email address",
      why: "To send you a sign-in link. There is no password to store, because there is none.",
    },
    {
      what: "When you signed in",
      why: "With the browser you used and the country and network of the connection. Not your IP address. Kept for 90 days.",
    },
    {
      what: "Your sessions",
      why: "So you stay signed in: up to 30 days without a visit, and never longer than 90 days in all.",
    },
    {
      what: "What you sent, in outline",
      why: "Each transfer's size, dates, download count, and that it is yours. Its files, their names and its title stay encrypted.",
    },
    {
      what: "Your passkeys",
      why: "Their public key and the name you give each one. Never your fingerprint or face: those stay on your device.",
    },
    {
      what: "Your vault, if you make one",
      why: "Only in locked form. It opens in your browser, with your password, your recovery phrase or a passkey, and nowhere else.",
    },
    {
      what: "Your plan",
      why: "Free, or for a paid plan that a subscription exists and when it renews. Your card details go to our payment provider, never to us.",
    },
  ],

  neverTitle: "What we can never read",
  neverIntro: "Not because we promise not to look, but because it reaches us encrypted and the key never does:",
  never: [
    "What is in your files",
    "The names of your files",
    "The titles of your transfers",
    "The key in a link, which is what opens a transfer",
    "Your vault password or recovery phrase",
  ],
  neverPortals: "The names of your portals and forms, their questions, and what people send or answer",
  checkBefore: "You can check this yourself in a couple of minutes:",
  checkLink: "verify it",

  notTitle: "What we do not do",
  not: [
    "No ads, analytics or trackers, and no tracking cookies",
    "No selling or sharing of your data",
    "No newsletters: we only email you to sign in, or about something you did",
  ],

  takeTitle: "Take it with you, or delete it",
  downloadLead: "Download it.",
  download: "Settings, Account, Your data gives you everything we hold about you as a file.",
  deleteLead: "Delete it.",
  delete:
    "Settings, Account, Delete account removes your account, your transfers and your sessions at once. There is no waiting period and no way back.",

  fullTitle: "In full",
  fullBefore: "This page is a summary. The",
  privacy: "privacy policy",
  fullMiddle: "is the full and binding version, and the",
  security: "security overview",
  fullAfter: "explains how the encryption works.",
};

const nl: typeof en = {
  seoTitle: "Wat een account bewaart - Tessil",
  description:
    "Een account bij Tessil is niet verplicht. Hier staat alles wat het bewaart, wat wij nooit kunnen lezen, en hoe je het allemaal verwijdert.",
  title: "Wat een account bewaart",
  tagline: "Een account is niet verplicht. Dit is alles wat het toevoegt, en wat wij hoe dan ook niet kunnen lezen.",
  updated: "22 november 2026",

  shortTitle: "In het kort",
  short:
    "Je kunt bestanden versturen zonder account: een link blijft dan tot drie dagen geldig. Met een account wordt dat een week, houd je een lijst bij van wat je verstuurde, en kun je inloggen met een passkey. Je bestanden worden op dezelfde manier in je browser versleuteld, ingelogd of niet.",

  storedTitle: "Wat we bewaren als je een account hebt",
  stored: [
    {
      what: "Je e-mailadres",
      why: "Om je een inloglink te sturen. Er is geen wachtwoord om te bewaren, want dat is er niet.",
    },
    {
      what: "Wanneer je inlogde",
      why: "Met de browser die je gebruikte en het land en netwerk van de verbinding. Niet je IP-adres. 90 dagen bewaard.",
    },
    {
      what: "Je sessies",
      why: "Zodat je ingelogd blijft: tot 30 dagen zonder bezoek, en nooit langer dan 90 dagen in totaal.",
    },
    {
      what: "Wat je verstuurde, in grote lijnen",
      why: "Van elke transfer de grootte, de data, het aantal downloads en dat hij van jou is. De bestanden, hun namen en de titel blijven versleuteld.",
    },
    {
      what: "Je passkeys",
      why: "Hun publieke sleutel en de naam die je elk geeft. Nooit je vingerafdruk of gezicht: die blijven op je apparaat.",
    },
    {
      what: "Je kluis, als je er een maakt",
      why: "Alleen op slot. Hij opent in je browser, met je wachtwoord, je herstelzin of een passkey, en nergens anders.",
    },
    {
      what: "Je abonnement",
      why: "Gratis, of bij een betaald abonnement dat er een abonnement is en wanneer het verlengt. Je kaartgegevens gaan naar onze betaalprovider, nooit naar ons.",
    },
  ],

  neverTitle: "Wat wij nooit kunnen lezen",
  neverIntro: "Niet omdat we beloven niet te kijken, maar omdat het versleuteld bij ons aankomt en de sleutel nooit:",
  never: [
    "Wat er in je bestanden staat",
    "De namen van je bestanden",
    "De titels van je transfers",
    "De sleutel in een link, waarmee een transfer opengaat",
    "Het wachtwoord of de herstelzin van je kluis",
  ],
  neverPortals: "De namen van je portalen en formulieren, hun vragen, en wat mensen sturen of antwoorden",
  checkBefore: "Je kunt dit zelf in een paar minuten nagaan:",
  checkLink: "controleer het",

  notTitle: "Wat wij niet doen",
  not: [
    "Geen advertenties, analytics of trackers, en geen trackingcookies",
    "Geen verkoop of delen van je gegevens",
    "Geen nieuwsbrieven: we mailen je alleen om in te loggen, of over iets wat je zelf deed",
  ],

  takeTitle: "Neem het mee, of verwijder het",
  downloadLead: "Download het.",
  download: "Instellingen, Account, Je gegevens geeft je alles wat we over je bewaren als bestand.",
  deleteLead: "Verwijder het.",
  delete:
    "Instellingen, Account, Account verwijderen verwijdert je account, je transfers en je sessies in één keer. Er is geen wachttijd en geen weg terug.",

  fullTitle: "Volledig",
  fullBefore: "Deze pagina is een samenvatting. Het",
  privacy: "privacybeleid",
  fullMiddle: "is de volledige en bindende versie, en het",
  security: "beveiligingsoverzicht",
  fullAfter: "legt uit hoe de versleuteling werkt.",
};

export const whatWeStoreMessages: Record<Locale, typeof en> = { en, nl };
