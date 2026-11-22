// IDB-backed K_vault cache. Stores the non-extractable CryptoKey directly so
// the dashboard can decrypt on reload without re-prompting. How long it is
// kept is chosen per device: 1, 7 or 30 days, 1 by default.

const DB_NAME = "tessil-vault";
const DB_VERSION = 1;
const STORE_NAME = "keys";
const KEY_ID = "kvault";

const DAY_MS = 24 * 60 * 60 * 1000;

/** The choices a device offers for how long the vault stays open. */
export const VAULT_HOLD_DAYS = [1, 7, 30] as const;
export type VaultHoldDays = (typeof VAULT_HOLD_DAYS)[number];
const HOLD_KEY = "tessil:vault-hold-days";

/** This device's choice. Not a secret: only how long, never the key. */
export function readVaultHoldDays(): VaultHoldDays {
  try {
    const raw = Number(localStorage.getItem(HOLD_KEY));
    return VAULT_HOLD_DAYS.find((d) => d === raw) ?? 1;
  } catch {
    return 1;
  }
}

interface StoredVaultKey {
  key: CryptoKey;
  /** K_vault as HKDF input, for vault items. Absent on entries cached before items existed. */
  derivationKey?: CryptoKey;
  expiresAt: number;
  userId: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IDB open failed"));
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | IDBRequest<unknown>,
): Promise<T | null> {
  let db: IDBDatabase;
  try {
    db = await openDb();
  } catch {
    return null;
  }
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const req = fn(store);
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => resolve(null);
    tx.oncomplete = () => db.close();
    tx.onerror = () => {
      db.close();
      resolve(null);
    };
  });
}

type Listener = (state: { unlocked: boolean; userId: string | null }) => void;
const listeners = new Set<Listener>();

function notify(state: { unlocked: boolean; userId: string | null }) {
  for (const l of listeners) {
    try { l(state); } catch { /* listener errors must not block */ }
  }
}

export function subscribeToVaultState(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Both keys MUST be non-extractable; kept for this device's chosen number of days. */
export async function storeVaultKey(
  userId: string,
  key: CryptoKey,
  derivationKey: CryptoKey,
): Promise<void> {
  const entry: StoredVaultKey = {
    key,
    derivationKey,
    expiresAt: Date.now() + readVaultHoldDays() * DAY_MS,
    userId,
  };
  await withStore("readwrite", (store) => store.put(entry, KEY_ID));
  notify({ unlocked: true, userId });
}

/** Returns null when missing, expired, or stale (different user). */
async function readEntry(userId: string): Promise<StoredVaultKey | null> {
  const entry = await withStore<StoredVaultKey | undefined>(
    "readonly",
    (store) => store.get(KEY_ID),
  );
  if (!entry) return null;
  if (entry.userId !== userId || Date.now() >= entry.expiresAt) {
    await clearVaultKey();
    return null;
  }
  // A session unlocked by an older version of the app holds only half of
  // what is needed now. Treat it as locked, so the user is asked to unlock
  // once and everything works, instead of some pages seeing an open vault
  // and others a locked one.
  if (!entry.derivationKey) {
    await clearVaultKey();
    return null;
  }
  return entry;
}

export async function readVaultKey(userId: string): Promise<CryptoKey | null> {
  return (await readEntry(userId))?.key ?? null;
}

/** Null when locked, and for a session unlocked before vault items existed. */
export async function readVaultDerivationKey(userId: string): Promise<CryptoKey | null> {
  return (await readEntry(userId))?.derivationKey ?? null;
}

/** Drop the cached K_vault. Idempotent - safe to call when nothing is stored. */
export async function clearVaultKey(): Promise<void> {
  await withStore("readwrite", (store) => store.delete(KEY_ID));
  notify({ unlocked: false, userId: null });
}

export async function isVaultUnlocked(userId: string): Promise<boolean> {
  const key = await readVaultKey(userId);
  return key !== null;
}

/**
 * Sets this device's choice, and applies it to a vault open now, counted
 * from this moment. Shortening it can close the vault sooner; never later
 * than chosen.
 */
export async function setVaultHoldDays(days: VaultHoldDays): Promise<void> {
  try {
    localStorage.setItem(HOLD_KEY, String(days));
  } catch {
    // Without storage the choice lasts until the page closes.
  }
  const entry = await withStore<StoredVaultKey | undefined>("readonly", (store) => store.get(KEY_ID));
  if (!entry || Date.now() >= entry.expiresAt) return;
  await withStore("readwrite", (store) => store.put({ ...entry, expiresAt: Date.now() + days * DAY_MS }, KEY_ID));
}

/** When an open vault on this device closes by itself, or null when it is not open. */
export async function vaultOpenUntil(userId: string): Promise<Date | null> {
  const entry = await readEntry(userId);
  return entry ? new Date(entry.expiresAt) : null;
}
