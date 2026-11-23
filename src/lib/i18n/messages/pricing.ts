// The pricing page's text, and the plan table's. See README.md in this folder.

import type { Locale } from "../locale";

const en = {
  title: "Pricing - Tessil",
  description:
    "Sending files is free and encrypted. A plan adds portals: links where people send files that only you can open. You never pay for privacy.",
  heading1: "Pay for more.",
  heading2: "Never for privacy.",
  introForms:
    "Sending files is free, encrypted, and stays that way. A plan adds portals and forms: links where other people send files and answers that only you can open.",
  intro:
    "Sending files is free, encrypted, and stays that way. A plan adds portals: links where other people send files that only you can open.",
  period: "Billing period",
  monthly: "Monthly",
  yearly: "Yearly",
  yearlyFree: "2 months free yearly",
  notYet: "This plan can't be bought yet. It will be soon.",
  checkoutFailed: "Couldn't start the checkout. Try again in a moment.",
  portalFailed: "Couldn't open your plan settings. Try again in a moment.",
  keptForm:
    "Your form is kept in this browser. Once you are on a plan, open Forms and choose New form: it will be waiting there.",
  withoutAccount: "Without an account you can still send up to 500 MB. Prices include tax where it applies.",
  compareAll: "Compare everything",
  everyLimit: "Every limit, side by side",
  everyLimitBody:
    "The exact numbers behind each plan. Without an account the limits are 500 MB per transfer, 500 MB a month, 5 transfers a day and links that last up to 3 days.",
  neverCosts: "What never costs anything",
  free: [
    { title: "End-to-end encryption", body: "Every file and its name, on every plan, with or without an account." },
    { title: "Password protection", body: "A second lock on a link, for when the link alone is not enough." },
    { title: "Passkeys and the vault", body: "Sign in without email, and keep the names of what you sent readable only to you." },
    { title: "Automatic expiry", body: "Everything is deleted when its time is up. Nothing piles up." },
  ],
  aboutPaying: "About paying",
  account: {
    q: "Do I need an account, and what does it store?",
    a: "Not to send: without an account a link lasts up to 3 days. An account, free or paid, stores your email address, when you signed in, and the size and dates of what you send. Never your files, their names or the key that opens them.",
    link: "Everything an account stores",
  },
  cancel: {
    q: "How do I cancel?",
    a: "From your account settings, at any time, in under a minute. The plan runs until the end of the period you paid for and does not renew. Nobody asks you why.",
  },
  refund: {
    q: "Can I get my money back?",
    a: (email: string) =>
      `Within 14 days of your first payment, yes, in full: write to ${email}. After that a period that has started is not refunded, except where the law gives you that right.`,
  },
  ends: {
    q: "What happens to my portals when a plan ends?",
    qForms: "What happens to my portals and forms when a plan ends?",
    a: "They stop accepting files. What they already hold stays available to you until it expires. Sending works as before.",
    aForms:
      "They stop accepting files and answers. What they already hold stays available to you until it expires. Sending works as before.",
  },
  payee: {
    q: "Who am I paying?",
    a: "Polar, our payment provider, is the seller on your invoice and handles tax. We never see your card details.",
  },
  senders: {
    q: "Do the people who send me files need a plan?",
    qForms: "Do the people who send me files or answers need a plan?",
    a: "No. They need no account at all. Someone you share a portal with needs an account, and a free one is enough.",
    aForms:
      "No. They need no account at all. Someone you share a portal or form with needs an account, and a free one is enough.",
  },
  fullWording: "The full wording is in the",
  terms: "terms",

  table: {
    caption: "What each plan includes",
    yourPlan: "Your plan",
    included: (plan: string) => `Included in ${plan}`,
    notIn: (plan: string) => `Not in ${plan}`,
  },
};

const nl: typeof en = {
  title: "Prijzen - Tessil",
  description:
    "Bestanden versturen is gratis en versleuteld. Een abonnement voegt portalen toe: links waarmee mensen jou bestanden sturen die alleen jij kunt openen. Voor privacy betaal je nooit.",
  heading1: "Betaal voor meer.",
  heading2: "Nooit voor privacy.",
  introForms:
    "Bestanden versturen is gratis, versleuteld, en blijft dat. Een abonnement voegt portalen en formulieren toe: links waarmee anderen jou bestanden en antwoorden sturen die alleen jij kunt openen.",
  intro:
    "Bestanden versturen is gratis, versleuteld, en blijft dat. Een abonnement voegt portalen toe: links waarmee anderen jou bestanden sturen die alleen jij kunt openen.",
  period: "Betaalperiode",
  monthly: "Maandelijks",
  yearly: "Jaarlijks",
  yearlyFree: "2 maanden gratis per jaar",
  notYet: "Dit abonnement is nog niet te koop. Dat komt binnenkort.",
  checkoutFailed: "De betaling kon niet starten. Probeer het zo nog eens.",
  portalFailed: "Je abonnementsinstellingen konden niet worden geopend. Probeer het zo nog eens.",
  keptForm:
    "Je formulier wordt in deze browser bewaard. Zodra je een abonnement hebt, open je Formulieren en kies je Nieuw formulier: het staat daar klaar.",
  withoutAccount: "Zonder account kun je nog steeds tot 500 MB versturen. Prijzen zijn inclusief btw waar die geldt.",
  compareAll: "Vergelijk alles",
  everyLimit: "Elke grens, naast elkaar",
  everyLimitBody:
    "De precieze aantallen achter elk abonnement. Zonder account zijn de grenzen 500 MB per transfer, 500 MB per maand, 5 transfers per dag en links die tot 3 dagen geldig blijven.",
  neverCosts: "Wat nooit iets kost",
  free: [
    { title: "End-to-end versleuteling", body: "Elk bestand en de naam ervan, bij elk abonnement, met of zonder account." },
    { title: "Wachtwoordbeveiliging", body: "Een tweede slot op een link, voor als de link alleen niet genoeg is." },
    { title: "Passkeys en de kluis", body: "Log in zonder e-mail, en houd de namen van wat je verstuurde alleen voor jou leesbaar." },
    { title: "Automatisch verlopen", body: "Alles wordt verwijderd als de tijd om is. Er stapelt zich niets op." },
  ],
  aboutPaying: "Over betalen",
  account: {
    q: "Heb ik een account nodig, en wat bewaart het?",
    a: "Niet om te versturen: zonder account blijft een link tot 3 dagen geldig. Een account, gratis of betaald, bewaart je e-mailadres, wanneer je inlogde, en de grootte en data van wat je verstuurt. Nooit je bestanden, hun namen of de sleutel die ze opent.",
    link: "Alles wat een account bewaart",
  },
  cancel: {
    q: "Hoe zeg ik op?",
    a: "Vanuit je accountinstellingen, op elk moment, in minder dan een minuut. Het abonnement loopt tot het eind van de periode die je betaalde en wordt niet verlengd. Niemand vraagt waarom.",
  },
  refund: {
    q: "Kan ik mijn geld terugkrijgen?",
    a: (email: string) =>
      `Binnen 14 dagen na je eerste betaling, ja, volledig: mail naar ${email}. Daarna wordt een begonnen periode niet terugbetaald, behalve waar de wet je dat recht geeft.`,
  },
  ends: {
    q: "Wat gebeurt er met mijn portalen als een abonnement afloopt?",
    qForms: "Wat gebeurt er met mijn portalen en formulieren als een abonnement afloopt?",
    a: "Ze nemen geen bestanden meer aan. Wat er al in staat blijft voor jou beschikbaar tot het verloopt. Versturen werkt zoals altijd.",
    aForms:
      "Ze nemen geen bestanden en antwoorden meer aan. Wat er al in staat blijft voor jou beschikbaar tot het verloopt. Versturen werkt zoals altijd.",
  },
  payee: {
    q: "Aan wie betaal ik?",
    a: "Polar, onze betaalprovider, is de verkoper op je factuur en regelt de btw. Wij zien je kaartgegevens nooit.",
  },
  senders: {
    q: "Hebben de mensen die mij bestanden sturen een abonnement nodig?",
    qForms: "Hebben de mensen die mij bestanden of antwoorden sturen een abonnement nodig?",
    a: "Nee. Ze hebben helemaal geen account nodig. Iemand met wie je een portaal deelt heeft een account nodig, en een gratis account is genoeg.",
    aForms:
      "Nee. Ze hebben helemaal geen account nodig. Iemand met wie je een portaal of formulier deelt heeft een account nodig, en een gratis account is genoeg.",
  },
  fullWording: "De volledige tekst staat in de",
  terms: "voorwaarden",

  table: {
    caption: "Wat elk abonnement bevat",
    yourPlan: "Jouw abonnement",
    included: (plan: string) => `Inbegrepen bij ${plan}`,
    notIn: (plan: string) => `Niet bij ${plan}`,
  },
};

export const pricingMessages: Record<Locale, typeof en> = { en, nl };
