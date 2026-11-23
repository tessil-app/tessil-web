// "Which one to pick" for every comparison, both ways, keyed by the English
// slug. Only claims the page already makes; a fair answer is what gets quoted.

import type { Locale } from "$lib/i18n/locale";

export type Choose = { them: string[]; tessil: string[] };

export const CHOOSE: Record<string, Record<Locale, Choose>> = {
  "wetransfer-alternative": {
    en: {
      them: [
        "You send large, non-sensitive files and want the biggest transfer limits.",
        "You don't mind the service being able to read what you upload.",
      ],
      tessil: [
        "The files are client work, documents or anything sensitive.",
        "You want the service to be unable to read your files, not just promise not to.",
        "You want no ads, no trackers and open-source code.",
      ],
    },
    nl: {
      them: [
        "Je verstuurt grote, niet-gevoelige bestanden en wilt de hoogste limieten.",
        "Het maakt je niet uit dat de dienst kan lezen wat je uploadt.",
      ],
      tessil: [
        "Het gaat om klantwerk, documenten of iets anders gevoeligs.",
        "Je wilt dat de dienst je bestanden niet kán lezen, niet alleen belooft het niet te doen.",
        "Je wilt geen advertenties, geen trackers en open-source code.",
      ],
    },
  },
  "boomerang-alternative": {
    en: {
      them: [
        "You mainly want an ad-free platform that doesn't mine your uploads.",
        "You need more storage or larger files than Tessil's free sending allows.",
      ],
      tessil: [
        "You want end-to-end encryption, so the service can't read your files.",
        "You want to check the claim yourself in open-source code.",
      ],
    },
    nl: {
      them: [
        "Je wilt vooral een dienst zonder advertenties die niets met je uploads doet.",
        "Je hebt meer opslag of grotere bestanden nodig dan gratis versturen bij Tessil toestaat.",
      ],
      tessil: [
        "Je wilt end-to-end versleuteling, zodat de dienst je bestanden niet kan lezen.",
        "Je wilt de belofte zelf kunnen controleren in open-source code.",
      ],
    },
  },
  "proton-drive-alternative": {
    en: {
      them: [
        "You want encrypted long-term storage with sync across devices.",
        "You already have a Proton account.",
      ],
      tessil: [
        "You just need to hand someone a file securely, now.",
        "Neither you nor the recipient should have to sign up.",
      ],
    },
    nl: {
      them: [
        "Je wilt versleutelde opslag voor de lange termijn, gesynchroniseerd op al je apparaten.",
        "Je hebt al een Proton-account.",
      ],
      tessil: [
        "Je wilt iemand nu veilig een bestand geven.",
        "Jij en de ontvanger hoeven geen account te maken.",
      ],
    },
  },
  "tresorit-send-alternative": {
    en: {
      them: [
        "You already work in the Tresorit ecosystem.",
        "Swiss hosting suits you better than EU hosting.",
      ],
      tessil: [
        "You want the encryption to be auditable in public source code.",
        "You want hosting inside the EU.",
      ],
    },
    nl: {
      them: [
        "Je werkt al met Tresorit.",
        "Hosting in Zwitserland past je beter dan hosting in de EU.",
      ],
      tessil: [
        "Je wilt de versleuteling kunnen controleren in openbare broncode.",
        "Je wilt hosting binnen de EU.",
      ],
    },
  },
  "wormhole-alternative": {
    en: {
      them: [
        "You want the most short-lived, fire-and-forget transfer.",
        "US hosting is fine for you.",
      ],
      tessil: [
        "You want open-source code and EU hosting.",
        "You want to choose how long a link lasts, and keep a list of your transfers.",
      ],
    },
    nl: {
      them: [
        "Je wilt de meest kortstondige transfer: versturen en vergeten.",
        "Hosting in de Verenigde Staten is voor jou geen probleem.",
      ],
      tessil: [
        "Je wilt open-source code en hosting in de EU.",
        "Je wilt zelf kiezen hoe lang een link geldig is, en een lijst van je transfers bijhouden.",
      ],
    },
  },
  "zivver-alternative": {
    en: {
      them: [
        "Your organisation sends a lot of sensitive email and wants it inside Outlook or Gmail.",
        "You need recipient checks before mail goes out.",
      ],
      tessil: [
        "You mainly need clients to send you files, through one link.",
        "Clients should not have to type a code or create an account.",
        "You prefer a price per account rather than per colleague.",
      ],
    },
    nl: {
      them: [
        "Je organisatie verstuurt veel gevoelige e-mail en wil dat binnen Outlook of Gmail.",
        "Je wilt controles op de ontvanger voordat een mail vertrekt.",
      ],
      tessil: [
        "Je wilt vooral dat klanten je bestanden sturen, via één link.",
        "Klanten hoeven geen code te typen of een account te maken.",
        "Je betaalt liever per account dan per collega.",
      ],
    },
  },
  "dropbox-file-request-alternative": {
    en: {
      them: [
        "You already pay for Dropbox and the files are not sensitive.",
        "You receive very large files.",
      ],
      tessil: [
        "The files are tax returns, IDs, medical letters or contracts.",
        "Nobody but you should be able to read them once they arrive.",
        "You don't want senders to give their name and email address.",
      ],
    },
    nl: {
      them: [
        "Je betaalt al voor Dropbox en de bestanden zijn niet gevoelig.",
        "Je ontvangt heel grote bestanden.",
      ],
      tessil: [
        "Het gaat om aangiftes, identiteitsbewijzen, medische brieven of contracten.",
        "Niemand behalve jij mag ze kunnen lezen als ze binnen zijn.",
        "Afzenders hoeven niet hun naam en e-mailadres op te geven.",
      ],
    },
  },
  "google-forms-alternative": {
    en: {
      them: [
        "It's a lunch poll or a sign-up sheet.",
        "You need branching, quizzes or add-ons.",
      ],
      tessil: [
        "The answers are personal.",
        "People should be able to send a file without signing in to Google.",
      ],
    },
    nl: {
      them: [
        "Het is een lunchpeiling of een inschrijflijst.",
        "Je hebt vertakkingen, quizzen of add-ons nodig.",
      ],
      tessil: [
        "De antwoorden zijn persoonlijk.",
        "Mensen moeten een bestand kunnen sturen zonder in te loggen bij Google.",
      ],
    },
  },
  "typeform-alternative": {
    en: {
      them: [
        "It's a marketing survey or a lead form.",
        "Design themes and integrations matter most.",
      ],
      tessil: [
        "It's an intake form or anything with personal data.",
        "Only you should be able to read the answers, on every plan, hosted in the EU.",
      ],
    },
    nl: {
      them: [
        "Het is een marketingenquête of een leadformulier.",
        "Ontwerp en koppelingen wegen het zwaarst.",
      ],
      tessil: [
        "Het is een intakeformulier of iets anders met persoonsgegevens.",
        "Alleen jij mag de antwoorden kunnen lezen, op elk abonnement, gehost in de EU.",
      ],
    },
  },
  "jotform-alternative": {
    en: {
      them: [
        "You need payments, approvals or a template for every occasion.",
        "You'll remember to switch encryption on for each sensitive form.",
      ],
      tessil: [
        "You want every form encrypted by default, with no switch to forget.",
        "You prefer a short, plain tool.",
      ],
    },
    nl: {
      them: [
        "Je hebt betalingen, goedkeuringen of een sjabloon voor elke gelegenheid nodig.",
        "Je denkt eraan om versleuteling per gevoelig formulier aan te zetten.",
      ],
      tessil: [
        "Je wilt elk formulier standaard versleuteld, zonder schakelaar om te vergeten.",
        "Je wilt een kort, eenvoudig hulpmiddel.",
      ],
    },
  },
  "formdesk-alternative": {
    en: {
      them: [
        "You need ISO 27001 or NEN 7510 certification.",
        "You need payments and workflows.",
      ],
      tessil: [
        "Nobody but you should be able to read the answers, not even the company running the forms.",
        "You want the code open for anyone to check.",
      ],
    },
    nl: {
      them: [
        "Je hebt certificering voor ISO 27001 of NEN 7510 nodig.",
        "Je hebt betalingen en werkstromen nodig.",
      ],
      tessil: [
        "Niemand behalve jij mag de antwoorden kunnen lezen, ook het bedrijf achter de formulieren niet.",
        "Je wilt dat de code voor iedereen te controleren is.",
      ],
    },
  },
  "swisstransfer-alternative": {
    en: {
      them: ["You send very large files, up to 50 GB, that are not sensitive.", "Swiss hosting is what you want."],
      tessil: [
        "The files should stay unreadable to the service, not just stored in a good jurisdiction.",
        "You want open-source code you can check.",
      ],
    },
    nl: {
      them: ["Je verstuurt heel grote bestanden, tot 50 GB, die niet gevoelig zijn.", "Je wilt hosting in Zwitserland."],
      tessil: [
        "De bestanden moeten onleesbaar blijven voor de dienst, niet alleen in een goed land staan.",
        "Je wilt open-source code die je kunt controleren.",
      ],
    },
  },
  "smash-alternative": {
    en: {
      them: ["You send huge files with no size limit and the content is not confidential."],
      tessil: [
        "What you send should stay between you and the recipient.",
        "You want the files kept in the EU, by a service that cannot read them.",
      ],
    },
    nl: {
      them: ["Je verstuurt enorme bestanden zonder limiet en de inhoud is niet vertrouwelijk."],
      tessil: [
        "Wat je verstuurt moet tussen jou en de ontvanger blijven.",
        "Je wilt de bestanden in de EU, bij een dienst die ze niet kan lezen.",
      ],
    },
  },
  "tresorit-file-request-alternative": {
    en: {
      them: [
        "Your team already keeps its files in Tresorit.",
        "You want what clients send to land next to your encrypted storage.",
      ],
      tessil: [
        "Senders should not have to give an email address.",
        "You want a checklist of the documents you still need.",
        "You want open-source code and a price that does not depend on storage.",
      ],
    },
    nl: {
      them: [
        "Je team bewaart zijn bestanden al in Tresorit.",
        "Je wilt dat wat klanten sturen naast je versleutelde opslag terechtkomt.",
      ],
      tessil: [
        "Afzenders hoeven geen e-mailadres op te geven.",
        "Je wilt een checklist van de documenten die je nog nodig hebt.",
        "Je wilt open-source code en een prijs die niet van opslag afhangt.",
      ],
    },
  },
  "cryptpad-form-alternative": {
    en: {
      them: [
        "You want a free encrypted office suite with documents and sheets as well as forms.",
        "You want to host it yourself.",
      ],
      tessil: [
        "You collect personal answers and documents from clients, with a file question.",
        "You want it run for you, hosted in the EU.",
      ],
    },
    nl: {
      them: [
        "Je wilt een gratis versleuteld kantoorpakket met documenten en spreadsheets naast formulieren.",
        "Je wilt het zelf hosten.",
      ],
      tessil: [
        "Je verzamelt persoonlijke antwoorden en documenten van klanten, met een vraag voor bestanden.",
        "Je wilt dat het voor je wordt beheerd, gehost in de EU.",
      ],
    },
  },
};
