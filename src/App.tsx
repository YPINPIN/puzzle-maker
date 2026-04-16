import { useRef } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from './store';
import ImageUpload from './features/upload/ImageUpload';
import DifficultySelector from './features/config/DifficultySelector';
import CropPreview from './features/crop/CropPreview';
import PuzzleBoard from './features/game/PuzzleBoard';
import CompletionOverlay from './features/complete/CompletionOverlay';

export default function App() {
  const phase = useSelector((s: RootState) => s.puzzle.phase);
  const canvasMapRef = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const pathMapRef = useRef<Map<number, Path2D>>(new Map());

  return (
    <div className="w-screen h-screen overflow-hidden">
      {phase === 'upload' && (
        <ImageUpload canvasMapRef={canvasMapRef} pathMapRef={pathMapRef} />
      )}
      {phase === 'config' && <DifficultySelector />}
      {phase === 'crop' && (
        <CropPreview
          canvasMapRef={canvasMapRef}
          pathMapRef={pathMapRef}
        />
      )}
      {(phase === 'playing' || phase === 'complete') && (
        <PuzzleBoard
          canvasMapRef={canvasMapRef}
          pathMapRef={pathMapRef}
        />
      )}
      {phase === 'complete' && <CompletionOverlay />}
    </div>
  );
}
