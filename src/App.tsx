import { useRef, useMemo, lazy } from 'react';
import { createHashRouter, RouterProvider } from 'react-router';

const AppLayout          = lazy(() => import('./features/layout/AppLayout'));
const HomePage           = lazy(() => import('./features/home/HomePage'));
const ImageUpload        = lazy(() => import('./features/upload/ImageUpload'));
const DifficultySelector = lazy(() => import('./features/config/DifficultySelector'));
const CropPreview        = lazy(() => import('./features/crop/CropPreview'));
const PlayRoute          = lazy(() => import('./features/game/PlayRoute'));

export default function App() {
  const canvasMapRef = useRef(new Map<number, HTMLCanvasElement>());
  const pathMapRef   = useRef(new Map<number, Path2D>());

  const router = useMemo(() =>
    createHashRouter([
      {
        path: '/',
        element: <AppLayout />,
        children: [
          {
            index: true,
            element: <HomePage canvasMapRef={canvasMapRef} pathMapRef={pathMapRef} />,
          },
          { path: 'upload', element: <ImageUpload /> },
          { path: 'config', element: <DifficultySelector /> },
          {
            path: 'crop',
            element: <CropPreview canvasMapRef={canvasMapRef} pathMapRef={pathMapRef} />,
          },
          {
            path: 'play',
            element: <PlayRoute canvasMapRef={canvasMapRef} pathMapRef={pathMapRef} />,
          },
        ],
      },
    ]),
  []);

  return <RouterProvider router={router} />;
}
