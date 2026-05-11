import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../store';
import {
  setReferenceImage, setPieces, setGameId, setConfigId,
  startGame, restoreGame, setDifficulty,
} from '../../store/puzzleSlice';
import { generatePieces } from '../../lib/pieceFactory';
import { TOOLBAR_HEIGHT, MAX_CANVAS_WIDTH, TAB_RATIO, getEffectiveDPR, ZOOM_BUTTON_AVOID_W, ZOOM_BUTTON_AVOID_H, GAME_BOTTOM_BAR_HEIGHT, SCATTER_EDGE_PAD_CSS } from '../../lib/constants';
import { getRecords } from '../../lib/records';
import type { PuzzleRecord } from '../../lib/records';
import { getDraft, clearDraft } from '../../lib/gameDraft';
import type { GameDraft } from '../../lib/gameDraft';
import { getImage, waitForImageCache } from '../../lib/imageCache';
import type { GameHistoryRecord, InProgressGameState, Difficulty } from '../../types/puzzle';
import RecordsModal from '../upload/RecordsModal';
import ConfirmDialog, { Hi, HiAccent, HiDanger } from '../../components/ConfirmDialog';
import ShareCodeModal from '../../components/ShareCodeModal';
import { Icon } from '../../components/Icon';
import PageFooter from '../../components/PageFooter';
import { DIFFICULTY_LABEL, CREST } from '../../lib/difficulty';
import { formatDate, formatDuration } from '../../lib/format';

type Props = {
  canvasMapRef: React.RefObject<Map<number, HTMLCanvasElement>>;
  pathMapRef: React.RefObject<Map<number, Path2D>>;
};

export default function HomePage({ canvasMapRef, pathMapRef }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { key: locationKey } = useLocation();
  const [showRecords, setShowRecords] = useState<'quick' | 'history' | null>(null);
  const [showFullWarning, setShowFullWarning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [shareTarget, setShareTarget] = useState<PuzzleRecord | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [currentDraft, setCurrentDraft] = useState<GameDraft | null>(null);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [imageCacheReady, setImageCacheReady] = useState(false);

  useEffect(() => {
    waitForImageCache().then(() => setImageCacheReady(true));
  }, []);

  useEffect(() => {
    setCurrentDraft(getDraft());
  }, [locationKey, imageCacheReady]);

  function guardDraft(action: () => void) {
    if (getDraft()) {
      setPendingAction(() => action);
    } else {
      action();
    }
  }

  function handleNewPuzzle() {
    if (getRecords().length >= 10) {
      setShowFullWarning(true);
      return;
    }
    guardDraft(() => navigate('/upload'));
  }

  const applyRecord = useCallback(async (record: PuzzleRecord) => {
    const image = getImage(record.id);
    if (!image || isLoading) return;
    setIsLoading(true);
    try {
      const displayW = Math.min(window.innerWidth, MAX_CANVAS_WIDTH);
      const displayH = window.innerHeight - TOOLBAR_HEIGHT - GAME_BOTTOM_BAR_HEIGHT;
      const dpr = getEffectiveDPR();
      const canvasW = displayW * dpr;
      const canvasH = displayH * dpr;

      const result = await generatePieces(
        image,
        record.cols,
        record.rows,
        canvasW,
        canvasH,
        undefined,
        undefined,
        { w: ZOOM_BUTTON_AVOID_W * dpr, h: ZOOM_BUTTON_AVOID_H * dpr },
        SCATTER_EDGE_PAD_CSS * dpr
      );

      canvasMapRef.current.clear();
      result.canvasMap.forEach((c, id) => canvasMapRef.current.set(id, c));
      pathMapRef.current.clear();
      result.pathMap.forEach((p, id) => pathMapRef.current.set(id, p));

      dispatch(setDifficulty(record.difficulty as Difficulty));
      dispatch(setReferenceImage(image));
      dispatch(setPieces({
        pieces: result.pieces,
        rows: result.rows,
        cols: result.cols,
        boardW: canvasW,
        boardH: canvasH,
        pieceW: result.pieceW,
        pieceH: result.pieceH,
        puzzleOffsetX: result.puzzleOffsetX,
        puzzleOffsetY: result.puzzleOffsetY,
      }));
      dispatch(setConfigId(record.id));
      dispatch(setGameId(crypto.randomUUID()));
      dispatch(startGame());
      navigate('/play');
    } finally {
      setIsLoading(false);
    }
  }, [canvasMapRef, pathMapRef, dispatch, navigate, isLoading]);

  const continueGame = useCallback(async (historyRecord: GameHistoryRecord) => {
    const image = getImage(historyRecord.configId);
    if (!image || isLoading) return;
    setIsLoading(true);
    try {
      const { savedState } = historyRecord;
      const displayW = Math.min(window.innerWidth, MAX_CANVAS_WIDTH);
      const displayH = window.innerHeight - TOOLBAR_HEIGHT - GAME_BOTTOM_BAR_HEIGHT;
      const dpr = getEffectiveDPR();
      const canvasW = displayW * dpr;
      const canvasH = displayH * dpr;

      const result = await generatePieces(
        image,
        historyRecord.cols,
        historyRecord.rows,
        canvasW,
        canvasH,
        undefined,
        savedState.pieces
      );

      canvasMapRef.current.clear();
      result.canvasMap.forEach((c, id) => canvasMapRef.current.set(id, c));
      pathMapRef.current.clear();
      result.pathMap.forEach((p, id) => pathMapRef.current.set(id, p));

      // 正方形 piece，scaleX = scaleY；puzzleOffset 需各自計算補正量
      const scaleX = result.pieceW / savedState.pieceW;
      const scaleY = result.pieceH / savedState.pieceH;
      const odx = result.puzzleOffsetX - savedState.puzzleOffsetX * scaleX;
      const ody = result.puzzleOffsetY - savedState.puzzleOffsetY * scaleY;
      const TAB_SIZE = Math.floor(result.pieceW * TAB_RATIO);
      const maxX = canvasW - result.pieceW - TAB_SIZE;
      const maxY = canvasH - result.pieceH - TAB_SIZE;
      const scaledPieces = savedState.pieces.map((p) => {
        const scaledX = Math.round(p.currentPosition.x * scaleX + odx);
        const scaledY = Math.round(p.currentPosition.y * scaleY + ody);
        return {
          ...p,
          currentPosition: {
            x: p.isSnapped ? scaledX : Math.max(TAB_SIZE, Math.min(maxX, scaledX)),
            y: p.isSnapped ? scaledY : Math.max(TAB_SIZE, Math.min(maxY, scaledY)),
          },
          correctPosition: {
            x: Math.round(p.correctPosition.x * scaleX + odx),
            y: Math.round(p.correctPosition.y * scaleY + ody),
          },
        };
      });
      const scaledSavedState: InProgressGameState = {
        ...savedState,
        boardW: canvasW,
        boardH: canvasH,
        pieces: scaledPieces,
        pieceW: result.pieceW,
        pieceH: result.pieceH,
        puzzleOffsetX: result.puzzleOffsetX,
        puzzleOffsetY: result.puzzleOffsetY,
      };

      dispatch(restoreGame({
        pieces: result.pieces,
        savedState: scaledSavedState,
        referenceDataUrl: image,
        difficulty: historyRecord.difficulty as Difficulty,
        cols: historyRecord.cols,
        rows: historyRecord.rows,
        gameId: historyRecord.id,
        configId: historyRecord.configId ?? null,
      }));
      navigate('/play');
    } finally {
      setIsLoading(false);
    }
  }, [canvasMapRef, pathMapRef, dispatch, navigate, isLoading]);

  const resumeDraft = useCallback(async () => {
    const draft = getDraft();
    if (!draft || isLoading) return;
    const image = getImage(draft.configId);
    if (!image) {
      clearDraft();
      setCurrentDraft(null);
      return;
    }
    const fakeRecord: GameHistoryRecord = {
      id: draft.gameId,
      configId: draft.configId,
      createdAt: 0,
      updatedAt: 0,
      difficulty: draft.difficulty,
      cols: draft.cols,
      rows: draft.rows,
      savedState: draft.savedState,
      isCompleted: false,
    };
    await continueGame(fakeRecord);
  }, [continueGame, isLoading]);

  return (
    <div
      className="h-full overflow-y-auto flex flex-col items-center p-6"
      style={{ background: 'var(--pg-warm)' }}
    >
      <div className="flex-1 flex flex-col items-center justify-center w-full">
        <div className="w-full max-w-sm flex flex-col gap-4">

          {currentDraft && (
            <DraftCard draft={currentDraft} onClick={resumeDraft} />
          )}

          <MenuCard
            icon={<IconNew />}
            title="建立新拼圖"
            subtitle="上傳圖片，從頭開始"
            onClick={handleNewPuzzle}
            variant="primary"
          />
          <MenuCard
            icon={<IconSave />}
            title="讀取存檔"
            subtitle="從上次中斷的地方繼續"
            onClick={() => setShowRecords('history')}
            variant="secondary"
          />
          <MenuCard
            icon={<IconQuick />}
            title="快速開局"
            subtitle="從已儲存的設定立即開始"
            onClick={() => setShowRecords('quick')}
            variant="secondary"
          />

        </div>
      </div>

      <PageFooter />

      {showFullWarning && (
        <ConfirmDialog
          title="快捷設定已達上限"
          message={<>快捷設定已儲存 10 筆，無法建立新設定。請先至<HiAccent>「快速開局」</HiAccent>刪除不需要的設定後再試。</>}
          confirmText="前往快速開局"
          cancelText="取消"
          onConfirm={() => { setShowFullWarning(false); setShowRecords('quick'); }}
          onCancel={() => setShowFullWarning(false)}
        />
      )}

      {pendingAction && (
        <ConfirmDialog
          title="有未儲存的遊戲進度"
          message={<>繼續後將立即<HiDanger>刪除暫存紀錄</HiDanger>，無法再從「繼續上局」恢復。{'\n'}如需保留進度，請先點選<HiAccent>「繼續上局」</HiAccent>並使用<Hi>「保存並結束」</Hi>儲存。</>}
          confirmText="確定刪除並繼續"
          cancelText="取消"
          danger
          onConfirm={() => {
            clearDraft();
            setCurrentDraft(null);
            const action = pendingAction;
            setPendingAction(null);
            action();
          }}
          onCancel={() => setPendingAction(null)}
        />
      )}

      {showRecords && (
        <RecordsModal
          mode={showRecords}
          onClose={() => setShowRecords(null)}
          onApply={(record) => { setShowRecords(null); guardDraft(() => applyRecord(record)); }}
          onContinue={(record) => { setShowRecords(null); guardDraft(() => continueGame(record)); }}
          onShare={(record) => setShareTarget(record)}
          onImportCode={() => setShowImportDialog(true)}
        />
      )}

      {shareTarget && (
        <ShareCodeModal
          mode="share"
          record={shareTarget}
          onClose={() => setShareTarget(null)}
        />
      )}

      {showImportDialog && (
        <ShareCodeModal
          mode="import"
          onImport={(record) => {
            setShowImportDialog(false);
            setShowRecords(null);
            applyRecord(record);
          }}
          onClose={() => setShowImportDialog(false)}
        />
      )}
    </div>
  );
}


function DraftCard({ draft, onClick }: { draft: import('../../lib/gameDraft').GameDraft; onClick: () => void }) {
  const snapped = draft.savedState.pieces.filter((p) => p.isSnapped).length;
  const total = draft.savedState.pieces.length;
  const progressPct = total > 0 ? Math.round((snapped / total) * 100) : 0;
  return (
    <button
      onClick={onClick}
      className="w-full flex gap-3 p-3 rounded-2xl border-2 text-left transition-all active:scale-[0.99] card-lift bg-accent-500/10 hover:bg-accent-500/15 border-accent-500/40 hover:border-accent-500/70 shadow-sm"
    >
      <div className="w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden bg-paper-200">
        <img src={getImage(draft.configId) ?? ''} alt="" className="w-full h-full object-contain" />
      </div>
      <div className="flex flex-col justify-between flex-1 min-w-0 gap-0.5">
        <p className="text-sm font-bold text-accent-500">繼續上局</p>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 text-xs text-paper-600">
            <Icon name={CREST[draft.difficulty] ?? 'crest-easy'} size={13} />
            <span className="translate-y-px">{DIFFICULTY_LABEL[draft.difficulty] ?? draft.difficulty}</span>
          </span>
          <span className="text-xs text-paper-600">{draft.cols}×{draft.rows}（{total} 片）</span>
          <span
            className="text-xs px-1.5 py-0.5 rounded-full font-bold border"
            style={{ background: 'var(--color-brand-50)', color: 'var(--color-brand-700)', borderColor: 'rgba(244,165,43,.3)' }}
          >
            {progressPct}% 完成
          </span>
        </div>
        {draft.savedAt != null && (
          <p className="text-xs text-paper-500 truncate">暫存於 {formatDate(draft.savedAt)}</p>
        )}
        <p className="text-xs text-paper-600">
          已拼 {snapped} / {total} 片・已用 {formatDuration(draft.savedState.elapsedAtSave)}
        </p>
      </div>
    </button>
  );
}

type CardVariant = 'primary' | 'secondary' | 'resume';

function MenuCard({
  icon, title, subtitle, onClick, variant,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
  variant: CardVariant;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 p-5 rounded-2xl border-2 text-left transition-all active:scale-[0.99] card-lift ${
        variant === 'primary'
          ? 'btn-primary border-brand-700'
          : variant === 'resume'
          ? 'bg-accent-500/10 hover:bg-accent-500/15 border-accent-500/40 hover:border-accent-500/70 shadow-sm'
          : 'bg-paper-50 hover:bg-paper-100 border-paper-300 hover:border-brand-500/50 shadow-sm'
      }`}
    >
      <div className={`w-12 h-12 flex-shrink-0 rounded-2xl flex items-center justify-center overflow-hidden ${
        variant === 'primary'
          ? 'bg-white/35 shadow-[inset_0_1px_0_rgba(255,255,255,.5)]'
          : variant === 'resume'
          ? 'bg-accent-500/20'
          : 'bg-brand-50 text-brand-600'
      }`}>
        {icon}
      </div>
      <div>
        <p className="font-bold text-base text-paper-900">
          {title}
        </p>
        <p className={`text-sm mt-0.5 font-medium ${
          variant === 'primary' ? 'text-paper-900/70'
          : variant === 'resume' ? 'text-accent-500'
          : 'text-paper-800/80'
        }`}>
          {subtitle}
        </p>
      </div>
      <div className="ml-auto">
        <Icon
          name="ic-forward"
          size={20}
          className={
            variant === 'primary' ? 'text-paper-900/60'
            : variant === 'resume' ? 'text-accent-500'
            : 'text-brand-500'
          }
        />
      </div>
    </button>
  );
}

function IconNew() {
  return <Icon name="ic-image" size={24} className="text-paper-900/80" />;
}

function IconSave() {
  return <Icon name="ic-folder" size={24} className="text-brand-600" />;
}

function IconQuick() {
  return <Icon name="ic-sparkle" size={24} className="text-brand-600" />;
}
