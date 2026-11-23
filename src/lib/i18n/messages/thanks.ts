// The page after a contribution (/thanks). See README.md in this folder.

import type { Locale } from "../locale";

const en = {
  seoTitle: "Thank you - Tessil",
  title: "Thank you",
  tagline: "That covers a real part of what it costs to run this.",
  sameEmailTitle: "Use the same email as your account",
  sameEmail1:
    "If you checked out with the address you use for your Tessil account, nothing else is needed. Nothing depends on it today; it is simply the only thing that ties a contribution to an account.",
  sameEmail2:
    "Checked out with a different address, or don't have an account yet? That is fine, and your support counts exactly the same.",
  receiptTitle: "Your receipt",
  receipt:
    "Polar handles the payment and emails you a receipt. A monthly contribution renews on the same date each month until you stop it. A one-time contribution is exactly that: charged once, never again.",
  stopTitle: "Stopping a monthly contribution",
  stopBefore: "Under a minute, on your own, whenever you want. No notice period and no retention offer. Open",
  portal: "the customer portal",
  stopAfter: ", which is also linked from every receipt, and cancel there. It stops at the end of the period you have already paid for.",
  missingBefore: "If the link has gone missing or a charge looks wrong, mail",
  missingAfter:
    ". I'll cancel it for you and refund the last payment if it renewed after you meant to stop. Full detail on the",
  pricingPage: "pricing page",
  back: "Back to Tessil",
};

const nl: typeof en = {
  seoTitle: "Dank je wel - Tessil",
  title: "Dank je wel",
  tagline: "Daarmee is een echt deel gedekt van wat het kost om dit te draaien.",
  sameEmailTitle: "Gebruik hetzelfde e-mailadres als je account",
  sameEmail1:
    "Betaalde je met het adres van je Tessil-account, dan hoef je verder niets te doen. Er hangt vandaag niets van af; het is alleen het enige dat een bijdrage aan een account koppelt.",
  sameEmail2:
    "Betaalde je met een ander adres, of heb je nog geen account? Geen probleem, je steun telt precies hetzelfde.",
  receiptTitle: "Je betaalbewijs",
  receipt:
    "Polar regelt de betaling en mailt je een betaalbewijs. Een maandelijkse bijdrage wordt elke maand op dezelfde datum verlengd tot je hem stopt. Een eenmalige bijdrage is precies dat: één keer afgeschreven, nooit meer.",
  stopTitle: "Een maandelijkse bijdrage stoppen",
  stopBefore: "Binnen een minuut, zelf, wanneer je wilt. Geen opzegtermijn en geen aanbod om te blijven. Open",
  portal: "het klantportaal",
  stopAfter: ", dat ook in elk betaalbewijs staat, en zeg daar op. Het stopt aan het eind van de periode die je al betaald hebt.",
  missingBefore: "Is de link kwijt of klopt een afschrijving niet, mail dan",
  missingAfter:
    ". Ik zeg het voor je op en betaal de laatste betaling terug als die werd verlengd nadat je wilde stoppen. Alles staat op de",
  pricingPage: "prijzenpagina",
  back: "Terug naar Tessil",
};

export const thanksMessages: Record<Locale, typeof en> = { en, nl };
