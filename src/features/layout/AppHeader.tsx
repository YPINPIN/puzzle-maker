import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import { usePhase } from '../../lib/usePhase';
import { pauseGame, userPauseGame, resumeGame, toggleImagePreview, togglePreviewHint, resetGame } from '../../store/puzzleSlice';
import { getGameHistory, saveGameHistoryAtSlot } from '../../lib/gameHistory';
import { clearDraft } from '../../lib/gameDraft';
import type { GameHistoryRecord, InProgressGameState } from '../../types/puzzle';
import SavePanel from '../game/SavePanel';
import { Icon } from '../../components/Icon';
import { DIFFICULTY_LABEL, CREST } from '../../lib/difficulty';
import { formatTimer } from '../../lib/format';
import { isMuted } from '../../lib/soundEngine';
import VolumeModal from '../../components/VolumeModal';

type Props = { leaveHandlerRef: React.MutableRefObject<(() => void) | null> };

export default function AppHeader({ leaveHandlerRef }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const phase = usePhase();
  const { isComplete, difficulty, cols, rows, startTime, isPaused, pausedAt, pauseOffset, gameId, configId, referenceDataUrl, pieces, groups, pieceGroup, nextGroupId, boardW, boardH, pieceW, pieceH, puzzleOffsetX, puzzleOffsetY, showPreviewHint } = useSelector((s: RootState) => s.puzzle, shallowEqual);

  const [, setTick] = useState(0);
  const [showSavePanel, setShowSavePanel] = useState(false);
  const [showVolumeModal, setShowVolumeModal] = useState(false);
  const [muted, setMuted] = useState(() => isMuted());

  // 每次 render 同步最新值，讓 handleSaveToSlot 永遠拿到最新狀態
  const saveDataRef = useRef({
    gameId,
    configId,
    startTime,
    isPaused,
    pausedAt,
    pauseOffset,
    referenceDataUrl,
    pieces,
    groups,
    pieceGroup,
    nextGroupId,
    boardW,
    boardH,
    pieceW,
    pieceH,
    puzzleOffsetX,
    puzzleOffsetY,
    difficulty,
    cols,
    rows,
    showPreviewHint,
  });
  useLayoutEffect(() => {
    saveDataRef.current = {
      gameId,
      configId,
      startTime,
      isPaused,
      pausedAt,
      pauseOffset,
      referenceDataUrl,
      pieces,
      groups,
      pieceGroup,
      nextGroupId,
      boardW,
      boardH,
      pieceW,
      pieceH,
      puzzleOffsetX,
      puzzleOffsetY,
      difficulty,
      cols,
      rows,
      showPreviewHint,
    };
  });

  const computeElapsed = useCallback(() => {
    if (!startTime) return 0;
    const base = isPaused ? (pausedAt ?? Date.now()) : Date.now();
    return Math.max(0, base - startTime - pauseOffset);
  }, [startTime, isPaused, pausedAt, pauseOffset]);

  useEffect(() => {
    if (!startTime || isPaused) return;
    const id = setInterval(() => setTick((n) => n + 1), 500);
    return () => clearInterval(id);
  }, [startTime, isPaused]);

  const displayElapsed = computeElapsed();

  const buildRecord = useCallback((): GameHistoryRecord | null => {
    const { gameId, configId, startTime, isPaused, pausedAt, pauseOffset, referenceDataUrl, pieces, groups, pieceGroup, nextGroupId, boardW, boardH, pieceW, pieceH, puzzleOffsetX, puzzleOffsetY, difficulty, cols, rows, showPreviewHint } = saveDataRef.current;

    if (!gameId || !startTime || !referenceDataUrl) return null;

    const now = Date.now();
    const elapsedAtSave = isPaused ? Math.max(0, (pausedAt ?? now) - startTime - pauseOffset) : Math.max(0, now - startTime - pauseOffset);

    const savedState: InProgressGameState = {
      pieces,
      groups,
      pieceGroup,
      nextGroupId,
      elapsedAtSave,
      boardW,
      boardH,
      pieceW,
      pieceH,
      puzzleOffsetX,
      puzzleOffsetY,
      showPreviewHint,
    };

    return {
      id: gameId,
      configId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      difficulty,
      cols,
      rows,
      savedState,
    };
  }, []);

  const handleSaveToSlot = useCallback(
    (existing: GameHistoryRecord | null, slotIndex: number) => {
      const record = buildRecord();
      if (!record) return;
      // 覆蓋原始 slot（同 gameId）直接儲存；其他 slot 產生新的 gameId
      const isOriginSlot = existing?.id === record.id;
      const finalRecord = isOriginSlot ? record : { ...record, id: crypto.randomUUID(), createdAt: Date.now() };
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
      if (leaveHandlerRef.current) {
        leaveHandlerRef.current();
      } else {
        const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
        if (idx > 0) navigate(-idx);
        else navigate('/');
      }
    },
    [buildRecord, dispatch, navigate, leaveHandlerRef],
  );

  const isPlaying = phase === 'playing';

  return (
    <>
      <div
        className="flex-shrink-0 text-white px-4 py-2 min-h-[64px] relative"
        style={{
          background: 'linear-gradient(180deg, #251E15 0%, #1A140D 100%)',
          borderBottom: '1px solid #3A2F25',
          boxShadow: 'inset 0 -1px 0 rgba(244,165,43,.2), 0 2px 8px rgba(0,0,0,.3)',
        }}
      >
        <div className="max-w-[1440px] mx-auto w-full flex flex-wrap items-center gap-x-2 gap-y-1.5 h-full">
          {/* App 名稱 */}
          <span className="flex items-center gap-2">
            <Icon name="brand-mark" size={24} />
            <span className={`text-base font-bold tracking-wide text-paper-100${isPlaying ? ' max-sm:hidden' : ''}`}>拼圖樂</span>
          </span>

          {/* 難度 + 格數 + 預覽提示開關 */}
          {isPlaying && cols > 0 && (
            <div className="inline-flex items-center gap-2 flex-shrink-0" data-tutorial="play-difficulty">
              <span
                className="inline-flex items-center gap-1.5 text-xs font-bold rounded-full px-2.5 py-0.5 whitespace-nowrap"
                style={{
                  background: 'rgba(244,165,43,.14)',
                  color: '#F5B13F',
                  border: '1px solid rgba(244,165,43,.35)',
                }}
              >
                <Icon name={CREST[difficulty] ?? 'crest-easy'} size={16} className="max-sm:hidden" />
                <span className="translate-y-px">
                  {DIFFICULTY_LABEL[difficulty] ?? difficulty}・{cols}×{rows}
                </span>
              </span>
              <button
                onClick={() => dispatch(togglePreviewHint())}
                title={showPreviewHint ? '關閉預覽提示' : '開啟預覽提示'}
                className="inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-lg transition-all hover:brightness-110 active:scale-95"
                style={{
                  background: showPreviewHint ? 'rgba(244,165,43,.22)' : 'rgba(58,47,37,0.7)',
                  border: `1px solid ${showPreviewHint ? 'rgba(244,165,43,.5)' : '#5A4B38'}`,
                  color: showPreviewHint ? '#F5B13F' : '#7A6A55',
                }}
              >
                <Icon name="ic-lightbulb" size={15} />
              </button>
            </div>
          )}

          <div className="flex-1" />

          {/* 計時器（playing）+ 靜音按鈕（所有頁面） */}
          <div className="flex items-center gap-2">
            {isPlaying && (
              <div className="timer-box whitespace-nowrap" data-tutorial="play-timer">
                <Icon name="ic-timer" size={16} style={{ color: '#F5B13F' }} />
                <span className="translate-y-px">{formatTimer(displayElapsed)}</span>
              </div>
            )}
            <button
              onClick={() => setShowVolumeModal(true)}
              title="音量設定"
              className="inline-flex items-center justify-center px-2.5 py-1.5 rounded-xl transition-all hover:brightness-110 active:scale-95"
              style={{
                background: 'linear-gradient(180deg, #2AA39A 0%, #1E8A82 100%)',
                color: '#fff',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,.3), 0 2px 6px rgba(20,100,90,.3)',
                opacity: muted ? 0.65 : 1,
              }}
            >
              <Icon name={muted ? 'ic-volume-off' : 'ic-volume'} size={16} />
            </button>
          </div>

          {/* 遊戲控制按鈕（playing phase，完成後隱藏） */}
          {phase === 'playing' && !isComplete && (
            <div className="flex flex-wrap gap-2 flex-shrink-0">
              <button data-tutorial="play-reference" onClick={() => dispatch(toggleImagePreview())} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all hover:brightness-110" style={{ background: '#3A2F25', border: '1px solid #5A4B38', color: '#F4ECDE' }}>
                <Icon name="ic-eye" size={16} /> 參考圖
              </button>
              <button data-tutorial="play-pause" onClick={() => dispatch(userPauseGame())} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all hover:brightness-110" style={{ background: '#3A2F25', border: '1px solid #5A4B38', color: '#F4ECDE' }}>
                <Icon name="ic-pause" size={16} /> 暫停
              </button>
              <button
                data-tutorial="play-save"
                onClick={() => {
                  dispatch(pauseGame()); // reducer 有 guard：已暫停則 no-op
                  setShowSavePanel(true);
                }}
                className="btn-primary gap-1.5 px-3 py-1.5 text-xs"
              >
                <Icon name="ic-save" size={16} /> 保存並結束
              </button>
              <button data-tutorial="play-end" onClick={() => navigate('/')} className="btn-danger px-3 py-1.5 text-xs">
                結束
              </button>
            </div>
          )}
        </div>
      </div>

      {showSavePanel && (
        <SavePanel
          gameId={gameId}
          onSave={handleSaveToSlot}
          onClose={() => {
            dispatch(resumeGame()); // reducer 有 guard：未暫停則 no-op
            setShowSavePanel(false);
          }}
        />
      )}

      {showVolumeModal && (
        <VolumeModal
          onClose={() => {
            setMuted(isMuted());
            setShowVolumeModal(false);
          }}
        />
      )}
    </>
  );
}
