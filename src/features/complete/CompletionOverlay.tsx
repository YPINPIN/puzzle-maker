import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import { resetGame } from '../../store/puzzleSlice';
import { getRecords, updateRecord } from '../../lib/records';
import { getGameHistory, updateGameHistory, saveGameHistoryAtSlot } from '../../lib/gameHistory';
import type { GameHistoryRecord } from '../../types/puzzle';
import SavePanel from '../game/SavePanel';

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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full flex flex-col items-center gap-5">
          {referenceDataUrl && (
            <img
              src={referenceDataUrl}
              alt="完成的拼圖"
              className="max-w-full max-h-48 rounded-xl shadow-lg object-contain"
            />
          )}
          <div className="text-5xl">🎉</div>
          <h1 className="text-3xl font-bold text-gray-800">拼圖完成！</h1>
          <p className="text-xl text-gray-600">
            用時：<span className="font-semibold text-blue-600">{formatTime(elapsedMs)}</span>
          </p>

          {hasHistoryRecord ? (
            <div className="flex flex-col items-center gap-3 w-full mt-2">
              <p className="text-xs text-green-600 font-medium">已自動保存至歷史紀錄</p>
              <button
                onClick={() => dispatch(resetGame())}
                className="w-full px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white text-lg font-bold rounded-xl shadow-lg transition-colors"
              >
                再玩一次
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 w-full mt-2">
              <p className="text-xs text-gray-400 text-center">離開將不保存遊戲紀錄</p>
              <button
                onClick={() => setShowSavePanel(true)}
                className="w-full px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white text-lg font-bold rounded-xl shadow-lg transition-colors"
              >
                保存紀錄
              </button>
              <button
                onClick={() => dispatch(resetGame())}
                className="w-full px-8 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 text-lg font-bold rounded-xl transition-colors"
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
