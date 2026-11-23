// The forms page's text. See README.md in this folder.

import type { QuestionType } from "$lib/form/questions";
import type { Locale } from "../locale";

const en = {
  title: "End-to-end encrypted forms and intake forms - Tessil",
  description:
    "Ask your questions with one link. Questions and answers are encrypted in the browser, so only you can read what people fill in. No account needed to answer.",
  heading: "Forms.",
  sub: "Ask your questions with one link. The answers reach you, and nobody else.",
  tryEditor: "Try the editor",
  yourForms: "Open your forms",
  plans: "See the plans",

  filmLabel: "The form editor: two questions are added, then the form is filled in and sent.",
  filmCaption: "The editor, recorded as it is. Add questions, try the form as a visitor, send.",
  pause: "Pause",
  play: "Play",

  typeHeading: "Type something. Watch what we get.",
  typeBody:
    "The left side is a form. The right side is what would reach our servers, encrypted again with every key you press by the code a real form uses. Nothing leaves this page.",
  demo: {
    name: "What should we call you?",
    purpose: "What would you use a form for?",
    purposes: ["Client intake", "Sign-ups", "Feedback", "Something else"],
    read: "Should we be able to read your answers?",
    yes: "Yes",
    no: "No",
  },
  inBrowser: "In your browser",
  onServers: "On our servers",
  bytes: (n: number) => `${n.toLocaleString("en")} bytes`,
  bytesLabel: "Encrypted bytes, unreadable",
  saidYes: "You said we should be able to read it. We still can't.",
  saidNo: "You said we shouldn't be able to read it. We can't.",
  typing: "Every key changes all of it, and the size stays the same however much you write.",
  empty: "This is an empty form. It already looks like any other.",
  sameTreatment:
    "Your questions get the same treatment before they are stored, and so do files people add. The key that opens the answers lives in your vault, not with us.",
  readHow: "Read how it works",
  or: "or",
  checkYourself: "check it yourself",

  askOnce: "Ask once.",
  addUp: "See it add up.",
  summaryBody:
    "Every response opens on its own, and together they become a summary: how many answered each question and what they chose. It is counted in your browser, after your vault has opened the answers. Pick an option to see who chose it.",
  summaryPoints: [
    "Search across every answer",
    "Export everything to a spreadsheet",
    "A record of each response, with its reference",
    "Share a form with one colleague",
  ],
  summaryOf: (n: number) => `Summary of ${n} responses`,
  you: "You",
  examplesMine: "Example numbers, with your answer added.",
  examples: "Example numbers. Pick an answer in the form above and yours is added.",

  kinds: "Seven kinds of question.",
  kindsBody:
    "Mark the ones that must be answered. Reorder, reword and add questions later; the link stays the same, and answers already in keep the wording they were given under.",
  types: {
    short: "Short answer",
    long: "Long answer",
    choice: "One choice",
    choices: "Several choices",
    yesno: "Yes or no",
    date: "Date",
    file: "File upload",
  } as Record<QuestionType, string>,
  options: [
    {
      name: "Files as answers",
      about: "Ask for a copy of an ID or a signed contract between the other questions. It is encrypted like the rest.",
    },
    {
      name: "A welcome and a thank-you",
      about: "A few lines above the questions, and a note after sending that says what happens next.",
    },
    {
      name: "A closing date",
      about: "The page says until when, and the form closes by itself when the day ends.",
    },
    {
      name: "An email when someone answers",
      about: "One per form per hour at most. It can't say what was answered, because we can't read that.",
    },
    {
      name: "Try it first",
      about: "Fill in your own form from the editor, exactly as others will see it. Nothing is sent.",
    },
    {
      name: "English or Dutch",
      about: "Pick the language of the page. Visitors can switch to the other one themselves.",
    },
    {
      name: "Your logo",
      about: "Above the name, so the page looks like yours and not like ours.",
      max: true,
    },
    {
      name: "A password",
      about: "The page shows nothing until it is entered. Change it whenever you like; the link stays.",
      max: true,
    },
  ] as { name: string; about: string; max?: boolean }[],
  optionsNote:
    "People who answer need no account. Responses are deleted after 30 days, or 90 on Max, so export what you want to keep.",

  askAway: "Ask away.",
  askAwayBody:
    "Build one now, without an account. Publishing it needs a paid plan: 3 forms of up to 15 questions on Pro, 10 forms of up to 50 on Max.",
  onlyFiles: "Only need files from people?",
  seePortals: "Have a look at portals",
};

const nl: typeof en = {
  title: "Versleutelde formulieren en intakeformulieren - Tessil",
  description:
    "Stel je vragen met één link. Vragen en antwoorden worden in de browser versleuteld, zodat alleen jij ze kunt lezen. Antwoorden kan zonder account.",
  heading: "Formulieren.",
  sub: "Stel je vragen met één link. De antwoorden komen bij jou aan, en bij niemand anders.",
  tryEditor: "Probeer de editor",
  yourForms: "Open je formulieren",
  plans: "Bekijk de abonnementen",

  filmLabel: "De formuliereditor: er worden twee vragen toegevoegd, daarna wordt het formulier ingevuld en verstuurd.",
  filmCaption: "De editor, opgenomen zoals hij is. Vragen toevoegen, het formulier proberen als bezoeker, versturen.",
  pause: "Pauzeren",
  play: "Afspelen",

  typeHeading: "Typ iets. Zie wat wij krijgen.",
  typeBody:
    "Links staat een formulier. Rechts staat wat er op onze servers zou aankomen, bij elke toets opnieuw versleuteld door de code die een echt formulier gebruikt. Er verlaat niets deze pagina.",
  demo: {
    name: "Hoe mogen we je noemen?",
    purpose: "Waarvoor zou je een formulier gebruiken?",
    purposes: ["Intake van klanten", "Aanmeldingen", "Feedback", "Iets anders"],
    read: "Moeten wij je antwoorden kunnen lezen?",
    yes: "Ja",
    no: "Nee",
  },
  inBrowser: "In je browser",
  onServers: "Op onze servers",
  bytes: (n: number) => `${n.toLocaleString("nl")} bytes`,
  bytesLabel: "Versleutelde bytes, onleesbaar",
  saidYes: "Je zei dat wij het moeten kunnen lezen. Dat kunnen we nog steeds niet.",
  saidNo: "Je zei dat wij het niet moeten kunnen lezen. Dat kunnen we ook niet.",
  typing: "Elke toets verandert alles, en de grootte blijft gelijk, hoeveel je ook schrijft.",
  empty: "Dit is een leeg formulier. Het ziet er nu al uit als elk ander.",
  sameTreatment:
    "Je vragen worden net zo behandeld voordat ze worden opgeslagen, en de bestanden die mensen toevoegen ook. De sleutel die de antwoorden opent staat in je kluis, niet bij ons.",
  readHow: "Lees hoe het werkt",
  or: "of",
  checkYourself: "controleer het zelf",

  askOnce: "Eén keer vragen.",
  addUp: "Zien hoe het optelt.",
  summaryBody:
    "Elke reactie opent los, en samen worden ze een samenvatting: hoeveel mensen elke vraag beantwoordden en wat ze kozen. Dat wordt in je browser geteld, nadat je kluis de antwoorden heeft geopend. Kies een optie om te zien wie die koos.",
  summaryPoints: [
    "Zoeken in alle antwoorden",
    "Alles exporteren naar een spreadsheet",
    "Een overzicht van elke reactie, met de referentie",
    "Deel een formulier met één collega",
  ],
  summaryOf: (n: number) => `Samenvatting van ${n} reacties`,
  you: "Jij",
  examplesMine: "Voorbeeldaantallen, met jouw antwoord erbij.",
  examples: "Voorbeeldaantallen. Kies een antwoord in het formulier hierboven en het jouwe komt erbij.",

  kinds: "Zeven soorten vragen.",
  kindsBody:
    "Geef aan welke verplicht zijn. Verander later de volgorde, de woorden of voeg vragen toe; de link blijft dezelfde, en antwoorden die al binnen zijn houden de vraag zoals die toen luidde.",
  types: {
    short: "Kort antwoord",
    long: "Lang antwoord",
    choice: "Eén keuze",
    choices: "Meerdere keuzes",
    yesno: "Ja of nee",
    date: "Datum",
    file: "Bestand uploaden",
  },
  options: [
    {
      name: "Bestanden als antwoord",
      about: "Vraag tussen de andere vragen door om een kopie van een ID of een getekend contract. Het wordt versleuteld zoals de rest.",
    },
    {
      name: "Een welkom en een bedankje",
      about: "Een paar regels boven de vragen, en een notitie na het versturen over wat er nu gebeurt.",
    },
    {
      name: "Een sluitingsdatum",
      about: "De pagina zegt tot wanneer, en het formulier sluit vanzelf aan het eind van die dag.",
    },
    {
      name: "Een e-mail als iemand antwoordt",
      about: "Hooguit één per formulier per uur. Er staat niet in wat er werd geantwoord, want dat kunnen wij niet lezen.",
    },
    {
      name: "Eerst zelf proberen",
      about: "Vul je eigen formulier in vanuit de editor, precies zoals anderen het zien. Er wordt niets verstuurd.",
    },
    {
      name: "Nederlands of Engels",
      about: "Kies de taal van de pagina. Bezoekers kunnen zelf naar de andere overschakelen.",
    },
    {
      name: "Je logo",
      about: "Boven de naam, zodat de pagina eruitziet als die van jou en niet als die van ons.",
      max: true,
    },
    {
      name: "Een wachtwoord",
      about: "De pagina toont niets tot het is ingevuld. Wijzig het wanneer je wilt; de link blijft.",
      max: true,
    },
  ],
  optionsNote:
    "Wie antwoordt heeft geen account nodig. Reacties worden verwijderd na 30 dagen, of 90 bij Max, dus exporteer wat je wilt bewaren.",

  askAway: "Vraag maar raak.",
  askAwayBody:
    "Bouw er nu een, zonder account. Publiceren vraagt een betaald abonnement: 3 formulieren van maximaal 15 vragen bij Pro, 10 formulieren van maximaal 50 bij Max.",
  onlyFiles: "Heb je alleen bestanden van mensen nodig?",
  seePortals: "Bekijk portalen",
};

export const formsMessages: Record<Locale, typeof en> = { en, nl };
