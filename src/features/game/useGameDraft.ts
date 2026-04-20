import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { saveDraft, clearDraft } from '../../lib/gameDraft';

export function useGameDraft() {
  const state = useSelector((s: RootState) => s.puzzle);
  const stateRef = useRef(state);
  stateRef.current = state;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function buildAndSave() {
    const s = stateRef.current;
    if (s.phase !== 'playing' || !s.gameId || !s.referenceDataUrl) return;
    const now = Date.now();
    const elapsedAtSave = Math.max(
      0,
      (s.isPaused ? (s.pausedAt ?? now) : now) - (s.startTime ?? now) - s.pauseOffset
    );
    saveDraft({
      gameId: s.gameId,
      configId: s.configId,
      difficulty: s.difficulty,
      cols: s.cols,
      rows: s.rows,
      croppedImageDataUrl: s.referenceDataUrl,
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
      },
    });
  }

  // Debounced save when pieces change during playing
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (state.phase !== 'playing') return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(buildAndSave, 1500);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [state.pieces]); // intentionally only watching pieces

  // Clear draft when game completes
  useEffect(() => {
    if (state.phase === 'complete') clearDraft();
  }, [state.phase]);

  // Save immediately when page becomes hidden (back swipe / tab switch)
  useEffect(() => {
    const onHide = () => {
      if (stateRef.current.phase === 'playing') buildAndSave();
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
