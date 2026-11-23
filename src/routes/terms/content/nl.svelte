<script lang="ts">
  // De gebruiksvoorwaarden in het Nederlands. Zelfde secties en betekenis als en.svelte.

  import { FORMS_ANNOUNCED, PORTALS_ANNOUNCED } from "$lib/config/launch";
  import { hrefFor } from "$lib/i18n/paths";
</script>

<section class="space-y-3">
  <h2 class="text-xl font-semibold text-foreground">1. Aanvaarding van de voorwaarden</h2>
  <p class="text-muted-foreground">
    Door Tessil ("de Dienst") te gebruiken, ga je akkoord met deze voorwaarden. Ga je niet akkoord,
    gebruik de Dienst dan niet.
  </p>
</section>

<section class="space-y-3">
  <h2 class="text-xl font-semibold text-foreground">2. Beschrijving van de Dienst</h2>
  <p class="text-muted-foreground">
    Tessil is een dienst om bestanden end-to-end versleuteld te versturen met tijdelijke deellinks.
  </p>
  {#if PORTALS_ANNOUNCED}
    <p class="text-muted-foreground">
      Bestanden versturen is gratis. Het werkt zonder account; inloggen voegt een lijst toe met wat
      je verstuurde, en transfers die langer geldig blijven.
    </p>
    <p class="text-muted-foreground">
      Betaalde abonnementen voegen portalen toe: links waarmee anderen jou bestanden sturen. Wat een
      abonnement bevat en kost, staat op de
      <a href={hrefFor("/pricing", "nl")} class="text-primary underline underline-offset-2">prijspagina</a>.
    </p>
  {:else}
    <p class="text-muted-foreground">
      Tessil is gratis te gebruiken. Het werkt zonder account; inloggen voegt een lijst toe met wat
      je verstuurde, en transfers die langer geldig blijven. Er is op dit moment geen betaald
      abonnement.
    </p>
  {/if}
</section>

{#if PORTALS_ANNOUNCED}
  <section class="space-y-3">
    <h2 class="text-xl font-semibold text-foreground">Portalen</h2>
    <p class="text-muted-foreground">
      Heb je een portaal, dan bepaal jij wie de link krijgt, wat je mensen vraagt te sturen, en wat
      je doet met wat binnenkomt. Jij bent verantwoordelijk voor een rechtmatige grond om het te
      verzamelen en voor het informeren van de afzenders over hoe je het gebruikt. Wij bewaren het
      voor je in een vorm die wij niet kunnen lezen.
    </p>
    <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
      <li>Leveringen worden automatisch verwijderd na de periode die je abonnement bepaalt. Download wat je wilt bewaren; daarna kunnen wij het niet terughalen</li>
      <li>Raak je elke manier kwijt om je kluis te openen, dan kunnen wij je portalen niet voor je openen</li>
      <li>Gebruik een portaal niet om inhoud te verzamelen die deze voorwaarden verbieden. We kunnen een portaal uitzetten dat voor misbruik is gemeld</li>
      <li>Eindigt je abonnement, dan nemen je portalen geen bestanden meer aan. Wat er al in staat, blijft tot het verloopt</li>
    </ul>
    <p class="text-muted-foreground">
      Stuur je bestanden via iemands portaal, dan stuur je ze naar die persoon, niet naar ons. Vragen
      over wat ermee gebeurt, stel je aan wie je de link gaf.
    </p>
  </section>

  {#if FORMS_ANNOUNCED}
    <section class="space-y-3">
      <h2 class="text-xl font-semibold text-foreground">Formulieren</h2>
      <p class="text-muted-foreground">
        Heb je een formulier, dan bepaal jij wat je vraagt, wie de link krijgt, en wat je met de
        antwoorden doet. Jij bent verantwoordelijk voor een rechtmatige grond om ze te verzamelen,
        voor het niet meer vragen dan je nodig hebt, en voor het informeren van wie antwoordt over hoe
        je gebruikt wat ze je geven. Wij bewaren het voor je in een vorm die wij niet kunnen lezen.
      </p>
      <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
        <li>Reacties worden automatisch verwijderd na de periode die je abonnement bepaalt. Exporteer wat je wilt bewaren; daarna kunnen wij het niet terughalen</li>
        <li>Raak je elke manier kwijt om je kluis te openen, dan kunnen wij je formulieren niet voor je openen</li>
        <li>Wij kunnen een reactie niet aan je formulier toetsen. Vertrouw niet op een reactie alleen als bewijs van wat iemand werd gevraagd</li>
        <li>Gebruik een formulier niet om inhoud te verzamelen die deze voorwaarden verbieden, of om je voor iemand anders uit te geven. We kunnen een formulier uitzetten dat voor misbruik is gemeld</li>
        <li>Eindigt je abonnement, dan nemen je formulieren geen reacties meer aan. Wat er al in staat, blijft tot het verloopt</li>
      </ul>
      <p class="text-muted-foreground">
        Vul je iemands formulier in, dan antwoord je die persoon, niet ons. Vragen over wat er met je
        antwoorden gebeurt, stel je aan wie je de link gaf.
      </p>
    </section>
  {/if}

  <section class="space-y-3" id="billing">
    <h2 class="text-xl font-semibold text-foreground">Betaalde abonnementen en betalen</h2>
    <p class="text-muted-foreground">
      Betaalde abonnementen worden verkocht via Polar, dat optreedt als merchant of record. Dat
      betekent dat Polar de verkoper op je factuur is, de betaling ontvangt en de belasting regelt.
      Wij ontvangen je kaartgegevens nooit; Polar laat ons alleen weten dat er een abonnement is en
      wanneer het verlengt of eindigt.
    </p>
    <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
      <li><strong>Verlenging.</strong> Een abonnement wordt vooraf betaald, per maand of per jaar, en verlengt automatisch tot je opzegt</li>
      <li><strong>Opzeggen.</strong> Je kunt op elk moment opzeggen in je accountinstellingen. Het abonnement loopt dan tot het eind van de periode die je hebt betaald en wordt niet verlengd</li>
      <li><strong>Na afloop van een abonnement.</strong> Je account gaat terug naar het gratis abonnement. Je portalen nemen geen bestanden meer aan; wat er al in staat, blijft voor je beschikbaar tot het verloopt. Versturen blijft werken zoals altijd</li>
      <li><strong>Terugbetaling.</strong> Bedenk je je binnen 14 dagen na je eerste betaling, mail dan naar <a href="mailto:hello@tessil.app" class="text-primary underline underline-offset-2">hello@tessil.app</a> en je krijgt het volledig terug. Daarna wordt een begonnen periode niet terugbetaald, behalve waar de wet je dat recht geeft</li>
      <li><strong>Mislukte betalingen.</strong> Kan een verlenging niet worden geïnd, dan probeert Polar het opnieuw. Mislukt het dan nog, dan eindigt het abonnement</li>
      <li><strong>Prijswijzigingen.</strong> We laten het je minstens 30 dagen voordat een nieuwe prijs voor je verlenging geldt per e-mail weten, zodat je eerst kunt opzeggen</li>
    </ul>
    <p class="text-muted-foreground">
      Versleuteling, wachtwoordbeveiliging, passkeys en automatisch verlopen zijn nooit onderdeel van
      wat een abonnement verkoopt. Die blijven gratis.
    </p>
  </section>
{/if}

<section class="space-y-3">
  <h2 class="text-xl font-semibold text-foreground">3. Toegestaan gebruik</h2>
  <p class="text-muted-foreground">Je gaat ermee akkoord de Dienst NIET te gebruiken om:</p>
  <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
    <li>Illegale inhoud te uploaden, te delen of te verspreiden</li>
    <li>Auteursrechtelijk beschermd materiaal zonder toestemming te delen</li>
    <li>Malware, virussen of schadelijke code te verspreiden</li>
    <li>Inhoud te delen die minderjarigen uitbuit of schaadt</li>
    <li>Anderen lastig te vallen, te misbruiken of te bedreigen</li>
    <li>Toepasselijke wetten of regels te overtreden</li>
    <li>Gebruiksgrenzen te omzeilen of de Dienst te misbruiken</li>
    <li>Geautomatiseerde systemen te gebruiken om op grote schaal inhoud te uploaden</li>
    <li>De Dienst zonder toestemming door te verkopen of commercieel te exploiteren</li>
  </ul>
  <p class="text-muted-foreground">
    We behouden ons het recht voor de toegang te beëindigen van gebruikers die deze voorwaarden
    overtreden.
  </p>
</section>

<section class="space-y-3">
  <h2 class="text-xl font-semibold text-foreground">4. Verantwoordelijkheden van de gebruiker</h2>
  <p class="text-muted-foreground">Je bent als enige verantwoordelijk voor:</p>
  <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
    <li>De inhoud die je uploadt en deelt</li>
    <li>Het veilig houden van je deellinks</li>
    <li>Ervoor zorgen dat je het recht hebt de inhoud te delen</li>
    <li>Het naleven van alle wetten die in jouw rechtsgebied gelden</li>
  </ul>
</section>

<section class="space-y-3">
  <h2 class="text-xl font-semibold text-foreground">5. Beperkingen van de Dienst</h2>
  <p class="text-muted-foreground">
    De grootte per bestand, het volume per maand en de geldigheidsduur zijn begrensd om de dienst
    snel te houden en misbruik te voorkomen. Accounts waarmee is ingelogd krijgen wat ruimere grenzen
    dan anoniem gebruik. Voor iedereen gelden grenzen voor redelijk gebruik.
  </p>
  <p class="text-muted-foreground">
    We kunnen deze grenzen aanpassen als dat nodig is om de dienst beschikbaar te houden.
  </p>
</section>

<section class="space-y-3">
  <h2 class="text-xl font-semibold text-foreground">6. Privacy en versleuteling</h2>
  <p class="text-muted-foreground">
    Tessil gebruikt end-to-end versleuteling. Bestanden worden in je browser versleuteld voordat ze
    worden geüpload. Wij hebben de sleutels niet:
  </p>
  <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
    <li>Wij kunnen je bestanden niet bekijken, openen of terughalen</li>
    <li>Raak je de deellink kwijt, dan zijn de bestanden niet terug te halen</li>
    <li>Wij kunnen niet ingaan op verzoeken om de inhoud van bestanden te leveren (omdat wij er geen toegang toe hebben)</li>
  </ul>
  <p class="text-muted-foreground">
    Meer informatie staat in ons <a href={hrefFor("/privacy", "nl")} class="text-primary underline underline-offset-2">privacybeleid</a>.
  </p>
</section>

<section class="space-y-3">
  <h2 class="text-xl font-semibold text-foreground">7. Illegale inhoud en misbruik melden</h2>
  <p class="text-muted-foreground">
    Tessil tolereert geen illegale inhoud, waaronder maar niet beperkt tot beeldmateriaal van seksueel
    misbruik van kinderen (CSAM), terroristische inhoud, of andere inhoud die in strijd is met de wet.
  </p>
  <p class="text-muted-foreground">
    End-to-end versleuteling verhindert dat wij de inhoud van bestanden zien. We kunnen wel optreden
    op meldingen:
  </p>
  <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
    <li>Iedereen kan misbruik melden via onze <a href={hrefFor("/abuse", "nl")} class="text-primary underline underline-offset-2">pagina voor het melden van misbruik</a></li>
    <li>Na een geldige melding verwijderen we de gemelde transfer en alle bijbehorende gegevens meteen</li>
    <li>We bewaren beschikbare metagegevens (zoals IP-adressen en tijdstippen) voor opsporingsinstanties als de wet dat vereist</li>
    <li>We werken volledig mee aan onderzoeken van opsporingsinstanties, in overeenstemming met de wet</li>
  </ul>
  <p class="text-muted-foreground">
    Gaat het om iets dringends rond de veiligheid van kinderen, neem dan meteen contact op met de
    politie, en meld het daarnaast aan ons via
    <a href="mailto:abuse@tessil.app" class="text-primary underline underline-offset-2">abuse@tessil.app</a>.
  </p>
</section>

<section class="space-y-3">
  <h2 class="text-xl font-semibold text-foreground">8. Opsporing en naleving van de wet</h2>
  <p class="text-muted-foreground">
    We houden ons aan de Europese Digital Services Act en het toepasselijke Nederlandse recht. In het
    bijzonder:
  </p>
  <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
    <li>We treden snel op na een melding van illegale inhoud</li>
    <li>We werken mee met opsporingsinstanties als die een geldig rechtsbevel tonen</li>
    <li>We kunnen beschikbare metagegevens (IP-adressen, tijdstippen, bestandsgroottes) bewaren en verstrekken op een rechtmatig verzoek</li>
    <li>We verwijderen transfers waarvan is vastgesteld dat ze illegale inhoud bevatten</li>
  </ul>
  <p class="text-muted-foreground">
    Door onze zero-knowledge-opzet hebben wij geen toegang tot sleutels of de inhoud van bestanden.
    Beschikbare metagegevens zijn beperkt tot wat in ons
    <a href={hrefFor("/privacy", "nl")} class="text-primary underline underline-offset-2">privacybeleid</a> staat.
  </p>
</section>

<section class="space-y-3">
  <h2 class="text-xl font-semibold text-foreground">9. Uitsluiting van garanties</h2>
  <p class="text-muted-foreground">
    DE DIENST WORDT GELEVERD "ZOALS HIJ IS" EN "ZOALS BESCHIKBAAR", ZONDER ENIGE GARANTIE, UITDRUKKELIJK
    OF STILZWIJGEND, WAARONDER MAAR NIET BEPERKT TOT:
  </p>
  <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
    <li>Stilzwijgende garanties van verkoopbaarheid</li>
    <li>Geschiktheid voor een bepaald doel</li>
    <li>Het niet inbreuk maken op rechten van anderen</li>
    <li>Beschikbaarheid, betrouwbaarheid of juistheid</li>
  </ul>
  <p class="text-muted-foreground">
    We garanderen niet dat de Dienst zonder onderbreking, zonder fouten of veilig werkt.
  </p>
</section>

<section class="space-y-3">
  <h2 class="text-xl font-semibold text-foreground">10. Beperking van aansprakelijkheid</h2>
  <p class="text-muted-foreground">
    VOOR ZOVER DE WET DAT TOESTAAT, ZIJN TESSIL EN ZIJN BEHEERDERS NIET AANSPRAKELIJK VOOR:
  </p>
  <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
    <li>Indirecte, incidentele, bijzondere schade, gevolgschade of punitieve schadevergoedingen</li>
    <li>Verlies van gegevens, winst of zakelijke kansen</li>
    <li>Schade die voortkomt uit je gebruik van de Dienst of het niet kunnen gebruiken ervan</li>
    <li>Inhoud die door gebruikers is geüpload of gedeeld</li>
    <li>Onbevoegde toegang tot of wijziging van je verzendingen of gegevens</li>
  </ul>
  <p class="text-muted-foreground">
    Deze beperking geldt ongeacht de rechtsgrond (overeenkomst, onrechtmatige daad of anderszins).
  </p>
</section>

<section class="space-y-3">
  <h2 class="text-xl font-semibold text-foreground">11. Vrijwaring</h2>
  <p class="text-muted-foreground">
    Je vrijwaart Tessil, zijn beheerders en gelieerde partijen voor alle claims, schade, verliezen of
    kosten (waaronder juridische kosten) die voortkomen uit je gebruik van de Dienst of uit het
    overtreden van deze Voorwaarden.
  </p>
</section>

<section class="space-y-3">
  <h2 class="text-xl font-semibold text-foreground">12. Wijzigingen aan de Dienst</h2>
  <p class="text-muted-foreground">
    We behouden ons het recht voor de Dienst (of een deel ervan) op elk moment te wijzigen, op te
    schorten of te beëindigen, met of zonder aankondiging. We zijn niet aansprakelijk tegenover jou
    of derden voor het wijzigen, opschorten of beëindigen van de Dienst.
  </p>
</section>

<section class="space-y-3">
  <h2 class="text-xl font-semibold text-foreground">13. Toepasselijk recht</h2>
  <p class="text-muted-foreground">
    Op deze Voorwaarden is Nederlands recht van toepassing, met uitsluiting van de regels van
    internationaal privaatrecht. Geschillen worden uitsluitend voorgelegd aan de bevoegde rechter in
    Nederland.
  </p>
</section>

<section class="space-y-3">
  <h2 class="text-xl font-semibold text-foreground">14. Wijzigingen in de voorwaarden</h2>
  <p class="text-muted-foreground">
    We kunnen deze Voorwaarden van tijd tot tijd aanpassen. Wie de Dienst blijft gebruiken na een
    wijziging, aanvaardt de nieuwe Voorwaarden. We raden je aan deze pagina af en toe na te lezen.
  </p>
</section>

<section class="space-y-3">
  <h2 class="text-xl font-semibold text-foreground">15. Contact</h2>
  <p class="text-muted-foreground">
    Vragen over deze Voorwaarden:
  </p>
  <p class="text-muted-foreground">
    <a href="mailto:legal@tessil.app" class="text-primary underline underline-offset-2">legal@tessil.app</a>
  </p>
</section>
