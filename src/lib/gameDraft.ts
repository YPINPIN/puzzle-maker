import type { InProgressGameState } from '../types/puzzle';

const DRAFT_KEY = 'puzzle-game-draft';

export type GameDraft = {
  gameId: string;
  configId: string | null;
  difficulty: string;
  cols: number;
  rows: number;
  croppedImageDataUrl: string;
  thumbnailDataUrl?: string;
  savedState: InProgressGameState;
  savedAt?: number;
};

export function saveDraft(draft: GameDraft): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // storage quota exceeded — silently ignore
  }
}

export function getDraft(): GameDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GameDraft;
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  localStorage.removeItem(DRAFT_KEY);
}
