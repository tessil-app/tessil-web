// The questions of a form. They live in the form's public bundle, encrypted
// under the link key, so the server never reads them.
// See docs/adr/0016-encrypted-forms.md.

export const QUESTION_TYPES = ["short", "long", "choice", "choices", "yesno", "date", "file"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export interface Question {
  /** Stable across edits, so answers and files stay attached to the right question. */
  id: string;
  type: QuestionType;
  label: string;
  /** A line under the label. */
  hint?: string;
  required?: boolean;
  /** For "choice" and "choices". */
  options?: string[];
}

/** Most questions any form may hold. Plans allow fewer; see `questionLimit`. */
export const FORM_QUESTIONS_MAX = 50;
export const QUESTION_LABEL_MAX = 200;
export const QUESTION_HINT_MAX = 300;
export const QUESTION_OPTIONS_MAX = 20;
export const QUESTION_OPTION_MAX = 100;

/** Questions per form on a plan. Kept in the interface: the server cannot read the bundle. */
export function questionLimit(tier: string | null | undefined): number {
  return tier === "max" ? FORM_QUESTIONS_MAX : 10;
}

const QUESTION_ID = /^[a-z0-9]{6}$/;

export function newQuestionId(): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  // 36 does not divide 256, so reject the tail instead of taking it modulo.
  let id = "";
  while (id.length < 6) {
    const [b] = crypto.getRandomValues(new Uint8Array(1));
    if (b < 252) id += alphabet[b % 36];
  }
  return id;
}

export function hasOptions(type: QuestionType): boolean {
  return type === "choice" || type === "choices";
}

function cleanOptions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const entry of raw.slice(0, QUESTION_OPTIONS_MAX)) {
    if (typeof entry !== "string") continue;
    const option = entry.trim().slice(0, QUESTION_OPTION_MAX);
    if (option && !out.includes(option)) out.push(option);
  }
  return out;
}

/** Keeps only well-formed questions; a bundle is data from the network. */
export function cleanQuestions(raw: unknown): Question[] {
  if (!Array.isArray(raw)) return [];
  const out: Question[] = [];
  for (const entry of raw.slice(0, FORM_QUESTIONS_MAX)) {
    const q = entry as Partial<Record<keyof Question, unknown>> | null;
    const type = QUESTION_TYPES.find((t) => t === q?.type);
    const label = typeof q?.label === "string" ? q.label.trim().slice(0, QUESTION_LABEL_MAX) : "";
    if (
      !type ||
      !label ||
      typeof q?.id !== "string" ||
      !QUESTION_ID.test(q.id) ||
      out.some((o) => o.id === q.id)
    ) {
      continue;
    }
    const options = hasOptions(type) ? cleanOptions(q.options) : [];
    // A choice with nothing to choose from cannot be answered.
    if (hasOptions(type) && options.length === 0) continue;
    const hint = typeof q.hint === "string" ? q.hint.trim().slice(0, QUESTION_HINT_MAX) : "";
    out.push({
      id: q.id,
      type,
      label,
      ...(hint ? { hint } : {}),
      ...(q.required === true ? { required: true } : {}),
      ...(options.length > 0 ? { options } : {}),
    });
  }
  return out;
}
