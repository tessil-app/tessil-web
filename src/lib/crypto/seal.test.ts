import { describe, expect, it } from "bun:test";
import { Aes256Gcm, CipherSuite, DhkemP256HkdfSha256, HkdfSha256 } from "@hpke/core";
import { openSealed, sealTo, type RecipientKeypair } from "./seal";

const ECDH = { name: "ECDH", namedCurve: "P-256" } as const;

// Mirrors how a vault holds a key: the private half is not extractable.
async function recipient(): Promise<RecipientKeypair> {
  const pair = await crypto.subtle.generateKey(ECDH, true, ["deriveBits"]);
  const pkcs8 = await crypto.subtle.exportKey("pkcs8", pair.privateKey);
  return {
    privateKey: await crypto.subtle.importKey("pkcs8", pkcs8, ECDH, false, ["deriveBits"]),
    publicKey: new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey)),
  };
}

const secret = crypto.getRandomValues(new Uint8Array(32));

function hex(s: string): Uint8Array {
  return new Uint8Array(s.match(/../g)!.map((b) => parseInt(b, 16)));
}

describe("sealing to a public key", () => {
  it("opens with the matching private key and context", async () => {
    const me = await recipient();
    const wire = await sealTo(me.publicKey, secret, "portal-key|p1|u1|1");
    expect(wire[0]).toBe(1);
    expect(wire).toHaveLength(1 + 65 + 32 + 16);
    expect(await openSealed(me, wire, "portal-key|p1|u1|1")).toEqual(secret);
  });

  it("does not open with someone else's key", async () => {
    const me = await recipient();
    const other = await recipient();
    const wire = await sealTo(me.publicKey, secret, "ctx");
    expect(await openSealed(other, wire, "ctx")).toBeNull();
  });

  it("does not open under a different context", async () => {
    const me = await recipient();
    const wire = await sealTo(me.publicKey, secret, "portal-key|p1|u1|1");
    expect(await openSealed(me, wire, "portal-key|p2|u1|1")).toBeNull();
    expect(await openSealed(me, wire, "deposit-key|p1|u1|1")).toBeNull();
  });

  it("rejects tampering, truncation and unknown versions", async () => {
    const me = await recipient();
    const wire = await sealTo(me.publicKey, secret, "ctx");

    const flipped = wire.slice();
    flipped[flipped.length - 1] ^= 1;
    expect(await openSealed(me, flipped, "ctx")).toBeNull();

    const badEnc = wire.slice();
    badEnc[10] ^= 1;
    expect(await openSealed(me, badEnc, "ctx")).toBeNull();

    expect(await openSealed(me, wire.slice(0, 40), "ctx")).toBeNull();

    const future = wire.slice();
    future[0] = 9;
    expect(await openSealed(me, future, "ctx")).toBeNull();
  });

  it("produces a different result each time", async () => {
    const me = await recipient();
    const a = await sealTo(me.publicKey, secret, "ctx");
    const b = await sealTo(me.publicKey, secret, "ctx");
    expect(a).not.toEqual(b);
  });

  it("refuses a public key that is not on the curve", async () => {
    const offCurve = new Uint8Array(65).fill(1);
    offCurve[0] = 0x04;
    await expect(sealTo(offCurve, secret, "ctx")).rejects.toThrow();
  });
});

describe("sealing with a known sender", () => {
  it("opens only when the named sender sealed it", async () => {
    const me = await recipient();
    const sender = await recipient();
    const impostor = await recipient();
    const wire = await sealTo(me.publicKey, secret, "ctx", sender);
    expect(wire[0]).toBe(2);

    expect(await openSealed(me, wire, "ctx", sender.publicKey)).toEqual(secret);
    expect(await openSealed(me, wire, "ctx", impostor.publicKey)).toBeNull();
  });

  // The server knows every public key. Without sender authentication it
  // could seal contents of its own to any user.
  it("refuses an anonymous seal where a sender is required, and the reverse", async () => {
    const me = await recipient();
    const sender = await recipient();

    const anonymous = await sealTo(me.publicKey, secret, "ctx");
    expect(await openSealed(me, anonymous, "ctx", sender.publicKey)).toBeNull();

    const relabelled = anonymous.slice();
    relabelled[0] = 2;
    expect(await openSealed(me, relabelled, "ctx", sender.publicKey)).toBeNull();

    const authenticated = await sealTo(me.publicKey, secret, "ctx", sender);
    expect(await openSealed(me, authenticated, "ctx")).toBeNull();
  });
});

// RFC 9180 appendix A.3.1: DHKEM(P-256, HKDF-SHA256), HKDF-SHA256,
// AES-128-GCM, base mode. Pins the pinned library to the standard, so an
// upgrade that changed the key schedule would fail here.
describe("the HPKE library against RFC 9180 test vector A.3.1", () => {
  it("decrypts the published first ciphertext", async () => {
    const { Aes128Gcm } = await import("@hpke/core");
    const vectorSuite = new CipherSuite({
      kem: new DhkemP256HkdfSha256(),
      kdf: new HkdfSha256(),
      aead: new Aes128Gcm(),
    });
    expect(new Aes256Gcm().keySize).toBe(32);

    const skRm = hex("f3ce7fdae57e1a310d87f1ebbde6f328be0a99cdbcadf4d6589cf29de4b8ffd2");
    const enc = hex(
      "04a92719c6195d5085104f469a8b9814d5838ff72b60501e2c4466e5e67b325ac98536d7b61a1af4b78e5b7f951c0900be863c403ce65c9bfcb9382657222d18c4",
    );
    const info = hex("4f6465206f6e2061204772656369616e2055726e");
    const aad = hex("436f756e742d30");
    const ct = hex(
      "5ad590bb8baa577f8619db35a36311226a896e7342a6d836d8b7bcd2f20b6c7f9076ac232e3ab2523f39513434",
    );

    const recipientKey = await vectorSuite.kem.importKey("raw", skRm.buffer as ArrayBuffer, false);
    const ctx = await vectorSuite.createRecipientContext({
      recipientKey,
      enc: enc.buffer as ArrayBuffer,
      info: info.buffer as ArrayBuffer,
    });
    const pt = await ctx.open(ct.buffer as ArrayBuffer, aad.buffer as ArrayBuffer);
    expect(new TextDecoder().decode(pt)).toBe("Beauty is truth, truth beauty");
  });
});
