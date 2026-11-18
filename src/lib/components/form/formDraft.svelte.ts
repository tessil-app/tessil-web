// What the form editor holds while someone builds a form, and how it is
// saved. The editor component only lays it out.

import {
  FORM_QUESTIONS_MAX,
  hasOptions,
  newQuestionId,
  QUESTION_OPTIONS_MAX,
  type Question,
  type QuestionType,
} from "$lib/form/questions";
import { DEFAULT_LOCALE, type Locale } from "$lib/i18n/locale";
import type { OpenedPortal } from "$lib/portal/deposit";
import { PORTAL_PASSWORD_MIN, type PortalLogo, type PortalSettings } from "$lib/portal/keys";
import { prepareLogo } from "$lib/portal/logo";

export interface EditorProps {
  initial: PortalSettings;
  mode: "create" | "edit";
  onSave: (settings: PortalSettings) => Promise<void>;
  cancelHref: string;
  questionLimit: number;
  canBrand?: boolean;
}

function dayOf(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function endOfDay(day: string): string | null {
  const [y, m, d] = day.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
}

export function problemOf(q: Question): string | null {
  if (!q.label.trim()) return "Write the question.";
  if (hasOptions(q.type) && !(q.options ?? []).some((o) => o.trim())) return "Add at least one option.";
  return null;
}

export class FormDraft {
  readonly mode: "create" | "edit";
  readonly canBrand: boolean;
  readonly hadPassword: boolean;
  readonly hadLogo: boolean;
  readonly today = dayOf(new Date());
  private readonly onSave: EditorProps["onSave"];
  private readonly questionLimit: number;

  title = $state("");
  lang = $state<Locale>(DEFAULT_LOCALE);
  questions = $state<Question[]>([]);
  messageOn = $state(false);
  message = $state("");
  thanksOn = $state(false);
  thanks = $state("");
  logoOn = $state(false);
  logo = $state<PortalLogo | null>(null);
  logoError = $state<string | null>(null);
  logoBusy = $state(false);
  passwordOn = $state(false);
  newPassword = $state("");
  closeOn = $state(false);
  closeDay = $state("");
  notify = $state(false);

  isSaving = $state(false);
  saveError = $state<string | null>(null);
  saved = $state(false);
  triedSave = $state(false);

  constructor(props: EditorProps) {
    const start = props.initial;
    this.mode = props.mode;
    this.canBrand = props.canBrand ?? false;
    this.onSave = props.onSave;
    this.questionLimit = props.questionLimit;
    this.hadPassword = start.hasPassword;
    this.hadLogo = start.logo !== null;
    this.title = start.title;
    this.lang = start.lang ?? DEFAULT_LOCALE;
    this.questions = (start.questions ?? []).map((q) => ({
      ...q,
      required: q.required ?? false,
      options: q.options ? [...q.options] : undefined,
    }));
    this.messageOn = start.message.length > 0;
    this.message = start.message;
    this.thanksOn = start.thanks.length > 0;
    this.thanks = start.thanks;
    this.logoOn = start.logo !== null;
    this.logo = start.logo;
    this.passwordOn = start.hasPassword;
    this.closeOn = start.closesAt !== null;
    this.closeDay = start.closesAt ? dayOf(new Date(start.closesAt)) : "";
    this.notify = start.notifyOnDelivery;
    this.baseline = JSON.stringify(this.settings);
  }

  // Getters, since these read fields the constructor sets.
  get limit() {
    return Math.min(this.questionLimit, FORM_QUESTIONS_MAX);
  }
  get atLimit() {
    return this.questions.length >= this.limit;
  }
  get brandLocked() {
    return !this.canBrand && !this.hadLogo;
  }
  get passwordLocked() {
    return !this.canBrand && !this.hadPassword;
  }
  get passwordMissing() {
    return this.passwordOn && !this.hadPassword && this.newPassword.length < PORTAL_PASSWORD_MIN;
  }
  get passwordShort() {
    return this.passwordOn && this.newPassword.length > 0 && this.newPassword.length < PORTAL_PASSWORD_MIN;
  }

  settings = $derived.by<PortalSettings>(() => ({
    title: this.title.trim(),
    lang: this.lang,
    checklist: [],
    message: this.messageOn ? this.message.trim() : "",
    thanks: this.thanksOn ? this.thanks.trim() : "",
    fieldLabel: "",
    logo: this.logoOn ? this.logo : null,
    twoWay: false,
    returns: [],
    questions: this.questions.map((q) => {
      const options = hasOptions(q.type) ? [...new Set((q.options ?? []).map((o) => o.trim()).filter(Boolean))] : [];
      const hint = q.hint?.trim() ?? "";
      return {
        id: q.id,
        type: q.type,
        label: q.label.trim(),
        ...(hint ? { hint } : {}),
        ...(q.required ? { required: true } : {}),
        ...(options.length > 0 ? { options } : {}),
      };
    }),
    closesAt: this.closeOn ? endOfDay(this.closeDay) : null,
    notifyOnDelivery: this.notify,
    hasPassword: this.passwordOn,
    newPassword: this.passwordOn ? this.newPassword : "",
  }));

  problems = $derived(this.questions.map(problemOf));
  formReady = $derived(this.questions.length > 0 && this.problems.every((p) => p === null));
  baseline = $state("");
  dirty = $derived(JSON.stringify(this.settings) !== this.baseline);
  get canSave() {
    return (
      (this.mode === "create" || this.dirty) &&
      !this.isSaving &&
      !this.passwordMissing &&
      !this.passwordShort
    );
  }

  previewForm = $derived.by<OpenedPortal>(() => ({
    id: "preview",
    title: this.settings.title || "Your form's name",
    publicKey: new Uint8Array(),
    linkKey: new Uint8Array(),
    accessToken: null,
    accepting: true,
    maxTotalSize: 0,
    lang: this.lang,
    checklist: [],
    message: this.settings.message,
    thanks: this.settings.thanks,
    fieldLabel: "",
    closesAt: this.settings.closesAt,
    logo: this.settings.logo,
    twoWay: false,
    returns: [],
    kind: "form",
    questions: (this.settings.questions ?? []).map((q) => ({
      ...q,
      label: q.label || "Untitled question",
      ...(hasOptions(q.type) && !q.options?.length ? { options: ["Option 1"] } : {}),
    })),
  }));

  /** Adds a question at `at` (default: the end) and returns its ID. */
  addQuestion(type: QuestionType = "short", at = this.questions.length): string | null {
    if (this.atLimit) return null;
    const id = newQuestionId();
    const q: Question = { id, type, label: "", required: false };
    if (hasOptions(type)) q.options = ["", ""];
    const next = [...this.questions];
    next.splice(at, 0, q);
    this.questions = next;
    return id;
  }

  duplicate(index: number): string | null {
    if (this.atLimit) return null;
    const src = this.questions[index];
    const id = newQuestionId();
    const next = [...this.questions];
    next.splice(index + 1, 0, { ...src, id, options: src.options ? [...src.options] : undefined });
    this.questions = next;
    return id;
  }

  setType(index: number, type: QuestionType) {
    const q = this.questions[index];
    q.type = type;
    if (hasOptions(type) && !(q.options ?? []).length) q.options = ["", ""];
  }

  moveTo(from: number, to: number) {
    if (to < 0 || to >= this.questions.length || from === to) return;
    const next = [...this.questions];
    const [q] = next.splice(from, 1);
    next.splice(to, 0, q);
    this.questions = next;
  }

  remove(index: number) {
    this.questions = this.questions.filter((_, i) => i !== index);
  }

  addOption(index: number): number | null {
    const q = this.questions[index];
    if ((q.options ?? []).length >= QUESTION_OPTIONS_MAX) return null;
    q.options = [...(q.options ?? []), ""];
    return q.options.length - 1;
  }

  removeOption(index: number, at: number) {
    const q = this.questions[index];
    q.options = (q.options ?? []).filter((_, i) => i !== at);
  }

  setClose(on: boolean) {
    this.closeOn = on;
    if (on && !this.closeDay) this.closeDay = dayOf(new Date(Date.now() + 14 * 86_400_000));
  }

  async pickLogo(file: File) {
    this.logoBusy = true;
    this.logoError = null;
    try {
      this.logo = await prepareLogo(file);
    } catch (err) {
      this.logoError = err instanceof Error ? err.message : "That image could not be used.";
    } finally {
      this.logoBusy = false;
    }
  }

  leaving = false;

  /** Returns the first broken question's ID when the form isn't ready. */
  async save(): Promise<{ firstProblem: string | null } | void> {
    if (!this.canSave) return;
    this.triedSave = true;
    if (this.settings.title.length === 0) {
      this.saveError = "Give the form a name first.";
      return { firstProblem: "start" };
    }
    this.saveError = null;
    if (!this.formReady) {
      return { firstProblem: this.questions.find((q) => problemOf(q) !== null)?.id ?? null };
    }
    this.isSaving = true;
    this.saveError = null;
    try {
      this.leaving = this.mode === "create";
      await this.onSave(this.settings);
      this.baseline = JSON.stringify(this.settings);
      this.saved = true;
      this.triedSave = false;
    } catch (err) {
      this.leaving = false;
      this.saveError = err instanceof Error ? err.message : "Couldn't save. Try again.";
    } finally {
      this.isSaving = false;
    }
  }
}
