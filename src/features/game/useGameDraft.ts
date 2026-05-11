import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { saveDraft, clearDraft } from '../../lib/gameDraft';
import { isTutorialDone } from '../../lib/records';

export function useGameDraft() {
  const state = useSelector((s: RootState) => s.puzzle);
  const stateRef = useRef(state);
  useLayoutEffect(() => {
    stateRef.current = state;
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buildAndSave = useCallback(() => {
    if (!isTutorialDone()) return;
    const s = stateRef.current;
    if (s.isComplete || !s.gameId || !s.referenceDataUrl) return;
    const now = Date.now();
    const elapsedAtSave = Math.max(0, (s.isPaused ? (s.pausedAt ?? now) : now) - (s.startTime ?? now) - s.pauseOffset);
    saveDraft({
      gameId: s.gameId,
      configId: s.configId,
      difficulty: s.difficulty,
      cols: s.cols,
      rows: s.rows,
      savedAt: now,
      savedState: {
        pieces: s.pieces,
        groups: s.groups,
        pieceGroup: s.pieceGroup,
        nextGroupId: s.nextGroupId,
        elapsedAtSave,
        boardW: s.boardW,
        boardH: s.boardH,
        pieceW: s.pieceW,
        pieceH: s.pieceH,
        puzzleOffsetX: s.puzzleOffsetX,
        puzzleOffsetY: s.puzzleOffsetY,
        showPreviewHint: s.showPreviewHint,
      },
    });
  }, []); // stateRef 永遠是最新值，空 deps 安全

  // Debounced save when pieces change during playing
  useEffect(() => {
    if (stateRef.current.isComplete || !stateRef.current.gameId) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(buildAndSave, 1500);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [state.pieces, buildAndSave]);

  // Clear draft when game completes
  useEffect(() => {
    if (state.isComplete) clearDraft();
  }, [state.isComplete]);

  // Save immediately when page becomes hidden (back swipe / tab switch)
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') buildAndSave();
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [buildAndSave]);

  return { saveNow: buildAndSave };
}
