<script lang="ts">
  // De controlepagina in het Nederlands. Zelfde secties als en.svelte.

  import { PORTALS_ANNOUNCED } from "$lib/config/launch";
  import { hrefFor } from "$lib/i18n/paths";

  const sectionClass = "space-y-3";
  const headingClass = "text-lg font-semibold text-foreground";
  const bodyClass = "text-muted-foreground";
  const stepsClass =
    "list-decimal list-inside text-muted-foreground space-y-1.5 ml-4";
  const resultClass =
    "rounded-md border border-border bg-muted/30 px-4 py-3 text-sm text-foreground space-y-2";
  const preClass =
    "overflow-x-auto rounded-md border border-border bg-muted/30 px-4 py-3 text-xs text-foreground";
  const linkClass = "text-primary underline underline-offset-2";
</script>

<section class={sectionClass}>
  <p class={bodyClass}>
    Je hoeft ons niet te vertrouwen, en deze controles vragen dat ook niet. Geen ervan steunt op iets
    wat wij beweren. Elke controle steunt op iets wat je eigen browser laat zien, en je kunt ze nu
    meteen op de live site uitvoeren.
  </p>
  <p class={bodyClass}>
    Je hebt een transfer nodig die je naar jezelf stuurde, en de ontwikkelaarstools van je browser:
    <code>F12</code> op Windows en Linux, <code>Cmd + Option + I</code> op een Mac.
  </p>
</section>

<section class={sectionClass}>
  <h2 class={headingClass}>1. De sleutel komt nooit op onze servers</h2>
  <p class={bodyClass}>
    Stuur jezelf een bestand vanaf de homepage. De link die je terugkrijgt ziet er zo uit:
  </p>
  <pre class={preClass}><code
      >https://tessil.app/d/7f3a9c2b#kA9tR2xQ...</code
    ></pre>
  <p class={bodyClass}>
    Alles na de <code>#</code> is de sleutel. Je browser heeft hem gemaakt, en het is het enige
    waarmee onze opgeslagen versleutelde gegevens weer je bestand worden.
  </p>
  <ol class={stepsClass}>
    <li>Kopieer het deel van de link na de <code>#</code>.</li>
    <li>Open de link, open de ontwikkelaarstools en kies Network.</li>
    <li>Laad de pagina opnieuw en laat hem helemaal laden.</li>
    <li>Zoek in de vastgelegde aanvragen naar de sleutel die je kopieerde.</li>
  </ol>
  <div class={resultClass}>
    <p><strong>Wat je zou moeten zien:</strong> geen resultaten. Niet in een URL, niet in een header, niet in de inhoud van een aanvraag.</p>
    <p class="text-muted-foreground">
      Browsers sturen het fragment (het deel na <code>#</code>) niet naar servers. Dat is de
      HTTP-standaard, afgedwongen door de browser die je al gebruikt, geen beleid dat wij beloven na
      te leven. Er is geen aanvraag die wij stilletjes kunnen bekijken om die sleutel te leren, want
      hij wordt nooit verstuurd.
    </p>
  </div>
</section>

<section class={sectionClass}>
  <h2 class={headingClass}>2. Wat wij bewaren is onleesbaar</h2>
  <ol class={stepsClass}>
    <li>Download het bestand terwijl het tabblad Network nog open staat.</li>
    <li>
      Zoek de aanvraag naar een adres dat eindigt op <code>r2.cloudflarestorage.com</code>. Dat is
      het opgeslagen object, byte voor byte zoals het in onze opslag staat.
    </li>
    <li>Open de response.</li>
  </ol>
  <div class={resultClass}>
    <p><strong>Wat je zou moeten zien:</strong> binaire ruis, die begint met de vier tekens <code>TSL1</code>.</p>
    <p class="text-muted-foreground">
      Dat is de markering van ons formaat. Niet je bestand, niet je bestandsnaam, geen miniatuur.
      Het leesbare bestand ontstaat pas nadat je browser de sleutel uit stap 1 toepast. Zou iemand
      onze hele opslag meenemen, dan is dit wat hij heeft.
    </p>
  </div>
</section>

<section class={sectionClass}>
  <h2 class={headingClass}>3. Er draait verder niets op de pagina</h2>
  <ol class={stepsClass}>
    <li>Bekijk, nog steeds in het tabblad Network, elk domein waar de pagina contact mee maakte.</li>
  </ol>
  <div class={resultClass}>
    <p><strong>Wat je zou moeten zien:</strong> <code>tessil.app</code>, <code>api.tessil.app</code> en een opslag-URL. Dat is de hele lijst.</p>
    <p class="text-muted-foreground">
      Geen analytics, geen tagmanager, geen lettertypes van het CDN van een ander, geen
      sessierecorder. Op een pagina waarvan de URL een sleutel bevat, is een script van derden geen
      privacyhinder maar een lek van de sleutel.
    </p>
  </div>
  <p class={bodyClass}>
    Dit wordt afgedwongen, niet beloofd. Twee lagen Content-Security-Policy gelden voor elke pagina
    en beide moeten slagen. De eerste is een response-header die je zelf kunt lezen:
  </p>
  <pre class={preClass}><code
      >curl -sI https://tessil.app | grep -i content-security-policy</code
    ></pre>
  <p class={bodyClass}>
    <code>connect-src</code> beperkt daar netwerkaanvragen tot onze eigen herkomst en de opslag, dus
    een script kan niet naar huis bellen, ook niet als er per ongeluk een werd toegevoegd. De tweede
    laag zit in de pagina zelf: bekijk de bron en je vindt een meta-tag
    <code>content-security-policy</code> waarvan <code>script-src</code> de precieze SHA-256-hash
    vastlegt van het enige inline script dat we meeleveren. Elk ander inline script, door wie ook
    ingevoegd, valt door die hash en wordt nooit uitgevoerd.
  </p>
</section>

<section class={sectionClass}>
  <h2 class={headingClass}>4. Lees de code</h2>
  <p class={bodyClass}>
    Niet verplicht, en de traagste van de vier, maar het is de enige controle die bedoeling laat
    zien in plaats van gedrag. Tessil is AGPL-3.0 en de hele client is openbaar. De bestanden die
    ertoe doen:
  </p>
  <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
    <li><code>src/lib/crypto/streaming.ts</code> is de versleuteling zelf</li>
    <li><code>src/lib/crypto/key.ts</code> maakt de sleutel die in het fragment van de link gaat</li>
    <li><code>src/lib/download/streamDownload.ts</code> ontsleutelt op de terugweg</li>
  </ul>
  <p class={bodyClass}>
    <a
      href="https://github.com/tessil-app/tessil-web"
      rel="noopener noreferrer"
      class={linkClass}>github.com/tessil-app/tessil-web</a
    >
    en
    <a
      href="https://github.com/tessil-app/tessil-api"
      rel="noopener noreferrer"
      class={linkClass}>tessil-api</a
    >. AGPL-3.0 betekent dat wie een aangepaste Tessil als dienst draait, zijn aanpassingen moet
    publiceren, dus een gehoste kopie kan de versleuteling niet stilletjes weghalen.
  </p>
</section>

<section class={sectionClass}>
  <h2 class={headingClass}>Wat wij kunnen zien</h2>
  <p class={bodyClass}>
    De controles hierboven zijn weinig waard zonder dit deel. Over de inhoud van je bestanden hoef je
    ons niet te vertrouwen, dat regelt de wiskunde. Over de volgende lijst wel, dus hier is hij
    volledig:
  </p>
  <ul class="list-disc list-inside text-muted-foreground space-y-1 ml-4">
    <li>De grootte van elk bestand en wanneer het werd geüpload</li>
    <li>Hoe vaak een transfer is gedownload</li>
    <li>Wanneer een transfer verloopt, en wanneer hij werd verwijderd</li>
    <li>Je e-mailadres, als je een account hebt aangemaakt</li>
    {#if PORTALS_ANNOUNCED}
      <li>
        Bij een portaal: dat het bestaat en van wie het is, wanneer er leveringen binnenkomen en hoe
        groot die zijn, het e-mailadres van iemand die je uitnodigt, en wanneer je het voor het
        laatst opende
      </li>
    {/if}
    <li>
      Bij inloggen het land en de netwerkaanbieder die op dat moment uit je IP-adres worden
      afgeleid. IP-adressen bewaren we niet.
    </li>
  </ul>
  <p class={bodyClass}>
    De inhoud van bestanden, bestandsnamen en titels van transfers staan niet op die lijst, en dat
    kan ook niet, want ze komen versleuteld binnen.{#if PORTALS_ANNOUNCED}
      {" "}Hetzelfde geldt voor de naam van een portaal, wat het vraagt, en de notities die
      afzenders toevoegen.{/if} Alle details staan in het
    <a href={hrefFor("/security", "nl")} class={linkClass}>beveiligingsoverzicht</a>
    en het <a href={hrefFor("/privacy", "nl")} class={linkClass}>privacybeleid</a>.
  </p>
</section>

<section class={sectionClass}>
  <h2 class={headingClass}>Klopt er iets niet?</h2>
  <p class={bodyClass}>
    Komt een controle op deze pagina anders uit dan beschreven, dan is dat een fout of een gebroken
    belofte, en in beide gevallen horen we het graag. Mail
    <a href="mailto:security@tessil.app" class={linkClass}>security@tessil.app</a>. Je hoort binnen
    72 uur van ons.
  </p>
</section>
