// Portal key material, made and used only in the browser.
// See docs/adr/0014-portal-keys-and-vault-items.md.
//
// A portal has:
//   - a keypair. Depositors seal each deposit's key to the public half.
//   - a link key, carried in the portal link's fragment. It encrypts the
//     public bundle (public key + title), so the server can neither read
//     the title nor hand a depositor a public key of its own.
//
// Each member holds the private key and the link key, sealed to their own
// public key. Everything is bound to the portal's ID, which is why the
// browser picks the ID before anything is sent.

import { openSealed, sealTo, type RecipientKeypair } from "$lib/crypto/seal";
import { base64UrlToBytes, bytesToBase64Url } from "$lib/vault/crypto";

const ECDH = { name: "ECDH", namedCurve: "P-256" } as const;
const LINK_KEY_BYTES = 32;
const IV_BYTES = 12;
const BUNDLE_VERSION = 1;
const BUNDLE_CONTEXT = "tessil/portal-bundle/v1";
const BUNDLE_PAD = 128;
const ID_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";

export const PORTAL_TITLE_MAX = 80;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function buffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

/** 21 URL-safe characters, the same shape as every other ID in the app. */
export function newPortalId(): string {
  // 64 symbols, so masking six bits is unbiased.
  return Array.from(crypto.getRandomValues(new Uint8Array(21)), (b) => ID_ALPHABET[b & 63]).join("");
}

// ─── public bundle ──────────────────────────────────────────────────────────

export interface PortalPublicInfo {
  /** Raw uncompressed P-256 point. */
  publicKey: Uint8Array;
  title: string;
  keyVersion: number;
}

async function bundleKey(linkKey: Uint8Array): Promise<CryptoKey> {
  const master = await crypto.subtle.importKey("raw", buffer(linkKey), "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(0), info: encoder.encode(BUNDLE_CONTEXT) },
    master,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

function bundleAad(portalId: string): ArrayBuffer {
  return buffer(encoder.encode(`${BUNDLE_CONTEXT}|${portalId}`));
}

/** version(1) || iv(12) || AES-256-GCM(padded JSON). */
export async function sealPortalBundle(
  portalId: string,
  linkKey: Uint8Array,
  info: PortalPublicInfo,
): Promise<Uint8Array> {
  const json = JSON.stringify({
    publicKey: bytesToBase64Url(info.publicKey),
    title: info.title,
    keyVersion: info.keyVersion,
  });
  // Padded with spaces so the stored size does not give away the title's length.
  const raw = encoder.encode(json);
  const padded = new Uint8Array(Math.ceil(raw.length / BUNDLE_PAD) * BUNDLE_PAD).fill(0x20);
  padded.set(raw);

  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: buffer(iv), additionalData: bundleAad(portalId) },
    await bundleKey(linkKey),
    buffer(padded),
  );
  const out = new Uint8Array(1 + IV_BYTES + ciphertext.byteLength);
  out[0] = BUNDLE_VERSION;
  out.set(iv, 1);
  out.set(new Uint8Array(ciphertext), 1 + IV_BYTES);
  return out;
}

/**
 * Returns null when the bundle was not made for this portal with this link
 * key. A depositor must treat that as "do not upload": the public key
 * cannot be trusted.
 */
export async function openPortalBundle(
  portalId: string,
  linkKey: Uint8Array,
  bundle: Uint8Array,
): Promise<PortalPublicInfo | null> {
  if (bundle.byteLength <= 1 + IV_BYTES || bundle[0] !== BUNDLE_VERSION) return null;
  try {
    const plaintext = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: buffer(bundle.subarray(1, 1 + IV_BYTES)),
        additionalData: bundleAad(portalId),
      },
      await bundleKey(linkKey),
      buffer(bundle.subarray(1 + IV_BYTES)),
    );
    const parsed = JSON.parse(decoder.decode(plaintext)) as {
      publicKey?: unknown;
      title?: unknown;
      keyVersion?: unknown;
    };
    if (
      typeof parsed.publicKey !== "string" ||
      typeof parsed.title !== "string" ||
      typeof parsed.keyVersion !== "number"
    ) {
      return null;
    }
    const publicKey = base64UrlToBytes(parsed.publicKey);
    // Refuses anything that is not a point on the curve.
    await crypto.subtle.importKey("raw", buffer(publicKey), ECDH, true, []);
    return { publicKey, title: parsed.title, keyVersion: parsed.keyVersion };
  } catch {
    return null;
  }
}

// ─── member keys ────────────────────────────────────────────────────────────

function memberContext(portalId: string, userId: string, keyVersion: number): string {
  return `portal-keys|${portalId}|${userId}|${keyVersion}`;
}

export interface PortalKeys {
  linkKey: Uint8Array;
  /** Usable for opening deposits; not readable by page script. */
  privateKey: CryptoKey;
}

/** Seals a portal's private key and link key for one member. */
export async function sealPortalKeysFor(
  memberPublicKey: Uint8Array,
  portalId: string,
  memberUserId: string,
  keyVersion: number,
  linkKey: Uint8Array,
  privateKeyPkcs8: Uint8Array,
): Promise<Uint8Array> {
  const plaintext = new Uint8Array(LINK_KEY_BYTES + privateKeyPkcs8.byteLength);
  plaintext.set(linkKey, 0);
  plaintext.set(privateKeyPkcs8, LINK_KEY_BYTES);
  try {
    return await sealTo(memberPublicKey, plaintext, memberContext(portalId, memberUserId, keyVersion));
  } finally {
    plaintext.fill(0);
  }
}

/** Null when these keys were not sealed for this member, portal and version. */
export async function openPortalKeys(
  member: RecipientKeypair,
  portalId: string,
  memberUserId: string,
  keyVersion: number,
  sealedKeys: Uint8Array,
): Promise<PortalKeys | null> {
  const plaintext = await openSealed(member, sealedKeys, memberContext(portalId, memberUserId, keyVersion));
  if (!plaintext || plaintext.byteLength <= LINK_KEY_BYTES) return null;
  try {
    const privateKey = await crypto.subtle.importKey(
      "pkcs8",
      buffer(plaintext.subarray(LINK_KEY_BYTES)),
      ECDH,
      false,
      ["deriveBits"],
    );
    return { linkKey: plaintext.slice(0, LINK_KEY_BYTES), privateKey };
  } catch {
    return null;
  } finally {
    plaintext.fill(0);
  }
}

/**
 * Re-seals a portal's keys from one member to another, which is how an
 * invite hands them over. The key bytes exist only inside this function.
 * Null when `from` cannot open the keys.
 */
export async function resealPortalKeys(
  from: { keypair: RecipientKeypair; userId: string },
  to: { publicKey: Uint8Array; userId: string },
  portalId: string,
  keyVersion: number,
  sealedKeys: Uint8Array,
): Promise<Uint8Array | null> {
  const plaintext = await openSealed(
    from.keypair,
    sealedKeys,
    memberContext(portalId, from.userId, keyVersion),
  );
  if (!plaintext) return null;
  try {
    return await sealTo(to.publicKey, plaintext, memberContext(portalId, to.userId, keyVersion));
  } finally {
    plaintext.fill(0);
  }
}

// ─── creation ───────────────────────────────────────────────────────────────

export interface NewPortal {
  id: string;
  linkKey: Uint8Array;
  /** Send these two to the server. */
  publicBundle: Uint8Array;
  sealedKeys: Uint8Array;
}

/** Everything for a new portal, with its owner as the only member. */
export async function createPortalKeys(
  title: string,
  ownerUserId: string,
  ownerPublicKey: Uint8Array,
): Promise<NewPortal> {
  const id = newPortalId();
  const keyVersion = 1;
  const linkKey = crypto.getRandomValues(new Uint8Array(LINK_KEY_BYTES));
  const pair = await crypto.subtle.generateKey(ECDH, true, ["deriveBits"]);
  const publicKey = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
  const pkcs8 = new Uint8Array(await crypto.subtle.exportKey("pkcs8", pair.privateKey));
  try {
    const [publicBundle, sealedKeys] = await Promise.all([
      sealPortalBundle(id, linkKey, { publicKey, title, keyVersion }),
      sealPortalKeysFor(ownerPublicKey, id, ownerUserId, keyVersion, linkKey, pkcs8),
    ]);
    return { id, linkKey, publicBundle, sealedKeys };
  } finally {
    pkcs8.fill(0);
  }
}

// ─── link ───────────────────────────────────────────────────────────────────

export function portalLink(origin: string, portalId: string, linkKey: Uint8Array): string {
  return `${origin}/p/${portalId}#${bytesToBase64Url(linkKey)}`;
}

/** The link key from a URL fragment, or null if it is not one. */
export function linkKeyFromFragment(fragment: string): Uint8Array | null {
  const value = fragment.replace(/^#/, "");
  if (!/^[A-Za-z0-9_-]{43}$/.test(value)) return null;
  const bytes = base64UrlToBytes(value);
  return bytes.byteLength === LINK_KEY_BYTES ? bytes : null;
}
