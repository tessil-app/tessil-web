// The text of the command-line tool's page. The demo terminal stays in
// English, because the tool does. See README.md in this folder.

import type { Locale } from "../locale";

const en = {
  seoTitle: "Tessil from your terminal - CLI and MCP server",
  description:
    "Send and receive end-to-end encrypted files from a terminal, a script or an AI assistant. Open source. Your assistant never sees the link.",
  copied: "Copied",
  copy: "Copy",
  heading: "No browser needed.",
  sub: "The same encrypted transfers and portals, from your terminal, your scripts and your AI assistant. We still see nothing.",
  installTitle: "Install the real one",
  installThen: "Then",
  installAfter: ". Open source, AGPL-3.0.",
  readCode: "Read the code",
  howInstall: "How to install",
  script: "Script",

  pairTitle1: "It never asks",
  pairTitle2: "for your password.",
  pairBody:
    "makes a key of its own on your computer and shows a short code. You approve it in your browser, tick what it may do, and that is the pairing.",
  pairKeychain:
    "The key lives in your system's keychain. It works for 90 days, and you can revoke it from your settings the moment you want to.",
  mock: {
    asking: "A program is asking for access",
    callsItself: "Calls itself",
    itsKey: "Its key",
    send: "Send files",
    see: "See what it sent",
    read: "Read portals you pick",
    approve: "Approve",
    dont: "Don't approve",
  },

  assistantTitle1: "Your assistant sends it.",
  assistantTitle2: "It never sees the link.",
  assistantBody:
    "A link holds the key to your files, and whatever an assistant sees is kept by whoever runs the model. So the link goes to your clipboard, and the assistant is told only that it did.",
  assistantPoints: [
    "No tool takes or returns a link, a key or a password",
    "No tool returns what is inside a file",
    "What a sender wrote is passed on marked as theirs",
    "It runs on your machine. There is no hosted version",
  ],
  anyAssistant: "Works with any assistant that can start a local MCP server.",
  chatAsk: "Send the signed contract to Anna, valid for three days.",
  chatReply: "Sent contract-signed.pdf, encrypted on your machine. The link is on your clipboard. I can't see it.",
  clipboard: "Your clipboard",

  folder: "Tax 2025/",
  folderFiles: [
    ["passport.jpg", "annual-statement.pdf", "record.txt"],
    ["mortgage-overview.pdf", "record.txt"],
  ],
  fresh: "new",
  portalsTitle1: "Portals that",
  portalsTitle2: "file themselves.",
  portalsBefore: "Hand a portal to the tool and",
  portalsAfter: "brings down what arrived: one folder per delivery, with the files and a record of who sent what.",
  portalsAgain:
    "Run it again and it fetches only what is new. Put it on a schedule and a portal whose files are deleted after 30 days becomes an archive you keep.",
  portalsPaid: "Reading portals needs a paid plan, like portals themselves.",
  whatPortal: "What a portal is",

  keyTitle: "A key, not the keys.",
  keyBody:
    "The tool signs in with an access key that is its own. It can do what you ticked. The rest is not forbidden to it; it was never given the means.",
  itCan: "It can",
  can: ["Send files and get a link", "List and delete what it sent", "Read the portals you hand it"],
  itCannot: "It cannot",
  cannot: [
    "Open your vault or see your password",
    "Touch your account, billing or passkeys",
    "See transfers it did not send",
    "Open a portal you did not hand it",
  ],
  honest:
    "One thing we will not pretend: an assistant that can also run commands on your computer can do what you can do there, including reading your clipboard. Those limits are set where you approve what it runs.",
  howKeys: "How access keys work",

  installIt: "Install it.",
  oneKey: "One access key comes with every account, the free one included.",
  everyCommand: "Every command",
  downloads: "Downloads",
  plans: "What each plan includes",
};

const nl: typeof en = {
  seoTitle: "Tessil vanuit je terminal - CLI en MCP-server",
  description:
    "Verstuur en ontvang end-to-end versleutelde bestanden vanuit een terminal, een script of een AI-assistent. Open source. Je assistent ziet de link nooit.",
  copied: "Gekopieerd",
  copy: "Kopiëren",
  heading: "Geen browser nodig.",
  sub: "Dezelfde versleutelde transfers en portalen, vanuit je terminal, je scripts en je AI-assistent. Wij zien nog steeds niets.",
  installTitle: "Installeer de echte",
  installThen: "Daarna",
  installAfter: ". Open source, AGPL-3.0.",
  readCode: "Lees de code",
  howInstall: "Zo installeer je het",
  script: "Script",

  pairTitle1: "Hij vraagt nooit",
  pairTitle2: "om je wachtwoord.",
  pairBody:
    "maakt een eigen sleutel op je computer en toont een korte code. Je keurt hem goed in je browser, vinkt aan wat hij mag, en daarmee is hij gekoppeld.",
  pairKeychain:
    "De sleutel staat in de sleutelbos van je systeem. Hij werkt 90 dagen, en je trekt hem in vanuit je instellingen op het moment dat je wilt.",
  mock: {
    asking: "Een programma vraagt om toegang",
    callsItself: "Noemt zich",
    itsKey: "Zijn sleutel",
    send: "Bestanden versturen",
    see: "Zien wat hij verstuurde",
    read: "Portalen lezen die je kiest",
    approve: "Goedkeuren",
    dont: "Niet goedkeuren",
  },

  assistantTitle1: "Je assistent verstuurt het.",
  assistantTitle2: "Hij ziet de link nooit.",
  assistantBody:
    "Een link bevat de sleutel tot je bestanden, en wat een assistent ziet, wordt bewaard door wie het model draait. Daarom gaat de link naar je klembord, en hoort de assistent alleen dat dat gebeurd is.",
  assistantPoints: [
    "Geen enkele functie neemt of geeft een link, sleutel of wachtwoord",
    "Geen enkele functie geeft terug wat er in een bestand staat",
    "Wat een afzender schreef, wordt doorgegeven als het zijne",
    "Hij draait op je eigen computer. Er is geen gehoste versie",
  ],
  anyAssistant: "Werkt met elke assistent die een lokale MCP-server kan starten.",
  chatAsk: "Stuur het getekende contract naar Anna, drie dagen geldig.",
  chatReply: "contract-getekend.pdf verstuurd, versleuteld op je computer. De link staat op je klembord. Ik kan hem niet zien.",
  clipboard: "Je klembord",

  folder: "Belasting 2025/",
  folderFiles: [
    ["paspoort.jpg", "jaaropgave.pdf", "record.txt"],
    ["hypotheekoverzicht.pdf", "record.txt"],
  ],
  fresh: "nieuw",
  portalsTitle1: "Portalen die",
  portalsTitle2: "zichzelf archiveren.",
  portalsBefore: "Geef de tool een portaal en",
  portalsAfter: "haalt binnen wat er aankwam: één map per levering, met de bestanden en een overzicht van wie wat stuurde.",
  portalsAgain:
    "Draai het nog eens en het haalt alleen op wat nieuw is. Zet het op een schema, en een portaal waarvan de bestanden na 30 dagen verdwijnen wordt een archief dat je houdt.",
  portalsPaid: "Portalen lezen vraagt een betaald abonnement, net als portalen zelf.",
  whatPortal: "Wat een portaal is",

  keyTitle: "Een sleutel, niet de sleutels.",
  keyBody:
    "De tool logt in met een eigen toegangssleutel. Hij kan wat jij aanvinkte. De rest is hem niet verboden; hij kreeg er nooit de middelen voor.",
  itCan: "Hij kan",
  can: ["Bestanden versturen en een link krijgen", "Opsommen en verwijderen wat hij verstuurde", "De portalen lezen die je hem geeft"],
  itCannot: "Hij kan niet",
  cannot: [
    "Je kluis openen of je wachtwoord zien",
    "Bij je account, betalingen of passkeys",
    "Transfers zien die hij niet zelf verstuurde",
    "Een portaal openen dat je hem niet gaf",
  ],
  honest:
    "Eén ding doen we niet alsof: een assistent die ook opdrachten op je computer kan uitvoeren, kan daar doen wat jij kunt, ook je klembord lezen. Die grenzen stel je in waar je goedkeurt wat hij uitvoert.",
  howKeys: "Hoe toegangssleutels werken",

  installIt: "Installeer het.",
  oneKey: "Bij elk account hoort één toegangssleutel, ook bij het gratis account.",
  everyCommand: "Alle opdrachten",
  downloads: "Downloads",
  plans: "Wat elk abonnement bevat",
};

export const cliMessages: Record<Locale, typeof en> = { en, nl };
