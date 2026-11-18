import { describe, expect, it } from "bun:test";
import { importVaultDerivationKey } from "$lib/vault/keypair";
import type { Question } from "./questions";
import { cleanTemplate, openTemplate, sealTemplate, TEMPLATE_NAME_MAX, type TemplateContent } from "./templates";

const QUESTIONS: Question[] = [
  { id: "name01", type: "short", label: "Your name", required: true },
  { id: "pick01", type: "choice", label: "Kind of client", options: ["Private", "Business"] },
];
const CONTENT: TemplateContent = {
  name: "Client intake",
  title: "New client intake",
  lang: "nl",
  message: "A few questions first.",
  thanks: "Thank you.",
  questions: QUESTIONS,
  notifyOnDelivery: true,
};

const vault = () => importVaultDerivationKey(crypto.getRandomValues(new Uint8Array(32)));

describe("a form template", () => {
  it("opens again with the same vault, owner and ID", async () => {
    const key = await vault();
    const sealed = await sealTemplate(key, "user-1", "tpl-aaaaaaaaaaaaaaaaa", CONTENT);
    expect(await openTemplate(key, "user-1", "tpl-aaaaaaaaaaaaaaaaa", sealed)).toEqual(CONTENT);
  });

  it("does not open for another vault, owner or ID", async () => {
    const key = await vault();
    const sealed = await sealTemplate(key, "user-1", "tpl-aaaaaaaaaaaaaaaaa", CONTENT);
    expect(await openTemplate(await vault(), "user-1", "tpl-aaaaaaaaaaaaaaaaa", sealed)).toBeNull();
    expect(await openTemplate(key, "user-2", "tpl-aaaaaaaaaaaaaaaaa", sealed)).toBeNull();
    // The server cannot hand one template back under another's ID.
    expect(await openTemplate(key, "user-1", "tpl-bbbbbbbbbbbbbbbbb", sealed)).toBeNull();
  });

  it("does not say what is in it", async () => {
    const sealed = await sealTemplate(await vault(), "user-1", "tpl-aaaaaaaaaaaaaaaaa", CONTENT);
    const seen = new TextDecoder().decode(sealed);
    expect(seen).not.toContain("Client intake");
    expect(seen).not.toContain("Your name");
  });

  it("needs a name and a question, and trims what is too long", () => {
    expect(cleanTemplate({ v: 1, ...CONTENT, name: "  " })).toBeNull();
    expect(cleanTemplate({ v: 1, ...CONTENT, questions: [] })).toBeNull();
    expect(cleanTemplate({ v: 2, ...CONTENT })).toBeNull();
    expect(cleanTemplate(null)).toBeNull();
    const long = cleanTemplate({ v: 1, ...CONTENT, name: "n".repeat(200), lang: "xx", notifyOnDelivery: "yes" });
    expect(long?.name).toHaveLength(TEMPLATE_NAME_MAX);
    expect(long?.lang).toBe("en");
    expect(long?.notifyOnDelivery).toBe(false);
  });

  it("refuses to seal a template without a question", async () => {
    await expect(sealTemplate(await vault(), "user-1", "tpl-aaaaaaaaaaaaaaaaa", { ...CONTENT, questions: [] })).rejects.toThrow();
  });
});
