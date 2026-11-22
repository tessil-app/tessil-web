<script lang="ts">
  // Het privacybeleid in het Nederlands. Zelfde secties en betekenis als en.svelte.

  import { ACCESS_KEYS_ANNOUNCED, FORMS_ANNOUNCED, PORTALS_ANNOUNCED } from "$lib/config/launch";
</script>

<section class="space-y-3">
  <h2 class="text-xl font-semibold text-foreground">1. Inleiding</h2>
  <p class="text-muted-foreground">
    Tessil ("wij", "ons") is een dienst om bestanden end-to-end versleuteld te versturen. Deze
    pagina legt uit welke gegevens we verwerken als je de dienst op tessil.app gebruikt.
  </p>
  <p class="text-muted-foreground">
    Je bestanden zijn voor ons onleesbaar, en dat is zo ontworpen. Ze worden in je browser
    versleuteld voordat ze worden geüpload, en de sleutel staat in het fragment van de deellink; dat
    fragment komt nooit op onze servers.
  </p>
  <p class="text-muted-foreground">
    Je kunt Tessil anoniem gebruiken of met een account. Een account voegt functies toe om je
    transfers te beheren; het verandert niets aan hoe bestanden worden versleuteld.
  </p>
</section>

<section class="space-y-3">
  <h2 class="text-xl font-semibold text-foreground">2. Gegevens die we verzamelen</h2>

  <h3 class="text-lg font-medium text-foreground">2.1 Gegevens van transfers (versleuteld)</h3>
  <p class="text-muted-foreground">
    Als je bestanden uploadt, worden ze in je browser versleuteld voordat ze naar onze servers
    gaan. We bewaren:
  </p>
  <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
    <li>Versleutelde bestandsgegevens (die kunnen wij niet ontsleutelen)</li>
    <li>Versleutelde bestandsnamen (die kunnen wij niet ontsleutelen)</li>
    <li>Bestandsgrootte, MIME-type en tijdstip van uploaden</li>
    <li>De verloopdatum die je koos</li>
    <li>Een downloadteller en, als je een wachtwoord instelt, een hash van een waarde die je browser daaruit afleidt (nooit het wachtwoord zelf)</li>
  </ul>
  <p class="text-muted-foreground">
    De sleutel wordt in je browser gemaakt en staat alleen in het fragment van de deellink. Wij
    ontvangen of bewaren de sleutel nooit. Wij kunnen je bestanden niet ontsleutelen.
  </p>

  <h3 class="text-lg font-medium text-foreground">2.2 Accountgegevens (alleen als je inlogt)</h3>
  <p class="text-muted-foreground">
    Een account is niet verplicht. Als je ervoor kiest in te loggen, verzamelen we het volgende:
  </p>
  <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
    <li>
      <strong>E-mailadres.</strong> Gebruikt om je te herkennen bij het inloggen. Opgeslagen in
      kleine letters, geïndexeerd om dubbele accounts te voorkomen, en gebruikt om je een eenmalige
      inloglink te sturen.
    </li>
    <li>
      <strong>Inloggegevens.</strong> Gehashte inlogcodes (we bewaren alleen de SHA-256-hash, nooit
      de code zelf), de browser (user-agent) van elke inlogpoging en actieve sessie, het land en de
      netwerkaanbieder die op dat moment uit je IP-adres worden afgeleid, en de vervaltijden van
      sessies. Het IP-adres zelf bewaren we niet; om dezelfde verbinding te herkennen houden we er
      een vingerafdruk met een sleutel van bij, die niet naar het adres is terug te rekenen en
      waardeloos wordt zodra de sleutel is verwijderd.
    </li>
    <li>
      <strong>Abonnement.</strong> Op welk abonnement het account zit.{#if PORTALS_ANNOUNCED}
        {" "}Bij een betaald abonnement laat onze betaalprovider ons weten dat er een abonnement is
        en wanneer het verlengt of eindigt. Je kaartgegevens ontvangen we nooit.{/if}
    </li>
    <li>
      <strong>Koppeling van transfers aan je account.</strong> Transfers die je maakt terwijl je
      ingelogd bent, krijgen je account-ID mee, zodat ze in je lijst met transfers staan. Anonieme
      transfers hebben zo'n koppeling niet.
    </li>
  </ul>
  <p class="text-muted-foreground">
    Inloggen verandert niets aan hoe bestanden worden versleuteld. Je sleutel komt nooit op onze
    servers, ingelogd of niet.
  </p>

  {#if ACCESS_KEYS_ANNOUNCED}
    <h3 class="text-lg font-medium text-foreground">Toegangssleutels</h3>
    <p class="text-muted-foreground">
      Met een toegangssleutel kan de command-line tool op je eigen computer namens je account
      werken. Per sleutel bewaren we de naam die je hem gaf, de publieke sleutel, een versleutelde
      vorm van zijn inlogtoken, wat je hem toestond, welke portalen je hem gaf (met hun sleutels in
      een afgesloten vorm die wij niet kunnen openen), wanneer hij werd goedgekeurd, wanneer hij voor
      het laatst werd gebruikt en wanneer hij ophoudt te werken. Transfers die een sleutel verstuurt,
      worden met die sleutel gemarkeerd. Een programma dat vraagt om te koppelen en nooit wordt
      goedgekeurd, laat tien minuten een record achter. Ingetrokken en verlopen sleutels worden na
      30 dagen verwijderd.
    </p>
  {/if}

  {#if PORTALS_ANNOUNCED}
    <h3 class="text-lg font-medium text-foreground">Portalen</h3>
    <p class="text-muted-foreground">
      Een portaal is een link waarmee anderen bestanden sturen naar iemand met een account.
    </p>
    <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
      <li>
        <strong>Als je een portaal hebt.</strong> We bewaren dat het bestaat en bij je account hoort,
        of het aan staat, en wanneer je het voor het laatst opende. Als je ze gebruikt, bewaren we
        ook de sluitingsdatum, of je een e-mail wilt als er bestanden binnenkomen en wanneer we die
        het laatst stuurden, en een versleutelde waarde waarmee we kunnen nagaan dat een bezoeker het
        wachtwoord van het portaal kent, zonder dat wij het wachtwoord kennen. De naam, de taal, je
        teksten, je logo, de lijst met documenten die je vraagt en welke bestanden je via het portaal
        terugstuurde, worden alleen versleuteld bewaard, in een vorm die wij niet kunnen lezen.
      </li>
      <li>
        <strong>Als je bestanden terugstuurt via een portaal.</strong> Die worden bewaard als een
        transfer op je account, zoals elke andere die je verstuurt.
      </li>
      <li>
        <strong>Als je e-mails bij binnenkomst aanzet.</strong> We mailen jou, en wie je het portaal
        mee deelt, als er bestanden binnenkomen. De e-mail noemt het portaal en de bestanden niet.
      </li>
      <li>
        <strong>Als je bestanden stuurt via een portaal.</strong> Je hebt geen account nodig en we
        vragen niet wie je bent. We bewaren de versleutelde bestanden, hun versleutelde namen, je
        versleutelde notitie en alles wat de pagina je verder vroeg in te vullen, ook versleuteld,
        hun grootte en wanneer ze binnenkwamen. Alleen de eigenaar van het portaal, en één persoon
        met wie die het eventueel deelt, kan ze ontsleutelen.
      </li>
      <li>
        <strong>Als je wordt uitgenodigd voor een portaal.</strong> De eigenaar geeft ons je
        e-mailadres, zodat we je de uitnodiging kunnen sturen en die aan je account kunnen koppelen.
        We bewaren het bij de uitnodiging tot die is aangenomen, afgewezen of ingetrokken.
      </li>
    </ul>
    <p class="text-muted-foreground">
      Wat mensen via een portaal sturen, kan persoonsgegevens bevatten over henzelf of anderen. Wij
      kunnen dat niet zien. De eigenaar van het portaal bepaalt wat er gevraagd wordt en wat ermee
      gebeurt, en is daarvoor verantwoordelijk onder de wetgeving voor gegevensbescherming; wij
      bewaren het namens hem.
    </p>
  {/if}

  {#if FORMS_ANNOUNCED}
    <h3 class="text-lg font-medium text-foreground">Formulieren</h3>
    <p class="text-muted-foreground">
      Een formulier is een link waarmee anderen de vragen beantwoorden van iemand met een account.
      Het wordt bewaard en behandeld als een portaal.
    </p>
    <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
      <li>
        <strong>Als je een formulier hebt.</strong> We bewaren wat we voor een portaal bewaren, en
        dat het een formulier is. De naam, je vragen en hun opties, je teksten en je logo worden
        alleen versleuteld bewaard, in een vorm die wij niet kunnen lezen.
      </li>
      <li>
        <strong>Als je een formulier invult.</strong> Je hebt geen account nodig en we vragen niet
        wie je bent. We bewaren je versleutelde antwoorden, de bestanden die je toevoegt met hun
        versleutelde namen, hun grootte en wanneer ze binnenkwamen. Alleen de eigenaar van het
        formulier, en één persoon met wie die het eventueel deelt, kan ze ontsleutelen.
      </li>
    </ul>
    <p class="text-muted-foreground">
      Antwoorden op een formulier bevatten vaak persoonsgegevens. Wij kunnen ze niet zien. De
      eigenaar van het formulier bepaalt wat er gevraagd wordt en wat er met de antwoorden gebeurt,
      en is daarvoor verantwoordelijk onder de wetgeving voor gegevensbescherming; wij bewaren ze
      namens hem.
    </p>
  {/if}

  <h3 class="text-lg font-medium text-foreground">2.3 Gegevens voor beveiliging en controle</h3>
  <p class="text-muted-foreground">
    Om de dienst te laten werken, misbruik te voorkomen en aan wettelijke bewaarplichten te
    voldoen, verwerken we:
  </p>
  <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
    <li>
      Je IP-adres, alleen in het voorbijgaan: het adres van elke aanvraag wordt omgezet in een
      vingerafdruk met een sleutel, om verkeer te begrenzen en misbruik te voorkomen. De sleutel
      wisselt en het adres zelf wordt niet in onze database opgeslagen
    </li>
    <li>
      Controlegebeurtenissen rond inloggen (inlogaanvragen, gelukte inlogpogingen, ingetrokken
      sessies, verwijderde transfers en verwijderde accounts), tot 90 dagen bewaard
    </li>
    <li>Eenvoudige serverlogs van aanvragen (tot 7 dagen bewaard, voor de beveiliging)</li>
    <li>
      Opgetelde tellers per transfer (aantal bestanden, totaal aantal bytes, voltooid of verlopen),
      onbeperkt bewaard zonder koppeling aan een gebruiker en alleen gebruikt voor statistieken van
      de dienst
    </li>
  </ul>

  <h3 class="text-lg font-medium text-foreground">2.4 Gegevens die we NIET verzamelen</h3>
  <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
    <li>We verzamelen je e-mailadres niet, tenzij je een account aanmaakt</li>
    <li>We gebruiken geen trackingcookies, analyticsscripts of marketingpixels</li>
    <li>We verkopen of delen geen gegevens met derden voor advertenties</li>
    <li>We hebben geen toegang tot de inhoud of de namen van je bestanden</li>
  </ul>
</section>

<section class="space-y-3">
  <h2 class="text-xl font-semibold text-foreground">3. Hoe we je gegevens gebruiken</h2>
  <p class="text-muted-foreground">We gebruiken deze gegevens om:</p>
  <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
    <li>De dienst voor het versturen van bestanden te leveren</li>
    <li>Eenmalige inloglinks en meldingen over je account te sturen (bijvoorbeeld de bevestiging dat een account is verwijderd)</li>
    <li>Je lijst met transfers gelijk te houden met de transfers die van jou zijn</li>
    <li>Grenzen aan het gebruik te handhaven, voor eerlijk gebruik</li>
    <li>Misbruik tegen te gaan en de dienst veilig te houden</li>
    <li>Bestanden automatisch te verwijderen als ze verlopen</li>
  </ul>
  <p class="text-muted-foreground">
    We gebruiken je gegevens niet voor advertenties, profilering of enige vorm van geautomatiseerde
    besluitvorming met rechtsgevolgen of vergelijkbare aanzienlijke gevolgen.
  </p>
</section>

<section class="space-y-3">
  <h2 class="text-xl font-semibold text-foreground">4. Opslag en beveiliging</h2>
  <p class="text-muted-foreground">
    Versleutelde bestanden worden opgeslagen in Cloudflare R2 binnen de Europese Unie.
    Accountgegevens en controlegegevens staan in een PostgreSQL-database binnen de Europese Unie.
    Beveiligingsmaatregelen:
  </p>
  <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
    <li>End-to-end versleuteling (AES-256-GCM) van alle bestandsinhoud en bestandsnamen</li>
    <li>TLS/HTTPS voor alle gegevens onderweg</li>
    <li>Bestanden worden automatisch verwijderd als de link verloopt, op het moment dat je bij het versturen kiest</li>
    <li>Inlogcodes alleen opgeslagen als SHA-256-hash (we kunnen de oorspronkelijke code niet terughalen)</li>
    <li>Sessiecookies op de server gemarkeerd als <code>HttpOnly</code>, <code>Secure</code> en <code>SameSite</code></li>
    <li>Geen blijvende opslag van bestandsinhoud</li>
  </ul>
</section>

<section class="space-y-3">
  <h2 class="text-xl font-semibold text-foreground">5. Bewaartermijnen</h2>
  <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
    <li><strong>Geüploade bestanden:</strong> Automatisch verwijderd als de link verloopt, op het moment dat je bij het versturen kiest: tot 3 dagen zonder account, 7 dagen met een gratis account, en tot 30 of 90 dagen bij de betaalde abonnementen</li>
    {#if PORTALS_ANNOUNCED}
      <li>
        <strong>Bestanden die via een portaal zijn gestuurd:</strong> Automatisch verwijderd 30 dagen
        na binnenkomst, of 90 dagen bij het grotere abonnement. De eigenaar van het portaal kan ze
        eerder verwijderen. Een portaal of het account van de eigenaar verwijderen, verwijdert ze ook.
      </li>
      <li>
        <strong>Uitnodigingen voor een portaal:</strong> Verwijderd als ze zijn aangenomen,
        afgewezen of ingetrokken.
      </li>
    {/if}
    {#if FORMS_ANNOUNCED}
      <li>
        <strong>Reacties op een formulier:</strong> Automatisch verwijderd 30 dagen na binnenkomst,
        of 90 dagen bij het grotere abonnement. De eigenaar van het formulier kan ze eerder
        verwijderen. Een formulier of het account van de eigenaar verwijderen, verwijdert ze ook.
      </li>
    {/if}
    <li>
      <strong>Accountgegevens:</strong> Bewaard zolang je account bestaat. Meteen en onherroepelijk
      verwijderd als je je account verwijdert in je instellingen.
    </li>
    <li>
      <strong>Inlogcodes (inloglinks):</strong> 15 minuten geldig, eenmalig te gebruiken, daarna
      verwijderd.
    </li>
    <li>
      <strong>Actieve sessies:</strong> Tot 30 dagen zonder activiteit (telkens verlengd) en
      hooguit 90 dagen na de eerste keer inloggen. Ingetrokken sessies worden bij de volgende
      opschoning verwijderd.
    </li>
    <li>
      <strong>Controlegebeurtenissen rond inloggen:</strong> 90 dagen bewaard, daarna automatisch
      verwijderd.
    </li>
    <li><strong>Gegevens voor het begrenzen van verkeer:</strong> Verlopen automatisch na de periode van de grens (tot 30 dagen)</li>
    <li><strong>Serverlogs:</strong> Tot 7 dagen bewaard, daarna automatisch verwijderd</li>
    <li>
      <strong>Opgetelde tellers:</strong> Onbeperkt bewaard. Ze bevatten geen persoonsgegevens en
      geen koppeling aan een gebruiker.
    </li>
  </ul>
</section>

<section class="space-y-3">
  <h2 class="text-xl font-semibold text-foreground">6. Je rechten (AVG)</h2>
  <p class="text-muted-foreground">
    Onder de Algemene verordening gegevensbescherming (AVG) heb je het recht om:
  </p>
  <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
    <li>De persoonsgegevens in te zien die we over je hebben</li>
    <li>Onjuiste persoonsgegevens te laten corrigeren</li>
    <li>Je gegevens te laten verwijderen ("recht op vergetelheid")</li>
    <li>Bezwaar te maken tegen of beperking te vragen van bepaalde verwerking van je gegevens</li>
    <li>Een kopie van je gegevens te krijgen in een overdraagbaar formaat</li>
    <li>Een klacht in te dienen bij de toezichthouder voor gegevensbescherming in je land</li>
  </ul>
  <p class="text-muted-foreground">
    <strong>Zelf verwijderen.</strong> Heb je een account, dan kun je het op elk moment verwijderen
    via
    <a href="/dashboard/settings" class="text-primary underline underline-offset-2">Instellingen → Danger zone</a>.
    Verwijderen gebeurt meteen en is definitief: je account, alle transfers van jou, elke actieve
    sessie en openstaande inloglinks worden gewist, en het e-mailadres in eerdere
    controlegegevens wordt weggehaald. We sturen een bevestiging naar je oude adres zodra het
    verwijderen klaar is.
  </p>
  <p class="text-muted-foreground">
    <strong>Zelf je gegevens downloaden.</strong> Je kunt een JSON-kopie downloaden van je
    accountgegevens, je recente inlogactiviteit en de gegevens van je transfers via
    <a href="/dashboard/settings" class="text-primary underline underline-offset-2">Instellingen → Your data</a>.
    De export bevat niet de inhoud van je bestanden: die zijn in je browser versleuteld met een
    sleutel die wij nooit ontvangen.
  </p>
  <p class="text-muted-foreground">
    <strong>Anonieme transfers</strong> zijn niet aan een account gekoppeld. Je kunt ze alleen vóór
    hun verloopdatum laten verwijderen door te wachten tot ze vanzelf verlopen, of door ons te
    mailen met het ID van de transfer op het contactadres hieronder.
  </p>
  <p class="text-muted-foreground">
    Voor elk ander verzoek onder de AVG neem je contact op via het adres in sectie 9. We antwoorden
    binnen een maand, zoals artikel 12, lid 3 voorschrijft.
  </p>
</section>

<section class="space-y-3">
  <h2 class="text-xl font-semibold text-foreground">7. Verwerkers en waar gegevens staan</h2>
  <p class="text-muted-foreground">
    Dit zijn alle derden die namens ons gegevens verwerken, wat elk ontvangt, en waar ze zitten.
  </p>
  <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
    <li>
      <strong>Hetzner (Duitsland):</strong> Draait de applicatieserver en de logs daarvan. Ziet
      aanvragen aan de dienst. Europees bedrijf, Europees datacenter.
    </li>
    <li>
      <strong>Scaleway Managed PostgreSQL (Amsterdam, Nederland):</strong> De database met
      accountgegevens, sessies en gegevens over transfers. Europees bedrijf, Europees datacenter.
    </li>
    <li>
      <strong>Scaleway Transactional Email (Frankrijk):</strong> Verstuurt eenmalige inloglinks en
      meldingen over je account{#if PORTALS_ANNOUNCED}, waaronder uitnodigingen voor een portaal{/if}.
      Ontvangt je e-mailadres en de inhoud van het bericht. Alleen transactionele e-mail, nooit
      marketing.
    </li>
    {#if PORTALS_ANNOUNCED}
      <li>
        <strong>Polar:</strong> Verkoopt de betaalde abonnementen als merchant of record. Koop je een
        abonnement, dan ontvangt Polar je e-mailadres en je betaalgegevens en maakt het je factuur.
        Wij ontvangen alleen of er een abonnement is en wanneer het verlengt of eindigt.
      </li>
    {/if}
    <li>
      <strong>Cloudflare:</strong> Versleutelde opslag van bestanden (R2, beperkt tot de Europese
      jurisdictie, zodat objecten in Europese datacenters blijven), plus CDN en bescherming tegen
      DDoS-aanvallen voor de site. R2 bevat alleen versleutelde gegevens. Omdat Cloudflare de
      TLS-verbinding aan zijn rand afhandelt, kan het gegevens over aanvragen en je sessiecookie
      zien, maar nooit je sleutel, die in het fragment van de link blijft en nooit wordt verstuurd.
    </li>
  </ul>
  <p class="text-muted-foreground">
    Cloudflare Inc. heeft zijn hoofdkantoor in de Verenigde Staten, dus we beweren niet buiten het
    bereik van Amerikaans recht te vallen. We beweren iets beperkters: de inhoud van je bestanden
    wordt in je browser versleuteld voordat die wordt geüpload, en de sleutel komt op geen enkele
    server, niet die van ons en niet die van Cloudflare. Een gerechtelijk bevel aan Cloudflare levert
    versleutelde gegevens en metagegevens op, niet je bestanden. Deze doorgifte steunt op de
    standaardvoorwaarden voor gegevensverwerking van Cloudflare en zijn opties om gegevens in de EU
    te houden.
  </p>
</section>

<section class="space-y-3">
  <h2 class="text-xl font-semibold text-foreground">8. Wijzigingen in dit beleid</h2>
  <p class="text-muted-foreground">
    We kunnen dit beleid aanpassen. Wezenlijke wijzigingen zie je aan de datum "Laatst bijgewerkt"
    bovenaan deze pagina.
  </p>
</section>

<section class="space-y-3">
  <h2 class="text-xl font-semibold text-foreground">9. Contact</h2>
  <p class="text-muted-foreground">
    Vragen over dit beleid of over hoe we met gegevens omgaan:
  </p>
  <p class="text-muted-foreground">
    <a href="mailto:privacy@tessil.app" class="text-primary underline underline-offset-2">privacy@tessil.app</a>
  </p>
</section>
