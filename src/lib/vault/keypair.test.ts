import { describe, expect, it } from "bun:test";
import {
  PUBLIC_KEY_BYTES,
  USER_PRIVATE_KEY_KIND,
  generateUserKeypair,
  importUserPrivateKey,
  importUserPublicKey,
  importVaultDerivationKey,
  openVaultItem,
  publicKeyFingerprint,
  sealVaultItem,
} from "./keypair";

const kVault = () => importVaultDerivationKey(crypto.getRandomValues(new Uint8Array(32)));
const secret = new TextEncoder().encode("a vault secret");

describe("vault items", () => {
  it("round-trips for the same vault, owner and kind", async () => {
    const key = await kVault();
    const wire = await sealVaultItem(key, "user-a", "note", secret);
    expect(await openVaultItem(key, "user-a", "note", wire)).toEqual(secret);
  });

  it("does not open under another vault key", async () => {
    const wire = await sealVaultItem(await kVault(), "user-a", "note", secret);
    expect(await openVaultItem(await kVault(), "user-a", "note", wire)).toBeNull();
  });

  it("does not open as another owner or another kind", async () => {
    const key = await kVault();
    const wire = await sealVaultItem(key, "user-a", "note", secret);
    expect(await openVaultItem(key, "user-b", "note", wire)).toBeNull();
    expect(await openVaultItem(key, "user-a", "other", wire)).toBeNull();
  });

  it("rejects tampering, truncation and unknown versions", async () => {
    const key = await kVault();
    const wire = await sealVaultItem(key, "user-a", "note", secret);

    const flipped = wire.slice();
    flipped[flipped.length - 1] ^= 1;
    expect(await openVaultItem(key, "user-a", "note", flipped)).toBeNull();

    expect(await openVaultItem(key, "user-a", "note", wire.slice(0, 10))).toBeNull();

    const future = wire.slice();
    future[0] = 2;
    expect(await openVaultItem(key, "user-a", "note", future)).toBeNull();
  });

  it("uses a fresh nonce each time", async () => {
    const key = await kVault();
    const a = await sealVaultItem(key, "user-a", "note", secret);
    const b = await sealVaultItem(key, "user-a", "note", secret);
    expect(a).not.toEqual(b);
  });
});

describe("user keypair", () => {
  it("survives being sealed in the vault and still agrees on a shared secret", async () => {
    const key = await kVault();
    const mine = await generateUserKeypair();
    expect(mine.publicKey).toHaveLength(PUBLIC_KEY_BYTES);

    const wire = await sealVaultItem(key, "user-a", USER_PRIVATE_KEY_KIND, mine.privateKey);
    const opened = await openVaultItem(key, "user-a", USER_PRIVATE_KEY_KIND, wire);
    const myPrivate = await importUserPrivateKey(opened!);

    const theirs = await generateUserKeypair();
    const theirPrivate = await importUserPrivateKey(theirs.privateKey);

    const fromMe = await crypto.subtle.deriveBits(
      { name: "ECDH", public: await importUserPublicKey(theirs.publicKey) },
      myPrivate,
      256,
    );
    const fromThem = await crypto.subtle.deriveBits(
      { name: "ECDH", public: await importUserPublicKey(mine.publicKey) },
      theirPrivate,
      256,
    );
    expect(new Uint8Array(fromMe)).toEqual(new Uint8Array(fromThem));
  });

  it("gives a stable fingerprint that differs per key", async () => {
    const a = await generateUserKeypair();
    const b = await generateUserKeypair();
    const print = await publicKeyFingerprint(a.publicKey);
    expect(print).toMatch(/^([0-9a-f]{4} ){7}[0-9a-f]{4}$/);
    expect(await publicKeyFingerprint(a.publicKey)).toBe(print);
    expect(await publicKeyFingerprint(b.publicKey)).not.toBe(print);
  });
});
