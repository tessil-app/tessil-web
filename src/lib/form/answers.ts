// A response's answers. They travel as a small file inside the response,
// encrypted under its key like any other file, with a name no real file
// can have. See docs/adr/0016-encrypted-forms.md.

import { streamingDecrypt } from "$lib/crypto/streaming";
import { QUESTION_OPTION_MAX, type Question, type QuestionType } from "./questions";

/** Real names have the separator stripped (`encodeDepositFileName`), so none starts with it. */
export const ANSWERS_FILE_NAME = "\u001fanswers.json";
/** Lets the server hand out the answers with the list of responses. */
export const ANSWERS_MIME_TYPE = "application/vnd.tessil.answers+json";

export const ANSWER_SHORT_MAX = 300;
export const ANSWER_LONG_MAX = 5000;
const ANSWERS_VERSION = 1;
// Padded so the stored size says little about how much was written.
const ANSWERS_PAD = 1024;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Text, a list (several choices, file names), yes or no, or nothing. */
export type AnswerValue = string | string[] | boolean | null;

export interface FormAnswer {
  id: string;
  type: QuestionType;
  /** The question as it was worded when answered. */
  label: string;
  value: AnswerValue;
}

/** What a visitor has filled in so far, by question ID. */
export type AnswerDraft = Record<string, AnswerValue | undefined>;

export function isAnswersFile(file: { name: string; mimeType?: string | null }): boolean {
  return file.name === ANSWERS_FILE_NAME || file.mimeType === ANSWERS_MIME_TYPE;
}

function textMax(type: QuestionType): number {
  return type === "long" ? ANSWER_LONG_MAX : ANSWER_SHORT_MAX;
}

/** One answer, made to fit its question, or null when it says nothing. */
function cleanValue(type: QuestionType, raw: unknown, options?: string[]): AnswerValue {
  switch (type) {
    case "short":
    case "long": {
      const text = typeof raw === "string" ? raw.trim().slice(0, textMax(type)) : "";
      return text || null;
    }
    case "date":
      return typeof raw === "string" && DAY.test(raw) ? raw : null;
    case "yesno":
      return typeof raw === "boolean" ? raw : null;
    case "choice": {
      const text = typeof raw === "string" ? raw.trim().slice(0, QUESTION_OPTION_MAX) : "";
      if (!text) return null;
      return !options || options.includes(text) ? text : null;
    }
    case "choices":
    case "file": {
      if (!Array.isArray(raw)) return null;
      const list = raw
        .filter((v): v is string => typeof v === "string")
        .map((v) => v.trim().slice(0, type === "file" ? 255 : QUESTION_OPTION_MAX))
        .filter((v) => v && (!options || options.includes(v)));
      const unique = [...new Set(list)].slice(0, 100);
      return unique.length > 0 ? unique : null;
    }
  }
}

/** True when the question has an answer worth sending. */
export function isAnswered(question: Question, value: AnswerValue | undefined): boolean {
  return cleanValue(question.type, value, question.options) !== null;
}

/** Required questions without an answer, in the form's order. */
export function missingAnswers(questions: Question[], draft: AnswerDraft): Question[] {
  return questions.filter((q) => q.required && !isAnswered(q, draft[q.id]));
}

/** The answers to send, in the form's order, each with the question's wording at this moment. */
export function collectAnswers(questions: Question[], draft: AnswerDraft): FormAnswer[] {
  return questions.map((q) => ({
    id: q.id,
    type: q.type,
    label: q.label,
    value: cleanValue(q.type, draft[q.id], q.options),
  }));
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** JSON, padded with spaces to a multiple of 1 KiB. */
export function encodeAnswers(answers: FormAnswer[]): Uint8Array {
  const raw = encoder.encode(JSON.stringify({ v: ANSWERS_VERSION, answers }));
  const padded = new Uint8Array(Math.ceil((raw.length + 1) / ANSWERS_PAD) * ANSWERS_PAD).fill(0x20);
  padded.set(raw);
  return padded;
}

/** Null when this is not an answers file this code understands. */
export function decodeAnswers(bytes: Uint8Array): FormAnswer[] | null {
  let parsed: { v?: unknown; answers?: unknown };
  try {
    parsed = JSON.parse(decoder.decode(bytes));
  } catch {
    return null;
  }
  if (parsed?.v !== ANSWERS_VERSION || !Array.isArray(parsed.answers)) return null;
  const out: FormAnswer[] = [];
  for (const entry of parsed.answers.slice(0, 100)) {
    const a = entry as Partial<Record<keyof FormAnswer, unknown>> | null;
    const type = (["short", "long", "choice", "choices", "yesno", "date", "file"] as const).find(
      (t) => t === a?.type,
    );
    if (!type || typeof a?.id !== "string" || typeof a.label !== "string") continue;
    out.push({
      id: a.id.slice(0, 16),
      type,
      label: a.label.trim().slice(0, 200),
      // The options at the time are not known here; any text is kept.
      value: cleanValue(type, a.value),
    });
  }
  return out;
}

/** Opens a downloaded answers file with its response's key. Null when it does not open. */
export async function decryptAnswers(ciphertext: Uint8Array, key: CryptoKey): Promise<FormAnswer[] | null> {
  try {
    const source = new Blob([ciphertext as BlobPart]).stream();
    const plain = await new Response(streamingDecrypt(source, ciphertext.byteLength, key)).arrayBuffer();
    return decodeAnswers(new Uint8Array(plain));
  } catch {
    return null;
  }
}

/** An answer as one line of text. */
export function answerText(answer: FormAnswer, words = { yes: "Yes", no: "No" }): string {
  const v = answer.value;
  if (v === null) return "";
  if (typeof v === "boolean") return v ? words.yes : words.no;
  return Array.isArray(v) ? v.join(", ") : v;
}

/** The first short answer, to name a response in a list. */
export function leadingAnswer(answers: FormAnswer[]): string | null {
  const first = answers.find((a) => a.type === "short" && typeof a.value === "string");
  return first ? (first.value as string) : null;
}

// ─── export ─────────────────────────────────────────────────────────────────

export interface CsvResponse {
  reference: string;
  receivedAt: string;
  answers: FormAnswer[];
}

// A spreadsheet runs a cell that starts with one of these as a formula.
const FORMULA_START = /^[=+\-@\t\r]/;

function csvCell(text: string): string {
  const safe = FORMULA_START.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

/**
 * One row per response, one column per question. Columns follow the form
 * as it is now, then any questions only older responses answered.
 */
export function answersCsv(questions: Question[], responses: CsvResponse[]): string {
  const columns: { id: string; label: string }[] = questions.map((q) => ({ id: q.id, label: q.label }));
  for (const r of responses) {
    for (const a of r.answers) {
      if (!columns.some((c) => c.id === a.id)) columns.push({ id: a.id, label: a.label });
    }
  }
  const lines = [["Reference", "Received", ...columns.map((c) => c.label)]];
  for (const r of responses) {
    lines.push([
      r.reference,
      r.receivedAt,
      ...columns.map((c) => {
        const a = r.answers.find((x) => x.id === c.id);
        return a ? answerText(a) : "";
      }),
    ]);
  }
  // Excel reads UTF-8 only with the byte order mark.
  return "﻿" + lines.map((cells) => cells.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
