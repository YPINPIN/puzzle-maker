import { useRef, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from './store';
import { resetGame, pauseGame, resumeGame } from './store/puzzleSlice';
import ConfirmDialog, { HiAccent } from './components/ConfirmDialog';
import HomePage from './features/home/HomePage';
import ImageUpload from './features/upload/ImageUpload';
import DifficultySelector from './features/config/DifficultySelector';
import CropPreview from './features/crop/CropPreview';
import PuzzleBoard from './features/game/PuzzleBoard';
import CompletionOverlay from './features/complete/CompletionOverlay';
import AppHeader from './features/layout/AppHeader';
import { useGameDraft } from './features/game/useGameDraft';
import { usePhaseHistory } from './features/game/usePhaseHistory';

export default function App() {
  const dispatch = useDispatch<AppDispatch>();
  const phase = useSelector((s: RootState) => s.puzzle.phase);
  const canvasMapRef = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const pathMapRef = useRef<Map<number, Path2D>>(new Map());

  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const { saveNow } = useGameDraft();

  const handleExitRequest = useCallback(() => {
    saveNow();
    dispatch(pauseGame());   // reducer 有 guard：已暫停則 no-op
    setShowExitConfirm(true);
  }, [dispatch, saveNow]);

  usePhaseHistory({ onInterceptBackFromPlaying: handleExitRequest });

  return (
    <div className="flex flex-col w-screen overflow-hidden overscroll-none" style={{ height: '100dvh' }}>
      <AppHeader onExitRequest={handleExitRequest} />
      <div className="flex-1 overflow-hidden min-h-0">
        {phase === 'home' && (
          <HomePage canvasMapRef={canvasMapRef} pathMapRef={pathMapRef} />
        )}
        {phase === 'upload' && <ImageUpload />}
        {phase === 'config' && <DifficultySelector />}
        {phase === 'crop' && (
          <CropPreview canvasMapRef={canvasMapRef} pathMapRef={pathMapRef} />
        )}
        {(phase === 'playing' || phase === 'complete') && (
          <PuzzleBoard canvasMapRef={canvasMapRef} pathMapRef={pathMapRef} />
        )}
        {phase === 'complete' && <CompletionOverlay />}
      </div>

      {showExitConfirm && (
        <ConfirmDialog
          title="確定要離開遊戲嗎？"
          message={<>目前進度已自動暫存，回到首頁後可從<HiAccent>「繼續上局」</HiAccent>恢復。</>}
          confirmText="確定離開"
          cancelText="繼續遊戲"
          danger
          onConfirm={() => {
            setShowExitConfirm(false);
            dispatch(resetGame());
          }}
          onCancel={() => {
            dispatch(resumeGame());   // reducer 有 guard：未暫停則 no-op
            setShowExitConfirm(false);
          }}
        />
      )}
    </div>
  );
}
