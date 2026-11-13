import { describe, expect, it } from "bun:test";
import { unwrapVaultKeyWithPasskey, wrapVaultKeyForPasskey } from "./passkeyUnlock";

const prf = () => crypto.getRandomValues(new Uint8Array(32));
const kVault = crypto.getRandomValues(new Uint8Array(32));

describe("wrapping the vault key for a passkey", () => {
  it("round-trips with the same PRF output, account and passkey", async () => {
    const out = prf();
    const wrap = await wrapVaultKeyForPasskey(out, "user-a", "passkey-1", kVault);
    expect(wrap).toHaveLength(60);
    expect(await unwrapVaultKeyWithPasskey(out, "user-a", "passkey-1", wrap)).toEqual(kVault);
  });

  it("does not open with another passkey's PRF output", async () => {
    const wrap = await wrapVaultKeyForPasskey(prf(), "user-a", "passkey-1", kVault);
    expect(await unwrapVaultKeyWithPasskey(prf(), "user-a", "passkey-1", wrap)).toBeNull();
  });

  // The server stores the wraps. It must not be able to move one.
  it("does not open when moved to another passkey or account", async () => {
    const out = prf();
    const wrap = await wrapVaultKeyForPasskey(out, "user-a", "passkey-1", kVault);
    expect(await unwrapVaultKeyWithPasskey(out, "user-a", "passkey-2", wrap)).toBeNull();
    expect(await unwrapVaultKeyWithPasskey(out, "user-b", "passkey-1", wrap)).toBeNull();
  });

  it("rejects tampering and wrong sizes", async () => {
    const out = prf();
    const wrap = await wrapVaultKeyForPasskey(out, "user-a", "passkey-1", kVault);
    const flipped = wrap.slice();
    flipped[20] ^= 1;
    expect(await unwrapVaultKeyWithPasskey(out, "user-a", "passkey-1", flipped)).toBeNull();
    expect(await unwrapVaultKeyWithPasskey(out, "user-a", "passkey-1", wrap.slice(0, 59))).toBeNull();
  });

  it("uses a fresh nonce each time", async () => {
    const out = prf();
    const a = await wrapVaultKeyForPasskey(out, "user-a", "passkey-1", kVault);
    const b = await wrapVaultKeyForPasskey(out, "user-a", "passkey-1", kVault);
    expect(a).not.toEqual(b);
  });
});
