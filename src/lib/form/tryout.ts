// The form someone builds on /forms/try before they have an account or a
// plan. It waits in this browser until they can create it for real.

import { cleanQuestions, type Question } from "./questions";

const KEY = "tessil:form-tryout";

export interface TryoutDraft {
  title: string;
  message: string;
  thanks: string;
  questions: Question[];
}

export function keepTryout(draft: TryoutDraft): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    // Private windows may refuse; the form is then simply not kept.
  }
}

export function readTryout(): TryoutDraft | null {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<TryoutDraft> | null;
    const questions = cleanQuestions(raw?.questions);
    if (!raw || questions.length === 0) return null;
    return {
      title: typeof raw.title === "string" ? raw.title : "",
      message: typeof raw.message === "string" ? raw.message : "",
      thanks: typeof raw.thanks === "string" ? raw.thanks : "",
      questions,
    };
  } catch {
    return null;
  }
}

export function forgetTryout(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to forget.
  }
}
