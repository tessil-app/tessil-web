// Dutch comparison content. Written for Dutch search intent rather than
// translated line by line from the English, so wording and emphasis differ
// on purpose. Claims must stay identical in substance to the English page.
//
// `enSlug` links each entry to its English counterpart, which is what drives
// hreflang and the language switcher.

import { FORMS_ANNOUNCED, PORTALS_ANNOUNCED } from "$lib/config/launch";
import type { Comparison } from "./comparisons";
import { RECEIVING_VERIFIED_NL, receivingComparisonsNl } from "./receiving.nl";

export type LocalizedComparison = Comparison & {
  /** Slug of the English page this translates, for hreflang pairing. */
  enSlug: string;
};

/** Shown on every page so competitor facts are dated, not eternal truth. */
export const LAST_VERIFIED_NL = "juni 2026";

const TESSIL_NL = {
  e2e: true,
  keyServer: true,
  noAccount: true,
  openSource: "Ja (AGPL-3.0)",
  hosting: "EU (Duitsland + Nederland)",
  tracking: "Geen",
  price: "Gratis",
  expiry: true,
  password: true,
};

const sendComparisonsNl: LocalizedComparison[] = [
  {
    slug: "wetransfer-alternatief",
    enSlug: "wetransfer-alternative",
    competitor: "WeTransfer",
    shortName: "WeTransfer",
    metaTitle: "Versleuteld WeTransfer alternatief - Tessil",
    metaDescription:
      "Een versleuteld alternatief voor WeTransfer. Tessil versleutelt bestanden in je browser en ziet je bestanden of sleutel nooit. Open source, EU-hosting, gratis.",
    heading: "Tessil vs WeTransfer",
    summary:
      "Een end-to-end versleuteld alternatief voor WeTransfer. Je bestanden zijn voor ons onleesbaar: niet als instelling, maar als ontwerp.",
    intro: [
      "WeTransfer is voor de meeste mensen de standaardmanier om grote bestanden te versturen: slepen, link delen, klaar. Handig, maar niet end-to-end versleuteld. WeTransfer beheert zelf de sleutels, dus de dienst (en wie de dienst daartoe kan dwingen) kan in principe bij wat je uploadt. Op de gratis versie krijg je daarnaast advertenties en analytics, en in 2025 ontstond er kritiek op voorwaarden die vergaande rechten op geüploade bestanden leken te claimen, later herzien.",
      "Tessil is gebouwd voor het geval dat dit wel uitmaakt. Bestanden worden in je browser versleuteld met AES-GCM voordat ze je apparaat verlaten, en de ontsleutelsleutel staat in het URL-fragment van de deellink: het deel na de # dat browsers nooit naar een server sturen. Wij bewaren alleen versleutelde data die we zelf niet kunnen lezen.",
      "Tessil is open source (AGPL-3.0), volledig gehost in de EU, gratis, en je hebt geen account nodig om iets te versturen.",
    ],
    rows: [
      { label: "End-to-end versleuteld", tessil: TESSIL_NL.e2e, competitor: false },
      { label: "Sleutel bereikt de server nooit", tessil: TESSIL_NL.keyServer, competitor: false },
      { label: "Werkt zonder account", tessil: TESSIL_NL.noAccount, competitor: true },
      { label: "Open source", tessil: TESSIL_NL.openSource, competitor: false },
      {
        label: "Hosting / jurisdictie",
        tessil: TESSIL_NL.hosting,
        competitor: "EU (NL); eigendom van Bending Spoons",
      },
      {
        label: "Advertenties en tracking van derden",
        tessil: TESSIL_NL.tracking,
        competitor: "Advertenties op de gratis versie",
      },
      { label: "Prijs", tessil: TESSIL_NL.price, competitor: "Gratis versie + betaalde abonnementen" },
      { label: "Vervaltermijn en downloadlimieten", tessil: TESSIL_NL.expiry, competitor: true },
      { label: "Wachtwoordbeveiliging", tessil: TESSIL_NL.password, competitor: true },
    ],
    verdict: [
      "Wil je gewoon snel een bestand naar iemand sturen en speelt privacy geen rol, dan is WeTransfer prima en wrijvingsloos. Wil je dat de dienst je bestanden simpelweg niet kán lezen, voor klantwerk, documenten of wat dan ook dat gevoelig ligt, dan geeft Tessil je dat zonder dat je de simpele link-flow opgeeft.",
      "De gratis limieten van Tessil liggen lager dan die van WeTransfer. Dat is de eerlijke ruil voor zero-knowledge versleuteling en geen advertenties.",
    ],
    faq: [
      {
        q: "Is WeTransfer end-to-end versleuteld?",
        a: "Nee. WeTransfer versleutelt bestanden onderweg en in opslag, maar beheert zelf de sleutels, dus de dienst kan bij je bestanden. Tessil versleutelt in je browser en ontvangt de sleutel nooit.",
      },
      {
        q: "Kan ik met Tessil grote bestanden versturen zoals met WeTransfer?",
        a: "Tessil uploadt in delen tot de huidige limiet per transfer. Die limiet ligt lager dan bij de betaalde abonnementen van WeTransfer, in ruil voor echte end-to-end versleuteling en geen advertenties.",
      },
      {
        q: "Heb ik een account nodig om Tessil te gebruiken?",
        a: "Nee, je kunt anoniem versturen. Een optioneel gratis account geeft je een overzicht van de transfers die je aanmaakt. Het verandert niets aan de manier waarop bestanden versleuteld worden.",
      },
    ],
  },
  {
    slug: "boomerang-alternatief",
    enSlug: "boomerang-alternative",
    competitor: "Boomerang",
    shortName: "Boomerang",
    metaTitle: "Versleuteld, open source alternatief voor Boomerang - Tessil",
    metaDescription:
      "Boomerang is een nette transferdienst zonder advertenties, maar niet end-to-end versleuteld. Tessil versleutelt in je browser, houdt de sleutel buiten de server en is open source. EU-hosting, gratis versturen.",
    heading: "Tessil vs Boomerang",
    summary:
      "Net als Boomerang: zonder inloggen, zonder advertenties, gehost in de EU. Anders dan Boomerang: echt end-to-end versleuteld en open source.",
    intro: [
      "Boomerang (bmrng.me) is een nette transferdienst zonder advertenties, van een van de oprichters van WeTransfer. Je hoeft niet in te loggen, je gegevens blijven in de EU, en Boomerang zegt uitdrukkelijk geen advertenties te tonen en geen AI op je bestanden te trainen. Voor wie privacy belangrijk vindt, is dat een echte stap vooruit ten opzichte van de bekende grote namen.",
      "Waar het ophoudt, is de versleuteling. Boomerang beschrijft bestanden als versleuteld onderweg en in opslag. Dat betekent dat Boomerang de sleutels heeft en in principe kan lezen wat je uploadt. Dat is gewoon veilig bestanden delen, geen end-to-end versleuteling.",
      "Tessil dicht dat gat. Bestanden worden in je browser versleuteld voordat ze worden geüpload, en de sleutel staat in het fragment van de deellink, dus wij bewaren alleen versleutelde gegevens die we niet kunnen lezen. Alles is open source onder AGPL-3.0, dus de bewering is te controleren in plaats van alleen beweerd.",
    ],
    rows: [
      { label: "End-to-end versleuteld", tessil: TESSIL_NL.e2e, competitor: false },
      { label: "Sleutel bereikt de server nooit", tessil: TESSIL_NL.keyServer, competitor: false },
      { label: "Werkt zonder account", tessil: TESSIL_NL.noAccount, competitor: true },
      { label: "Open source", tessil: TESSIL_NL.openSource, competitor: false },
      { label: "Hosting / jurisdictie", tessil: TESSIL_NL.hosting, competitor: "Gegevens in de EU (op Cloudflare)" },
      { label: "Advertenties en tracking van derden", tessil: TESSIL_NL.tracking, competitor: "Geen (advertentievrij)" },
      { label: "Prijs", tessil: TESSIL_NL.price, competitor: "Gratis + betaald (ongeveer € 6,99 per maand)" },
      { label: "Vervaltermijn en downloadlimieten", tessil: TESSIL_NL.expiry, competitor: true },
      { label: "Wachtwoordbeveiliging", tessil: TESSIL_NL.password, competitor: "Alleen betaald" },
    ],
    verdict: [
      "Boomerang is een van de prettigere bekende transferdiensten: geen advertenties, geen AI-training, gehost in de EU, geen inloggen. Wil je vooral niet dat een platform dat van advertenties leeft je uploads uitbuit, dan doet Boomerang dat goed.",
      "Tessil is de volgende stap: als je wilt dat de dienst je bestanden technisch niet kán lezen, in plaats van alleen belooft het niet te doen. Versleuteling in de browser plus open source code is het verschil tussen een beleid vertrouwen en het controleren.",
    ],
    faq: [
      {
        q: "Is Boomerang end-to-end versleuteld?",
        a: "Volgens de openbare beschrijving niet. Boomerang versleutelt bestanden onderweg en in opslag, dus het beheert de sleutels en kan bij je bestanden. Tessil versleutelt in je browser en ontvangt de sleutel nooit, dus het bewaart alleen versleutelde gegevens die het niet kan lezen. Beweringen over versleuteling veranderen, dus controleer het op de site van elke aanbieder.",
      },
      {
        q: "Wat kost Boomerang in vergelijking met Tessil?",
        a: "Boomerang heeft een gratis versie en een betaald abonnement van ongeveer € 6,99 per maand voor meer opslag en grotere bestanden. Versturen met Tessil is gratis, met of zonder account; betaalde abonnementen voegen portalen en formulieren toe om te ontvangen. Kijk op de site van Boomerang voor de actuele prijzen.",
      },
      {
        q: "Is Tessil ook in Nederland gemaakt?",
        a: "Ja. Tessil wordt in Nederland gebouwd en volledig in de EU gehost (Duitsland en Nederland). Net als bij Boomerang heb je geen account nodig om te versturen, en Tessil voegt end-to-end versleuteling in de browser en volledig open source code toe.",
      },
    ],
  },
  {
    slug: "proton-drive-alternatief",
    enSlug: "proton-drive-alternative",
    competitor: "Proton Drive",
    shortName: "Proton Drive",
    metaTitle: "Proton Drive alternatief om snel versleuteld te versturen - Tessil",
    metaDescription:
      "Proton Drive is een volledige versleutelde cloud. Tessil is gericht, end-to-end versleuteld bestanden versturen zonder account: deel een link, de sleutel verlaat je browser niet. Open source, EU-hosting.",
    heading: "Tessil vs Proton Drive",
    summary:
      "Proton Drive is versleutelde cloudopslag; Tessil is gericht, versleuteld bestanden versturen zonder account.",
    intro: [
      "Proton Drive is een uitstekende end-to-end versleutelde clouddrive van het Proton-team in Zwitserland. Wil je bestanden lang bewaren met versleutelde synchronisatie tussen apparaten, dan is het een sterke keuze. Maar het is in de eerste plaats opslag, en je hebt een Proton-account nodig.",
      "Tessil lost een smaller probleem op: stuur dit bestand nu versleuteld naar deze persoon, zonder dat iemand zich hoeft aan te melden. Bestanden worden in je browser versleuteld, de sleutel reist mee in het fragment van de link, en de transfer verloopt wanneer jij wilt. Geen account nodig om te versturen of te ontvangen.",
      "Beide houden je gegevens zero-knowledge. Het verschil is de vorm: een drive waarin je werkt, tegenover een transfer die je verstuurt en vergeet.",
    ],
    rows: [
      { label: "End-to-end versleuteld", tessil: TESSIL_NL.e2e, competitor: true },
      { label: "Sleutel bereikt de server nooit", tessil: TESSIL_NL.keyServer, competitor: true },
      { label: "Werkt zonder account", tessil: TESSIL_NL.noAccount, competitor: false },
      { label: "Open source", tessil: TESSIL_NL.openSource, competitor: "Apps zijn open source" },
      { label: "Hosting / jurisdictie", tessil: TESSIL_NL.hosting, competitor: "Zwitserland" },
      { label: "Advertenties en tracking van derden", tessil: TESSIL_NL.tracking, competitor: "Geen" },
      { label: "Gemaakt voor", tessil: "Losse versleutelde transfers", competitor: "Versleutelde cloudopslag" },
      { label: "Prijs", tessil: TESSIL_NL.price, competitor: "Gratis versie + betaald" },
      { label: "Vervaltermijn en downloadlimieten", tessil: TESSIL_NL.expiry, competitor: true },
      { label: "Wachtwoordbeveiliging", tessil: TESSIL_NL.password, competitor: true },
    ],
    verdict: [
      "Kies Proton Drive als je een versleuteld thuis voor je bestanden wilt, met synchronisatie en lange opslag, en een account geen bezwaar is. Kies Tessil als je iemand gewoon veilig een bestand wilt geven zonder dat een van jullie zich aanmeldt.",
      "Veel mensen gebruiken beide: Proton Drive om te bewaren, Tessil om te versturen.",
    ],
    faq: [
      {
        q: "Vervangt Tessil Proton Drive?",
        a: "Niet precies: Proton Drive is cloudopslag, Tessil is losse transfers. Tessil vervangt het deel 'deel een link naar een bestand', zonder account of langdurige opslag.",
      },
      {
        q: "Heb ik voor Tessil een account nodig, zoals bij Proton?",
        a: "Nee. Tessil werkt volledig anoniem. Een account is optioneel en voegt alleen een lijst toe met de transfers die je maakt, waar je ze kunt beheren.",
      },
      {
        q: "Zijn ze allebei end-to-end versleuteld?",
        a: "Ja. Beide versleutelen op je apparaat, zodat de dienst je bestanden niet kan lezen. Tessil publiceert daarnaast zijn volledige broncode onder AGPL-3.0.",
      },
    ],
  },
  {
    slug: "tresorit-send-alternatief",
    enSlug: "tresorit-send-alternative",
    competitor: "Tresorit Send",
    shortName: "Tresorit Send",
    metaTitle: "Open source alternatief voor Tresorit Send - Tessil",
    metaDescription:
      "Een open source alternatief voor Tresorit Send. End-to-end versleuteld bestanden versturen, de sleutel bereikt de server nooit, gehost in de EU, geen account nodig.",
    heading: "Tessil vs Tresorit Send",
    summary:
      "Net als Tresorit Send, maar open source en gehost in de EU. Versleuteld, met een link, zonder account.",
    intro: [
      "Tresorit Send is de gratis transferdienst van Tresorit, een gewaardeerd Zwitsers encryptiebedrijf. Het is echt end-to-end versleuteld en werkt met een link: dicht bij wat Tessil doet. Het belangrijkste verschil is dat Tresorit gesloten broncode heeft, dus je neemt de beweringen over versleuteling op vertrouwen aan.",
      "Tessil biedt hetzelfde model (versleuteling in de browser, sleutel in het fragment van de link, geen account om te versturen) en publiceert elke regel broncode onder AGPL-3.0, zodat de zero-knowledge-bewering te controleren is in plaats van alleen beweerd.",
      "De hosting is volledig in de EU, en er zijn nergens advertenties of trackers van derden.",
    ],
    rows: [
      { label: "End-to-end versleuteld", tessil: TESSIL_NL.e2e, competitor: true },
      { label: "Sleutel bereikt de server nooit", tessil: TESSIL_NL.keyServer, competitor: true },
      { label: "Werkt zonder account", tessil: TESSIL_NL.noAccount, competitor: true },
      { label: "Open source", tessil: TESSIL_NL.openSource, competitor: false },
      { label: "Hosting / jurisdictie", tessil: TESSIL_NL.hosting, competitor: "Zwitserland (Tresorit / Swiss Post)" },
      { label: "Advertenties en tracking van derden", tessil: TESSIL_NL.tracking, competitor: "Geen" },
      { label: "Prijs", tessil: TESSIL_NL.price, competitor: "Send gratis + betaalde Tresorit" },
      { label: "Vervaltermijn en downloadlimieten", tessil: TESSIL_NL.expiry, competitor: true },
      { label: "Wachtwoordbeveiliging", tessil: TESSIL_NL.password, competitor: true },
    ],
    verdict: [
      "Tresorit Send is een degelijke, betrouwbare keuze, zeker als je Tresorit al gebruikt. Tessil geeft dezelfde versleutelde ervaring met een link, met de extra zekerheid van volledig open source code en hosting in de EU, en versturen is gratis.",
      "Is controleerbaarheid voor jou belangrijk, dan is dat de doorslag: de code van Tessil is openbaar.",
    ],
    faq: [
      {
        q: "Wat is het verschil tussen Tessil en Tresorit Send?",
        a: "Ze lijken erg op elkaar: beide zijn end-to-end versleuteld, werken met een link en vragen geen account om te versturen. Tessil is open source (AGPL-3.0) en gehost in de EU; Tresorit Send heeft gesloten broncode en wordt in Zwitserland gehost.",
      },
      {
        q: "Is Tessil echt gratis?",
        a: "Versturen is gratis en blijft dat, met of zonder account. Betaalde abonnementen voegen portalen en formulieren toe om te ontvangen. Er zijn geen advertenties en geen trackers van derden.",
      },
      {
        q: "Kan ik de versleuteling van Tessil controleren?",
        a: "Ja. De volledige code is gepubliceerd onder AGPL-3.0, dus iedereen kan nagaan hoe versleuteling en sleutelbeheer werken.",
      },
    ],
  },
  {
    slug: "wormhole-alternatief",
    enSlug: "wormhole-alternative",
    competitor: "Wormhole",
    shortName: "Wormhole",
    metaTitle: "Alternatief voor Wormhole (wormhole.app) - Tessil",
    metaDescription:
      "Net als Wormhole houdt Tessil de sleutel in de link, zodat wij je bestanden niet kunnen lezen. Anders dan Wormhole is Tessil open source, gehost in de EU, en met optionele accounts.",
    heading: "Tessil vs Wormhole",
    summary:
      "Hetzelfde model met de sleutel in de link als Wormhole, plus open source, hosting in de EU en optionele accounts.",
    intro: [
      "Wormhole (wormhole.app) maakte de strakke, moderne vorm van versleuteld versturen populair: bestanden worden in de browser versleuteld en de sleutel staat in de link, dus de dienst kan ze niet lezen. Transfers verlopen snel vanzelf. Een mooie dienst, en het dichtst bij Tessil in opzet.",
      "Tessil gebruikt hetzelfde kernidee (versleuteling in de browser, sleutel in het fragment van de URL) en verschilt in wat eromheen zit. Het is open source onder AGPL-3.0, gehost in de EU in plaats van de VS, en biedt een optioneel gratis account met een lijst van je transfers, zodat je ze kunt beheren en opnieuw delen in plaats van dat elke verzending vluchtig is.",
      "Je kiest ook zelf hoe lang een link geldig blijft, in plaats van vast te zitten aan één korte levensduur.",
    ],
    rows: [
      { label: "End-to-end versleuteld", tessil: TESSIL_NL.e2e, competitor: true },
      { label: "Sleutel bereikt de server nooit", tessil: TESSIL_NL.keyServer, competitor: true },
      { label: "Werkt zonder account", tessil: TESSIL_NL.noAccount, competitor: true },
      { label: "Open source", tessil: TESSIL_NL.openSource, competitor: false },
      { label: "Hosting / jurisdictie", tessil: TESSIL_NL.hosting, competitor: "Verenigde Staten (Socket)" },
      { label: "Advertenties en tracking van derden", tessil: TESSIL_NL.tracking, competitor: "Geen" },
      { label: "Optionele accounts / lijst met transfers", tessil: true, competitor: false },
      { label: "Instelbare geldigheid van links", tessil: TESSIL_NL.expiry, competitor: "Vaste korte levensduur" },
      { label: "Prijs", tessil: TESSIL_NL.price, competitor: "Gratis" },
    ],
    verdict: [
      "Wormhole en Tessil delen het belangrijkste: geen van beide diensten kan je bestanden lezen. Wil je de meest vluchtige ervaring, versturen en vergeten, dan is Wormhole prima. Wil je liever controleerbare open source code, hosting in de EU en de mogelijkheid van een account dat je transfers bijhoudt, dan past Tessil beter.",
      "Versturen is bij beide gratis, dus het draait vooral om jurisdictie, openheid en of je optioneel iets wilt bewaren.",
    ],
    faq: [
      {
        q: "Is Tessil hetzelfde als Wormhole?",
        a: "Het versleutelingsmodel is hetzelfde: bestanden worden op je apparaat versleuteld en de sleutel blijft in de link. Tessil verschilt doordat het open source is (AGPL-3.0), in de EU wordt gehost en optionele accounts biedt met een instelbare geldigheid.",
      },
      {
        q: "Verwijdert Tessil transfers automatisch, zoals Wormhole?",
        a: "Ja. Transfers verlopen op basis van de tijd en de downloadlimiet die je instelt. Je kiest zelf de periode in plaats van vast te zitten aan één korte levensduur.",
      },
      {
        q: "Waar worden beide diensten gehost?",
        a: "Tessil wordt volledig in de EU gehost (Duitsland en Nederland). Wormhole wordt vanuit de Verenigde Staten beheerd.",
      },
    ],
  },
  {
    slug: "swisstransfer-alternatief",
    enSlug: "swisstransfer-alternative",
    competitor: "SwissTransfer",
    shortName: "SwissTransfer",
    metaTitle: "End-to-end versleuteld alternatief voor SwissTransfer - Tessil",
    metaDescription:
      "SwissTransfer is gratis en bewaart bestanden in Zwitserland, maar is niet end-to-end versleuteld. Tessil versleutelt in je browser, zodat wij je bestanden niet kunnen lezen. Open source, EU-hosting, gratis.",
    heading: "Tessil vs SwissTransfer",
    summary:
      "Beide zijn gratis en zonder account. SwissTransfer verstuurt grotere bestanden; Tessil versleutelt ze zodat de dienst ze niet kan lezen.",
    intro: [
      "SwissTransfer, van de Zwitserse hostingpartij Infomaniak, is een royale gratis dienst: tot 50 GB per transfer, geen account, een optioneel wachtwoord, en bestanden die alleen in Infomaniaks eigen datacenters in Zwitserland staan. Infomaniak beschrijft de bestanden als versleuteld tijdens verzending en in opslag. Het noemt ze niet end-to-end versleuteld: de sleutels liggen dus bij Infomaniak.",
      "Tessil versleutelt elk bestand in je browser voordat het wordt geüpload, en de sleutel zit in het fragment van de link, het deel na de # dat browsers nooit naar een server sturen. Wij bewaren alleen versleutelde data die we niet kunnen openen, in de EU, en de code is open source onder AGPL-3.0.",
    ],
    rows: [
      { label: "End-to-end versleuteld", tessil: TESSIL_NL.e2e, competitor: "Nee; versleuteld tijdens verzending en in opslag" },
      { label: "Sleutel bereikt de server nooit", tessil: TESSIL_NL.keyServer, competitor: false },
      { label: "Werkt zonder account", tessil: TESSIL_NL.noAccount, competitor: true },
      { label: "Grootste transfer, gratis", tessil: "1 GB", competitor: "50 GB" },
      { label: "Hosting / jurisdictie", tessil: TESSIL_NL.hosting, competitor: "Zwitserland (eigen datacenters van Infomaniak)" },
      { label: "Open source", tessil: TESSIL_NL.openSource, competitor: "Geen openbare servercode gevonden" },
      { label: "Wachtwoord", tessil: TESSIL_NL.password, competitor: true },
      { label: "Prijs", tessil: TESSIL_NL.price, competitor: "Gratis" },
    ],
    verdict: [
      "Voor grote bestanden die niet gevoelig zijn, is SwissTransfer moeilijk te verslaan: 50 GB, gratis, geen account, en een partij met eigen Zwitserse datacenters.",
      "Voor documenten die niemand anders mag lezen, is end-to-end versleuteling het verschil dat telt. Bij Tessil heeft de dienst de sleutel nooit; bij SwissTransfer wel. De gratis transfers van Tessil zijn kleiner, dat is de ruil.",
    ],
    faq: [
      {
        q: "Is SwissTransfer end-to-end versleuteld?",
        a: "Niet volgens Infomaniaks eigen beschrijving: bestanden zijn versleuteld tijdens verzending en in opslag, niet in je browser. Tessil versleutelt in je browser en krijgt de sleutel nooit.",
      },
      {
        q: "Kan ik 50 GB versturen met Tessil?",
        a: "Nee. Gratis transfers bij Tessil gaan tot 1 GB, betaalde abonnementen tot 5 GB per bestand. Moet je 50 GB aan niet-gevoelige bestanden versturen, dan past SwissTransfer beter.",
      },
      {
        q: "Is Zwitserland of de EU beter voor privacy?",
        a: "Beide hebben sterke privacywetgeving. Het land bepaalt wie de gegevens van een aanbieder kan opeisen; end-to-end versleuteling bepaalt of die gegevens überhaupt leesbaar zijn. Tessil wordt in de EU gehost en heeft alleen gegevens die het niet kan lezen.",
      },
    ],
    verified: "november 2026",
    verifiedIso: "2026-11-23",
  },
  {
    slug: "smash-alternatief",
    enSlug: "smash-alternative",
    competitor: "Smash",
    shortName: "Smash",
    metaTitle: "Alternatief voor Smash met end-to-end versleuteling - Tessil",
    metaDescription:
      "Smash verstuurt gratis bestanden van elke grootte. Tessil versleutelt bestanden in je browser, zodat de dienst ze niet kan lezen. Open source, EU-hosting, zonder account.",
    heading: "Tessil vs Smash",
    summary: "Smash verstuurt bestanden van elke grootte. Tessil verstuurt kleinere bestanden die alleen de ontvanger kan lezen.",
    intro: [
      "Smash is een Franse dienst die bekendstaat om gratis transfers zonder limiet op de grootte, die tot 7 dagen beschikbaar blijven. De beveiligingspagina beschrijft bestanden als versleuteld met AES-256 in opslag en met TLS tijdens verzending, opgeslagen bij Amazon Web Services in meerdere regio's in de wereld, met hosting in Frankrijk als optie voor zakelijke klanten. Sommige pagina's van Smash noemen het gratis abonnement end-to-end versleuteld; wat de beveiligingspagina beschrijft is versleuteling in opslag en tijdens verzending, die de dienst zelf kan opheffen.",
      "Tessil versleutelt elk bestand in je browser voor het uploaden, en de sleutel blijft in het fragment van de link, dat nooit naar een server gaat. Wij bewaren versleutelde data die we niet kunnen lezen, in de EU, en de code is open source onder AGPL-3.0.",
    ],
    rows: [
      { label: "Versleuteld in je browser, sleutel nooit op de server", tessil: TESSIL_NL.keyServer, competitor: "Niet zoals de beveiligingspagina het beschrijft" },
      { label: "Werkt zonder account", tessil: TESSIL_NL.noAccount, competitor: true },
      { label: "Grootste transfer, gratis", tessil: "1 GB", competitor: "Geen limiet" },
      { label: "Hosting / jurisdictie", tessil: TESSIL_NL.hosting, competitor: "AWS, meerdere regio's; Frankrijk bij zakelijke abonnementen" },
      { label: "Open source", tessil: TESSIL_NL.openSource, competitor: false },
      { label: "Wachtwoord", tessil: TESSIL_NL.password, competitor: true },
      { label: "Prijs", tessil: TESSIL_NL.price, competitor: "Gratis + betaalde abonnementen" },
    ],
    verdict: [
      "Verstuur je enorme video- of ontwerpbestanden en is de inhoud niet vertrouwelijk, dan zijn de onbeperkte gratis transfers van Smash de praktische keuze.",
      "Moet wat je verstuurt tussen jou en de ontvanger blijven, dan betekent versleuteling in de browser bij Tessil dat de dienst het niet kan lezen, wat het beleid ook zegt. De gratis transfers van Tessil zijn daarvoor kleiner.",
    ],
    faq: [
      {
        q: "Is Smash end-to-end versleuteld?",
        a: "De pagina's verschillen. De beveiligingspagina beschrijft AES-256-versleuteling in opslag en TLS tijdens verzending, op opslag bij AWS: versleuteling waarvan de dienst de sleutels heeft. Tessil versleutelt in je browser en krijgt de sleutel nooit. Kijk op de huidige beveiligingspagina van Smash voor hun eigen woorden.",
      },
      {
        q: "Heeft Tessil een limiet op de bestandsgrootte?",
        a: "Ja: 1 GB per transfer op het gratis abonnement en 5 GB per bestand op betaalde abonnementen. Dat is de eerlijke prijs van alles in de browser versleutelen.",
      },
      {
        q: "Waar worden bestanden bewaard?",
        a: "Tessil bewaart versleutelde bestanden alleen in de EU. Smash zegt bestanden op te slaan bij AWS in meerdere regio's, dicht bij de gebruiker, met Frankrijk als optie voor zakelijke klanten.",
      },
    ],
    verified: "november 2026",
    verifiedIso: "2026-11-23",
  },
];

export const comparisonsNl: LocalizedComparison[] = [
  ...sendComparisonsNl,
  ...receivingComparisonsNl
    .filter((c) => (c.kind === "form" ? FORMS_ANNOUNCED : PORTALS_ANNOUNCED))
    .map((c) => ({ ...c, verified: RECEIVING_VERIFIED_NL })),
];

export function getComparisonNl(slug: string): LocalizedComparison | undefined {
  return comparisonsNl.find((c) => c.slug === slug);
}

/** Dutch slug for an English one, when a translation exists. */
export function nlSlugForEn(enSlug: string): string | undefined {
  return comparisonsNl.find((c) => c.enSlug === enSlug)?.slug;
}
