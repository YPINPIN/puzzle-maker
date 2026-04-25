import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import { resetGame } from '../../store/puzzleSlice';
import { getRecords, updateRecord } from '../../lib/records';
import { getGameHistory, updateGameHistory, saveGameHistoryAtSlot } from '../../lib/gameHistory';
import type { GameHistoryRecord } from '../../types/puzzle';
import SavePanel from '../game/SavePanel';
import { Icon } from '../../components/Icon';

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) return `${minutes} 分 ${seconds.toString().padStart(2, '0')} 秒`;
  return `${seconds} 秒`;
}

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

  const [hasHistoryRecord, setHasHistoryRecord] = useState(false);
  const [showSavePanel, setShowSavePanel] = useState(false);
  const thumbnailRef = useRef<string>('');

  // Generate thumbnail from reference image
  useEffect(() => {
    if (!referenceDataUrl) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 200;
      const ctx = canvas.getContext('2d')!;
      const aspect = img.width / img.height;
      const tw = aspect > 1 ? 200 : Math.round(200 * aspect);
      const th = aspect > 1 ? Math.round(200 / aspect) : 200;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 200, 200);
      ctx.drawImage(img, Math.round((200 - tw) / 2), Math.round((200 - th) / 2), tw, th);
      thumbnailRef.current = canvas.toDataURL('image/jpeg', 0.7);
    };
    img.src = referenceDataUrl;
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
    if (!existing) { setHasHistoryRecord(false); return; }

    updateGameHistory(gameId, {
      isCompleted: true,
      updatedAt: Date.now(),
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
    });
    setHasHistoryRecord(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
          <h1 className="text-3xl font-black text-paper-900 tracking-tight">拼圖完成！</h1>
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 font-mono font-bold"
            style={{ background: 'var(--color-paper-100)', color: 'var(--color-brand-700)', border: '1px solid #F4A52B' }}
          >
            <Icon name="ic-timer" size={16} />
            <span className="leading-none translate-y-px">用時 {formatTime(elapsedMs)}</span>
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
