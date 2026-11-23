// The question types and their icons, for the editor.

import type { QuestionType } from "$lib/form/questions";
import IconCalendarBlankRegular from "phosphor-icons-svelte/IconCalendarBlankRegular.svelte";
import IconCheckSquareRegular from "phosphor-icons-svelte/IconCheckSquareRegular.svelte";
import IconPaperclipRegular from "phosphor-icons-svelte/IconPaperclipRegular.svelte";
import IconRadioButtonRegular from "phosphor-icons-svelte/IconRadioButtonRegular.svelte";
import IconTextAaRegular from "phosphor-icons-svelte/IconTextAaRegular.svelte";
import IconTextAlignLeftRegular from "phosphor-icons-svelte/IconTextAlignLeftRegular.svelte";
import IconToggleLeftRegular from "phosphor-icons-svelte/IconToggleLeftRegular.svelte";

// In the order the editor offers them; names are in messages/forms.ts.
export const QUESTION_TYPES_SHOWN: { value: QuestionType }[] = [
  { value: "short" },
  { value: "long" },
  { value: "choice" },
  { value: "choices" },
  { value: "yesno" },
  { value: "date" },
  { value: "file" },
];

export const TYPE_ICON: Record<QuestionType, typeof IconTextAaRegular> = {
  short: IconTextAaRegular,
  long: IconTextAlignLeftRegular,
  choice: IconRadioButtonRegular,
  choices: IconCheckSquareRegular,
  yesno: IconToggleLeftRegular,
  date: IconCalendarBlankRegular,
  file: IconPaperclipRegular,
};
