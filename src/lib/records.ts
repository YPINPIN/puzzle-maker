const STORAGE_KEY = 'puzzle-quick-settings';

export type PuzzleRecord = {
  id: string;
  createdAt: number;
  difficulty: string;
  cols: number;
  rows: number;
  thumbnailDataUrl: string;
  croppedImageDataUrl?: string;  // 壓縮裁切圖（≤800px JPEG 0.75），用於重新遊玩
  isCompleted: boolean;
  bestTimeMs: number;
};

export function getRecords(): PuzzleRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PuzzleRecord[];
  } catch {
    return [];
  }
}

export function saveRecord(record: PuzzleRecord): void {
  const records = getRecords();
  records.unshift(record);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, 10)));
}

export function updateRecord(id: string, updates: Partial<PuzzleRecord>): void {
  const records = getRecords();
  const idx = records.findIndex((r) => r.id === id);
  if (idx === -1) return;
  records[idx] = { ...records[idx], ...updates };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function deleteRecord(id: string): void {
  const records = getRecords().filter((r) => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}
