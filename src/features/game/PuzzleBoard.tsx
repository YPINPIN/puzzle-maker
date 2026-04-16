import { useRef, useEffect, useState, useCallback } from 'react';
import { useGameLoop } from './useGameLoop';
import { usePointerDrag } from './usePointerDrag';
import GameToolbar from './GameToolbar';
import ImagePreviewOverlay from './ImagePreviewOverlay';
import { TOOLBAR_HEIGHT } from '../../lib/constants';

type Props = {
  canvasMapRef: React.RefObject<Map<number, HTMLCanvasElement>>;
  pathMapRef: React.RefObject<Map<number, Path2D>>;
};

const ZOOM_MIN = 100;  // % — 不允許縮小至 fit-to-window 以下
const ZOOM_MAX = 200;  // %（= canvas 原始大小，1:1 pixel）
const ZOOM_STEP = 25;  // %

export default function PuzzleBoard({ canvasMapRef, pathMapRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hoveredPieceIdRef = useRef<number | null>(null);
  const activePieceIdRef = useRef<number | null>(null);
  const dragDeltaRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragBasePositionsRef = useRef<Record<number, { x: number; y: number }>>({});

  // canvas 邏輯尺寸：正方形，邊長 = 2 × min(viewport)
  // 200% zoom 時 actualCssScale = 1（1:1 pixel，最清晰）
  const canvasSize = 2 * Math.min(window.innerWidth, window.innerHeight - TOOLBAR_HEIGHT);
  const baseDimsRef = useRef({ w: canvasSize, h: canvasSize });

  // fitScale = 0.5（canvas-based，永遠恰好 = 0.5，不超出視窗）
  const computeFitScale = () => {
    const { w, h } = baseDimsRef.current;
    return Math.min(window.innerWidth / w, (window.innerHeight - TOOLBAR_HEIGHT) / h);
  };
  const fitScaleRef = useRef(computeFitScale());

  // zoomPercent：100 = fit-to-window（預設）、200 = canvas 原始大小
  const [zoomPercent, setZoomPercent] = useState(100);
  const zoomPercentRef = useRef(100);

  // resize 遮罩
  const [isResizing, setIsResizing] = useState(false);
  const resizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // pan：CSS pixel 位移（畫面縮放 > 100% 時啟用）
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panRef = useRef({ x: 0, y: 0 });         // 同步值，供 callback 使用
  const panSnapshotRef = useRef({ x: 0, y: 0 }); // 拖曳開始時的 pan 快照

  // 實際 CSS scale = fitScale × zoomPercent / 100
  const getActualScale = (zoom = zoomPercentRef.current) =>
    fitScaleRef.current * zoom / 100;

  // 更新 pan 並夾住邊界（ZOOM_MIN 時鎖定 pan=0，避免浮點誤差導致微移）
  const updatePan = useCallback((newX: number, newY: number) => {
    if (zoomPercentRef.current <= ZOOM_MIN) {
      panRef.current = { x: 0, y: 0 };
      setPan({ x: 0, y: 0 });
      return;
    }
    const scale = getActualScale();
    const { w: cW, h: cH } = baseDimsRef.current;
    const maxPanX = Math.max(0, (cW * scale - window.innerWidth) / 2);
    const maxPanY = Math.max(0, (cH * scale - (window.innerHeight - TOOLBAR_HEIGHT)) / 2);
    const x = Math.max(-maxPanX, Math.min(maxPanX, newX));
    const y = Math.max(-maxPanY, Math.min(maxPanY, newY));
    panRef.current = { x, y };
    setPan({ x, y });
  }, []);

  // 縮放時重新夾住 pan（降至 ZOOM_MIN 時歸零）
  const clampPan = useCallback((zoom: number) => {
    if (zoom <= ZOOM_MIN) {
      panRef.current = { x: 0, y: 0 };
      setPan({ x: 0, y: 0 });
      return;
    }
    const scale = fitScaleRef.current * zoom / 100;
    const { w: cW, h: cH } = baseDimsRef.current;
    const maxPanX = Math.max(0, (cW * scale - window.innerWidth) / 2);
    const maxPanY = Math.max(0, (cH * scale - (window.innerHeight - TOOLBAR_HEIGHT)) / 2);
    const x = Math.max(-maxPanX, Math.min(maxPanX, panRef.current.x));
    const y = Math.max(-maxPanY, Math.min(maxPanY, panRef.current.y));
    panRef.current = { x, y };
    setPan({ x, y });
  }, []);

  const changeZoom = useCallback((delta: number) => {
    const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoomPercentRef.current + delta));
    zoomPercentRef.current = next;
    setZoomPercent(next);
    clampPan(next);
  }, [clampPan]);

  // pan callbacks 傳給 usePointerDrag
  const onPanStart = useCallback(() => {
    panSnapshotRef.current = { ...panRef.current };
  }, []);

  const onPanDelta = useCallback((dxCss: number, dyCss: number) => {
    updatePan(panSnapshotRef.current.x + dxCss, panSnapshotRef.current.y + dyCss);
  }, [updatePan]);

  // canvas 像素尺寸（只設定一次）
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = baseDimsRef.current.w;
    canvas.height = baseDimsRef.current.h;
    fitScaleRef.current = computeFitScale();
  }, []);

  // resize：重算 fitScale，更新 pan，顯示遮罩 600ms
  useEffect(() => {
    function onResize() {
      fitScaleRef.current = computeFitScale();
      clampPan(zoomPercentRef.current);
      // 強制 re-render 以更新 CSS transform
      setZoomPercent((z) => z);

      setIsResizing(true);
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
      resizeTimerRef.current = setTimeout(() => setIsResizing(false), 600);
    }
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
    };
  }, [clampPan]);

  // 滾輪縮放
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
      changeZoom(delta);
    }
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [changeZoom]);

  useGameLoop({
    canvasRef, canvasMapRef, pathMapRef,
    hoveredPieceIdRef, activePieceIdRef,
    dragDeltaRef, dragBasePositionsRef,
  });

  usePointerDrag({
    canvasRef, pathMapRef,
    hoveredPieceIdRef, activePieceIdRef,
    dragDeltaRef, dragBasePositionsRef,
    onPanStart,
    onPanDelta,
  });

  const actualCssScale = fitScaleRef.current * zoomPercent / 100;
  const { w: baseW, h: baseH } = baseDimsRef.current;

  // 縮放超過 100% 時可以拖曳平移
  const canPan = zoomPercent > ZOOM_MIN;

  return (
    <div className="relative flex flex-col w-screen h-screen">
      <GameToolbar />

      {/* 遊戲區域：深色桌面背景，佔滿剩餘高度 */}
      <div
        className="flex-1 relative overflow-hidden"
        style={{ backgroundColor: '#2e2b28' }}
      >
        {isResizing && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 pointer-events-none">
            <span className="text-white text-lg font-semibold tracking-wide">調整版面中…</span>
          </div>
        )}

        <canvas
          ref={canvasRef}
          className="block touch-none"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: baseW,
            height: baseH,
            transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${actualCssScale})`,
            transformOrigin: 'center center',
            cursor: 'default',
            boxShadow: '0 12px 48px rgba(0,0,0,0.65)',
          }}
        />
      </div>

      {/* 縮放控制（右下角） */}
      <div className="absolute bottom-4 right-4 flex flex-col items-end gap-1.5 z-10">
        {/* 拖曳平移提示（縮放 > 100% 時顯示） */}
        <div
          className="flex items-center gap-1 text-xs text-white/80 bg-black/40 rounded-lg px-2 py-1 pointer-events-none select-none transition-opacity duration-300"
          style={{ opacity: canPan ? 1 : 0 }}
        >
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
          </svg>
          拖曳以平移
        </div>

        {/* 縮放按鈕 */}
        <div className="flex items-center gap-1.5 bg-white/85 backdrop-blur-sm rounded-xl px-2 py-1.5 shadow-md border border-gray-200">
          <button
            onClick={() => changeZoom(-ZOOM_STEP)}
            disabled={zoomPercent <= ZOOM_MIN}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-30 transition-colors text-lg font-bold"
          >
            −
          </button>
          <span className="text-xs font-semibold text-gray-600 w-10 text-center select-none">
            {zoomPercent}%
          </span>
          <button
            onClick={() => changeZoom(ZOOM_STEP)}
            disabled={zoomPercent >= ZOOM_MAX}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-30 transition-colors text-lg font-bold"
          >
            ＋
          </button>
        </div>
      </div>

      <ImagePreviewOverlay />
    </div>
  );
}
