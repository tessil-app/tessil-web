// Portal key material, made and used only in the browser.
// See docs/adr/0014-portal-keys-and-vault-items.md.
//
// A portal has:
//   - a keypair. Depositors seal each deposit's key to the public half.
//   - a link key, carried in the portal link's fragment. It encrypts the
//     public bundle (public key + title), so the server can neither read
//     the title nor hand a depositor a public key of its own.
//
// Each member holds the private key and the link key in their own vault.
// Everything is bound to the portal's ID, which is why the browser picks
// the ID before anything is sent.

import { openSealed, sealTo, type RecipientKeypair } from "$lib/crypto/seal";
import { base64UrlToBytes, bytesToBase64Url } from "$lib/crypto/base64url";
import { LOCALES, type Locale } from "$lib/i18n/locale";
import { openVaultItem, sealVaultItem } from "$lib/vault/keypair";

const ECDH = { name: "ECDH", namedCurve: "P-256" } as const;
const LINK_KEY_BYTES = 32;
const IV_BYTES = 12;
const BUNDLE_VERSION = 1;
const BUNDLE_CONTEXT = "tessil/portal-bundle/v1";
const BUNDLE_PAD = 128;
const TOKEN_CONTEXT = "tessil/portal-deposit-token/v1";
const ID_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";

export const PORTAL_TITLE_MAX = 80;
export const PORTAL_MESSAGE_MAX = 600;
export const PORTAL_THANKS_MAX = 300;
export const PORTAL_FIELD_LABEL_MAX = 40;
// The server refuses a larger bundle.
const BUNDLE_MAX_BYTES = 32 * 1024;

export const PORTAL_RETURNS_MAX = 20;

/** A batch of files the owner sends back: a transfer and the key that opens it. */
export interface PortalReturn {
  id: string;
  /** The transfer's key, as it would stand in its own link. */
  key: string;
}

function cleanReturns(raw: unknown): PortalReturn[] {
  if (!Array.isArray(raw)) return [];
  const out: PortalReturn[] = [];
  for (const entry of raw.slice(0, PORTAL_RETURNS_MAX)) {
    const item = entry as { id?: unknown; key?: unknown };
    if (
      typeof item?.id === "string" &&
      /^[A-Za-z0-9_-]{21}$/.test(item.id) &&
      typeof item.key === "string" &&
      /^[A-Za-z0-9_-]{43}$/.test(item.key) &&
      !out.some((r) => r.id === item.id)
    ) {
      out.push({ id: item.id, key: item.key });
    }
  }
  return out;
}

export const PORTAL_LOGO_MAX_BYTES = 16 * 1024;
export const LOGO_TYPES = ["image/webp", "image/png", "image/jpeg"] as const;
export type LogoType = (typeof LOGO_TYPES)[number];

/** A small image, already shrunk and re-encoded by the owner's browser. */
export interface PortalLogo {
  type: LogoType;
  /** Standard base64. */
  data: string;
}

/** What an `<img>` can show. Only ever one of the bitmap types above. */
export function logoSrc(logo: PortalLogo): string {
  return `data:${logo.type};base64,${logo.data}`;
}

const LOGO_DATA_MAX_CHARS = Math.ceil(PORTAL_LOGO_MAX_BYTES / 3) * 4;

/** Keeps a logo only when it is a bitmap of a known type and size. */
function cleanLogo(raw: unknown): PortalLogo | null {
  const logo = raw as { type?: unknown; data?: unknown } | null | undefined;
  const type = LOGO_TYPES.find((t) => t === logo?.type);
  if (
    !type ||
    typeof logo?.data !== "string" ||
    logo.data.length === 0 ||
    logo.data.length > LOGO_DATA_MAX_CHARS ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(logo.data)
  ) {
    return null;
  }
  return { type, data: logo.data };
}

/** The name, texts and list together are more than a bundle may hold. */
export class PortalBundleTooLargeError extends Error {
  constructor() {
    super("That is more text than a portal can hold. Shorten the message or the list.");
    this.name = "PortalBundleTooLargeError";
  }
}

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

// ─── deposit token ──────────────────────────────────────────────────────────

/**
 * Shown to the server when depositing, to prove the caller holds the link
 * and not just the portal's ID. Derived one-way from the link key, so the
 * server learning it does not reveal the key.
 */
export async function depositTokenFor(linkKey: Uint8Array): Promise<Uint8Array> {
  const master = await crypto.subtle.importKey("raw", buffer(linkKey), "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(0), info: encoder.encode(TOKEN_CONTEXT) },
    master,
    256,
  );
  return new Uint8Array(bits);
}

// ─── public bundle ──────────────────────────────────────────────────────────

export interface PortalPublicInfo {
  /** Raw uncompressed P-256 point. */
  publicKey: Uint8Array;
  title: string;
  keyVersion: number;
  /** Language of the deposit page, chosen by the owner. Absent on older portals. */
  lang?: Locale;
  /** What the owner asks visitors to send. Empty or absent: anything goes. */
  checklist?: ChecklistItem[];
  /** Shown under the name, e.g. what to send and by when. */
  message?: string;
  /** Shown after sending, in place of nothing. */
  thanks?: string;
  /** One thing the visitor must fill in, named by the owner, e.g. "Your name". */
  fieldLabel?: string;
  /** Shown above the name. */
  logo?: PortalLogo;
  /** The owner can send files back; the page shows them to every visitor. */
  twoWay?: boolean;
  returns?: PortalReturn[];
}

/**
 * What an owner can set on a portal. Everything lives in the public bundle
 * except the last two, which the server has to act on and so can see.
 */
export interface PortalSettings {
  title: string;
  lang: Locale | null;
  checklist: ChecklistItem[];
  message: string;
  thanks: string;
  /** Empty: no extra field. */
  fieldLabel: string;
  logo: PortalLogo | null;
  twoWay: boolean;
  /** Kept as it is by the settings form; changed where files are sent back. */
  returns: PortalReturn[];
  /** When new deliveries stop, as an ISO moment. Null: no closing date. */
  closesAt: string | null;
  /** Email the members when files arrive. */
  notifyOnDelivery: boolean;
}

/** True once a closing moment has passed. */
export function hasClosed(closesAt: string | null | undefined, now = Date.now()): boolean {
  return !!closesAt && new Date(closesAt).getTime() <= now;
}

export function settingsOf(
  info: PortalPublicInfo,
): Omit<PortalSettings, "closesAt" | "notifyOnDelivery"> {
  return {
    title: info.title,
    lang: info.lang ?? null,
    checklist: info.checklist ?? [],
    message: info.message ?? "",
    thanks: info.thanks ?? "",
    fieldLabel: info.fieldLabel ?? "",
    logo: info.logo ?? null,
    twoWay: info.twoWay === true,
    returns: info.returns ?? [],
  };
}

function cleanText(raw: unknown, max: number): string {
  return typeof raw === "string" ? raw.trim().slice(0, max) : "";
}

/** One thing the owner asks for, e.g. "Copy of your ID". */
export interface ChecklistItem {
  /** Stable across renames, so files stay attached to the right item. */
  id: string;
  label: string;
}

export const CHECKLIST_MAX_ITEMS = 20;
export const CHECKLIST_LABEL_MAX = 80;
const ITEM_ID = /^[a-z0-9]{6}$/;

export function newChecklistItemId(): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  // 36 does not divide 256, so reject the tail instead of taking it modulo.
  let id = "";
  while (id.length < 6) {
    const [b] = crypto.getRandomValues(new Uint8Array(1));
    if (b < 252) id += alphabet[b % 36];
  }
  return id;
}

/** Keeps only well-formed items; a bundle is data from the network. */
function cleanChecklist(raw: unknown): ChecklistItem[] {
  if (!Array.isArray(raw)) return [];
  const items: ChecklistItem[] = [];
  for (const entry of raw.slice(0, CHECKLIST_MAX_ITEMS)) {
    const item = entry as { id?: unknown; label?: unknown };
    if (
      typeof item?.id === "string" &&
      ITEM_ID.test(item.id) &&
      typeof item.label === "string" &&
      item.label.trim().length > 0 &&
      !items.some((i) => i.id === item.id)
    ) {
      items.push({ id: item.id, label: item.label.trim().slice(0, CHECKLIST_LABEL_MAX) });
    }
  }
  return items;
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
    ...(info.lang ? { lang: info.lang } : {}),
    ...(info.checklist && info.checklist.length > 0 ? { checklist: cleanChecklist(info.checklist) } : {}),
    ...(cleanText(info.message, PORTAL_MESSAGE_MAX) ? { message: cleanText(info.message, PORTAL_MESSAGE_MAX) } : {}),
    ...(cleanText(info.thanks, PORTAL_THANKS_MAX) ? { thanks: cleanText(info.thanks, PORTAL_THANKS_MAX) } : {}),
    ...(cleanText(info.fieldLabel, PORTAL_FIELD_LABEL_MAX)
      ? { fieldLabel: cleanText(info.fieldLabel, PORTAL_FIELD_LABEL_MAX) }
      : {}),
    ...(cleanLogo(info.logo) ? { logo: cleanLogo(info.logo) } : {}),
    ...(info.twoWay ? { twoWay: true } : {}),
    ...(cleanReturns(info.returns).length > 0 ? { returns: cleanReturns(info.returns) } : {}),
  });
  // Padded with spaces so the stored size does not give away the title's length.
  const raw = encoder.encode(json);
  const padded = new Uint8Array(Math.ceil(raw.length / BUNDLE_PAD) * BUNDLE_PAD).fill(0x20);
  padded.set(raw);
  // version + iv + ciphertext + tag
  if (1 + IV_BYTES + padded.length + 16 > BUNDLE_MAX_BYTES) throw new PortalBundleTooLargeError();

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
      lang?: unknown;
      checklist?: unknown;
      message?: unknown;
      thanks?: unknown;
      fieldLabel?: unknown;
      logo?: unknown;
      twoWay?: unknown;
      returns?: unknown;
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
    const lang = LOCALES.find((l) => l === parsed.lang);
    const checklist = cleanChecklist(parsed.checklist);
    const message = cleanText(parsed.message, PORTAL_MESSAGE_MAX);
    const thanks = cleanText(parsed.thanks, PORTAL_THANKS_MAX);
    const fieldLabel = cleanText(parsed.fieldLabel, PORTAL_FIELD_LABEL_MAX);
    return {
      publicKey,
      title: parsed.title,
      keyVersion: parsed.keyVersion,
      ...(lang ? { lang } : {}),
      ...(checklist.length > 0 ? { checklist } : {}),
      ...(message ? { message } : {}),
      ...(thanks ? { thanks } : {}),
      ...(fieldLabel ? { fieldLabel } : {}),
      ...(cleanLogo(parsed.logo) ? { logo: cleanLogo(parsed.logo)! } : {}),
      ...(parsed.twoWay === true ? { twoWay: true } : {}),
      ...(cleanReturns(parsed.returns).length > 0 ? { returns: cleanReturns(parsed.returns) } : {}),
    };
  } catch {
    return null;
  }
}

// ─── member keys ────────────────────────────────────────────────────────────
//
// A member's copy of the portal keys comes in two forms, told apart by the
// first byte:
//
//   kept    encrypted under the member's own vault key. Only the member
//           can have made it, so it is trusted as is. This is the form
//           every member ends up with.
//   handed  sealed by one member to another's public key, authenticated
//           with the sender's key pair. It exists only between an invite
//           and the invitee's first unlock, and is trusted exactly as far
//           as the invitee trusts that the sender's public key is theirs.
//
// A copy sealed to a public key with no sender proof is never accepted:
// the server knows every public key and could seal keys of its own.

const FORM_KEPT = 0x4b;
const FORM_HANDED = 0x48;

/** True for keys an inviter handed over that this member has not accepted yet. */
export function isHandedCopy(blob: Uint8Array): boolean {
  return blob.byteLength >= 2 && blob[0] === FORM_HANDED;
}

export interface PortalKeys {
  linkKey: Uint8Array;
  /** Usable for opening deposits; not readable by page script. */
  privateKey: CryptoKey;
}

/** A member's vault: their ID and K_vault as HKDF input. */
export interface MemberVault {
  userId: string;
  derivationKey: CryptoKey;
}

function vaultKind(portalId: string, keyVersion: number): string {
  return `portal-keys/${portalId}/${keyVersion}`;
}

function handoverContext(
  portalId: string,
  keyVersion: number,
  fromUserId: string,
  toUserId: string,
): string {
  return `portal-keys|${portalId}|${keyVersion}|${fromUserId}|${toUserId}`;
}

function withForm(form: number, body: Uint8Array): Uint8Array {
  const out = new Uint8Array(1 + body.byteLength);
  out[0] = form;
  out.set(body, 1);
  return out;
}

async function keep(
  vault: MemberVault,
  portalId: string,
  keyVersion: number,
  material: Uint8Array,
): Promise<Uint8Array> {
  const item = await sealVaultItem(
    vault.derivationKey,
    vault.userId,
    vaultKind(portalId, keyVersion),
    material,
  );
  return withForm(FORM_KEPT, item);
}

/** link key(32) || PKCS#8 private key, or null if this is not the member's kept copy. */
async function openKept(
  vault: MemberVault,
  portalId: string,
  keyVersion: number,
  blob: Uint8Array,
): Promise<Uint8Array | null> {
  if (blob.byteLength < 2 || blob[0] !== FORM_KEPT) return null;
  const material = await openVaultItem(
    vault.derivationKey,
    vault.userId,
    vaultKind(portalId, keyVersion),
    blob.subarray(1),
  );
  return material && material.byteLength > LINK_KEY_BYTES ? material : null;
}

async function importMaterial(material: Uint8Array): Promise<PortalKeys | null> {
  try {
    const privateKey = await crypto.subtle.importKey(
      "pkcs8",
      buffer(material.subarray(LINK_KEY_BYTES)),
      ECDH,
      false,
      ["deriveBits"],
    );
    return { linkKey: material.slice(0, LINK_KEY_BYTES), privateKey };
  } catch {
    return null;
  }
}

/** Opens a member's kept copy. Null for anything else, a handed copy included. */
export async function openPortalKeys(
  vault: MemberVault,
  portalId: string,
  keyVersion: number,
  blob: Uint8Array,
): Promise<PortalKeys | null> {
  const material = await openKept(vault, portalId, keyVersion, blob);
  if (!material) return null;
  try {
    return await importMaterial(material);
  } finally {
    material.fill(0);
  }
}

/**
 * Hands a portal's keys from one member to another, which is how an invite
 * works. The key bytes exist only inside this function. Null when `from`
 * does not hold the keys.
 */
export async function handPortalKeys(
  from: MemberVault & { keypair: RecipientKeypair },
  to: { userId: string; publicKey: Uint8Array },
  portalId: string,
  keyVersion: number,
  keptBlob: Uint8Array,
): Promise<Uint8Array | null> {
  const material = await openKept(from, portalId, keyVersion, keptBlob);
  if (!material) return null;
  try {
    const sealed = await sealTo(
      to.publicKey,
      material,
      handoverContext(portalId, keyVersion, from.userId, to.userId),
      from.keypair,
    );
    return withForm(FORM_HANDED, sealed);
  } finally {
    material.fill(0);
  }
}

/**
 * Accepts keys handed over by `from`. Opens only if they were sealed by the
 * holder of `from.publicKey`; whether that key really is the inviter's is
 * what comparing fingerprints establishes. Returns the keys and the kept
 * copy to store in place of the handed one, so later unlocks no longer
 * depend on anyone's public key.
 */
export async function acceptPortalKeys(
  to: MemberVault & { keypair: RecipientKeypair },
  from: { userId: string; publicKey: Uint8Array },
  portalId: string,
  keyVersion: number,
  handedBlob: Uint8Array,
): Promise<{ keys: PortalKeys; kept: Uint8Array } | null> {
  if (handedBlob.byteLength < 2 || handedBlob[0] !== FORM_HANDED) return null;
  const material = await openSealed(
    to.keypair,
    handedBlob.subarray(1),
    handoverContext(portalId, keyVersion, from.userId, to.userId),
    from.publicKey,
  );
  if (!material || material.byteLength <= LINK_KEY_BYTES) return null;
  try {
    const keys = await importMaterial(material);
    if (!keys) return null;
    return { keys, kept: await keep(to, portalId, keyVersion, material) };
  } finally {
    material.fill(0);
  }
}

// ─── creation ───────────────────────────────────────────────────────────────

export interface NewPortal {
  id: string;
  linkKey: Uint8Array;
  /** Send these three to the server. */
  publicBundle: Uint8Array;
  sealedKeys: Uint8Array;
  depositToken: Uint8Array;
}

/** Everything for a new portal, with its owner as the only member. */
export async function createPortalKeys(
  title: string,
  owner: MemberVault,
  lang?: Locale,
  extras: Pick<PortalPublicInfo, "checklist" | "message" | "thanks" | "fieldLabel" | "logo" | "twoWay"> = {},
): Promise<NewPortal> {
  const id = newPortalId();
  const keyVersion = 1;
  const linkKey = crypto.getRandomValues(new Uint8Array(LINK_KEY_BYTES));
  const pair = await crypto.subtle.generateKey(ECDH, true, ["deriveBits"]);
  const publicKey = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
  const pkcs8 = new Uint8Array(await crypto.subtle.exportKey("pkcs8", pair.privateKey));
  const material = new Uint8Array(LINK_KEY_BYTES + pkcs8.byteLength);
  material.set(linkKey, 0);
  material.set(pkcs8, LINK_KEY_BYTES);
  try {
    const [publicBundle, sealedKeys, depositToken] = await Promise.all([
      sealPortalBundle(id, linkKey, { ...extras, publicKey, title, keyVersion, lang }),
      keep(owner, id, keyVersion, material),
      depositTokenFor(linkKey),
    ]);
    return { id, linkKey, publicBundle, sealedKeys, depositToken };
  } finally {
    pkcs8.fill(0);
    material.fill(0);
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
