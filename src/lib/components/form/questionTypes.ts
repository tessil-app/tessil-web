// Names and icons of the question types, for the editor.

import type { QuestionType } from "$lib/form/questions";
import IconCalendarBlankRegular from "phosphor-icons-svelte/IconCalendarBlankRegular.svelte";
import IconCheckSquareRegular from "phosphor-icons-svelte/IconCheckSquareRegular.svelte";
import IconPaperclipRegular from "phosphor-icons-svelte/IconPaperclipRegular.svelte";
import IconRadioButtonRegular from "phosphor-icons-svelte/IconRadioButtonRegular.svelte";
import IconTextAaRegular from "phosphor-icons-svelte/IconTextAaRegular.svelte";
import IconTextAlignLeftRegular from "phosphor-icons-svelte/IconTextAlignLeftRegular.svelte";
import IconToggleLeftRegular from "phosphor-icons-svelte/IconToggleLeftRegular.svelte";

export const QUESTION_TYPES_SHOWN: { value: QuestionType; label: string }[] = [
  { value: "short", label: "Short answer" },
  { value: "long", label: "Long answer" },
  { value: "choice", label: "One choice" },
  { value: "choices", label: "Several choices" },
  { value: "yesno", label: "Yes or no" },
  { value: "date", label: "Date" },
  { value: "file", label: "File upload" },
];

export const typeLabel = (t: QuestionType) => QUESTION_TYPES_SHOWN.find((x) => x.value === t)?.label ?? t;

export const TYPE_ICON: Record<QuestionType, typeof IconTextAaRegular> = {
  short: IconTextAaRegular,
  long: IconTextAlignLeftRegular,
  choice: IconRadioButtonRegular,
  choices: IconCheckSquareRegular,
  yesno: IconToggleLeftRegular,
  date: IconCalendarBlankRegular,
  file: IconPaperclipRegular,
};
