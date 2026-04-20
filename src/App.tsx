import { useRef } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from './store';
import HomePage from './features/home/HomePage';
import ImageUpload from './features/upload/ImageUpload';
import DifficultySelector from './features/config/DifficultySelector';
import CropPreview from './features/crop/CropPreview';
import PuzzleBoard from './features/game/PuzzleBoard';
import CompletionOverlay from './features/complete/CompletionOverlay';
import AppHeader from './features/layout/AppHeader';
import { useGameDraft } from './features/game/useGameDraft';

export default function App() {
  const phase = useSelector((s: RootState) => s.puzzle.phase);
  const canvasMapRef = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const pathMapRef = useRef<Map<number, Path2D>>(new Map());

  useGameDraft();

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
    </div>
  );
}
