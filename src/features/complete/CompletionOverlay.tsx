import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import { resetGame } from '../../store/puzzleSlice';
import { getRecords, updateRecord } from '../../lib/records';
import { getGameHistory, updateGameHistory, saveGameHistoryAtSlot } from '../../lib/gameHistory';
import type { GameHistoryRecord } from '../../types/puzzle';
import SavePanel from '../game/SavePanel';
import { Icon } from '../../components/Icon';
import { formatDuration } from '../../lib/format';
import { generateThumbnail } from '../../lib/imageUtils';

export default function CompletionOverlay() {
  const dispatch = useDispatch<AppDispatch>();
  const elapsedMs = useSelector((s: RootState) => s.puzzle.elapsedMs);
  const referenceDataUrl = useSelector((s: RootState) => s.puzzle.referenceDataUrl);
  const gameId = useSelector((s: RootState) => s.puzzle.gameId);
  const configId = useSelector((s: RootState) => s.puzzle.configId);
  const pieces = useSelector((s: RootState) => s.puzzle.pieces);
  const groups = useSelector((s: RootState) => s.puzzle.groups);
  const pieceGroup = useSelector((s: RootState) => s.puzzle.pieceGroup);
  const nextGroupId = useSelector((s: RootState) => s.puzzle.nextGroupId);
  const boardW = useSelector((s: RootState) => s.puzzle.boardW);
  const boardH = useSelector((s: RootState) => s.puzzle.boardH);
  const pieceW = useSelector((s: RootState) => s.puzzle.pieceW);
  const pieceH = useSelector((s: RootState) => s.puzzle.pieceH);
  const puzzleOffsetX = useSelector((s: RootState) => s.puzzle.puzzleOffsetX);
  const puzzleOffsetY = useSelector((s: RootState) => s.puzzle.puzzleOffsetY);
  const difficulty = useSelector((s: RootState) => s.puzzle.difficulty);
  const cols = useSelector((s: RootState) => s.puzzle.cols);
  const rows = useSelector((s: RootState) => s.puzzle.rows);

  const [hasHistoryRecord] = useState(() =>
    Boolean(gameId && getGameHistory().some((r) => r.id === gameId))
  );
  const [showSavePanel, setShowSavePanel] = useState(false);
  const thumbnailRef = useRef<string>('');
  const savedStateRef = useRef({ pieces, groups, pieceGroup, nextGroupId, boardW, boardH, pieceW, pieceH, puzzleOffsetX, puzzleOffsetY });
  useLayoutEffect(() => {
    savedStateRef.current = { pieces, groups, pieceGroup, nextGroupId, boardW, boardH, pieceW, pieceH, puzzleOffsetX, puzzleOffsetY };
  });

  // Generate thumbnail from reference image
  useEffect(() => {
    if (!referenceDataUrl) return;
    generateThumbnail(referenceDataUrl)
      .then(dataUrl => { thumbnailRef.current = dataUrl; })
      .catch(() => { thumbnailRef.current = ''; });
  }, [referenceDataUrl]);

  // Update quick settings best time using configId
  useEffect(() => {
    if (!configId || !elapsedMs) return;
    const existing = getRecords().find((r) => r.id === configId);
    if (!existing) return;
    const bestTimeMs =
      existing.isCompleted && existing.bestTimeMs > 0 && existing.bestTimeMs < elapsedMs
        ? existing.bestTimeMs
        : elapsedMs;
    updateRecord(configId, { isCompleted: true, bestTimeMs });
  }, [configId, elapsedMs]);

  // Auto-save completed state to existing history record
  useEffect(() => {
    if (!gameId || !elapsedMs) return;
    const existing = getGameHistory().find((r) => r.id === gameId);
    if (!existing) return;
    const s = savedStateRef.current;
    updateGameHistory(gameId, {
      isCompleted: true,
      updatedAt: Date.now(),
      savedState: {
        pieces: s.pieces,
        groups: s.groups,
        pieceGroup: s.pieceGroup,
        nextGroupId: s.nextGroupId,
        elapsedAtSave: elapsedMs,
        boardW: s.boardW,
        boardH: s.boardH,
        pieceW: s.pieceW,
        pieceH: s.pieceH,
        puzzleOffsetX: s.puzzleOffsetX,
        puzzleOffsetY: s.puzzleOffsetY,
      },
    });
  }, [gameId, elapsedMs]);

  function buildCompletedRecord(): GameHistoryRecord {
    return {
      id: crypto.randomUUID(),
      configId: configId ?? null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      difficulty,
      cols,
      rows,
      thumbnailDataUrl: thumbnailRef.current || referenceDataUrl!,
      croppedImageDataUrl: referenceDataUrl!,
      isCompleted: true,
      savedState: {
        pieces,
        groups,
        pieceGroup,
        nextGroupId,
        elapsedAtSave: elapsedMs,
        boardW,
        boardH,
        pieceW,
        pieceH,
        puzzleOffsetX,
        puzzleOffsetY,
      },
    };
  }

  function handleSaveToSlot(_existing: GameHistoryRecord | null, slotIndex: number) {
    saveGameHistoryAtSlot(buildCompletedRecord(), slotIndex);
    setShowSavePanel(false);
    dispatch(resetGame());
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(13,9,6,.85)' }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="completion-title"
          className="amber-glow rounded-3xl p-5 max-w-sm w-full flex flex-col items-center gap-3 relative overflow-y-auto"
          style={{
            background: 'radial-gradient(120% 80% at 50% 0%, var(--color-brand-50), var(--color-paper-200))',
            border: '2px solid #F4A52B',
            maxHeight: 'calc(100vh - 2rem)',
          }}
        >

          {referenceDataUrl && (
            <img
              src={referenceDataUrl}
              alt="完成的拼圖"
              className="max-w-full max-h-48 rounded-xl object-contain"
              style={{ boxShadow: '0 0 0 2px #F4A52B, 0 8px 24px rgba(0,0,0,.2)' }}
            />
          )}
          <h1 id="completion-title" className="text-3xl font-black text-paper-900 tracking-tight">拼圖完成！</h1>
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 font-mono font-bold"
            style={{ background: 'var(--color-paper-100)', color: 'var(--color-brand-700)', border: '1px solid #F4A52B' }}
          >
            <Icon name="ic-timer" size={16} />
            <span className="leading-none translate-y-px">用時 {formatDuration(elapsedMs)}</span>
          </div>

          {hasHistoryRecord ? (
            <div className="flex flex-col items-center gap-3 w-full">
              <p className="text-xs font-bold" style={{ color: 'var(--color-success)' }}>★ 已自動保存至歷史紀錄</p>
              <button
                onClick={() => dispatch(resetGame())}
                className="btn-primary w-full text-lg px-8 py-3"
              >
                再玩一次
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 w-full">
              <p className="text-xs text-paper-600 text-center">離開將不保存遊戲紀錄</p>
              <button
                onClick={() => setShowSavePanel(true)}
                className="btn-primary w-full text-lg px-8 py-3"
              >
                保存紀錄
              </button>
              <button
                onClick={() => dispatch(resetGame())}
                className="btn-secondary w-full text-lg px-8 py-3"
              >
                離開
              </button>
            </div>
          )}
        </div>
      </div>

      {showSavePanel && (
        <SavePanel
          gameId={null}
          onSave={handleSaveToSlot}
          onClose={() => setShowSavePanel(false)}
        />
      )}
    </>
  );
}
