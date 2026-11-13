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
  files: { name: string; size: string }[];
  /** When the deposit is deleted automatically, if known. */
  deletedOn?: Date;
}

const LABELS: Record<Locale, Record<string, string>> = {
  en: {
    sentTitle: "Confirmation of sending",
    receivedTitle: "Record of files received",
    to: "Sent to",
    portal: "Portal",
    sentAt: "Sent",
    receivedAt: "Received",
    reference: "Reference",
    note: "Note",
    files: "Files",
    deletedOn: "Deleted automatically on",
    sentFooter:
      "The files were encrypted in your browser before sending. Only the recipient can open them. Quote the reference if you need to ask about this delivery.",
    receivedFooter:
      "Files in a portal are deleted automatically. Keep your own copy of anything you need to retain.",
  },
  nl: {
    sentTitle: "Verzendbevestiging",
    receivedTitle: "Overzicht van ontvangen bestanden",
    to: "Verstuurd naar",
    portal: "Portaal",
    sentAt: "Verstuurd",
    receivedAt: "Ontvangen",
    reference: "Referentie",
    note: "Opmerking",
    files: "Bestanden",
    deletedOn: "Wordt automatisch verwijderd op",
    sentFooter:
      "De bestanden zijn in je browser versleuteld voordat ze werden verstuurd. Alleen de ontvanger kan ze openen. Noem de referentie als je iets over deze levering wilt vragen.",
    receivedFooter:
      "Bestanden in een portaal worden automatisch verwijderd. Bewaar zelf een kopie van wat je moet bewaren.",
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
  const lines = [
    `Tessil - ${sent ? l.sentTitle : l.receivedTitle}`,
    "",
    `${sent ? l.to : l.portal}: ${input.portalTitle}`,
    `${sent ? l.sentAt : l.receivedAt}: ${when.format(input.at)}`,
    `${l.reference}: ${input.reference}`,
  ];
  if (input.note) lines.push(`${l.note}: ${input.note}`);
  if (input.deletedOn) lines.push(`${l.deletedOn}: ${day.format(input.deletedOn)}`);
  lines.push("", `${l.files} (${input.files.length}):`);
  for (const f of input.files) lines.push(`  - ${f.name} (${f.size})`);
  lines.push("", sent ? l.sentFooter : l.receivedFooter, "");
  return lines.join("\n");
}

/** Hands a small text file to the browser to save. */
export function saveTextFile(filename: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
