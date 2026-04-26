import type { GameHistoryRecord } from '../types/puzzle';

const HISTORY_KEY = 'puzzle-game-history';

export function getGameHistory(): GameHistoryRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as GameHistoryRecord[];
  } catch {
    return [];
  }
}

export function saveGameHistory(record: GameHistoryRecord): void {
  const history = getGameHistory();
  history.unshift(record);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 10)));
  } catch {
    // storage quota exceeded — silently ignore
  }
}

export function saveGameHistoryAtSlot(record: GameHistoryRecord, slotIndex: number): void {
  const history = getGameHistory();
  if (slotIndex < history.length) {
    history[slotIndex] = record;
  } else {
    history.push(record);
  }
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 10)));
  } catch {
    // storage quota exceeded — silently ignore
  }
}

export function updateGameHistory(id: string, updates: Partial<GameHistoryRecord>): void {
  const history = getGameHistory();
  const idx = history.findIndex((r) => r.id === id);
  if (idx === -1) return;
  history[idx] = { ...history[idx], ...updates };
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    // storage quota exceeded — silently ignore
  }
}

export function deleteGameHistory(id: string): void {
  const history = getGameHistory().filter((r) => r.id !== id);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    // storage quota exceeded — silently ignore
  }
}
