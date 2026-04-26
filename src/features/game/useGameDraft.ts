import { useEffect, useLayoutEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { saveDraft, clearDraft } from '../../lib/gameDraft';

export function useGameDraft() {
  const state = useSelector((s: RootState) => s.puzzle);
  const stateRef = useRef(state);
  useLayoutEffect(() => { stateRef.current = state; });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const thumbnailRef = useRef<string>('');

  // Pre-generate 200×200 centered thumbnail whenever reference image changes
  useEffect(() => {
    const url = state.referenceDataUrl;
    if (!url) { thumbnailRef.current = ''; return; }
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 200;
      const ctx = canvas.getContext('2d')!;
      const aspect = img.width / img.height;
      const tw = aspect > 1 ? 200 : Math.round(200 * aspect);
      const th = aspect > 1 ? Math.round(200 / aspect) : 200;
      ctx.fillStyle = '#F8F5F0';
      ctx.fillRect(0, 0, 200, 200);
      ctx.drawImage(img, Math.round((200 - tw) / 2), Math.round((200 - th) / 2), tw, th);
      thumbnailRef.current = canvas.toDataURL('image/jpeg', 0.7);
    };
    img.src = url;
  }, [state.referenceDataUrl]);

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
      thumbnailDataUrl: thumbnailRef.current || undefined,
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
      },
    });
  }

  // Debounced save when pieces change during playing
  useEffect(() => {
    if (stateRef.current.phase !== 'playing') return;
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
  }, []);

  return { saveNow: buildAndSave };
}
