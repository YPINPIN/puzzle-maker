import { useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../store';
import {
  setReferenceImage, setPieces, setGameId, setConfigId,
  startGame, restoreGame, goToUpload,
} from '../../store/puzzleSlice';
import { generatePieces } from '../../lib/pieceFactory';
import { TOOLBAR_HEIGHT, MAX_CANVAS_WIDTH, TAB_RATIO, getEffectiveDPR, ZOOM_BUTTON_AVOID_W, ZOOM_BUTTON_AVOID_H, GAME_BOTTOM_BAR_HEIGHT } from '../../lib/constants';
import { getRecords } from '../../lib/records';
import type { PuzzleRecord } from '../../lib/records';
import { getDraft } from '../../lib/gameDraft';
import type { GameDraft } from '../../lib/gameDraft';
import type { GameHistoryRecord, InProgressGameState, Difficulty } from '../../types/puzzle';
import RecordsModal from '../upload/RecordsModal';
import ConfirmDialog from '../../components/ConfirmDialog';
import ShareCodeModal from '../../components/ShareCodeModal';
import { Icon } from '../../components/Icon';

type Props = {
  canvasMapRef: React.RefObject<Map<number, HTMLCanvasElement>>;
  pathMapRef: React.RefObject<Map<number, Path2D>>;
};

export default function HomePage({ canvasMapRef, pathMapRef }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const [showRecords, setShowRecords] = useState<'quick' | 'history' | null>(null);
  const [showFullWarning, setShowFullWarning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [shareTarget, setShareTarget] = useState<PuzzleRecord | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [currentDraft, setCurrentDraft] = useState<GameDraft | null>(null);

  useEffect(() => {
    setCurrentDraft(getDraft());
  }, []);

  function handleNewPuzzle() {
    if (getRecords().length >= 10) {
      setShowFullWarning(true);
      return;
    }
    dispatch(goToUpload());
  }

  const applyRecord = useCallback(async (record: PuzzleRecord) => {
    if (!record.croppedImageDataUrl || isLoading) return;
    setIsLoading(true);
    try {
      const displayW = Math.min(window.innerWidth, MAX_CANVAS_WIDTH);
      const displayH = window.innerHeight - TOOLBAR_HEIGHT - GAME_BOTTOM_BAR_HEIGHT;
      const dpr = getEffectiveDPR();
      const canvasW = displayW * dpr;
      const canvasH = displayH * dpr;

      const result = await generatePieces(
        record.croppedImageDataUrl,
        record.cols,
        record.rows,
        canvasW,
        canvasH,
        undefined,
        undefined,
        { w: ZOOM_BUTTON_AVOID_W * dpr, h: ZOOM_BUTTON_AVOID_H * dpr }
      );

      canvasMapRef.current.clear();
      result.canvasMap.forEach((c, id) => canvasMapRef.current.set(id, c));
      pathMapRef.current.clear();
      result.pathMap.forEach((p, id) => pathMapRef.current.set(id, p));

      dispatch(setReferenceImage(record.croppedImageDataUrl));
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
    } finally {
      setIsLoading(false);
    }
  }, [canvasMapRef, pathMapRef, dispatch, isLoading]);

  const continueGame = useCallback(async (historyRecord: GameHistoryRecord) => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const { savedState } = historyRecord;
      const displayW = Math.min(window.innerWidth, MAX_CANVAS_WIDTH);
      const displayH = window.innerHeight - TOOLBAR_HEIGHT - GAME_BOTTOM_BAR_HEIGHT;
      const dpr = getEffectiveDPR();
      const canvasW = displayW * dpr;
      const canvasH = displayH * dpr;

      const result = await generatePieces(
        historyRecord.croppedImageDataUrl,
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
        referenceDataUrl: historyRecord.croppedImageDataUrl,
        difficulty: historyRecord.difficulty as Difficulty,
        cols: historyRecord.cols,
        rows: historyRecord.rows,
        gameId: historyRecord.id,
        configId: historyRecord.configId ?? null,
      }));
    } finally {
      setIsLoading(false);
    }
  }, [canvasMapRef, pathMapRef, dispatch, isLoading]);

  const resumeDraft = useCallback(async () => {
    const draft = getDraft();
    if (!draft || isLoading) return;
    const fakeRecord: GameHistoryRecord = {
      id: draft.gameId,
      configId: draft.configId,
      createdAt: 0,
      updatedAt: 0,
      difficulty: draft.difficulty,
      cols: draft.cols,
      rows: draft.rows,
      thumbnailDataUrl: '',
      croppedImageDataUrl: draft.croppedImageDataUrl,
      savedState: draft.savedState,
      isCompleted: false,
    };
    await continueGame(fakeRecord);
  }, [continueGame, isLoading]);

  return (
    <div
      className="h-full overflow-y-auto flex flex-col items-center justify-center p-6"
      style={{ background: 'var(--pg-warm)' }}
    >
      <div className="w-full max-w-sm flex flex-col gap-4">

        {currentDraft && (
          <MenuCard
            icon={
              <img
                src={currentDraft.croppedImageDataUrl}
                className="w-full h-full object-cover rounded-xl"
                alt=""
              />
            }
            title="繼續上局"
            subtitle={`${DIFFICULTY_LABEL[currentDraft.difficulty] ?? currentDraft.difficulty}・${currentDraft.cols}×${currentDraft.rows}`}
            onClick={resumeDraft}
            variant="resume"
          />
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

        {isLoading && (
          <p className="text-sm text-brand-600 animate-pulse text-center mt-2">正在載入遊戲…</p>
        )}
      </div>

      {showFullWarning && (
        <ConfirmDialog
          title="快捷設定已達上限"
          message="快捷設定已儲存 10 筆，無法建立新設定。請先至「快速開局」刪除不需要的設定後再試。"
          confirmText="前往快速開局"
          cancelText="取消"
          onConfirm={() => { setShowFullWarning(false); setShowRecords('quick'); }}
          onCancel={() => setShowFullWarning(false)}
        />
      )}

      {showRecords && (
        <RecordsModal
          mode={showRecords}
          onClose={() => setShowRecords(null)}
          onApply={applyRecord}
          onContinue={continueGame}
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

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: '簡單', normal: '普通', hard: '困難', expert: '專家',
};

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
        <p className="font-extrabold text-base text-paper-900">
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
