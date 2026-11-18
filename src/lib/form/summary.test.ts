import { describe, expect, it } from "bun:test";
import type { FormAnswer } from "./answers";
import type { Question } from "./questions";
import { pickedOption, share, summarise, SUMMARY_LATEST } from "./summary";

const QUESTIONS: Question[] = [
  { id: "name01", type: "short", label: "Your name" },
  { id: "pick01", type: "choice", label: "Kind of client", options: ["Private", "Business"] },
  { id: "many01", type: "choices", label: "Documents", options: ["ID", "Payslip"] },
  { id: "yes001", type: "yesno", label: "Filed last year?" },
  { id: "file01", type: "file", label: "Copy of your ID" },
];

function response(n: number, values: Record<string, FormAnswer["value"]>, extra: FormAnswer[] = []) {
  return {
    id: `r${n}`,
    createdAt: `2026-11-${String(n).padStart(2, "0")}T10:00:00.000Z`,
    answers: [
      ...QUESTIONS.map((q) => ({ id: q.id, type: q.type, label: q.label, value: values[q.id] ?? null })),
      ...extra,
    ],
  };
}

describe("the summary of a form", () => {
  const responses = [
    response(1, { name01: "Anna", pick01: "Private", many01: ["ID", "Payslip"], yes001: true, file01: ["a.jpg", "b.jpg"] }),
    response(2, { name01: "Bram", pick01: "Business", many01: ["ID"], yes001: false }),
    response(3, { name01: "Cees", pick01: "Private", yes001: false }),
  ];
  const [name, pick, many, yes, file] = summarise(QUESTIONS, responses);

  it("counts each option in the form's order", () => {
    expect(pick.options.map((o) => [o.value, o.count])).toEqual([
      ["Private", 2],
      ["Business", 1],
    ]);
    expect(many.options.map((o) => o.count)).toEqual([2, 1]);
    expect(yes.options.map((o) => [o.value, o.count])).toEqual([
      [true, 1],
      [false, 2],
    ]);
  });

  it("says how many answered and how many did not", () => {
    expect([many.answered, many.skipped]).toEqual([2, 1]);
    expect([file.answered, file.skipped, file.files]).toEqual([1, 2, 2]);
  });

  it("shows the newest text answers first, a handful at most", () => {
    expect(name.latest.map((l) => l.text)).toEqual(["Cees", "Bram", "Anna"]);
    expect(name.latest[0].responseId).toBe("r3");
    const many = Array.from({ length: 9 }, (_, i) => response(i + 1, { name01: `N${i}` }));
    expect(summarise(QUESTIONS, many)[0].latest).toHaveLength(SUMMARY_LATEST);
  });

  it("keeps an option and a question the form no longer has, marked as old", () => {
    const old = [
      response(4, { pick01: "Charity" }, [{ id: "gone01", type: "yesno", label: "Old question", value: true }]),
      response(5, {}),
    ];
    const all = summarise(QUESTIONS, old);
    expect(all[1].options.at(-1)).toEqual({ value: "Charity", count: 1, current: false });
    const gone = all.at(-1)!;
    expect(gone).toMatchObject({ id: "gone01", label: "Old question", current: false, answered: 1, skipped: 1 });
  });

  it("uses the form's wording, not the response's", () => {
    const reworded = response(1, { pick01: "Private" });
    reworded.answers[1].label = "Something the sender made up";
    expect(summarise(QUESTIONS, [reworded])[1].label).toBe("Kind of client");
  });

  it("counts a response without readable answers as not answered", () => {
    const [first] = summarise(QUESTIONS, [{ id: "x", createdAt: "2026-11-01T00:00:00.000Z", answers: null }]);
    expect([first.answered, first.skipped]).toEqual([0, 1]);
  });

  it("finds the responses that picked an option", () => {
    expect(responses.filter((r) => pickedOption(r.answers, "many01", "ID")).map((r) => r.id)).toEqual(["r1", "r2"]);
    expect(responses.filter((r) => pickedOption(r.answers, "yes001", false)).map((r) => r.id)).toEqual(["r2", "r3"]);
    expect(pickedOption(null, "yes001", true)).toBe(false);
  });

  it("does not count an answer of another kind than its question", () => {
    const odd = response(1, {});
    // A sender claims text where the form asks yes or no, and a list where it asks one choice.
    odd.answers[3] = { id: "yes001", type: "short", label: "x", value: "true" };
    odd.answers[1] = { id: "pick01", type: "choices", label: "x", value: ["Private", "Made up"] };
    const all = summarise(QUESTIONS, [odd]);
    expect(all[3].options.map((o) => [o.value, o.count])).toEqual([
      [true, 0],
      [false, 0],
    ]);
    expect(all[1].options.map((o) => o.count)).toEqual([0, 0]);
    expect(all[1].answered).toBe(0);
  });

  it("keeps what a sender can add within bounds", () => {
    // Fifty made-up options on a real question, and two hundred made-up questions.
    const flood = Array.from({ length: 10 }, (_, n) =>
      response(n + 1, { many01: Array.from({ length: 20 }, (_, i) => `made up ${n}-${i}`) }, [
        ...Array.from({ length: 20 }, (_, i) => ({
          id: `x${String(n).padStart(2, "0")}${String(i).padStart(3, "0")}`,
          type: "yesno" as const,
          label: "Made up",
          value: true,
        })),
      ]),
    );
    const all = summarise(QUESTIONS, flood);
    expect(all.length).toBeLessThanOrEqual(QUESTIONS.length + 50);
    expect(all[2].options.filter((o) => !o.current).length).toBeLessThanOrEqual(20);
  });

  it("rounds shares and survives no responses", () => {
    expect(share(1, 3)).toBe(33);
    expect(share(0, 0)).toBe(0);
  });
});
