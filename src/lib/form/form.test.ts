import { describe, expect, it } from "bun:test";
import { generateKey } from "$lib/crypto/key";
import { encryptFileStream } from "$lib/crypto/streaming";
import { createPortalKeys, openPortalBundle, sealPortalBundle } from "$lib/portal/keys";
import { importVaultDerivationKey } from "$lib/vault/keypair";
import {
  ANSWERS_FILE_NAME,
  ANSWERS_MAX_BYTES,
  ANSWERS_MIME_TYPE,
  answersCsv,
  answerText,
  collectAnswers,
  decodeAnswers,
  decryptAnswers,
  encodeAnswers,
  isAnswersFile,
  leadingAnswer,
  missingAnswers,
  type FormAnswer,
} from "./answers";
import { cleanQuestions, FORM_QUESTIONS_MAX, newQuestionId, questionLimit, type Question } from "./questions";
import { decodeDepositFileName, encodeDepositFileName } from "$lib/portal/deposit";

const QUESTIONS: Question[] = [
  { id: "name01", type: "short", label: "Your name", required: true },
  { id: "about1", type: "long", label: "What is it about?", hint: "A few lines" },
  { id: "pick01", type: "choice", label: "Kind of client", options: ["Private", "Business"], required: true },
  { id: "many01", type: "choices", label: "Documents you have", options: ["ID", "Payslip", "Contract"] },
  { id: "yes001", type: "yesno", label: "Did you file last year?" },
  { id: "date01", type: "date", label: "Date of birth" },
  { id: "file01", type: "file", label: "Copy of your ID", required: true },
];

async function owner() {
  return { userId: "owner-1", derivationKey: await importVaultDerivationKey(crypto.getRandomValues(new Uint8Array(32))) };
}

describe("questions", () => {
  it("makes six-character IDs like checklist items", () => {
    for (let i = 0; i < 50; i++) expect(newQuestionId()).toMatch(/^[a-z0-9]{6}$/);
  });

  it("keeps well-formed questions and drops the rest", () => {
    const cleaned = cleanQuestions([
      ...QUESTIONS,
      { id: "bad", type: "short", label: "Short ID" },
      { id: "nolabl", type: "short", label: "   " },
      { id: "kind01", type: "signature", label: "Unknown type" },
      { id: "name01", type: "short", label: "Duplicate ID" },
      { id: "empty1", type: "choice", label: "No options", options: [] },
      { id: "opts01", type: "choice", label: "Trimmed", options: [" A ", "A", 3, "B"] },
      "not a question",
    ]);
    expect(cleaned.map((q) => q.id)).toEqual([...QUESTIONS.map((q) => q.id), "opts01"]);
    expect(cleaned.at(-1)?.options).toEqual(["A", "B"]);
  });

  it("caps the count and gives Max more than Pro", () => {
    const many = Array.from({ length: 80 }, (_, i) => ({ id: `q${String(i).padStart(5, "0")}`, type: "short", label: "Q" }));
    expect(cleanQuestions(many)).toHaveLength(FORM_QUESTIONS_MAX);
    expect(questionLimit("pro")).toBe(15);
    expect(questionLimit("max")).toBe(50);
  });
});

describe("the bundle of a form", () => {
  it("carries the questions, and a portal has none", async () => {
    const made = await createPortalKeys("Intake", await owner(), "nl", { questions: QUESTIONS });
    const info = await openPortalBundle(made.id, made.linkKey, made.publicBundle);
    expect(info?.questions).toEqual(QUESTIONS);

    const portal = await createPortalKeys("Portal", await owner());
    expect(await openPortalBundle(portal.id, portal.linkKey, portal.publicBundle)).not.toHaveProperty("questions");
  });

  it("holds fifty long questions with a full-size logo", async () => {
    const questions: Question[] = Array.from({ length: 50 }, (_, i) => ({
      id: `q${String(i).padStart(5, "0")}`,
      type: i % 2 ? "choice" : "short",
      label: "Wat is uw situatie op dit moment, en sinds wanneer? ".repeat(2).slice(0, 100),
      hint: "Een korte toelichting helpt ons verder.",
      ...(i % 2 ? { options: ["Ja", "Nee", "Weet ik niet", "Anders"] } : {}),
    }));
    const made = await createPortalKeys("Intake", await owner(), undefined, {
      questions,
      message: "x".repeat(600),
      logo: { type: "image/webp", data: "A".repeat(Math.ceil((16 * 1024) / 3) * 4) },
    });
    expect(made.publicBundle.length).toBeLessThanOrEqual(64 * 1024);
    const info = await openPortalBundle(made.id, made.linkKey, made.publicBundle);
    expect(info?.questions).toHaveLength(50);
  });

  it("still keeps a portal's bundle to the old size", async () => {
    const made = await createPortalKeys("T", await owner());
    await expect(
      sealPortalBundle(made.id, made.linkKey, {
        publicKey: new Uint8Array(65).fill(4),
        title: "T",
        keyVersion: 1,
        message: "x".repeat(600),
        checklist: Array.from({ length: 20 }, (_, i) => ({ id: `item${String(i).padStart(2, "0")}`, label: "文".repeat(80) })),
        logo: { type: "image/webp", data: "A".repeat(Math.ceil((16 * 1024) / 3) * 4) },
        thanks: "文".repeat(300),
        fieldLabel: "文".repeat(40),
      }),
    ).resolves.toBeInstanceOf(Uint8Array);
  });
});

describe("answers", () => {
  const draft = {
    name01: "  Anna de Vries ",
    about1: "Huurgeschil",
    pick01: "Business",
    many01: ["ID", "Contract", "Not an option"],
    yes001: false,
    date01: "1990-04-01",
    file01: ["paspoort.jpg"],
  };

  it("collects them in the form's order with the wording of the moment", () => {
    const answers = collectAnswers(QUESTIONS, draft);
    expect(answers.map((a) => a.id)).toEqual(QUESTIONS.map((q) => q.id));
    expect(answers[0]).toEqual({ id: "name01", type: "short", label: "Your name", value: "Anna de Vries" });
    expect(answers[3].value).toEqual(["ID", "Contract"]);
    expect(answers[4].value).toBe(false);
  });

  it("drops a choice that is not one of the options, and a date that is not a day", () => {
    const answers = collectAnswers(QUESTIONS, { pick01: "Neither", date01: "next week" });
    expect(answers.find((a) => a.id === "pick01")?.value).toBeNull();
    expect(answers.find((a) => a.id === "date01")?.value).toBeNull();
  });

  it("names what is required and missing", () => {
    expect(missingAnswers(QUESTIONS, {}).map((q) => q.id)).toEqual(["name01", "pick01", "file01"]);
    expect(missingAnswers(QUESTIONS, draft)).toEqual([]);
    expect(missingAnswers(QUESTIONS, { ...draft, name01: "   " }).map((q) => q.id)).toEqual(["name01"]);
  });

  it("encode to padded JSON and decode back", () => {
    const answers = collectAnswers(QUESTIONS, draft);
    const bytes = encodeAnswers(answers);
    expect(bytes.length % 1024).toBe(0);
    expect(decodeAnswers(bytes)).toEqual(answers);
    // Short and long answers take the same room.
    expect(encodeAnswers(collectAnswers(QUESTIONS, {})).length).toBe(1024);
  });

  it("refuse what is not an answers file", () => {
    expect(decodeAnswers(new TextEncoder().encode("not json"))).toBeNull();
    expect(decodeAnswers(new TextEncoder().encode(JSON.stringify({ v: 2, answers: [] })))).toBeNull();
    const odd = decodeAnswers(
      new TextEncoder().encode(JSON.stringify({ v: 1, answers: [{ id: "a", type: "short", label: "L", value: 5 }, null] })),
    );
    // An ID no question can have is not kept.
    expect(odd).toEqual([]);
    const twice = decodeAnswers(
      new TextEncoder().encode(
        JSON.stringify({
          v: 1,
          answers: [
            { id: "abc123", type: "short", label: "L", value: "first" },
            { id: "abc123", type: "short", label: "L", value: "second" },
          ],
        }),
      ),
    );
    expect(twice).toEqual([{ id: "abc123", type: "short", label: "L", value: "first" }]);
  });

  it("open with the response's key after streaming encryption", async () => {
    const key = await generateKey();
    const answers = collectAnswers(QUESTIONS, draft);
    const encryptor = encryptFileStream(new File([encodeAnswers(answers) as BlobPart], "answers.json"), key);
    const ciphertext = new Uint8Array(await new Response(encryptor.stream).arrayBuffer());
    expect(await decryptAnswers(ciphertext, key)).toEqual(answers);
    expect(await decryptAnswers(ciphertext, await generateKey())).toBeNull();
  });

  it("are told apart from the visitor's files", () => {
    expect(isAnswersFile({ mimeType: ANSWERS_MIME_TYPE, size: 1024 })).toBe(true);
    expect(isAnswersFile({ mimeType: "application/json", size: 1024 })).toBe(false);
    // A visitor picks the type; a large file under it stays an ordinary file.
    expect(isAnswersFile({ mimeType: ANSWERS_MIME_TYPE, size: ANSWERS_MAX_BYTES + 1 })).toBe(false);
    // Fifty answers of the greatest length fit.
    const full = Array.from({ length: 50 }, (_, i) => ({
      id: `q${i}`,
      type: "long" as const,
      label: "L".repeat(200),
      value: "\u0001".repeat(5000),
    }));
    expect(encodeAnswers(full).length).toBeLessThan(ANSWERS_MAX_BYTES - 64 * 1024);
    // The reserved name cannot come from a visitor's file.
    expect(encodeDepositFileName(ANSWERS_FILE_NAME, null)).not.toBe(ANSWERS_FILE_NAME);
    // Files answer file questions like checklist items.
    expect(decodeDepositFileName(encodeDepositFileName("id.jpg", "file01"))).toEqual({ name: "id.jpg", itemId: "file01" });
  });

  it("read as text and lead a list", () => {
    const answers = collectAnswers(QUESTIONS, draft);
    expect(answers.map((a) => answerText(a))).toEqual([
      "Anna de Vries",
      "Huurgeschil",
      "Business",
      "ID, Contract",
      "No",
      "1990-04-01",
      "paspoort.jpg",
    ]);
    expect(leadingAnswer(answers)).toBe("Anna de Vries");
    expect(leadingAnswer([])).toBeNull();
  });
});

describe("the CSV export", () => {
  it("has a column per question, old questions last, and escapes what a spreadsheet would run", () => {
    const old: FormAnswer = { id: "gone01", type: "short", label: "Removed question", value: "kept" };
    const csv = answersCsv(QUESTIONS.slice(0, 2), [
      {
        reference: "7F3A-91C2",
        receivedAt: "2026-11-16 10:00",
        answers: [
          { id: "name01", type: "short", label: "Your name", value: "=HYPERLINK(\"x\")" },
          { id: "about1", type: "long", label: "What is it about?", value: "two\nlines, with \"quotes\"" },
        ],
      },
      { reference: "0000-0001", receivedAt: "2026-11-15 09:00", answers: [old] },
    ]);
    const lines = csv.replace(/^﻿/, "").split("\r\n");
    expect(lines[0]).toBe("Reference,Received,Your name,What is it about?,Removed question");
    expect(lines[1]).toBe(`7F3A-91C2,2026-11-16 10:00,"'=HYPERLINK(""x"")","two\nlines, with ""quotes""",`);
    expect(lines[2]).toBe("0000-0001,2026-11-15 09:00,,,kept");
  });
});
