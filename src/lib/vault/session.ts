// IDB-backed K_vault cache, 24h TTL. Stores the non-extractable CryptoKey directly so
// the dashboard can decrypt on reload without re-prompting.

const DB_NAME = "tessil-vault";
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

/** CryptoKey MUST be non-extractable; TTL is 24h. */
export async function storeVaultKey(userId: string, key: CryptoKey): Promise<void> {
  const entry: StoredVaultKey = {
    key,
    expiresAt: Date.now() + TTL_MS,
    userId,
  };
  await withStore("readwrite", (store) => store.put(entry, KEY_ID));
  notify({ unlocked: true, userId });
}

/** Returns null when missing, expired, or stale (different user). */
export async function readVaultKey(userId: string): Promise<CryptoKey | null> {
  const entry = await withStore<StoredVaultKey | undefined>(
    "readonly",
    (store) => store.get(KEY_ID),
  );
  if (!entry) return null;
  if (entry.userId !== userId) {
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

export async function isVaultUnlocked(userId: string): Promise<boolean> {
  const key = await readVaultKey(userId);
  return key !== null;
}
