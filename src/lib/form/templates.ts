// A form's setup kept for reuse: its questions and texts, under a name.
// Each template is one vault item, encrypted in the browser and bound to
// its own ID, so the server stores it without being able to read it.
// See docs/adr/0016-encrypted-forms.md.

import { api } from "$lib/api/client";
import { base64UrlToBytes, bytesToBase64Url } from "$lib/crypto/base64url";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "$lib/i18n/locale";
import { PORTAL_MESSAGE_MAX, PORTAL_THANKS_MAX, PORTAL_TITLE_MAX, newPortalId } from "$lib/portal/keys";
import { readVaultDerivationKey } from "$lib/vault/session";
import { openVaultItem, sealVaultItem } from "$lib/vault/keypair";
import { cleanQuestions, type Question } from "./questions";

export const TEMPLATE_NAME_MAX = 60;
const TEMPLATE_VERSION = 1;

/** What a template holds. No logo, password or closing date: those belong to one form. */
export interface TemplateContent {
  name: string;
  title: string;
  lang: Locale;
  message: string;
  thanks: string;
  questions: Question[];
  notifyOnDelivery: boolean;
}

export interface FormTemplate extends TemplateContent {
  id: string;
  createdAt: string;
}

const kindOf = (id: string) => `form_template:${id}`;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

const text = (raw: unknown, max: number) => (typeof raw === "string" ? raw.trim().slice(0, max) : "");

/** Keeps only what a template may hold; a blob is data from the network. */
export function cleanTemplate(raw: unknown): TemplateContent | null {
  const t = raw as (Partial<Record<keyof TemplateContent, unknown>> & { v?: unknown }) | null;
  if (!t || t.v !== TEMPLATE_VERSION) return null;
  const questions = cleanQuestions(t.questions);
  const name = text(t.name, TEMPLATE_NAME_MAX);
  if (questions.length === 0 || !name) return null;
  return {
    name,
    title: text(t.title, PORTAL_TITLE_MAX),
    lang: LOCALES.find((l) => l === t.lang) ?? DEFAULT_LOCALE,
    message: text(t.message, PORTAL_MESSAGE_MAX),
    thanks: text(t.thanks, PORTAL_THANKS_MAX),
    questions,
    notifyOnDelivery: t.notifyOnDelivery === true,
  };
}

export async function sealTemplate(
  derivationKey: CryptoKey,
  userId: string,
  id: string,
  content: TemplateContent,
): Promise<Uint8Array> {
  const clean = cleanTemplate({ v: TEMPLATE_VERSION, ...content });
  if (!clean) throw new Error("A template needs a name and at least one question.");
  return sealVaultItem(derivationKey, userId, kindOf(id), encoder.encode(JSON.stringify({ v: TEMPLATE_VERSION, ...clean })));
}

/** Null when it does not open with this vault, or holds something else. */
export async function openTemplate(
  derivationKey: CryptoKey,
  userId: string,
  id: string,
  wire: Uint8Array,
): Promise<TemplateContent | null> {
  const plain = await openVaultItem(derivationKey, userId, kindOf(id), wire);
  if (!plain) return null;
  try {
    return cleanTemplate(JSON.parse(decoder.decode(plain)));
  } catch {
    return null;
  }
}

export type TemplatesResult =
  | { ok: true; templates: FormTemplate[]; max: number; unreadable: number }
  | { ok: false; reason: "locked" };

/** The account's templates, newest first, opened with the vault. */
export async function loadTemplates(userId: string): Promise<TemplatesResult> {
  const [res, derivationKey] = await Promise.all([api.listFormTemplates(), readVaultDerivationKey(userId)]);
  if (!derivationKey) return { ok: false, reason: "locked" };
  const opened = await Promise.all(
    res.templates.map(async (row) => {
      const content = await openTemplate(derivationKey, userId, row.id, base64UrlToBytes(row.ciphertext));
      return content ? { ...content, id: row.id, createdAt: row.createdAt } : null;
    }),
  );
  const templates = opened.filter((t): t is FormTemplate => t !== null);
  return { ok: true, templates, max: res.max, unreadable: opened.length - templates.length };
}

/** Returns false when the vault is locked. Throws what the server refuses. */
export async function saveTemplate(userId: string, content: TemplateContent): Promise<boolean> {
  const derivationKey = await readVaultDerivationKey(userId);
  if (!derivationKey) return false;
  const id = newPortalId();
  const sealed = await sealTemplate(derivationKey, userId, id, content);
  await api.createFormTemplate({ id, ciphertext: bytesToBase64Url(sealed) });
  return true;
}

export async function deleteTemplate(id: string): Promise<void> {
  await api.deleteFormTemplate(id);
}
