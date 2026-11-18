// Confirmations for a deposit: a short reference both sides can quote, and
// a plain-text record each can keep. Made in the browser from what that
// side already knows; nothing extra is sent anywhere.

import type { Locale } from "$lib/i18n/locale";

/**
 * A short code for a deposit, the same for the person who sent it and the
 * people who received it, e.g. "7F3A-91C2". Derived from the deposit's ID.
 */
export async function depositReference(transferId: string): Promise<string> {
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`tessil/deposit-ref|${transferId}`)),
  );
  const hex = Array.from(digest.subarray(0, 4), (b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  return `${hex.slice(0, 4)}-${hex.slice(4)}`;
}

export interface ReceiptInput {
  /** "sent" for the depositor's copy, "received" for the portal member's. */
  kind: "sent" | "received";
  locale: Locale;
  portalTitle: string;
  reference: string;
  at: Date;
  note: string | null;
  /** The portal's extra field and what was filled in. */
  answer?: { label: string; value: string } | null;
  /** A form's questions and answers, already as text. Present: this is a form's response. */
  answers?: { label: string; value: string }[] | null;
  files: { name: string; size: string }[];
  /** When the deposit is deleted automatically, if known. */
  deletedOn?: Date;
}

const LABELS: Record<Locale, Record<string, string>> = {
  en: {
    sentTitle: "Confirmation of sending",
    receivedTitle: "Record of files received",
    receivedFormTitle: "Record of a response",
    to: "Sent to",
    portal: "Portal",
    form: "Form",
    sentAt: "Sent",
    receivedAt: "Received",
    reference: "Reference",
    from: "From",
    note: "Note",
    files: "Files",
    answers: "Answers",
    unanswered: "(not answered)",
    deletedOn: "Deleted automatically on",
    sentFooter:
      "The files were encrypted in your browser before sending. Only the recipient can open them. Quote the reference if you need to ask about this delivery.",
    receivedFooter:
      "Files in a portal are deleted automatically. Keep your own copy of anything you need to retain.",
    sentFormFooter:
      "Your answers were encrypted in your browser before sending. Only the recipient can read them. Quote the reference if you need to ask about this response.",
    receivedFormFooter:
      "Responses are deleted automatically. Keep your own copy of anything you need to retain.",
  },
  nl: {
    sentTitle: "Verzendbevestiging",
    receivedTitle: "Overzicht van ontvangen bestanden",
    receivedFormTitle: "Overzicht van een ingevuld formulier",
    to: "Verstuurd naar",
    portal: "Portaal",
    form: "Formulier",
    sentAt: "Verstuurd",
    receivedAt: "Ontvangen",
    reference: "Referentie",
    from: "Van",
    note: "Opmerking",
    files: "Bestanden",
    answers: "Antwoorden",
    unanswered: "(niet beantwoord)",
    deletedOn: "Wordt automatisch verwijderd op",
    sentFooter:
      "De bestanden zijn in je browser versleuteld voordat ze werden verstuurd. Alleen de ontvanger kan ze openen. Noem de referentie als je iets over deze levering wilt vragen.",
    receivedFooter:
      "Bestanden in een portaal worden automatisch verwijderd. Bewaar zelf een kopie van wat je moet bewaren.",
    sentFormFooter:
      "Je antwoorden zijn in je browser versleuteld voordat ze werden verstuurd. Alleen de ontvanger kan ze lezen. Noem de referentie als je iets over dit formulier wilt vragen.",
    receivedFormFooter:
      "Ingevulde formulieren worden automatisch verwijderd. Bewaar zelf een kopie van wat je moet bewaren.",
  },
};

export function buildReceiptText(input: ReceiptInput): string {
  const l = LABELS[input.locale];
  const when = new Intl.DateTimeFormat(input.locale === "nl" ? "nl-NL" : "en-GB", {
    dateStyle: "long",
    timeStyle: "short",
  });
  const day = new Intl.DateTimeFormat(input.locale === "nl" ? "nl-NL" : "en-GB", { dateStyle: "long" });
  const sent = input.kind === "sent";
  const isForm = !!input.answers;
  const lines = [
    `Tessil - ${sent ? l.sentTitle : isForm ? l.receivedFormTitle : l.receivedTitle}`,
    "",
    `${sent ? l.to : isForm ? l.form : l.portal}: ${input.portalTitle}`,
    `${sent ? l.sentAt : l.receivedAt}: ${when.format(input.at)}`,
    `${l.reference}: ${input.reference}`,
  ];
  if (input.answer) lines.push(`${input.answer.label || l.from}: ${input.answer.value}`);
  if (input.note) lines.push(`${l.note}: ${input.note}`);
  if (input.deletedOn) lines.push(`${l.deletedOn}: ${day.format(input.deletedOn)}`);
  if (input.answers && input.answers.length > 0) {
    lines.push("", `${l.answers}:`);
    for (const a of input.answers) {
      // Long answers keep their own lines, indented under the question.
      const value = a.value ? a.value.split("\n").join("\n    ") : l.unanswered;
      lines.push(`  ${a.label}`, `    ${value}`);
    }
  }
  if (!input.answers || input.files.length > 0) {
    lines.push("", `${l.files} (${input.files.length}):`);
    for (const f of input.files) lines.push(`  - ${f.name} (${f.size})`);
  }
  const footer = isForm
    ? sent
      ? l.sentFormFooter
      : l.receivedFormFooter
    : sent
      ? l.sentFooter
      : l.receivedFooter;
  lines.push("", footer, "");
  return lines.join("\n");
}
