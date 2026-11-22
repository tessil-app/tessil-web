<script lang="ts">
  // De beveiligingspagina in het Nederlands. Zelfde secties als en.svelte.

  import { ACCESS_KEYS_ANNOUNCED, FORMS_ANNOUNCED, PORTALS_ANNOUNCED } from "$lib/config/launch";
  import { hrefFor } from "$lib/i18n/paths";
</script>

<section class="space-y-3">
  <h2 class="text-xl font-semibold text-foreground">Reikwijdte</h2>
  <p class="text-muted-foreground">
    Tessil is een dienst om bestanden end-to-end versleuteld te versturen. Deze pagina beschrijft
    het beveiligingsmodel: waar wij wel en niet bij kunnen, hoe sleutels worden behandeld, en hoe
    je een kwetsbaarheid meldt.
  </p>
  <p class="text-muted-foreground">
    Deze pagina beschrijft wat wij doen. Controleer je liever dan dat je leest, dan loopt
    <a href={hrefFor("/verify", "nl")} class="text-primary underline underline-offset-2">controleer het zelf</a>
    je door vier controles die je in ongeveer twee minuten op de live site uitvoert.
  </p>
</section>

<section class="space-y-3">
  <h2 class="text-lg font-semibold text-foreground">Versleutelingsmodel</h2>
  <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
    <li>Bestanden, bestandsnamen en de optionele titel van een transfer worden vóór het uploaden in je browser versleuteld met AES-256-GCM</li>
    <li>De sleutel wordt in je browser gemaakt en staat in het fragment van de URL (het deel na <code>#</code>)</li>
    <li>Browsers sturen het fragment van een URL niet naar servers, dus de sleutel blijft in je browser</li>
    <li>Een optioneel wachtwoord sluit de sleutel in de link op en schermt de toegang op de server af. Het wachtwoord blijft in je browser; wij ontvangen alleen een daarvan afgeleide waarde, waarmee de link niet open kan</li>
    <li>Transfers worden automatisch verwijderd als ze verlopen</li>
  </ul>
</section>

<section class="space-y-3">
  <h2 class="text-lg font-semibold text-foreground">Links veilig delen</h2>
  <p class="text-muted-foreground">
    De sleutel staat in het fragment van de URL, het deel na <code>#</code>. Browsers sturen
    fragmenten nooit naar servers; de sleutel blijft op je apparaat.
  </p>
  <p class="text-muted-foreground">
    De volledige URL, met fragment, kan wel terechtkomen in je browsergeschiedenis, in
    browsersynchronisatie en in bladwijzers. Wie bij je browser kan, kan een bewaarde link lezen en
    de bestanden ontsleutelen, tenzij je een wachtwoord instelt.
  </p>
  <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
    <li>Deel links via betrouwbare, privé kanalen (Signal, versleutelde e-mail)</li>
    <li>Stel bij gevoelige bestanden een wachtwoord in, als tweede slot naast de link</li>
    <li>Gebruik een privévenster als je de link niet in je geschiedenis wilt</li>
    <li>Kies de kortste geldigheid die voor je ontvanger nog werkt</li>
  </ul>
</section>

<section class="space-y-3">
  <h2 class="text-lg font-semibold text-foreground">Wat wij kunnen zien</h2>
  <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
    <li>Versleutelde bestanden, versleutelde bestandsnamen en de versleutelde titel van een transfer (als die er is)</li>
    <li>Gegevens over een transfer: grootte, verloopdatum, tijdstippen</li>
    <li>Gegevens die nodig zijn om misbruik te behandelen en verkeer te begrenzen</li>
  </ul>
</section>

<section class="space-y-3">
  <h2 class="text-lg font-semibold text-foreground">Wat wij niet kunnen zien</h2>
  <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
    <li>De inhoud van bestanden</li>
    <li>De oorspronkelijke bestandsnamen</li>
    <li>De leesbare titel van een transfer</li>
    <li>Je sleutel</li>
  </ul>
</section>

<section class="space-y-3">
  <h2 class="text-lg font-semibold text-foreground">Waarborgen</h2>
  <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
    <li>HTTPS/TLS onderweg</li>
    <li>Alle cryptografie draait in je browser voordat er bytes het netwerk op gaan</li>
    <li>Een account is niet verplicht; versturen zonder account is volwaardig</li>
    <li>Geen analytics of tracking van derden</li>
  </ul>
</section>

<section class="space-y-3">
  <h2 class="text-lg font-semibold text-foreground">Optionele accounts</h2>
  <p class="text-muted-foreground">
    Log in om je transfers op één plek te beheren. Inloggen is niet verplicht. Accounts gebruiken
    een inloglink per e-mail of een passkey op je apparaat: geen wachtwoord om te onthouden, kwijt
    te raken of te laten uitlekken.
    <strong>Een account verzwakt de versleuteling niet:</strong>
    bestanden blijven end-to-end versleuteld, ingelogd of niet, en de sleutel staat nog steeds
    alleen in het fragment van de URL.
  </p>
  <p class="text-muted-foreground">Als je een account hebt, bewaren we:</p>
  <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
    <li>Je e-mailadres (om in te loggen)</li>
    <li>Je abonnement</li>
    <li>Een gehashte sessiecode, zolang je ingelogd blijft</li>
    <li>De browser waarmee je inlogde, als context in je inlogmail</li>
    <li>Inloggebeurtenissen (aanvragen, gelukte inlogpogingen, uitloggen), 90 dagen bewaard en daarna automatisch verwijderd</li>
  </ul>
  <p class="text-muted-foreground">
    <strong>We bewaren geen IP-adressen.</strong> Bij inloggebeurtenissen leggen we het land en de
    netwerkaanbieder (ASN) vast die we op het moment van de aanvraag uit je IP-adres afleiden, plus
    een wisselende cryptografische code waarmee we verdachte activiteit binnen 24 uur aan elkaar
    kunnen koppelen zonder het adres zelf te bewaren. Die code hangt af van een geheim dat we elke
    30 dagen vervangen, waarna eerdere gebeurtenissen voorgoed niet meer te koppelen zijn.
  </p>
  <p class="text-muted-foreground">
    Dit geldt voor elke gebeurtenis rond inloggen. Land en ASN worden opgezocht met MaxMind
    GeoLite2, lokaal geladen op onze servers; voor deze opzoeking verlaten geen gegevens per
    aanvraag de server.
  </p>
  <p class="text-muted-foreground">
    De code in een inloglink en je sessiecookie worden nooit leesbaar in de database gezet: beide
    worden eerst met SHA-256 gehasht. Inloglinks verlopen na 15 minuten en werken één keer.
  </p>
</section>

<section class="space-y-3">
  <h2 class="text-lg font-semibold text-foreground">Inlogcodes en phishing</h2>
  <p class="text-muted-foreground">
    Open je een inloglink op een ander apparaat dan waar je begon, dan toont Tessil daar een code
    van 6 cijfers in plaats van je in te loggen. Typ die code over op het apparaat waar je begon.
  </p>
  <p class="text-muted-foreground">
    <strong>Tessil vraagt je nooit om die code te delen.</strong>
    We mailen, bellen of berichten je nooit om een inlogcode te vragen. Vraagt iemand om de code,
    die zegt van Tessil te zijn, een vriend of een bezorgdienst, dan is het phishing. Deel hem niet.
  </p>
  <p class="text-muted-foreground">
    De code staat alleen op het apparaat dat de link opende. Nooit in de e-mail zelf, nooit in een
    ander bericht van ons.
  </p>
</section>

<section class="space-y-3">
  <h2 class="text-lg font-semibold text-foreground">Passkeys</h2>
  <p class="text-muted-foreground">
    Ondersteunt je apparaat het, voeg dan een passkey toe en sla de e-mail bij het inloggen over.
    Een passkey is een cryptografisch sleutelpaar dat je apparaat maakt en bewaart: Touch ID, Face
    ID, Windows Hello, een hardwaresleutel of een gesynchroniseerde sleutel uit de
    wachtwoordbeheerder van je platform.
  </p>
  <p class="text-muted-foreground">
    <strong>Passkeys zijn gebonden aan het domein van deze site.</strong> Je browser geeft een
    passkey van Tessil alleen af aan Tessil; op een nagemaakte site werkt hij niet, ook niet als die
    ons ontwerp tot op de pixel kopieert. Dat dwingt de browser af (de WebAuthn-standaard), niet
    wij. Daarom zijn passkeys bestand tegen phishing op een manier die wachtwoorden en eenmalige
    codes niet zijn.
  </p>
  <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
    <li>De privésleutel verlaat je apparaat nooit (of de beveiligde synchronisatie van je platform, als je daarvoor kiest)</li>
    <li>Wij bewaren alleen een publieke sleutel, een kenmerk en eenvoudige gegevens over het apparaat</li>
    <li>Voeg passkeys toe, hernoem of verwijder ze op elk moment in je accountinstellingen</li>
    <li>Passkeys vervangen inloggen per e-mail niet: beide blijven beschikbaar, zodat een verloren apparaat je niet buitensluit</li>
    <li>Een passkey kan ook je kluis openen, als je dat kiest. Zie hieronder bij de kluis</li>
  </ul>
  <p class="text-muted-foreground">
    Passkeys veranderen het versleutelingsmodel niet. Bestanden blijven end-to-end versleuteld, de
    sleutel staat nog steeds alleen in het fragment van de URL, en inloggen met een passkey bewijst
    alleen wie je bent tegenover Tessil; het geeft ons geen toegang tot de inhoud van je transfers.
  </p>
</section>

<section class="space-y-3">
  <h2 class="text-lg font-semibold text-foreground">De kluis (optioneel)</h2>
  <p class="text-muted-foreground">
    Een account werkt zonder kluis: je kunt inloggen en versturen, en je lijst met transfers toont
    wat je verstuurde naar grootte en datum. Een kluis voegt de twee dingen toe die wij niet leesbaar
    voor je kunnen bewaren: de namen van wat je verstuurde, en de links ernaartoe.
  </p>
  <p class="text-muted-foreground">
    Als je er een aanmaakt, maakt je browser een willekeurige kluissleutel
    (<em>K<sub>vault</sub></em>). Die komt nooit op onze servers. Wij bewaren alleen kopieën die op
    slot zitten, elk onder iets wat alleen jij hebt:
  </p>
  <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
    <li>een herstelzin van 12 woorden, altijd, als je offline reservekopie</li>
    <li>een kluiswachtwoord, als je dat kiest, in je browser versterkt met Argon2id</li>
    <li>een passkey, als je apparaat dat ondersteunt, met een geheim dat alleen die passkey kan maken</li>
  </ul>
  <p class="text-muted-foreground">
    Elk van deze opent de kluis. Wij zien de zin, het wachtwoord en het geheim van de passkey nooit,
    dus geen ervan is bij ons terug te halen. Raak je ze allemaal kwijt, dan is wat de kluis
    beschermt weg.
  </p>
  <p class="text-muted-foreground">
    Verstuur je iets terwijl je ingelogd bent en de kluis open is, dan sluit je browser de sleutel
    van die transfer op onder de kluissleutel en bewaart die opgesloten kopie bij ons. Zo kan je
    lijst met transfers later namen tonen en een link opnieuw maken. De kluis bevat ook een
    sleutelpaar voor je account: wij bewaren de publieke helft, en de privéhelft alleen op slot.
  </p>
  <p class="text-muted-foreground">
    De kluis blijft op een apparaat standaard een dag open, of 7 of 30 dagen als je dat voor dat
    apparaat kiest, en vraagt het daarna opnieuw. Je kunt hem op elk moment vergrendelen via het
    accountmenu, waarmee de sleutel meteen uit het geheugen verdwijnt.
  </p>
  <p class="text-muted-foreground">
    <strong>Wat dit beschermt:</strong> wie je kluis kan openen, ziet de namen en links van je
    eerdere transfers. De bestanden zelf zijn altijd versleuteld onder een aparte sleutel per
    transfer, die in de deellink zit.
  </p>
</section>

{#if PORTALS_ANNOUNCED}
  <section class="space-y-3" id="portals">
    <h2 class="text-lg font-semibold text-foreground">Portalen</h2>
    <p class="text-muted-foreground">
      Een portaal is een link waarmee anderen jou bestanden sturen. Het werkt als een transfer, maar
      omgekeerd: de browser van de afzender versleutelt, en alleen jouw browser kan ontsleutelen.
    </p>
    <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
      <li>Elk portaal heeft een eigen sleutelpaar, gemaakt in je browser. De privésleutel staat in je kluis en komt nooit leesbaar bij ons</li>
      <li>De portaallink draagt een tweede sleutel in het fragment. Die opent in de browser van de afzender de naam van het portaal, de lijst met gevraagde documenten en de publieke sleutel. Wij bewaren die alleen op slot, dus we kunnen ze niet lezen en de publieke sleutel niet vervangen door een van onszelf</li>
      <li>De browser van een afzender versleutelt elk bestand, de naam en de optionele notitie met een nieuwe sleutel, en sluit die zo op dat alleen de privésleutel van het portaal hem opent. De afzender kan zijn eigen levering daarna niet teruglezen, en andere afzenders ook niet</li>
      <li>Afzenders hebben geen account nodig. We vragen niet wie ze zijn</li>
      <li>Leveringen worden automatisch verwijderd na de periode die je abonnement bepaalt, en eerder als je ze verwijdert</li>
    </ul>
    <p class="text-muted-foreground">
      <strong>Een portaal delen.</strong> Je kunt één ander account toegang geven. Je browser geeft
      dat account de sleutels van het portaal, opgesloten voor zijn publieke sleutel en ondertekend
      met de jouwe, zodat zijn browser ze alleen aanneemt als ze van jou komen. Wat wij niet voor je
      kunnen bewijzen, is dat een publieke sleutel echt van de bedoelde persoon is. Daarvoor zijn de
      twee korte codes op het deelscherm: zien jullie allebei dezelfde codes, dan heeft niemand
      onderweg een sleutel vervangen. Sla je die vergelijking over, dan vertrouw je voor die ene stap
      op onze server.
    </p>
    <p class="text-muted-foreground">
      <strong>Wat wij van een portaal kunnen zien:</strong> dat het bestaat en van wie het is, of het
      aan staat, wanneer er leveringen binnenkomen, hoeveel bestanden ze bevatten en hoe groot die
      zijn, het e-mailadres dat je uitnodigt, en wanneer je het voor het laatst opende. Niet de naam,
      niet wat je vraagt, niet de notities, de bestandsnamen of de bestanden.
    </p>
  </section>
{/if}

{#if FORMS_ANNOUNCED}
  <section class="space-y-3" id="forms">
    <h2 class="text-lg font-semibold text-foreground">Formulieren</h2>
    <p class="text-muted-foreground">
      Een formulier is een link waarmee anderen jouw vragen beantwoorden. Eronder zit een portaal:
      hetzelfde sleutelpaar in je kluis, dezelfde tweede sleutel in de link, en hetzelfde delen met
      één ander account.
    </p>
    <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
      <li>Je vragen, hun opties en je teksten worden in je browser versleuteld en alleen op slot bewaard. De sleutel die ze voor een bezoeker opent staat in het fragment van de link, dat nooit bij ons komt</li>
      <li>De browser van de bezoeker zet de antwoorden in één klein bestand en versleutelt dat met een nieuwe sleutel, zo opgesloten dat alleen de privésleutel van het formulier het opent. Bestanden die als antwoord worden meegestuurd, worden net zo versleuteld</li>
      <li>Het antwoordbestand wordt aangevuld tot een veelvoud van 1 KiB, zodat de grootte weinig zegt over hoeveel er geschreven is</li>
      <li>Wie antwoordt heeft geen account nodig. We vragen niet wie het is</li>
      <li>De samenvatting, het zoeken en de export worden in je browser gemaakt, nadat je kluis de antwoorden heeft geopend</li>
      <li>Reacties worden automatisch verwijderd na de periode die je abonnement bepaalt, en eerder als je ze verwijdert</li>
    </ul>
    <p class="text-muted-foreground">
      <strong>Wat een formulier niet kan beloven.</strong> Omdat wij een formulier niet kunnen
      lezen, kan onze server een reactie er niet aan toetsen. Verplichte vragen en de formulering van
      elke vraag worden door de browser van de bezoeker afgehandeld, en elk antwoord komt binnen met
      de vraag zoals die browser hem toonde. Wie met zijn eigen browser knoeit, kan een andere
      formulering sturen of een verplichte vraag overslaan. De pagina van het formulier markeert een
      antwoord waarvan de formulering afwijkt.
    </p>
    <p class="text-muted-foreground">
      <strong>Wat wij van een formulier kunnen zien:</strong> dat het een formulier is en van wie, of
      het aan staat, de sluitingsdatum als die er is, wanneer er reacties binnenkomen, hoeveel
      bestanden ze bevatten en hoe groot die zijn. Niet de naam, niet de vragen of hun opties, niet
      de antwoorden, de bestandsnamen of de bestanden.
    </p>
  </section>
{/if}

{#if ACCESS_KEYS_ANNOUNCED}
  <section class="space-y-3" id="access-keys">
    <h2 class="text-lg font-semibold text-foreground">De command-line tool en toegangssleutels</h2>
    <p class="text-muted-foreground">
      De tool <code>tessil</code> doet op je eigen computer wat deze site in je browser doet, met
      dezelfde versleutelingscode. Hij kan ook draaien als MCP-server, zodat een AI-assistent op je
      computer hem kan gebruiken. Hij logt in met een toegangssleutel, niet met je account.
    </p>
    <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
      <li>Een toegangssleutel wordt op je computer gemaakt: een token, een sleutelpaar en een eigen geheim. Wij bewaren een hash van het token en de publieke sleutel. De tool bewaart de rest in de sleutelbos van je systeem</li>
      <li>Je keurt een sleutel goed in je browser met een korte code, nadat je de vingerafdruk van de sleutel op beide schermen hebt vergeleken, en je kiest wat hij mag. Hij werkt 90 dagen en is meteen in te trekken. Overal uitloggen trekt elke sleutel in</li>
      <li>Een sleutel heeft nooit je kluis, je wachtwoord of je browsersessie. Hij kan niet bij accountinstellingen, betalingen, passkeys of andere sleutels, wat hij ook mag</li>
      <li>Een sleutel ziet alleen de transfers die hij zelf verstuurde</li>
      <li>Een sleutel opent een portaal alleen als jij hem dat portaal geeft. Je browser sluit de sleutels van het portaal op voor de publieke sleutel van de toegangssleutel en ondertekent ze met de jouwe; de tool weigert alles wat niet is ondertekend door de accountsleutel die je bevestigde. Een sleutel die één portaal kreeg, kan geen ander openen, omdat hij de middelen daarvoor nooit kreeg</li>
    </ul>
    <p class="text-muted-foreground">
      <strong>Met een AI-assistent.</strong> Wat een assistent ziet, wordt bewaard door wie het model
      draait, en een link bevat de sleutel tot de bestanden. Daarom geeft de MCP-server van de tool
      de assistent nooit een link, een sleutel of een wachtwoord: een nieuwe link gaat naar je
      klembord. Geen enkele functie geeft de inhoud van een bestand terug. Wat een afzender in een
      levering schreef (notities, antwoorden, bestandsnamen) wordt doorgegeven als het zijne,
      opgeschoond en ingekort.
    </p>
    <p class="text-muted-foreground">
      <strong>Wat dit niet dekt.</strong> Een assistent die ook opdrachten op je computer kan
      uitvoeren, kan daar doen wat jij kunt, ook je klembord lezen. Die grenzen zijn van de
      assistent, ingesteld waar je goedkeurt wat hij uitvoert. De MCP-server draait alleen op je
      eigen computer; wij bieden geen gehoste versie, omdat die je sleutels zou moeten bewaren.
    </p>
    <p class="text-muted-foreground">
      <strong>Wat wij van een sleutel kunnen zien:</strong> de naam, de publieke sleutel, wat je hem
      toestond, welke portalen je hem gaf, wanneer hij voor het laatst werd gebruikt, en welke
      transfers hij verstuurde. Niet de bestanden, hun namen, of iets wat een sleutel ontsleutelt.
    </p>
    <p class="text-muted-foreground">
      De tool is open source, en zijn kopie van de versleutelingscode wordt getoetst aan gegevens die
      van deze site zijn vastgelegd.
      <a href="https://github.com/tessil-app/tessil-cli" class="text-primary underline underline-offset-2">Lees de code</a>.
    </p>
  </section>
{/if}

<section class="space-y-3">
  <h2 class="text-lg font-semibold text-foreground">Kwetsbaarheden melden</h2>
  <p class="text-muted-foreground">
    Een beveiligingsprobleem gevonden? Meld het vertrouwelijk, zodat we het kunnen oplossen voordat
    het openbaar wordt.
  </p>
  <p class="text-muted-foreground">
    <a href="mailto:security@tessil.app" class="text-primary underline underline-offset-2">security@tessil.app</a>
  </p>
  <p class="text-sm text-muted-foreground">
    Vermeld de stappen om het na te doen, de betrokken URL's en de gevolgen. Je hoort binnen 72 uur
    van ons.
  </p>
</section>

<section class="space-y-3">
  <h2 class="text-lg font-semibold text-foreground">Bronvermelding</h2>
  <p class="text-sm text-muted-foreground">
    Land en ASN worden opgezocht met GeoLite2-gegevens van MaxMind, beschikbaar via
    <a href="https://www.maxmind.com" rel="noopener noreferrer" class="text-primary underline underline-offset-2">maxmind.com</a>.
    De databases worden lokaal op onze servers geladen; er worden geen gegevens per aanvraag naar
    MaxMind gestuurd.
  </p>
</section>
