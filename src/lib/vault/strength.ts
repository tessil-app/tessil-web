// zxcvbn-ts wrapper. The wordlists are ~600 KB unminified, so we lazy-load
// them the first time the user types a password. ADR-0004: minimum length
// 14 chars AND zxcvbn score >= 3. No composition rules, no HIBP.

import type { ZxcvbnResult } from "@zxcvbn-ts/core";

export const MIN_PASSWORD_LENGTH = 14;
export const MIN_PASSWORD_SCORE = 3;

let zxcvbnReady: Promise<(input: string) => ZxcvbnResult> | null = null;

async function loadZxcvbn(): Promise<(input: string) => ZxcvbnResult> {
  const [{ zxcvbn, zxcvbnOptions }, common, en] = await Promise.all([
    import("@zxcvbn-ts/core"),
    import("@zxcvbn-ts/language-common"),
    import("@zxcvbn-ts/language-en"),
  ]);
  zxcvbnOptions.setOptions({
    translations: en.translations,
    dictionary: { ...common.dictionary, ...en.dictionary },
    graphs: common.adjacencyGraphs,
  });
  return zxcvbn;
}

export function getZxcvbn(): Promise<(input: string) => ZxcvbnResult> {
  if (!zxcvbnReady) zxcvbnReady = loadZxcvbn();
  return zxcvbnReady;
}

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  /** Combined gate from ADR-0004 — both length and score must pass. */
  acceptable: boolean;
  /** Localised feedback from zxcvbn — surfaced inline under the input. */
  warning: string;
  suggestions: string[];
}

export async function evaluatePassword(input: string): Promise<PasswordStrength> {
  // Empty input → don't load the dictionaries yet; just return a placeholder.
  if (input.length === 0) {
    return { score: 0, acceptable: false, warning: "", suggestions: [] };
  }
  const zxcvbn = await getZxcvbn();
  const result = zxcvbn(input);
  const score = result.score as PasswordStrength["score"];
  const longEnough = input.length >= MIN_PASSWORD_LENGTH;
  const strongEnough = score >= MIN_PASSWORD_SCORE;
  return {
    score,
    acceptable: longEnough && strongEnough,
    warning: result.feedback.warning ?? "",
    suggestions: result.feedback.suggestions ?? [],
  };
}

export function scoreLabel(score: PasswordStrength["score"]): string {
  return ["Very weak", "Weak", "Fair", "Strong", "Very strong"][score];
}
