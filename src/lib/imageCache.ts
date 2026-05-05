const RECORDS_KEY = 'puzzle-quick-settings';
const HISTORY_KEY = 'puzzle-game-history';
const DRAFT_KEY   = 'puzzle-game-draft';

const DB_NAME    = 'puzzle-image-db';
const STORE_NAME = 'images';
const DB_VERSION = 1;

let _db:          IDBDatabase | null = null;
let _mem:         Record<string, string> | null = null;
let _initPromise: Promise<void> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
    req.onsuccess = () => { _db = req.result; resolve(_db!); };
    req.onerror   = () => reject(req.error);
  });
}

export function initImageCache(): Promise<void> {
  if (_initPromise) return _initPromise;
  _initPromise = (async () => {
    try {
      const db = await openDB();
      _mem = await new Promise<Record<string, string>>((resolve) => {
        const result: Record<string, string> = {};
        const req = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).openCursor();
        req.onsuccess = (e) => {
          const cur = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
          if (cur) { result[cur.key as string] = cur.value as string; cur.continue(); }
          else resolve(result);
        };
        req.onerror = () => resolve({});
      });
    } catch {
      _mem = {};
    }
  })();
  return _initPromise;
}

export function waitForImageCache(): Promise<void> {
  return _initPromise ?? Promise.resolve();
}

export function getImage(configId: string | null | undefined): string | undefined {
  if (!configId) return undefined;
  return (_mem ?? {})[configId];
}

export function saveImage(configId: string, dataUrl: string): void {
  if (!configId) return;
  if (!_mem) _mem = {};
  _mem[configId] = dataUrl;
  openDB().then(db => {
    db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(dataUrl, configId);
  }).catch(() => {});
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function collectUsedConfigIds(): Set<string> {
  const ids = new Set<string>();
  const records = safeParse<{ id: string }[]>(localStorage.getItem(RECORDS_KEY), []);
  records.forEach((r) => ids.add(r.id));
  const slots = safeParse<({ configId?: string | null } | null)[]>(localStorage.getItem(HISTORY_KEY), []);
  slots.forEach((r) => { if (r?.configId) ids.add(r.configId); });
  const draft = safeParse<{ configId?: string | null } | null>(localStorage.getItem(DRAFT_KEY), null);
  if (draft?.configId) ids.add(draft.configId);
  return ids;
}

// Removes unreferenced images from _mem and IDB. Returns void so callers need not await.
export function pruneImageCache(): void {
  const used = collectUsedConfigIds();
  if (!_mem) return;
  const toDelete: string[] = [];
  for (const id of Object.keys(_mem)) {
    if (!used.has(id)) { delete _mem[id]; toDelete.push(id); }
  }
  if (toDelete.length === 0) return;
  openDB().then(db => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    toDelete.forEach(id => store.delete(id));
  }).catch(() => {});
}

