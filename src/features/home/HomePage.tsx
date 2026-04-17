import { useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../store';
import {
  setReferenceImage, setPieces, setGameId, setConfigId,
  startGame, restoreGame, goToUpload,
} from '../../store/puzzleSlice';
import { generatePieces } from '../../lib/pieceFactory';
import { TOOLBAR_HEIGHT } from '../../lib/constants';
import { getRecords } from '../../lib/records';
import type { PuzzleRecord } from '../../lib/records';
import type { GameHistoryRecord, InProgressGameState, Difficulty } from '../../types/puzzle';
import RecordsModal from '../upload/RecordsModal';
import ConfirmDialog from '../../components/ConfirmDialog';

type Props = {
  canvasMapRef: React.RefObject<Map<number, HTMLCanvasElement>>;
  pathMapRef: React.RefObject<Map<number, Path2D>>;
};

export default function HomePage({ canvasMapRef, pathMapRef }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const [showRecords, setShowRecords] = useState<'quick' | 'history' | null>(null);
  const [showFullWarning, setShowFullWarning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
      const viewH = window.innerHeight - TOOLBAR_HEIGHT;
      const viewW = window.innerWidth;
      const canvasSize = 2 * Math.min(viewW, viewH);

      const result = await generatePieces(
        record.croppedImageDataUrl,
        record.cols,
        record.rows,
        viewW,
        viewH,
        canvasSize,
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
        boardH: canvasSize,
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
      const viewH = window.innerHeight - TOOLBAR_HEIGHT;
      const viewW = window.innerWidth;
      const canvasSize = 2 * Math.min(viewW, viewH);

      const result = await generatePieces(
        historyRecord.croppedImageDataUrl,
        historyRecord.cols,
        historyRecord.rows,
        viewW,
        viewH,
        canvasSize,
      );

      canvasMapRef.current.clear();
      result.canvasMap.forEach((c, id) => canvasMapRef.current.set(id, c));
      pathMapRef.current.clear();
      result.pathMap.forEach((p, id) => pathMapRef.current.set(id, p));

      const scale = result.pieceW / savedState.pieceW;
      const odx = result.puzzleOffsetX - savedState.puzzleOffsetX * scale;
      const ody = result.puzzleOffsetY - savedState.puzzleOffsetY * scale;
      const maxX = canvasSize - result.pieceW;
      const maxY = canvasSize - result.pieceH;
      const scaledPieces = savedState.pieces.map((p) => {
        const scaledX = Math.round(p.currentPosition.x * scale + odx);
        const scaledY = Math.round(p.currentPosition.y * scale + ody);
        return {
          ...p,
          currentPosition: {
            x: p.isSnapped ? scaledX : Math.max(0, Math.min(maxX, scaledX)),
            y: p.isSnapped ? scaledY : Math.max(0, Math.min(maxY, scaledY)),
          },
          correctPosition: {
            x: Math.round(p.correctPosition.x * scale + odx),
            y: Math.round(p.correctPosition.y * scale + ody),
          },
        };
      });
      const scaledSavedState: InProgressGameState = {
        ...savedState,
        pieces: scaledPieces,
        boardH: canvasSize,
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

  return (
    <div className="h-full overflow-y-auto flex flex-col items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-sm flex flex-col gap-4">

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
          <p className="text-sm text-blue-500 animate-pulse text-center mt-2">正在載入遊戲…</p>
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
        />
      )}
    </div>
  );
}

type CardVariant = 'primary' | 'secondary';

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
      className={`w-full flex items-center gap-4 p-5 rounded-2xl border text-left transition-all active:scale-[0.98] ${
        variant === 'primary'
          ? 'bg-blue-500 hover:bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-200'
          : 'bg-white hover:bg-gray-50 border-gray-200 hover:border-gray-300 text-gray-800 shadow-sm'
      }`}
    >
      <div className={`w-12 h-12 flex-shrink-0 rounded-xl flex items-center justify-center ${
        variant === 'primary' ? 'bg-white/20' : 'bg-gray-100'
      }`}>
        {icon}
      </div>
      <div>
        <p className={`font-bold text-base ${variant === 'primary' ? 'text-white' : 'text-gray-800'}`}>
          {title}
        </p>
        <p className={`text-sm mt-0.5 ${variant === 'primary' ? 'text-blue-100' : 'text-gray-500'}`}>
          {subtitle}
        </p>
      </div>
      <div className="ml-auto">
        <svg
          className={`w-5 h-5 ${variant === 'primary' ? 'text-white/70' : 'text-gray-400'}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}

function IconNew() {
  return (
    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function IconSave() {
  return (
    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
    </svg>
  );
}

function IconQuick() {
  return (
    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}
