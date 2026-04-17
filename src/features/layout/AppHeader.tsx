import { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import {
  pauseGame,
  resumeGame,
  toggleImagePreview,
  resetGame,
} from '../../store/puzzleSlice';
import { getGameHistory, saveGameHistoryAtSlot } from '../../lib/gameHistory';
import type { GameHistoryRecord, InProgressGameState } from '../../types/puzzle';
import ConfirmDialog from '../../components/ConfirmDialog';
import SavePanel from '../game/SavePanel';

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: '簡單',
  normal: '普通',
  hard: '困難',
  expert: '專家',
};

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0
    ? `${m} 分 ${(s % 60).toString().padStart(2, '0')} 秒`
    : `${s} 秒`;
}

export default function AppHeader() {
  const dispatch = useDispatch<AppDispatch>();
  const phase = useSelector((s: RootState) => s.puzzle.phase);
  const difficulty = useSelector((s: RootState) => s.puzzle.difficulty);
  const cols = useSelector((s: RootState) => s.puzzle.cols);
  const rows = useSelector((s: RootState) => s.puzzle.rows);
  const startTime = useSelector((s: RootState) => s.puzzle.startTime);
  const isPaused = useSelector((s: RootState) => s.puzzle.isPaused);
  const pausedAt = useSelector((s: RootState) => s.puzzle.pausedAt);
  const pauseOffset = useSelector((s: RootState) => s.puzzle.pauseOffset);
  const gameId = useSelector((s: RootState) => s.puzzle.gameId);
  const configId = useSelector((s: RootState) => s.puzzle.configId);
  const referenceDataUrl = useSelector((s: RootState) => s.puzzle.referenceDataUrl);
  const pieces = useSelector((s: RootState) => s.puzzle.pieces);
  const groups = useSelector((s: RootState) => s.puzzle.groups);
  const pieceGroup = useSelector((s: RootState) => s.puzzle.pieceGroup);
  const nextGroupId = useSelector((s: RootState) => s.puzzle.nextGroupId);
  const boardH = useSelector((s: RootState) => s.puzzle.boardH);
  const pieceW = useSelector((s: RootState) => s.puzzle.pieceW);
  const pieceH = useSelector((s: RootState) => s.puzzle.pieceH);
  const puzzleOffsetX = useSelector((s: RootState) => s.puzzle.puzzleOffsetX);
  const puzzleOffsetY = useSelector((s: RootState) => s.puzzle.puzzleOffsetY);

  const [displayElapsed, setDisplayElapsed] = useState(0);
  const [showSavePanel, setShowSavePanel] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const thumbnailRef = useRef<string>('');

  // 每次 render 同步最新值，讓 handleSaveToSlot 永遠拿到最新狀態
  const saveDataRef = useRef({
    gameId, configId, startTime, isPaused, pausedAt, pauseOffset,
    referenceDataUrl, pieces, groups, pieceGroup, nextGroupId,
    boardH, pieceW, pieceH, puzzleOffsetX, puzzleOffsetY,
    difficulty, cols, rows,
  });
  saveDataRef.current = {
    gameId, configId, startTime, isPaused, pausedAt, pauseOffset,
    referenceDataUrl, pieces, groups, pieceGroup, nextGroupId,
    boardH, pieceW, pieceH, puzzleOffsetX, puzzleOffsetY,
    difficulty, cols, rows,
  };

  useEffect(() => {
    if (!referenceDataUrl) { thumbnailRef.current = ''; return; }
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

  const computeElapsed = useCallback(() => {
    if (!startTime) return 0;
    const base = isPaused ? (pausedAt ?? Date.now()) : Date.now();
    return Math.max(0, base - startTime - pauseOffset);
  }, [startTime, isPaused, pausedAt, pauseOffset]);

  useEffect(() => {
    if (!startTime || isPaused) return;
    const id = setInterval(() => setDisplayElapsed(computeElapsed()), 500);
    return () => clearInterval(id);
  }, [startTime, isPaused, computeElapsed]);

  useEffect(() => {
    setDisplayElapsed(computeElapsed());
  }, [isPaused, computeElapsed]);

  const buildRecord = useCallback((): GameHistoryRecord | null => {
    const {
      gameId, configId, startTime, isPaused, pausedAt, pauseOffset,
      referenceDataUrl, pieces, groups, pieceGroup, nextGroupId,
      boardH, pieceW, pieceH, puzzleOffsetX, puzzleOffsetY,
      difficulty, cols, rows,
    } = saveDataRef.current;

    if (!gameId || !startTime || !referenceDataUrl) return null;

    const now = Date.now();
    const elapsedAtSave = isPaused
      ? Math.max(0, (pausedAt ?? now) - startTime - pauseOffset)
      : Math.max(0, now - startTime - pauseOffset);

    const savedState: InProgressGameState = {
      pieces, groups, pieceGroup, nextGroupId,
      elapsedAtSave, boardH, pieceW, pieceH, puzzleOffsetX, puzzleOffsetY,
    };

    return {
      id: gameId,
      configId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      difficulty,
      cols,
      rows,
      thumbnailDataUrl: thumbnailRef.current || referenceDataUrl,
      croppedImageDataUrl: referenceDataUrl,
      savedState,
    };
  }, []);

  const handleSaveToSlot = useCallback((existing: GameHistoryRecord | null, slotIndex: number) => {
    const record = buildRecord();
    if (!record) return;
    // 覆蓋原始 slot（同 gameId）直接儲存；其他 slot 產生新的 gameId
    const isOriginSlot = existing?.id === record.id;
    const finalRecord = isOriginSlot
      ? record
      : { ...record, id: crypto.randomUUID(), createdAt: Date.now() };
    // 確認是否已存在相同 gameId 的紀錄（從歷史續玩後保存到原 slot）
    const existingInHistory = getGameHistory().find((r) => r.id === finalRecord.id);
    if (existingInHistory) {
      saveGameHistoryAtSlot({ ...finalRecord, createdAt: existingInHistory.createdAt }, slotIndex);
    } else {
      saveGameHistoryAtSlot(finalRecord, slotIndex);
    }
    setShowSavePanel(false);
    dispatch(resetGame());
  }, [buildRecord, dispatch]);

  const isPlaying = phase === 'playing' || phase === 'complete';

  return (
    <>
    <div className="flex-shrink-0 bg-gray-800 text-white px-4 py-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 min-h-[64px]">
      {/* App 名稱 */}
      <span className="text-base font-bold tracking-wide text-white/90 mr-1">
        拼圖樂
      </span>

      {/* 難度 + 格數 */}
      {isPlaying && cols > 0 && (
        <span className="text-xs text-gray-300 bg-gray-700 rounded px-2 py-0.5 whitespace-nowrap">
          {DIFFICULTY_LABEL[difficulty] ?? difficulty}・{cols}×{rows}
        </span>
      )}

      <div className="flex-1" />

      {/* 計時器 */}
      {isPlaying && (
        <div className="font-mono text-sm font-semibold tracking-wider text-white/90 whitespace-nowrap">
          {formatTime(displayElapsed)}
        </div>
      )}

      {/* 遊戲控制按鈕（playing phase） */}
      {phase === 'playing' && (
        <div className="flex gap-1.5 flex-shrink-0 flex-wrap justify-end">
          <button
            onClick={() => dispatch(toggleImagePreview())}
            className="px-2.5 py-1 text-xs bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors whitespace-nowrap"
          >
            查看參考圖
          </button>
          <button
            onClick={() => dispatch(isPaused ? resumeGame() : pauseGame())}
            className="px-2.5 py-1 text-xs bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors whitespace-nowrap"
          >
            {isPaused ? '繼續' : '暫停'}
          </button>
          <button
            onClick={() => setShowSavePanel(true)}
            className="px-2.5 py-1 text-xs bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors whitespace-nowrap"
          >
            保存並結束
          </button>
          <button
            onClick={() => setShowExitConfirm(true)}
            className="px-2.5 py-1 text-xs bg-red-700 hover:bg-red-600 rounded-lg transition-colors whitespace-nowrap"
          >
            結束遊戲
          </button>
        </div>
      )}
    </div>

    {showSavePanel && (
      <SavePanel
        gameId={gameId}
        onSave={handleSaveToSlot}
        onClose={() => setShowSavePanel(false)}
      />
    )}

    {showExitConfirm && (
      <ConfirmDialog
        title="確定要結束遊戲嗎？"
        message="目前進度不會被保存，確定要結束嗎？"
        confirmText="確定結束"
        cancelText="取消"
        danger
        onConfirm={() => {
          setShowExitConfirm(false);
          dispatch(resetGame());
        }}
        onCancel={() => setShowExitConfirm(false)}
      />
    )}
    </>
  );
}
