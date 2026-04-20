import { useRef, useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from './store';
import { resetGame } from './store/puzzleSlice';
import HomePage from './features/home/HomePage';
import ImageUpload from './features/upload/ImageUpload';
import DifficultySelector from './features/config/DifficultySelector';
import CropPreview from './features/crop/CropPreview';
import PuzzleBoard from './features/game/PuzzleBoard';
import CompletionOverlay from './features/complete/CompletionOverlay';
import AppHeader from './features/layout/AppHeader';
import ConfirmDialog from './components/ConfirmDialog';

export default function App() {
  const dispatch = useDispatch<AppDispatch>();
  const phase = useSelector((s: RootState) => s.puzzle.phase);
  const canvasMapRef = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const pathMapRef = useRef<Map<number, Path2D>>(new Map());
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

  // 攔截手機返回手勢（Android/iOS back swipe）防止遊戲進度丟失
  useEffect(() => {
    if (phase !== 'playing') return;
    history.pushState({ puzzle: true }, '');
    const onPopState = () => {
      history.pushState({ puzzle: true }, '');
      setShowQuitConfirm(true);
    };
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, [phase]);

  return (
    <div className="flex flex-col w-screen overflow-hidden overscroll-none" style={{ height: '100dvh' }}>
      <AppHeader />
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

      {showQuitConfirm && (
        <ConfirmDialog
          title="確認結束遊戲？"
          message="尚未儲存的進度將會遺失。"
          confirmText="結束遊戲"
          cancelText="繼續遊戲"
          onConfirm={() => {
            setShowQuitConfirm(false);
            dispatch(resetGame());
          }}
          onCancel={() => setShowQuitConfirm(false)}
          danger
        />
      )}
    </div>
  );
}
