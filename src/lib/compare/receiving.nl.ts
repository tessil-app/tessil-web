// De vergelijkingen voor ontvangen in het Nederlands. Zelfde beweringen als
// receiving.ts; de woorden zijn geschreven voor Nederlandse zoekvragen.

import type { LocalizedComparison } from "./comparisons.nl";

export const RECEIVING_VERIFIED_NL = "november 2026";

const PORTAAL = {
  e2e: true,
  noAccount: "Ja, en we vragen niets over hen",
  openSource: "Ja (AGPL-3.0)",
  price: "Vanaf €9 per maand voor 3 portalen, niet per gebruiker",
  checklist: true,
  deleted: "Na 30 dagen, of 90 bij Max",
};

const FORMULIER = {
  e2e: "Altijd, vragen en antwoorden",
  noAccount: true,
  openSource: "Ja (AGPL-3.0)",
  hosting: "EU (Duitsland + Nederland)",
  price: "Vanaf €9 per maand voor 3 formulieren",
  deleted: "Na 30 dagen, of 90 bij Max",
};

const MADE = "Gemaakt in Nederland, gehost in de EU";

export const receivingComparisonsNl: LocalizedComparison[] = [
  {
    slug: "zivver-alternatief",
    enSlug: "zivver-alternative",
    kind: "portal",
    competitor: "Zivver",
    shortName: "Zivver",
    metaTitle: "Zivver alternatief voor bestanden ontvangen van klanten - Tessil",
    metaDescription:
      "Ontvang documenten van klanten via één versleutelde link, zonder prijs per gebruiker. Zo verhouden Tessil-portalen zich tot Zivver bij het verzamelen van bestanden.",
    heading: "Tessil vs Zivver",
    summary:
      "Zivver is beveiligde e-mail voor hele organisaties. Een Tessil-portaal doet één ding: een link waarmee klanten jou bestanden sturen die alleen jij kunt openen.",
    intro: [
      "Zivver is een Nederlandse dienst voor beveiligde e-mail, veel gebruikt door zorgaanbieders, gemeenten en advocatenkantoren. Het werkt in Outlook en Gmail, versleutelt berichten en bijlagen, waarschuwt voordat gegevens bij de verkeerde persoon belanden, en laat externe partijen veilig antwoorden of bestanden sturen via een link op je website. Zivver zegt zelf geen sleutels te hebben om berichten en bestanden te lezen.",
      "Een Tessil-portaal is smaller. Je geeft een klant één link, desgewenst met een lijstje van de documenten die je nodig hebt. Hun browser versleutelt elk bestand voordat het hun apparaat verlaat, met een sleutel die alleen jouw browser kan gebruiken. Ze hebben geen account en geen verificatiecode nodig, en krijgen een bevestiging met een referentie. Jij opent wat binnenkwam in je browser; wij kunnen dat niet.",
      "Heb je e-mailversleuteling nodig voor een heel kantoor, dan is dat het terrein van Zivver, niet het onze. Wil je vooral dat klanten je eenvoudig documenten kunnen sturen, dan doet een portaal dat zonder abonnement per gebruiker.",
    ],
    rows: [
      { label: "Versleuteld zodat de aanbieder het niet kan lezen", tessil: PORTAAL.e2e, competitor: "Ja, volgens Zivver" },
      { label: "Klanten versturen zonder account", tessil: PORTAAL.noAccount, competitor: "Ja, na een code, sms of e-mailcontrole" },
      { label: "Hoe klanten versturen", tessil: "Eén link per verzoek", competitor: "Antwoorden op een Zivver-mail, of een link op je site" },
      { label: "Lijst van de documenten die je nodig hebt", tessil: PORTAAL.checklist, competitor: false },
      { label: "Werkt in Outlook en Gmail", tessil: false, competitor: true },
      { label: "Versleutelde e-mail", tessil: false, competitor: true },
      { label: "Open source", tessil: PORTAAL.openSource, competitor: false },
      { label: "Prijs", tessil: PORTAAL.price, competitor: "Per gebruiker per maand, jaarlijks gefactureerd" },
    ],
    verdict: [
      "Zivver is het completere gereedschap voor een organisatie die veel gevoelige e-mail verstuurt: het dekt uitgaande mail, controleert ontvangers en past in het e-mailprogramma dat mensen al gebruiken. Tessil doet daar niets van.",
      "Voor bestanden ontvangen van klanten is een portaal eenvoudiger. Eén link, geen code die de klant moet intypen, een checklist van wat er nog ontbreekt, en een prijs per account in plaats van per collega. Veel kleine praktijken hebben precies dat nodig, en niet meer.",
    ],
    faq: [
      {
        q: "Vervangt een Tessil-portaal Zivver?",
        a: "Alleen voor het ontvangen van bestanden. Tessil versleutelt geen e-mail. Gebruik je Zivver voor uitgaande mail, dan kan een portaal ernaast staan om documenten van klanten te verzamelen.",
      },
      {
        q: "Hebben mijn klanten een account of code nodig?",
        a: "Nee. Ze openen de link, voegen hun bestanden toe en versturen. De link bevat zelf wat hun browser nodig heeft om voor jou te versleutelen. Bij het Max-abonnement kun je een wachtwoord op een portaal zetten.",
      },
      {
        q: "Kan Tessil lezen wat mijn klanten sturen?",
        a: "Nee. Bestanden, hun namen en de notities van klanten worden in de browser van de klant versleuteld met een sleutel die alleen jouw browser heeft, bewaard in je kluis. Wij bewaren alleen wat we niet kunnen openen.",
      },
    ],
    cta: { label: "Bekijk hoe portalen werken", href: "/portals" },
  },
  {
    slug: "dropbox-bestandsverzoek-alternatief",
    enSlug: "dropbox-file-request-alternative",
    kind: "portal",
    competitor: "Dropbox-bestandsverzoeken",
    shortName: "Dropbox",
    metaTitle: "Versleuteld alternatief voor Dropbox-bestandsverzoeken - Tessil",
    metaDescription:
      "Verzamel bestanden van iedereen via een link, versleuteld in hun browser zodat de dienst ze niet kan lezen. Zo verhouden Tessil-portalen zich tot Dropbox-bestandsverzoeken.",
    heading: "Tessil vs Dropbox-bestandsverzoeken",
    summary:
      "Allebei geven ze je een link waarmee iedereen jou bestanden kan sturen. Bij Tessil worden de bestanden versleuteld voordat ze het apparaat van de afzender verlaten.",
    intro: [
      "Met een Dropbox-bestandsverzoek stuur je iemand een link om bestanden rechtstreeks in een map in je Dropbox te uploaden, zonder eigen Dropbox-account. Handig, en geschikt voor heel grote bestanden. Wie uploadt, geeft een naam en e-mailadres op, en de bestanden komen in je Dropbox-opslag, die Dropbox versleutelt met sleutels die het zelf beheert.",
      "Een Tessil-portaal is ook een link waarmee iedereen je bestanden kan sturen. Het verschil zit in waar de versleuteling gebeurt: in de browser van de afzender, met een sleutel die alleen jouw browser kan gebruiken. Wij hebben nooit een leesbare kopie, en wie ons zou kunnen dwingen ook niet. We vragen afzenders niet wie ze zijn; je kunt een eigen veld toevoegen als je een naam of klantnummer nodig hebt.",
      "Bestanden in een portaal zijn niet bedoeld om te blijven. Ze worden na 30 dagen verwijderd, of na 90 bij Max, dus je downloadt wat je wilt bewaren.",
    ],
    rows: [
      { label: "Versleuteld zodat de aanbieder het niet kan lezen", tessil: PORTAAL.e2e, competitor: "Niet standaard" },
      { label: "Afzenders hebben geen account nodig", tessil: PORTAAL.noAccount, competitor: "Ja, met naam en e-mailadres" },
      { label: "Lijst van de documenten die je nodig hebt", tessil: PORTAAL.checklist, competitor: false },
      { label: "Bevestiging met een referentie voor de afzender", tessil: true, competitor: false },
      { label: "Grootste upload", tessil: "10 GB in één keer", competitor: "Tot 250 GB per bestand bij betaalde abonnementen" },
      { label: "Wat binnenkomt wordt verwijderd", tessil: PORTAAL.deleted, competitor: "Blijft in je Dropbox" },
      { label: "Open source", tessil: PORTAAL.openSource, competitor: false },
      { label: "Bedrijf", tessil: MADE, competitor: "Verenigde Staten" },
      { label: "Prijs", tessil: PORTAAL.price, competitor: "Inbegrepen bij Dropbox-abonnementen" },
    ],
    verdict: [
      "Betaal je al voor Dropbox en zijn de bestanden niet gevoelig, dan zijn bestandsverzoeken lastig te verslaan: ze zijn er al en kunnen heel grote bestanden aan.",
      "Gaat het om aangiftes, ID-bewijzen, medische brieven of contracten, dan is de vraag wie ze nog meer kan lezen als ze binnen zijn. Bij een portaal is het antwoord: niemand behalve jij, en ze stapelen zich niet jarenlang op in je opslag.",
    ],
    faq: [
      {
        q: "Zijn Dropbox-bestandsverzoeken end-to-end versleuteld?",
        a: "Dropbox versleutelt opgeslagen bestanden met sleutels die het zelf beheert, dus Dropbox kan ze lezen. Bij sommige zakelijke abonnementen zijn end-to-end versleutelde mappen beschikbaar; we vonden niets waaruit blijkt dat bestandsverzoeken die gebruiken.",
      },
      {
        q: "Hebben afzenders een Tessil-account nodig?",
        a: "Nee. Ze openen je link, voegen hun bestanden toe en drukken op versturen. We vragen niet om hun naam of e-mailadres.",
      },
      {
        q: "Waar komen de bestanden terecht?",
        a: "In je portaal, versleuteld. Je opent en downloadt ze in je browser, waar je kluis de sleutel bewaart. Ze worden automatisch verwijderd na 30 dagen, of na 90 bij Max.",
      },
    ],
    cta: { label: "Bekijk hoe portalen werken", href: "/portals" },
  },
  {
    slug: "google-forms-alternatief",
    enSlug: "google-forms-alternative",
    kind: "form",
    competitor: "Google Forms",
    shortName: "Google Forms",
    metaTitle: "Privacyvriendelijk Google Forms alternatief, end-to-end versleuteld - Tessil",
    metaDescription:
      "Een formulierenbouwer waarbij vragen en antwoorden in de browser worden versleuteld, zodat alleen jij de reacties kunt lezen. Zo verhouden Tessil-formulieren zich tot Google Forms.",
    heading: "Tessil vs Google Forms",
    summary:
      "Google Forms is gratis en makkelijk. Tessil-formulieren zijn end-to-end versleuteld, zodat niemand behalve jij de antwoorden kan lezen, ook wij niet.",
    intro: [
      "Google Forms is de formulierenbouwer die de meeste mensen kennen: gratis, snel opgezet en gekoppeld aan Sheets. Reacties staan in je Google-account, waar Google bij kan, en een vraag om een bestand te uploaden vraagt invullers in te loggen met een Google-account.",
      "Tessil-formulieren werken anders. Je vragen en elk antwoord worden in de browser versleuteld, met een sleutel die alleen jij hebt. Wie antwoordt heeft geen account nodig, ook niet om een bestand toe te voegen. De samenvatting en de export naar een spreadsheet worden in je browser gemaakt, nadat je kluis de antwoorden heeft geopend.",
      "Daarmee past Tessil beter als de antwoorden persoonlijk zijn: een intake van klanten, aanmeldingen, alles wat je niet leesbaar op de server van een ander wilt hebben staan.",
    ],
    rows: [
      { label: "Antwoorden versleuteld zodat de aanbieder ze niet kan lezen", tessil: FORMULIER.e2e, competitor: false },
      { label: "Antwoorden zonder account", tessil: FORMULIER.noAccount, competitor: true },
      { label: "Bestanden als antwoord zonder account", tessil: true, competitor: "Invullers moeten inloggen bij Google" },
      { label: "Samenvatting en export naar een spreadsheet", tessil: true, competitor: true },
      { label: "Logica, quizzen en add-ons", tessil: false, competitor: true },
      { label: "Reacties automatisch verwijderd", tessil: FORMULIER.deleted, competitor: "Blijven tot je ze verwijdert" },
      { label: "Open source", tessil: FORMULIER.openSource, competitor: false },
      { label: "Bedrijf", tessil: MADE, competitor: "Verenigde Staten" },
      { label: "Prijs", tessil: FORMULIER.price, competitor: "Gratis" },
    ],
    verdict: [
      "Voor een lunchpeiling of een inschrijflijst is Google Forms gratis en kan het meer: vertakkingen, quizzen, add-ons. Tessil probeert dat niet te evenaren.",
      "Bij vragen waarvan de antwoorden persoonlijk zijn, zet Google Forms ze op een plek waar Google bij kan. Een Tessil-formulier houdt ze alleen voor jou leesbaar, en vraagt niemand in te loggen om je een bestand te sturen.",
    ],
    faq: [
      {
        q: "Zijn reacties in Google Forms versleuteld?",
        a: "Google versleutelt opgeslagen gegevens, maar met sleutels die het zelf beheert, dus Google kan reacties lezen. Tessil versleutelt vragen en antwoorden in de browser met een sleutel die nooit bij ons komt.",
      },
      {
        q: "Kan ik reacties op een Tessil-formulier naar een spreadsheet exporteren?",
        a: "Ja, als CSV. De export wordt in je browser gemaakt nadat je kluis de antwoorden heeft geopend, dus de leesbare versie gaat nooit langs onze servers.",
      },
      {
        q: "Hebben mensen een account nodig om te antwoorden?",
        a: "Nee, ook niet om een bestand toe te voegen.",
      },
    ],
    cta: { label: "Probeer de formuliereditor", href: "/forms/try" },
  },
  {
    slug: "typeform-alternatief",
    enSlug: "typeform-alternative",
    kind: "form",
    competitor: "Typeform",
    shortName: "Typeform",
    metaTitle: "Versleuteld Typeform alternatief voor gevoelige antwoorden - Tessil",
    metaDescription:
      "Formulieren waarvan alleen jij de antwoorden kunt lezen: versleuteld in de browser van de invuller, gehost in de EU. Zo verhouden Tessil-formulieren zich tot Typeform.",
    heading: "Tessil vs Typeform",
    summary:
      "Typeform maakt mooie formulieren. Tessil maakt formulieren waarvan niemand anders de antwoorden kan lezen.",
    intro: [
      "Typeform staat bekend om formulieren die één vraag tegelijk stellen en aanvoelen als een gesprek, met logica, ontwerpthema's en veel koppelingen. Het versleutelt reacties op zijn servers met sleutels die het zelf beheert, dus Typeform kan ze lezen, en gegevens in de EU houden kan bij de duurdere abonnementen.",
      "Tessil-formulieren zijn eenvoudiger en privé door hun ontwerp. Vragen en antwoorden worden in de browser versleuteld met een sleutel die alleen jij hebt, bij elk abonnement, en alles wordt in de EU gehost. Wie antwoordt heeft geen account nodig.",
    ],
    rows: [
      { label: "Antwoorden versleuteld zodat de aanbieder ze niet kan lezen", tessil: FORMULIER.e2e, competitor: false },
      { label: "Gegevens in de EU", tessil: "Altijd", competitor: "Bij duurdere abonnementen" },
      { label: "Antwoorden zonder account", tessil: FORMULIER.noAccount, competitor: true },
      { label: "Eén vraag tegelijk, met logica", tessil: false, competitor: true },
      { label: "Koppelingen", tessil: false, competitor: true },
      { label: "Reacties automatisch verwijderd", tessil: FORMULIER.deleted, competitor: "Blijven tot je ze verwijdert" },
      { label: "Open source", tessil: FORMULIER.openSource, competitor: false },
      { label: "Prijs", tessil: FORMULIER.price, competitor: "Beperkt gratis abonnement + betaalde abonnementen" },
    ],
    verdict: [
      "Voor marketingenquêtes en leadformulieren zijn het ontwerp en de koppelingen van Typeform het waard, en daarop concurreert Tessil niet.",
      "Voor intakeformulieren en alles met persoonsgegevens is de beslissende vraag wie de antwoorden kan lezen. Bij Tessil ben jij dat alleen, bij elk abonnement, zonder extra te betalen om gegevens in de EU te houden.",
    ],
    faq: [
      {
        q: "Is Typeform end-to-end versleuteld?",
        a: "Nee. Typeform versleutelt gegevens in opslag en onderweg met sleutels die het zelf beheert. Tessil versleutelt in de browser van de invuller met een sleutel die nooit bij ons komt.",
      },
      {
        q: "Heeft Tessil voorwaardelijke logica?",
        a: "Nog niet. Tessil-formulieren hebben zeven soorten vragen, verplichte antwoorden, een welkomst- en bedanktekst, een sluitingsdatum en bestanden uploaden.",
      },
    ],
    cta: { label: "Probeer de formuliereditor", href: "/forms/try" },
  },
  {
    slug: "jotform-alternatief",
    enSlug: "jotform-alternative",
    kind: "form",
    competitor: "Jotform",
    shortName: "Jotform",
    metaTitle: "Jotform alternatief met versleuteling op elk formulier - Tessil",
    metaDescription:
      "Elk Tessil-formulier is end-to-end versleuteld, zonder instelling om te vergeten. Zo verhouden Tessil-formulieren zich tot Jotform en zijn optie voor versleutelde formulieren.",
    heading: "Tessil vs Jotform",
    summary:
      "Jotform kan een formulier versleutelen als je dat aanzet. Bij Tessil is elk formulier versleuteld, altijd.",
    intro: [
      "Jotform is een grote formulierenbouwer met duizenden sjablonen, betalingen, workflows en een optie voor servers in de EU. Het biedt ook versleutelde formulieren: zet versleuteling aan voor een formulier en de inzendingen zijn alleen te lezen met je toegangscode. Eerlijk is eerlijk: dat is echte end-to-end versleuteling, en het is een keuze per formulier.",
      "Bij Tessil is er geen schakelaar. Elke vraag en elk antwoord wordt in de browser versleuteld, met een sleutel in je kluis. Ook de naam en de vragen van het formulier zelf zijn versleuteld. De keerzijde is de omvang: Tessil doet veel minder dan Jotform.",
    ],
    rows: [
      { label: "Antwoorden versleuteld zodat de aanbieder ze niet kan lezen", tessil: FORMULIER.e2e, competitor: "Optioneel, per formulier" },
      { label: "Ook vragen en naam van het formulier versleuteld", tessil: true, competitor: false },
      { label: "Antwoorden zonder account", tessil: FORMULIER.noAccount, competitor: true },
      { label: "Betalingen, workflows en sjablonen", tessil: false, competitor: true },
      { label: "Gegevens in de EU", tessil: "Altijd", competitor: "EU-servers beschikbaar" },
      { label: "Reacties automatisch verwijderd", tessil: FORMULIER.deleted, competitor: "Blijven tot je ze verwijdert" },
      { label: "Open source", tessil: FORMULIER.openSource, competitor: false },
      { label: "Bedrijf", tessil: MADE, competitor: "Verenigde Staten" },
      { label: "Prijs", tessil: FORMULIER.price, competitor: "Gratis abonnement + betaalde abonnementen" },
    ],
    verdict: [
      "Heb je betalingen, goedkeuringen of een sjabloon voor elke gelegenheid nodig, dan doet Jotform veel meer, en zijn versleutelde formulieren een goede optie als je eraan denkt ze te gebruiken.",
      "Wil je dat privacy de standaard is in plaats van een instelling, met een kort en eenvoudig gereedschap eromheen, dan is Tessil de eenvoudigere keuze.",
    ],
    faq: [
      {
        q: "Heeft Jotform end-to-end versleuteling?",
        a: "Ja, als optie per formulier. Versleutelde inzendingen zijn alleen met je toegangscode te lezen. Formulieren zonder die optie worden bewaard met versleuteling die Jotform zelf beheert.",
      },
      {
        q: "Wat versleutelt Tessil?",
        a: "Alles wat een formulier bevat: de naam, vragen, opties, je teksten, elk antwoord en elk bestand. Wij zien dat een formulier bestaat, wanneer er reacties binnenkomen en hoe groot ze zijn.",
      },
    ],
    cta: { label: "Probeer de formuliereditor", href: "/forms/try" },
  },
  {
    slug: "formdesk-alternatief",
    enSlug: "formdesk-alternative",
    kind: "form",
    competitor: "Formdesk",
    shortName: "Formdesk",
    metaTitle: "Formdesk alternatief met end-to-end versleutelde antwoorden - Tessil",
    metaDescription:
      "Nederlandse formulieren, gehost in de EU, waarvan alleen jij de antwoorden kunt lezen. Zo verhouden Tessil-formulieren zich tot Formdesk.",
    heading: "Tessil vs Formdesk",
    summary:
      "Allebei Nederlands, allebei met gegevens in de EU. Tessil voegt end-to-end versleuteling toe, zodat zelfs wij de antwoorden niet kunnen lezen.",
    intro: [
      "Formdesk is een Nederlandse formulierenbouwer met een lange staat van dienst, gebruikt door veel Nederlandse organisaties. Alle gegevens worden in Nederland gehost, Formdesk meldt certificering voor ISO 27001 en NEN 7510, en er zijn functies voor betalingen, workflows en koppelingen.",
      "Tessil-formulieren zijn nieuwer en kleiner. Het verschil dat telt is end-to-end versleuteling: vragen en antwoorden worden in de browser van de invuller versleuteld met een sleutel die alleen jij hebt, dus wij zouden ze niet kunnen lezen als we het probeerden. Een vergelijkbare verklaring vonden we bij Formdesk niet.",
    ],
    rows: [
      { label: "Antwoorden versleuteld zodat de aanbieder ze niet kan lezen", tessil: FORMULIER.e2e, competitor: "Niet vermeld door Formdesk" },
      { label: "Gegevens in Nederland of de EU", tessil: FORMULIER.hosting, competitor: "Nederland" },
      { label: "ISO 27001 / NEN 7510", tessil: false, competitor: "Ja, volgens Formdesk" },
      { label: "Antwoorden zonder account", tessil: FORMULIER.noAccount, competitor: true },
      { label: "Betalingen, workflows en koppelingen", tessil: false, competitor: true },
      { label: "Open source", tessil: FORMULIER.openSource, competitor: false },
      { label: "Prijs", tessil: FORMULIER.price, competitor: "Betaalde abonnementen" },
    ],
    verdict: [
      "Voor een organisatie die certificeringen, betalingen en workflows nodig heeft, is Formdesk de gevestigde Nederlandse keuze, en die certificeringen heeft Tessil niet.",
      "Is het belangrijkste dat niemand behalve jij de antwoorden kan lezen, ook niet het bedrijf dat de formulieren draait, dan geeft Tessil je dat, met de code open zodat iedereen het kan nagaan.",
    ],
    faq: [
      {
        q: "Is Tessil gecertificeerd?",
        a: "Nog niet. In plaats daarvan is de code open source en kan iedereen de versleuteling controleren; zie de pagina Controleren. Wat wij kunnen zien, staat volledig op de beveiligingspagina.",
      },
      {
        q: "Waar wordt Tessil gehost?",
        a: "In de EU: servers in Duitsland, de database in Amsterdam, versleutelde bestanden in opslag die beperkt is tot de EU.",
      },
    ],
    cta: { label: "Probeer de formuliereditor", href: "/forms/try" },
  },
  {
    slug: "tresorit-bestandsverzoek-alternatief",
    enSlug: "tresorit-file-request-alternative",
    kind: "portal",
    competitor: "Tresorit-bestandsverzoeken",
    shortName: "Tresorit",
    metaTitle: "Alternatief voor Tresorit-bestandsverzoeken, open source - Tessil",
    metaDescription:
      "Ontvang bestanden van klanten via een end-to-end versleutelde link, zonder naar hun e-mailadres te vragen. Zo verhouden Tessil-portalen zich tot bestandsverzoeken van Tresorit.",
    heading: "Tessil vs Tresorit-bestandsverzoeken",
    summary:
      "Beide verzamelen bestanden via een end-to-end versleutelde link. Tessil vraagt afzenders niets, is open source en kost een bedrag per account.",
    intro: [
      "Tresorit, een Zwitsers bedrijf voor versleutelde opslag, biedt bestandsverzoeken op de abonnementen Solo, Business en Enterprise: een link waarmee iedereen bestanden kan uploaden in een map in je Tresorit, end-to-end versleuteld. Wie uploadt heeft geen Tresorit-account nodig maar geeft een e-mailadres op, een uploadsessie bevat tot 5 GB, en een map heeft één verzoeklink tegelijk. Een serieus, goed aangeschreven product, en de versleuteling is echt.",
      "Een Tessil-portaal doet hetzelfde kernwerk in een andere vorm. Afzenders geven niets over zichzelf op tenzij je daar een veld voor toevoegt, je kunt de documenten opsommen die je nodig hebt zodat je ziet wat ontbreekt, en elke afzender krijgt een bevestiging met een kenmerk. De code is open source, dus de versleuteling is te controleren in plaats van op vertrouwen aan te nemen.",
    ],
    rows: [
      { label: "Versleuteld zodat de aanbieder het niet kan lezen", tessil: PORTAAL.e2e, competitor: true },
      { label: "Afzenders hebben geen account nodig", tessil: PORTAAL.noAccount, competitor: "Ja, maar ze geven een e-mailadres op" },
      { label: "Lijst van de documenten die je nodig hebt", tessil: PORTAAL.checklist, competitor: false },
      { label: "Versleutelde opslag en synchronisatie voor je eigen bestanden", tessil: false, competitor: true },
      { label: "Open source", tessil: PORTAAL.openSource, competitor: false },
      { label: "Hosting", tessil: "EU (Duitsland + Nederland)", competitor: "Zwitsers bedrijf" },
      { label: "Prijs", tessil: PORTAAL.price, competitor: "Onderdeel van de abonnementen Solo, Business en Enterprise" },
    ],
    verdict: [
      "Bewaart je team zijn bestanden al in Tresorit, dan zijn de bestandsverzoeken de logische keuze: wat klanten sturen komt naast al het andere terecht, end-to-end versleuteld.",
      "Heb je alleen nodig dat klanten je documenten sturen, dan is een portaal lichter: geen e-mailadres gevraagd, een checklist van wat nog ontbreekt, open-source code, en een prijs die niet van een opslagabonnement afhangt.",
    ],
    faq: [
      {
        q: "Zijn beide end-to-end versleuteld?",
        a: "Ja. Tresorit versleutelt uploads via bestandsverzoeken end-to-end, en Tessil ook. Het verschil is dat de code van Tessil openbaar is, zodat iedereen kan nagaan hoe het werkt.",
      },
      {
        q: "Moeten afzenders hun e-mailadres opgeven?",
        a: "Bij Tresorit-bestandsverzoeken wel. Bij een Tessil-portaal niet: we vragen afzenders niets, en je kunt zelf één veld toevoegen, zoals een naam of klantnummer, dat net als de bestanden wordt versleuteld.",
      },
      {
        q: "Vervangt een portaal Tresorit?",
        a: "Alleen voor ontvangen. Tessil is geen opslag: bestanden blijven 30 dagen bewaard, of 90 bij Max, en worden daarna verwijderd. Download wat je wilt houden.",
      },
    ],
    cta: { label: "Bekijk hoe portalen werken", href: "/portals" },
  },
  {
    slug: "cryptpad-form-alternatief",
    enSlug: "cryptpad-form-alternative",
    kind: "form",
    competitor: "CryptPad Form",
    shortName: "CryptPad",
    metaTitle: "Alternatief voor CryptPad Form voor versleutelde intakeformulieren - Tessil",
    metaDescription:
      "Twee open-source formulierbouwers met end-to-end versleuteling. Zo verhouden Tessil-formulieren zich tot CryptPad Form, en wanneer je welke kiest.",
    heading: "Tessil vs CryptPad Form",
    summary:
      "Beide zijn open source en end-to-end versleuteld. CryptPad is een gratis kantoorpakket met formulieren; Tessil is een hulpmiddel voor formulieren en bestanden van klanten.",
    intro: [
      "CryptPad is een open-source, end-to-end versleuteld kantoorpakket uit Frankrijk, gratis te gebruiken op cryptpad.fr en zelf te hosten. De Form-app versleutelt vragen en antwoorden zodat alleen de eigenaren van het formulier ze kunnen lezen, laat mensen anoniem antwoorden en kent rollen voor wie bewerkt, wie antwoorden leest en wie invult. In opzet het dichtst bij Tessil-formulieren, en een uitstekend project.",
      "Tessil-formulieren delen het principe en verschillen in doel. Ze zijn gemaakt om antwoorden en documenten van klanten te verzamelen: een vraag voor bestanden die net zo versleuteld is als de rest, een samenvatting per vraag en een CSV-export die in je browser worden gemaakt, en sjablonen, allemaal voor je gehost in de EU. Wie antwoordt heeft geen account nodig.",
    ],
    rows: [
      { label: "Antwoorden versleuteld zodat de aanbieder ze niet kan lezen", tessil: FORMULIER.e2e, competitor: true },
      { label: "Open source", tessil: FORMULIER.openSource, competitor: "Ja (AGPL-3.0)" },
      { label: "Antwoorden zonder account", tessil: FORMULIER.noAccount, competitor: true },
      { label: "Vraag voor bestanden", tessil: true, competitor: "Niet in de documentatie" },
      { label: "Documenten, spreadsheets en andere kantoorapps", tessil: false, competitor: true },
      { label: "Zelf hosten", tessil: false, competitor: true },
      { label: "Prijs", tessil: FORMULIER.price, competitor: "Gratis op cryptpad.fr" },
    ],
    verdict: [
      "Wil je een gratis, versleuteld pakket met documenten, spreadsheets en formulieren, of wil je het zelf hosten, dan past CryptPad beter, en de formulieren zijn goed.",
      "Verzamel je persoonlijke antwoorden en documenten van klanten, dan is Tessil precies daarvoor gemaakt: vragen voor bestanden, een bevestiging met een kenmerk, en niets om zelf te beheren.",
    ],
    faq: [
      {
        q: "Zijn beide echt end-to-end versleuteld?",
        a: "Ja. CryptPad versleutelt formulieren en antwoorden in de browser, net als Tessil, en beide publiceren hun code onder AGPL-3.0.",
      },
      {
        q: "Kunnen mensen bestanden sturen via een CryptPad-formulier?",
        a: "We vonden geen vraag voor bestanden in de documentatie van CryptPad. In een Tessil-formulier wordt een bestandsvraag in de browser van de invuller versleuteld, net als elk ander antwoord.",
      },
      {
        q: "Waarom betalen voor Tessil als CryptPad gratis is?",
        a: "Misschien hoeft dat niet. Doen de formulieren van CryptPad wat je nodig hebt, gebruik ze dan. De betaalde abonnementen van Tessil voegen vragen voor bestanden toe, portalen om documenten te ontvangen, en opslag die voor je wordt beheerd.",
      },
    ],
    cta: { label: "Probeer de formuliereditor", href: "/forms/try" },
  },
];
