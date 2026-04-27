import type { GameHistoryRecord } from '../types/puzzle';

const HISTORY_KEY = 'puzzle-game-history';
const SLOT_COUNT = 10;

type Slot = GameHistoryRecord | null;

function readSlots(): Slot[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Slot[];
  } catch {
    return [];
  }
}

function writeSlots(slots: Slot[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(slots.slice(0, SLOT_COUNT)));
  } catch {
    // storage quota exceeded — silently ignore
  }
}

export function getGameHistorySlots(): Slot[] {
  const stored = readSlots();
  return Array.from({ length: SLOT_COUNT }, (_, i) => stored[i] ?? null);
}

export function getGameHistory(): GameHistoryRecord[] {
  return getGameHistorySlots().filter((r): r is GameHistoryRecord => r !== null);
}

export function saveGameHistory(record: GameHistoryRecord): void {
  const slots = getGameHistorySlots();
  slots.unshift(record);
  writeSlots(slots);
}

export function saveGameHistoryAtSlot(record: GameHistoryRecord, slotIndex: number): void {
  const slots = getGameHistorySlots();
  slots[slotIndex] = record;
  writeSlots(slots);
}

export function updateGameHistory(id: string, updates: Partial<GameHistoryRecord>): void {
  const slots = getGameHistorySlots();
  const idx = slots.findIndex((r) => r?.id === id);
  if (idx === -1) return;
  slots[idx] = { ...slots[idx]!, ...updates };
  writeSlots(slots);
}

export function deleteGameHistory(id: string): void {
  const slots = getGameHistorySlots();
  const idx = slots.findIndex((r) => r?.id === id);
  if (idx !== -1) slots[idx] = null;
  writeSlots(slots);
}
