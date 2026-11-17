// Counts over a form's responses, for the summary view. Everything here
// works on answers already decrypted in the browser.

import type { AnswerValue, FormAnswer } from "./answers";
import type { Question, QuestionType } from "./questions";

export interface SummaryResponse {
  id: string;
  createdAt: string;
  answers: FormAnswer[] | null;
}

export interface OptionCount {
  /** What an answer holds when it picked this: an option's text, or yes or no. */
  value: string | boolean;
  count: number;
  /** False for an option only older responses chose. */
  current: boolean;
}

export interface QuestionSummary {
  id: string;
  type: QuestionType;
  label: string;
  /** False when only older responses answered it. */
  current: boolean;
  answered: number;
  skipped: number;
  /** For one choice, several choices, and yes or no. */
  options: OptionCount[];
  /** For text and dates: the newest answers first. */
  latest: { responseId: string; text: string }[];
  /** For file questions: files across all responses. */
  files: number;
}

export const SUMMARY_LATEST = 5;

function counted(type: QuestionType): boolean {
  return type === "choice" || type === "choices" || type === "yesno";
}

/** True when a response answered the question with this option. */
export function pickedOption(answers: FormAnswer[] | null, questionId: string, value: string | boolean): boolean {
  const v: AnswerValue | undefined = answers?.find((a) => a.id === questionId)?.value;
  return Array.isArray(v) ? typeof value === "string" && v.includes(value) : v === value;
}

/**
 * One summary per question: the form's questions in order, then any only
 * older responses answered. Wording and options come from the form where
 * it still has the question.
 */
export function summarise(questions: Question[], responses: SummaryResponse[]): QuestionSummary[] {
  const out: QuestionSummary[] = questions.map((q) => ({
    id: q.id,
    type: q.type,
    label: q.label,
    current: true,
    answered: 0,
    skipped: 0,
    options:
      q.type === "yesno"
        ? [true, false].map((value) => ({ value, count: 0, current: true }))
        : counted(q.type)
          ? (q.options ?? []).map((value) => ({ value, count: 0, current: true }))
          : [],
    latest: [],
    files: 0,
  }));
  const byId = new Map(out.map((s) => [s.id, s]));

  const newestFirst = [...responses].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  for (const response of newestFirst) {
    for (const answer of response.answers ?? []) {
      let s = byId.get(answer.id);
      if (!s) {
        s = {
          id: answer.id,
          type: answer.type,
          label: answer.label,
          current: false,
          answered: 0,
          skipped: 0,
          options: [],
          latest: [],
          files: 0,
        };
        byId.set(s.id, s);
        out.push(s);
      }
      const v = answer.value;
      if (v === null) continue;
      s.answered += 1;
      if (s.type === "file") {
        s.files += Array.isArray(v) ? v.length : 1;
      } else if (counted(s.type)) {
        for (const value of Array.isArray(v) ? v : [v]) {
          const option = s.options.find((o) => o.value === value);
          if (option) option.count += 1;
          else s.options.push({ value, count: 1, current: false });
        }
      } else if (s.latest.length < SUMMARY_LATEST) {
        s.latest.push({ responseId: response.id, text: Array.isArray(v) ? v.join(", ") : String(v) });
      }
    }
  }
  // Not answered, or not asked when the response was sent.
  for (const s of out) s.skipped = responses.length - s.answered;
  return out;
}

/** A whole percentage of `total`, 0 when there is nothing to divide by. */
export function share(count: number, total: number): number {
  return total > 0 ? Math.round((count / total) * 100) : 0;
}
