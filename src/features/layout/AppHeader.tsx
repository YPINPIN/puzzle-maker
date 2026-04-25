import { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import {
  pauseGame,
  userPauseGame,
  resumeGame,
  toggleImagePreview,
  resetGame,
} from '../../store/puzzleSlice';
import { getGameHistory, saveGameHistoryAtSlot } from '../../lib/gameHistory';
import { clearDraft } from '../../lib/gameDraft';
import type { GameHistoryRecord, InProgressGameState } from '../../types/puzzle';
import SavePanel from '../game/SavePanel';
import { Icon, type IconName } from '../../components/Icon';

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: '簡單',
  normal: '普通',
  hard: '困難',
  expert: '專家',
};

const CREST: Record<string, IconName> = {
  easy: 'crest-easy',
  normal: 'crest-normal',
  hard: 'crest-hard',
  expert: 'crest-expert',
};

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m.toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
}

export default function AppHeader({ onExitRequest }: { onExitRequest?: () => void }) {
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
  const boardW = useSelector((s: RootState) => s.puzzle.boardW);
  const boardH = useSelector((s: RootState) => s.puzzle.boardH);
  const pieceW = useSelector((s: RootState) => s.puzzle.pieceW);
  const pieceH = useSelector((s: RootState) => s.puzzle.pieceH);
  const puzzleOffsetX = useSelector((s: RootState) => s.puzzle.puzzleOffsetX);
  const puzzleOffsetY = useSelector((s: RootState) => s.puzzle.puzzleOffsetY);

  const [displayElapsed, setDisplayElapsed] = useState(0);
  const [showSavePanel, setShowSavePanel] = useState(false);
  const thumbnailRef = useRef<string>('');

  // 每次 render 同步最新值，讓 handleSaveToSlot 永遠拿到最新狀態
  const saveDataRef = useRef({
    gameId, configId, startTime, isPaused, pausedAt, pauseOffset,
    referenceDataUrl, pieces, groups, pieceGroup, nextGroupId,
    boardW, boardH, pieceW, pieceH, puzzleOffsetX, puzzleOffsetY,
    difficulty, cols, rows,
  });
  saveDataRef.current = {
    gameId, configId, startTime, isPaused, pausedAt, pauseOffset,
    referenceDataUrl, pieces, groups, pieceGroup, nextGroupId,
    boardW, boardH, pieceW, pieceH, puzzleOffsetX, puzzleOffsetY,
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
      boardW, boardH, pieceW, pieceH, puzzleOffsetX, puzzleOffsetY,
      difficulty, cols, rows,
    } = saveDataRef.current;

    if (!gameId || !startTime || !referenceDataUrl) return null;

    const now = Date.now();
    const elapsedAtSave = isPaused
      ? Math.max(0, (pausedAt ?? now) - startTime - pauseOffset)
      : Math.max(0, now - startTime - pauseOffset);

    const savedState: InProgressGameState = {
      pieces, groups, pieceGroup, nextGroupId,
      elapsedAtSave, boardW, boardH, pieceW, pieceH, puzzleOffsetX, puzzleOffsetY,
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
    clearDraft();
    setShowSavePanel(false);
    dispatch(resetGame());
  }, [buildRecord, dispatch]);

  const isPlaying = phase === 'playing' || phase === 'complete';

  return (
    <>
    <div
      className="flex-shrink-0 text-white px-4 py-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 min-h-[64px] relative"
      style={{
        background: 'linear-gradient(180deg, #251E15 0%, #1A140D 100%)',
        borderBottom: '1px solid #3A2F25',
        boxShadow: 'inset 0 -1px 0 rgba(244,165,43,.2), 0 2px 8px rgba(0,0,0,.3)',
      }}
    >
      {/* App 名稱 */}
      <span className="flex items-center gap-2 mr-1">
        <Icon name="brand-mark" size={24} />
        <span className="text-base font-black tracking-wide text-paper-100">拼圖樂</span>
      </span>

      {/* 難度 + 格數 */}
      {isPlaying && cols > 0 && (
        <span
          className="inline-flex items-center gap-1.5 text-xs font-bold rounded-full px-2.5 py-0.5 whitespace-nowrap"
          style={{
            background: 'rgba(244,165,43,.14)',
            color: '#F5B13F',
            border: '1px solid rgba(244,165,43,.35)',
          }}
        >
          <Icon name={CREST[difficulty] ?? 'crest-easy'} size={16} />
          <span className="translate-y-px">{DIFFICULTY_LABEL[difficulty] ?? difficulty}・{cols}×{rows}</span>
        </span>
      )}

      <div className="flex-1" />

      {/* 計時器 */}
      {isPlaying && (
        <div className="timer-box whitespace-nowrap">
          <Icon name="ic-timer" size={16} style={{ color: '#F5B13F' }} />
          <span className="translate-y-px">{formatTime(displayElapsed)}</span>
        </div>
      )}

      {/* 遊戲控制按鈕（playing phase） */}
      {phase === 'playing' && (
        <div className="flex flex-wrap gap-2 flex-shrink-0">
          <button
            onClick={() => dispatch(toggleImagePreview())}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all hover:brightness-110"
            style={{ background: '#3A2F25', border: '1px solid #5A4B38', color: '#F4ECDE' }}
          >
            <Icon name="ic-eye" size={16} /> 參考圖
          </button>
          <button
            onClick={() => dispatch(isPaused ? resumeGame() : userPauseGame())}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all hover:brightness-110"
            style={{ background: '#3A2F25', border: '1px solid #5A4B38', color: '#F4ECDE' }}
          >
            <Icon name={isPaused ? 'ic-play' : 'ic-pause'} size={16} /> {isPaused ? '繼續' : '暫停'}
          </button>
          <button
            onClick={() => {
              dispatch(pauseGame());   // reducer 有 guard：已暫停則 no-op
              setShowSavePanel(true);
            }}
            className="btn-primary px-3 py-1.5 text-xs"
          >
            <Icon name="ic-save" size={16} /> 保存並結束
          </button>
          <button
            onClick={() => onExitRequest?.()}
            className="btn-danger px-3 py-1.5 text-xs"
          >
            結束
          </button>
        </div>
      )}

    </div>

    {showSavePanel && (
      <SavePanel
        gameId={gameId}
        onSave={handleSaveToSlot}
        onClose={() => {
          dispatch(resumeGame());   // reducer 有 guard：未暫停則 no-op
          setShowSavePanel(false);
        }}
      />
    )}

</>
  );
}
