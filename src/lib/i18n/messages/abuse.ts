// The abuse report page's text. See README.md in this folder.

import type { Locale } from "../locale";

const en = {
  seoTitle: "Report Abuse - Tessil",
  description: "Report illegal or abusive transfers on Tessil. Submit a link for review.",
  title: "Report Abuse",
  tagline: "Report a transfer or related misuse on Tessil.",
  doneTitle: "Report submitted",
  doneBody: "Thanks for the report. We review every report and act on valid ones under applicable law.",
  noClient: "If your email client didn't open, send the report to",
  intro1:
    "If a transfer on Tessil contains illegal or abusive content, report it below. Every report is reviewed; valid ones get acted on under applicable law.",
  intro2:
    "End-to-end encryption stops us from viewing file contents. We can still delete the transfer, scrub associated metadata, and cooperate with law enforcement under lawful orders.",
  url: "Transfer URL",
  reason: "Reason for report",
  reasonHint: "Please describe why you are reporting this transfer",
  contact: "Your email (optional)",
  contactHint: "For follow-up if needed",
  submitting: "Submitting…",
  submit: "Submit report",
  failed: "Failed to submit report. Please email abuse@tessil.app directly.",
  orEmail: "Or email",
  // Follows the address directly, so it brings its own space.
  directly: " directly. For child-safety emergencies, also contact local law enforcement.",
  mailSubject: "Tessil Abuse Report",
  mailBody: (url: string, reason: string, contact: string) =>
    `Transfer URL: ${url}\n\nReason: ${reason}\n\nReporter contact: ${contact || "Not provided"}`,
};

const nl: typeof en = {
  seoTitle: "Misbruik melden - Tessil",
  description: "Meld illegale of misbruikende transfers op Tessil. Stuur een link in ter beoordeling.",
  title: "Misbruik melden",
  tagline: "Meld een transfer of ander misbruik van Tessil.",
  doneTitle: "Melding verstuurd",
  doneBody: "Bedankt voor je melding. We bekijken elke melding en treden op bij geldige meldingen, volgens de wet.",
  noClient: "Ging je e-mailprogramma niet open, stuur de melding dan naar",
  intro1:
    "Bevat een transfer op Tessil illegale of misbruikende inhoud, meld het dan hieronder. Elke melding wordt bekeken; bij geldige meldingen treden we op volgens de wet.",
  intro2:
    "End-to-end versleuteling verhindert dat wij de inhoud van bestanden zien. We kunnen de transfer wel verwijderen, bijbehorende metagegevens wissen en meewerken met opsporingsinstanties op grond van een rechtmatig bevel.",
  url: "URL van de transfer",
  reason: "Reden van de melding",
  reasonHint: "Beschrijf waarom je deze transfer meldt",
  contact: "Je e-mailadres (optioneel)",
  contactHint: "Voor contact als dat nodig is",
  submitting: "Versturen…",
  submit: "Melding versturen",
  failed: "De melding kon niet worden verstuurd. Mail rechtstreeks naar abuse@tessil.app.",
  orEmail: "Of mail rechtstreeks naar",
  directly: ". Gaat het om een noodgeval rond de veiligheid van kinderen, neem dan ook contact op met de politie.",
  mailSubject: "Tessil melding van misbruik",
  mailBody: (url: string, reason: string, contact: string) =>
    `URL van de transfer: ${url}\n\nReden: ${reason}\n\nContact van de melder: ${contact || "Niet opgegeven"}`,
};

export const abuseMessages: Record<Locale, typeof en> = { en, nl };
