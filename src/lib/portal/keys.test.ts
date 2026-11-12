import { describe, expect, it } from "bun:test";
import type { RecipientKeypair } from "$lib/crypto/seal";
import { openSealed, sealTo } from "$lib/crypto/seal";
import {
  createPortalKeys,
  linkKeyFromFragment,
  newPortalId,
  openPortalBundle,
  openPortalKeys,
  portalLink,
  resealPortalKeys,
  sealPortalBundle,
} from "./keys";

const ECDH = { name: "ECDH", namedCurve: "P-256" } as const;

async function member(): Promise<RecipientKeypair> {
  const pair = await crypto.subtle.generateKey(ECDH, true, ["deriveBits"]);
  const pkcs8 = await crypto.subtle.exportKey("pkcs8", pair.privateKey);
  return {
    privateKey: await crypto.subtle.importKey("pkcs8", pkcs8, ECDH, false, ["deriveBits"]),
    publicKey: new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey)),
  };
}

describe("creating a portal", () => {
  it("gives the owner keys that open what a depositor seals", async () => {
    const owner = await member();
    const portal = await createPortalKeys("Jansen Administratie", "owner-1", owner.publicKey);
    expect(portal.id).toMatch(/^[A-Za-z0-9_-]{21}$/);

    // Depositor: has only the link.
    const info = await openPortalBundle(portal.id, portal.linkKey, portal.publicBundle);
    expect(info?.title).toBe("Jansen Administratie");
    expect(info?.keyVersion).toBe(1);
    const depositKey = crypto.getRandomValues(new Uint8Array(32));
    const sealedDeposit = await sealTo(info!.publicKey, depositKey, "deposit-key|x");

    // Owner: opens their member keys, then the deposit.
    const keys = await openPortalKeys(owner, portal.id, "owner-1", 1, portal.sealedKeys);
    expect(keys?.linkKey).toEqual(portal.linkKey);
    const opened = await openSealed(
      { privateKey: keys!.privateKey, publicKey: info!.publicKey },
      sealedDeposit,
      "deposit-key|x",
    );
    expect(opened).toEqual(depositKey);
  });

  it("makes distinct IDs", () => {
    const ids = new Set(Array.from({ length: 200 }, newPortalId));
    expect(ids.size).toBe(200);
  });
});

describe("the public bundle", () => {
  const publicKeyOf = async () => (await member()).publicKey;

  it("does not open with another link key or for another portal", async () => {
    const linkKey = crypto.getRandomValues(new Uint8Array(32));
    const bundle = await sealPortalBundle("portal-a", linkKey, {
      publicKey: await publicKeyOf(),
      title: "Title",
      keyVersion: 1,
    });
    expect(await openPortalBundle("portal-a", linkKey, bundle)).not.toBeNull();
    expect(await openPortalBundle("portal-b", linkKey, bundle)).toBeNull();
    expect(
      await openPortalBundle("portal-a", crypto.getRandomValues(new Uint8Array(32)), bundle),
    ).toBeNull();
  });

  // The attack the link key exists to stop: the server swapping in its own key.
  it("cannot be forged by someone without the link key", async () => {
    const linkKey = crypto.getRandomValues(new Uint8Array(32));
    const real = await sealPortalBundle("portal-a", linkKey, {
      publicKey: await publicKeyOf(),
      title: "Title",
      keyVersion: 1,
    });
    const forged = await sealPortalBundle("portal-a", crypto.getRandomValues(new Uint8Array(32)), {
      publicKey: await publicKeyOf(),
      title: "Title",
      keyVersion: 1,
    });
    expect(await openPortalBundle("portal-a", linkKey, forged)).toBeNull();

    const tampered = real.slice();
    tampered[tampered.length - 5] ^= 1;
    expect(await openPortalBundle("portal-a", linkKey, tampered)).toBeNull();
  });

  it("hides the title's length", async () => {
    const linkKey = crypto.getRandomValues(new Uint8Array(32));
    const publicKey = await publicKeyOf();
    const short = await sealPortalBundle("p", linkKey, { publicKey, title: "A", keyVersion: 1 });
    const longer = await sealPortalBundle("p", linkKey, {
      publicKey,
      title: "A much longer portal title",
      keyVersion: 1,
    });
    expect(short.byteLength).toBe(longer.byteLength);
  });

  it("round-trips a title with non-ASCII characters", async () => {
    const linkKey = crypto.getRandomValues(new Uint8Array(32));
    const bundle = await sealPortalBundle("p", linkKey, {
      publicKey: await publicKeyOf(),
      title: "Boekhouding Ünal & Zoon",
      keyVersion: 3,
    });
    const info = await openPortalBundle("p", linkKey, bundle);
    expect(info?.title).toBe("Boekhouding Ünal & Zoon");
    expect(info?.keyVersion).toBe(3);
  });
});

describe("member keys", () => {
  it("open only for the member, portal and version they were sealed for", async () => {
    const owner = await member();
    const other = await member();
    const portal = await createPortalKeys("T", "owner-1", owner.publicKey);

    expect(await openPortalKeys(other, portal.id, "owner-1", 1, portal.sealedKeys)).toBeNull();
    expect(await openPortalKeys(owner, "another-portal", "owner-1", 1, portal.sealedKeys)).toBeNull();
    expect(await openPortalKeys(owner, portal.id, "someone-else", 1, portal.sealedKeys)).toBeNull();
    expect(await openPortalKeys(owner, portal.id, "owner-1", 2, portal.sealedKeys)).toBeNull();
  });

  it("can be handed to a second member, who then opens deposits too", async () => {
    const owner = await member();
    const invited = await member();
    const portal = await createPortalKeys("T", "owner-1", owner.publicKey);
    const info = await openPortalBundle(portal.id, portal.linkKey, portal.publicBundle);
    const depositKey = crypto.getRandomValues(new Uint8Array(32));
    const sealedDeposit = await sealTo(info!.publicKey, depositKey, "deposit-key|x");

    const forInvited = await resealPortalKeys(
      { keypair: owner, userId: "owner-1" },
      { publicKey: invited.publicKey, userId: "member-2" },
      portal.id,
      1,
      portal.sealedKeys,
    );
    expect(forInvited).not.toBeNull();

    const keys = await openPortalKeys(invited, portal.id, "member-2", 1, forInvited!);
    expect(keys?.linkKey).toEqual(portal.linkKey);
    const opened = await openSealed(
      { privateKey: keys!.privateKey, publicKey: info!.publicKey },
      sealedDeposit,
      "deposit-key|x",
    );
    expect(opened).toEqual(depositKey);

    // Sealed for member-2 only: the owner's copy does not open as theirs.
    expect(await openPortalKeys(invited, portal.id, "owner-1", 1, forInvited!)).toBeNull();
  });

  it("cannot be handed over by someone who is not a member", async () => {
    const owner = await member();
    const stranger = await member();
    const portal = await createPortalKeys("T", "owner-1", owner.publicKey);
    const result = await resealPortalKeys(
      { keypair: stranger, userId: "owner-1" },
      { publicKey: stranger.publicKey, userId: "stranger" },
      portal.id,
      1,
      portal.sealedKeys,
    );
    expect(result).toBeNull();
  });
});

describe("the portal link", () => {
  it("round-trips the link key through the fragment", () => {
    const linkKey = crypto.getRandomValues(new Uint8Array(32));
    const link = portalLink("https://tessil.app", "A".repeat(21), linkKey);
    expect(link.startsWith(`https://tessil.app/p/${"A".repeat(21)}#`)).toBe(true);
    expect(linkKeyFromFragment(new URL(link).hash)).toEqual(linkKey);
  });

  it("rejects fragments that are not a link key", () => {
    expect(linkKeyFromFragment("")).toBeNull();
    expect(linkKeyFromFragment("#short")).toBeNull();
    expect(linkKeyFromFragment("#" + "!".repeat(43))).toBeNull();
  });
});
