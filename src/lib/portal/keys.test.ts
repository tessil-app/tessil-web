import { describe, expect, it } from "bun:test";
import type { RecipientKeypair } from "$lib/crypto/seal";
import { openSealed, sealTo } from "$lib/crypto/seal";
import { importVaultDerivationKey } from "$lib/vault/keypair";
import {
  acceptPortalKeys,
  accessTokenFor,
  createPortalKeys,
  depositTokenFor,
  handPortalKeys,
  linkKeyFromFragment,
  newPortalId,
  openPortalBundle,
  openPortalKeys,
  portalLink,
  sealPortalBundle,
  type MemberVault,
} from "./keys";

const ECDH = { name: "ECDH", namedCurve: "P-256" } as const;

type Member = MemberVault & { keypair: RecipientKeypair };

async function member(userId: string): Promise<Member> {
  const pair = await crypto.subtle.generateKey(ECDH, true, ["deriveBits"]);
  const pkcs8 = await crypto.subtle.exportKey("pkcs8", pair.privateKey);
  return {
    userId,
    derivationKey: await importVaultDerivationKey(crypto.getRandomValues(new Uint8Array(32))),
    keypair: {
      privateKey: await crypto.subtle.importKey("pkcs8", pkcs8, ECDH, false, ["deriveBits"]),
      publicKey: new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey)),
    },
  };
}

const publicOf = (m: Member) => ({ userId: m.userId, publicKey: m.keypair.publicKey });

describe("creating a portal", () => {
  it("gives the owner keys that open what a depositor seals", async () => {
    const owner = await member("owner-1");
    const portal = await createPortalKeys("Jansen Administratie", owner);
    expect(portal.id).toMatch(/^[A-Za-z0-9_-]{21}$/);

    // Depositor: has only the link.
    const info = await openPortalBundle(portal.id, portal.linkKey, portal.publicBundle);
    expect(info?.title).toBe("Jansen Administratie");
    expect(info?.keyVersion).toBe(1);
    const depositKey = crypto.getRandomValues(new Uint8Array(32));
    const sealedDeposit = await sealTo(info!.publicKey, depositKey, "deposit-key|x");

    // Owner: opens their kept keys, then the deposit.
    const keys = await openPortalKeys(owner, portal.id, 1, portal.sealedKeys);
    expect(keys?.linkKey).toEqual(portal.linkKey);
    const opened = await openSealed(
      { privateKey: keys!.privateKey, publicKey: info!.publicKey },
      sealedDeposit,
      "deposit-key|x",
    );
    expect(opened).toEqual(depositKey);
  });

  it("derives a deposit token that is stable and does not expose the link key", async () => {
    const owner = await member("owner-1");
    const portal = await createPortalKeys("T", owner);
    expect(portal.depositToken).toHaveLength(32);
    expect(await depositTokenFor(portal.linkKey)).toEqual(portal.depositToken);
    expect(portal.depositToken).not.toEqual(portal.linkKey);
    // The token must not work as the link key.
    expect(await openPortalBundle(portal.id, portal.depositToken, portal.publicBundle)).toBeNull();
  });

  it("makes distinct IDs", () => {
    const ids = new Set(Array.from({ length: 200 }, newPortalId));
    expect(ids.size).toBe(200);
  });
});

describe("the public bundle", () => {
  const publicKeyOf = async () => (await member("x")).keypair.publicKey;

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

  it("carries the owner's language choice, and ignores one it does not know", async () => {
    const linkKey = crypto.getRandomValues(new Uint8Array(32));
    const publicKey = await publicKeyOf();
    const dutch = await sealPortalBundle("p", linkKey, { publicKey, title: "T", keyVersion: 1, lang: "nl" });
    expect((await openPortalBundle("p", linkKey, dutch))?.lang).toBe("nl");

    const none = await sealPortalBundle("p", linkKey, { publicKey, title: "T", keyVersion: 1 });
    expect((await openPortalBundle("p", linkKey, none))?.lang).toBeUndefined();

    const odd = await sealPortalBundle("p", linkKey, {
      publicKey,
      title: "T",
      keyVersion: 1,
      lang: "xx" as "nl",
    });
    const opened = await openPortalBundle("p", linkKey, odd);
    expect(opened?.title).toBe("T");
    expect(opened?.lang).toBeUndefined();
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
  it("open only for the member, portal and version they were kept for", async () => {
    const owner = await member("owner-1");
    const portal = await createPortalKeys("T", owner);

    expect(await openPortalKeys(await member("owner-1"), portal.id, 1, portal.sealedKeys)).toBeNull();
    expect(await openPortalKeys(owner, "another-portal", 1, portal.sealedKeys)).toBeNull();
    expect(await openPortalKeys({ ...owner, userId: "x" }, portal.id, 1, portal.sealedKeys)).toBeNull();
    expect(await openPortalKeys(owner, portal.id, 2, portal.sealedKeys)).toBeNull();
  });

  // The server knows the owner's public key. It must not be able to plant
  // keys of its own in the owner's portal list.
  it("cannot be planted by someone who only knows the member's public key", async () => {
    const owner = await member("owner-1");
    const portal = await createPortalKeys("T", owner);

    const pair = await crypto.subtle.generateKey(ECDH, true, ["deriveBits"]);
    const forgedMaterial = new Uint8Array([
      ...crypto.getRandomValues(new Uint8Array(32)),
      ...new Uint8Array(await crypto.subtle.exportKey("pkcs8", pair.privateKey)),
    ]);
    const anonymous = await sealTo(owner.keypair.publicKey, forgedMaterial, "anything");
    for (const form of [0x4b, 0x48]) {
      const planted = new Uint8Array([form, ...anonymous]);
      expect(await openPortalKeys(owner, portal.id, 1, planted)).toBeNull();
      expect(
        await acceptPortalKeys(owner, publicOf(await member("someone")), portal.id, 1, planted),
      ).toBeNull();
    }
  });
});

describe("handing keys to a second member", () => {
  it("lets the invited member open deposits and keep their own copy", async () => {
    const owner = await member("owner-1");
    const invited = await member("member-2");
    const portal = await createPortalKeys("T", owner);
    const info = await openPortalBundle(portal.id, portal.linkKey, portal.publicBundle);
    const depositKey = crypto.getRandomValues(new Uint8Array(32));
    const sealedDeposit = await sealTo(info!.publicKey, depositKey, "deposit-key|x");

    const handed = await handPortalKeys(owner, publicOf(invited), portal.id, 1, portal.sealedKeys);
    expect(handed).not.toBeNull();
    // A handed copy is not a kept one: it cannot be opened without checking the sender.
    expect(await openPortalKeys(invited, portal.id, 1, handed!)).toBeNull();

    const accepted = await acceptPortalKeys(invited, publicOf(owner), portal.id, 1, handed!);
    expect(accepted?.keys.linkKey).toEqual(portal.linkKey);
    const opened = await openSealed(
      { privateKey: accepted!.keys.privateKey, publicKey: info!.publicKey },
      sealedDeposit,
      "deposit-key|x",
    );
    expect(opened).toEqual(depositKey);

    // From now on the invited member opens their own kept copy.
    const later = await openPortalKeys(invited, portal.id, 1, accepted!.kept);
    expect(later?.linkKey).toEqual(portal.linkKey);
  });

  it("is refused when it did not come from the named sender", async () => {
    const owner = await member("owner-1");
    const invited = await member("member-2");
    const impostor = await member("owner-1");
    const portal = await createPortalKeys("T", owner);
    const handed = await handPortalKeys(owner, publicOf(invited), portal.id, 1, portal.sealedKeys);

    expect(await acceptPortalKeys(invited, publicOf(impostor), portal.id, 1, handed!)).toBeNull();
    // Nor for a different recipient, portal or version.
    const third = await member("member-3");
    expect(await acceptPortalKeys(third, publicOf(owner), portal.id, 1, handed!)).toBeNull();
    expect(await acceptPortalKeys(invited, publicOf(owner), "another-portal", 1, handed!)).toBeNull();
    expect(await acceptPortalKeys(invited, publicOf(owner), portal.id, 2, handed!)).toBeNull();
  });

  it("cannot be done by someone who does not hold the keys", async () => {
    const owner = await member("owner-1");
    const stranger = await member("stranger");
    const portal = await createPortalKeys("T", owner);
    expect(
      await handPortalKeys(stranger, publicOf(stranger), portal.id, 1, portal.sealedKeys),
    ).toBeNull();
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

describe("portal options", () => {
  it("round-trips the message, thank-you note and extra field", async () => {
    const owner = await member("owner-1");
    const portal = await createPortalKeys("T", owner, "nl", {
      message: "  Send before 1 April.\nThanks  ",
      thanks: "You will hear from us.",
      fieldLabel: "Client number",
    });
    const info = await openPortalBundle(portal.id, portal.linkKey, portal.publicBundle);
    expect(info?.message).toBe("Send before 1 April.\nThanks");
    expect(info?.thanks).toBe("You will hear from us.");
    expect(info?.fieldLabel).toBe("Client number");
    expect(info?.lang).toBe("nl");
  });

  it("leaves a portal without options as it was", async () => {
    const owner = await member("owner-1");
    const portal = await createPortalKeys("T", owner);
    const info = await openPortalBundle(portal.id, portal.linkKey, portal.publicBundle);
    expect(info).not.toHaveProperty("message");
    expect(info).not.toHaveProperty("thanks");
    expect(info).not.toHaveProperty("fieldLabel");
  });

  it("holds the longest list and texts together with a full-size logo", async () => {
    const owner = await member("owner-1");
    const checklist = Array.from({ length: 20 }, (_, i) => ({
      id: `item${String(i).padStart(2, "0")}`,
      label: "\u6587".repeat(80),
    }));
    const portal = await createPortalKeys("\u6587".repeat(80), owner, undefined, {
      checklist,
      message: "\u6587".repeat(600),
      thanks: "\u6587".repeat(300),
      fieldLabel: "\u6587".repeat(40),
      logo: { type: "image/webp", data: "A".repeat(Math.ceil((16 * 1024) / 3) * 4) },
    });
    expect(portal.publicBundle.length).toBeLessThanOrEqual(32 * 1024);
    const info = await openPortalBundle(portal.id, portal.linkKey, portal.publicBundle);
    expect(info?.checklist).toHaveLength(20);
    expect(info?.logo?.data.length).toBeGreaterThan(21_000);
  });

  it("carries a small logo and drops anything that is not a known bitmap", async () => {
    const owner = await member("owner-1");
    const logo = { type: "image/png" as const, data: btoa("not really a png") };
    const portal = await createPortalKeys("T", owner, undefined, { logo });
    const info = await openPortalBundle(portal.id, portal.linkKey, portal.publicBundle);
    expect(info?.logo).toEqual(logo);

    for (const bad of [
      { type: "image/svg+xml", data: btoa("<svg/>") },
      { type: "image/png", data: "not base64!" },
      { type: "image/png", data: "A".repeat(30_000) },
    ]) {
      const made = await createPortalKeys("T", owner, undefined, { logo: bad as never });
      expect(await openPortalBundle(made.id, made.linkKey, made.publicBundle)).not.toHaveProperty("logo");
    }
  });

  it("lists files sent back, and drops entries that are not a transfer and a key", async () => {
    const owner = await member("owner-1");
    const good = { id: "A".repeat(21), key: "k".repeat(43) };
    const portal = await createPortalKeys("T", owner, undefined, { twoWay: true });
    const bundle = await sealPortalBundle(portal.id, portal.linkKey, {
      ...(await openPortalBundle(portal.id, portal.linkKey, portal.publicBundle))!,
      returns: [good, good, { id: "short", key: "k".repeat(43) }, { id: "B".repeat(21), key: "x" }] as never,
    });
    const info = await openPortalBundle(portal.id, portal.linkKey, bundle);
    expect(info?.twoWay).toBe(true);
    expect(info?.returns).toEqual([good]);
  });
});

describe("a portal's password token", () => {
  it("is the same for the same portal, link and password, and differs when any changes", async () => {
    const link = new Uint8Array(32).fill(1);
    const other = new Uint8Array(32).fill(2);
    const token = await accessTokenFor("portal-a", link, "tulips-2025");
    expect(token).toHaveLength(32);
    expect(await accessTokenFor("portal-a", link, "tulips-2025")).toEqual(token);
    expect(await accessTokenFor("portal-a", link, "tulips-2026")).not.toEqual(token);
    expect(await accessTokenFor("portal-b", link, "tulips-2025")).not.toEqual(token);
    expect(await accessTokenFor("portal-a", other, "tulips-2025")).not.toEqual(token);
  });
});
