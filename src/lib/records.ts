import { pruneImageCache } from './imageCache';
import { getGameHistory } from './gameHistory';
import { getDraft } from './gameDraft';

const STORAGE_KEY = 'puzzle-quick-settings';
const TUTORIAL_DONE_KEY = 'puzzle-tutorial-done';

export function isTutorialDone(): boolean {
  return !!localStorage.getItem(TUTORIAL_DONE_KEY);
}

export type PuzzleRecord = {
  id: string;
  createdAt: number;
  difficulty: string;
  cols: number;
  rows: number;
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
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, 10)));
  } catch {
    // storage quota exceeded — silently ignore
  }
}

export function updateRecord(id: string, updates: Partial<PuzzleRecord>): void {
  const records = getRecords();
  const idx = records.findIndex((r) => r.id === id);
  if (idx === -1) return;
  records[idx] = { ...records[idx], ...updates };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // storage quota exceeded — silently ignore
  }
}

export function deleteRecord(id: string): void {
  const records = getRecords().filter((r) => r.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // storage quota exceeded — silently ignore
  }
  pruneImageCache();
}

export function isNewUser(): boolean {
  return getRecords().length === 0 && getGameHistory().length === 0 && getDraft() === null;
}
