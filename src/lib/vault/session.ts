// IndexedDB-backed K_vault session cache.
//
// A non-extractable CryptoKey is cached across page loads with a
// 24h TTL and a manual lock action. We store the CryptoKey directly
// in IDB (browsers persist non-extractable AES-GCM keys losslessly)
// so the dashboard can decrypt filenames on reload without
// prompting for the password again. The auth session lifetime is
// independent and longer — when the K_vault entry expires, the
// user is prompted to unlock.

const DB_NAME = "jtransfer-vault";
const DB_VERSION = 1;
const STORE_NAME = "keys";
const KEY_ID = "kvault";

const TTL_MS = 24 * 60 * 60 * 1000;

interface StoredVaultKey {
  key: CryptoKey;
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

// Listeners notified whenever lock/unlock state changes. Svelte stores can
// subscribe to react to expiration / manual lock.
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

/**
 * Persist a freshly-unwrapped K_vault for `userId`. The CryptoKey
 * must be non-extractable so the browser cannot serialise raw bytes
 * out of IDB. TTL is 24h from now.
 */
export async function storeVaultKey(userId: string, key: CryptoKey): Promise<void> {
  const entry: StoredVaultKey = {
    key,
    expiresAt: Date.now() + TTL_MS,
    userId,
  };
  await withStore("readwrite", (store) => store.put(entry, KEY_ID));
  notify({ unlocked: true, userId });
}

/**
 * Retrieve the cached K_vault for `userId`. Returns null when missing,
 * expired, or belonging to a different user (e.g. someone else signed in
 * on the same browser). Expired entries are deleted in passing.
 */
export async function readVaultKey(userId: string): Promise<CryptoKey | null> {
  const entry = await withStore<StoredVaultKey | undefined>(
    "readonly",
    (store) => store.get(KEY_ID),
  );
  if (!entry) return null;
  if (entry.userId !== userId) {
    // Belongs to a different user — drop it.
    await clearVaultKey();
    return null;
  }
  if (Date.now() >= entry.expiresAt) {
    await clearVaultKey();
    return null;
  }
  return entry.key;
}

/** Drop the cached K_vault. Idempotent — safe to call when nothing is stored. */
export async function clearVaultKey(): Promise<void> {
  await withStore("readwrite", (store) => store.delete(KEY_ID));
  notify({ unlocked: false, userId: null });
}

/**
 * Cheap synchronous-ish check: is there a non-expired vault entry for this
 * user? Returns false if IDB is unavailable. Use this from layout code that
 * needs to gate routes without paying for a full CryptoKey read on every
 * navigation.
 */
export async function isVaultUnlocked(userId: string): Promise<boolean> {
  const key = await readVaultKey(userId);
  return key !== null;
}
