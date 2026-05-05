// Direct localStorage keys to avoid circular imports in pruneImageCache / migrateToImageCache
const RECORDS_KEY  = 'puzzle-quick-settings';
const HISTORY_KEY  = 'puzzle-game-history';
const DRAFT_KEY    = 'puzzle-game-draft';
const LS_CACHE_KEY = 'puzzle-image-cache'; // legacy localStorage key, used only for one-time migration

const DB_NAME    = 'puzzle-image-db';
const STORE_NAME = 'images';
const DB_VERSION = 1;

let _db:  IDBDatabase | null = null;
let _mem: Record<string, string> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
    req.onsuccess = () => { _db = req.result; resolve(_db!); };
    req.onerror   = () => reject(req.error);
  });
}

// Load all IDB entries into _mem, then migrate any legacy localStorage cache.
// Must be called once at app startup; sets imageCacheReady when resolved.
export async function initImageCache(): Promise<void> {
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
    // One-time migration: move localStorage image cache → IDB
    const lsRaw = localStorage.getItem(LS_CACHE_KEY);
    if (lsRaw) {
      try {
        const lsCache = JSON.parse(lsRaw) as Record<string, string>;
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        for (const [id, url] of Object.entries(lsCache)) {
          if (!_mem[id]) { _mem[id] = url; store.put(url, id); }
        }
        localStorage.removeItem(LS_CACHE_KEY);
      } catch {}
    }
  } catch {
    _mem = {};
  }
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

function collectUsedConfigIds(): Set<string> {
  const ids = new Set<string>();
  try {
    const records = JSON.parse(localStorage.getItem(RECORDS_KEY) ?? '[]') as { id: string }[];
    records.forEach((r) => ids.add(r.id));
  } catch {}
  try {
    const slots = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') as ({ configId?: string | null } | null)[];
    slots.forEach((r) => { if (r?.configId) ids.add(r.configId); });
  } catch {}
  try {
    const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null') as { configId?: string | null } | null;
    if (draft?.configId) ids.add(draft.configId);
  } catch {}
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

// One-time migration: extract croppedImageDataUrl from old records into the image cache and
// strip both croppedImageDataUrl and thumbnailDataUrl to free ~1.5–2 MB of duplicated storage.
// Execution order: overwrite existing keys with smaller data first (frees space), then save cache.
// Safe to call multiple times; exits early when nothing to migrate.
export function migrateToImageCache(): void {
  type OldRecord = { id: string; croppedImageDataUrl?: string; thumbnailDataUrl?: string; [key: string]: unknown };
  type OldSlot   = ({ configId?: string | null; croppedImageDataUrl?: string; thumbnailDataUrl?: string; [key: string]: unknown } | null);
  type OldDraft  = ({ configId?: string | null; croppedImageDataUrl?: string; thumbnailDataUrl?: string; [key: string]: unknown } | null);

  let records: OldRecord[] = [];
  let slots: OldSlot[] = [];
  let draft: OldDraft = null;

  try { records = JSON.parse(localStorage.getItem(RECORDS_KEY) ?? '[]') as OldRecord[]; } catch {}
  try { slots   = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') as OldSlot[];  } catch {}
  try { draft   = JSON.parse(localStorage.getItem(DRAFT_KEY)   ?? 'null') as OldDraft; } catch {}

  const needsMigration =
    records.some((r) => r.croppedImageDataUrl || r.thumbnailDataUrl) ||
    slots.some((r) => r?.croppedImageDataUrl || r?.thumbnailDataUrl) ||
    Boolean(draft?.croppedImageDataUrl || draft?.thumbnailDataUrl);

  if (!needsMigration) return;

  // Collect images to save to IDB after migration
  const toSave: Record<string, string> = {};

  const migratedRecords = records.map((r) => {
    if (!r.croppedImageDataUrl && !r.thumbnailDataUrl) return r;
    if (r.croppedImageDataUrl) toSave[r.id] = r.croppedImageDataUrl;
    const { croppedImageDataUrl: _c, thumbnailDataUrl: _t, ...rest } = r;
    return rest;
  });

  const migratedSlots = slots.map((r) => {
    if (!r?.croppedImageDataUrl && !r?.thumbnailDataUrl) return r;
    if (r?.croppedImageDataUrl && r.configId && !toSave[r.configId]) toSave[r.configId] = r.croppedImageDataUrl;
    if (!r) return r;
    const { croppedImageDataUrl: _c, thumbnailDataUrl: _t, ...rest } = r;
    return rest;
  });

  let migratedDraft: OldDraft = draft;
  if (draft && (draft.croppedImageDataUrl || draft.thumbnailDataUrl)) {
    if (draft.croppedImageDataUrl && draft.configId && !toSave[draft.configId]) {
      toSave[draft.configId] = draft.croppedImageDataUrl;
    }
    const { croppedImageDataUrl: _c, thumbnailDataUrl: _t, ...rest } = draft;
    migratedDraft = rest;
  }

  // Overwrite with smaller payloads first to free storage before writing cache.
  try { localStorage.setItem(RECORDS_KEY, JSON.stringify(migratedRecords.slice(0, 10))); } catch {}
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(migratedSlots.slice(0, 10)));   } catch {}
  if (migratedDraft && Object.keys(migratedDraft).length > 0) {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(migratedDraft)); } catch {}
  }

  // Save extracted images to IDB (fire-and-forget)
  if (Object.keys(toSave).length > 0) {
    openDB().then(db => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      for (const [id, url] of Object.entries(toSave)) {
        if (_mem && !_mem[id]) _mem[id] = url;
        store.put(url, id);
      }
    }).catch(() => {});
  }
}
