import { describe, expect, it } from "bun:test";
import { generateKey } from "./key";
import {
  deriveTransferPassword,
  isProtectedFragment,
  protectTransferKey,
  saltFromFragment,
  unwrapTransferKey,
} from "./transferPassword";

async function rawKey(key: CryptoKey): Promise<string> {
  return Buffer.from(await crypto.subtle.exportKey("raw", key)).toString("hex");
}

describe("transfer password", () => {
  it("round-trips the key with the right password", async () => {
    const key = await generateKey();
    const { fragment, salt, verifier } = await protectTransferKey(key, "correct horse");

    expect(isProtectedFragment(fragment)).toBe(true);
    expect(saltFromFragment(fragment)).toBe(salt);

    const derived = await deriveTransferPassword("correct horse", salt);
    expect(derived.verifier).toBe(verifier);
    const opened = await unwrapTransferKey(fragment, derived.wrappingKey);
    expect(await rawKey(opened)).toBe(await rawKey(key));
  });

  it("rejects a wrong password and gives it a different verifier", async () => {
    const key = await generateKey();
    const { fragment, salt, verifier } = await protectTransferKey(key, "correct horse");

    const wrong = await deriveTransferPassword("battery staple", salt);
    expect(wrong.verifier).not.toBe(verifier);
    await expect(unwrapTransferKey(fragment, wrong.wrappingKey)).rejects.toThrow();
  });

  it("never puts the password or the wrap key in what the server receives", async () => {
    const key = await generateKey();
    const password = "correct horse";
    const { fragment, salt, verifier } = await protectTransferKey(key, password);

    expect(verifier).not.toContain(password);
    // The verifier alone must not open the link.
    const fromVerifier = await crypto.subtle.importKey(
      "raw",
      Buffer.from(verifier, "base64url"),
      { name: "AES-KW", length: 256 },
      false,
      ["unwrapKey"],
    );
    await expect(unwrapTransferKey(fragment, fromVerifier)).rejects.toThrow();
    expect(salt).toHaveLength(22);
  });

  it("uses a fresh salt per transfer", async () => {
    const key = await generateKey();
    const a = await protectTransferKey(key, "correct horse");
    const b = await protectTransferKey(key, "correct horse");
    expect(a.salt).not.toBe(b.salt);
    expect(a.verifier).not.toBe(b.verifier);
  });
});
