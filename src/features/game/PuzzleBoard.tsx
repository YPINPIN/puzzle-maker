import { useRef, useEffect, useLayoutEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import { resumeGame, rescalePieces } from '../../store/puzzleSlice';
import { useGameLoop } from './useGameLoop';
import { usePointerDrag } from './usePointerDrag';
import ImagePreviewOverlay from './ImagePreviewOverlay';
import { Icon } from '../../components/Icon';
import { MAX_CANVAS_WIDTH, TAB_RATIO, getEffectiveDPR, ZOOM_MIN, ZOOM_MAX, ZOOM_STEP, TOOLBAR_HEIGHT, GAME_BOTTOM_BAR_HEIGHT } from '../../lib/constants';
import { generatePieces } from '../../lib/pieceFactory';

type Props = {
  canvasMapRef: React.RefObject<Map<number, HTMLCanvasElement>>;
  pathMapRef: React.RefObject<Map<number, Path2D>>;
};

// 公式：actualCssScale = fitScale × zoom / 100
// 100% → 0.5×1.0=0.5 → canvas 填滿視窗；200% → 0.5×2.0=1.0 → 1:1 pixel，可平移

export default function PuzzleBoard({ canvasMapRef, pathMapRef }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const isPaused = useSelector((s: RootState) => s.puzzle.isPaused);
  const imageDataUrl = useSelector((s: RootState) => s.puzzle.imageDataUrl);
  const referenceDataUrl = useSelector((s: RootState) => s.puzzle.referenceDataUrl);
  const cropRegion = useSelector((s: RootState) => s.puzzle.cropRegion);
  const cols = useSelector((s: RootState) => s.puzzle.cols);
  const rows = useSelector((s: RootState) => s.puzzle.rows);
  const pieces = useSelector((s: RootState) => s.puzzle.pieces);
  const pieceW = useSelector((s: RootState) => s.puzzle.pieceW);
  const pieceH = useSelector((s: RootState) => s.puzzle.pieceH);
  const puzzleOffsetX = useSelector((s: RootState) => s.puzzle.puzzleOffsetX);
  const puzzleOffsetY = useSelector((s: RootState) => s.puzzle.puzzleOffsetY);
  const boardW = useSelector((s: RootState) => s.puzzle.boardW);
  const boardH = useSelector((s: RootState) => s.puzzle.boardH);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameAreaRef = useRef<HTMLDivElement>(null);

  // Sync latest state for async resize handler
  const boardDataRef = useRef({ imageDataUrl, referenceDataUrl, cropRegion, cols, rows, pieces, pieceW, pieceH, puzzleOffsetX, puzzleOffsetY, boardW, boardH });
  boardDataRef.current = { imageDataUrl, referenceDataUrl, cropRegion, cols, rows, pieces, pieceW, pieceH, puzzleOffsetX, puzzleOffsetY, boardW, boardH };

  const isRegeneratingRef = useRef(false);
  // 掛載後若 canvas 尺寸與 Redux 存的 boardW/boardH 不符（header 換行導致），需重新生成
  const needsInitialRegenRef = useRef<{ w: number; h: number } | null>(null);
  const regenerateDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoveredPieceIdRef = useRef<number | null>(null);
  const activePieceIdRef = useRef<number | null>(null);
  const dragDeltaRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragBasePositionsRef = useRef<Record<number, { x: number; y: number }>>({});

  // 從實際容器尺寸計算 canvas 邏輯尺寸（= 容器 × 2）
  // fitScale 恆為 0.5，使 100% zoom 時 canvas 恰好填滿容器
  const getContainerDims = useCallback(() => {
    const dpr = getEffectiveDPR();
    const c = gameAreaRef.current;
    const displayW = c ? Math.min(c.clientWidth, MAX_CANVAS_WIDTH) : Math.min(window.innerWidth, MAX_CANVAS_WIDTH);
    const displayH = c ? c.clientHeight : (window.innerHeight - TOOLBAR_HEIGHT - GAME_BOTTOM_BAR_HEIGHT);
    return { w: displayW * dpr, h: displayH * dpr, displayW, displayH };
  }, []);

  const _initDpr = getEffectiveDPR();
  const baseDimsRef = useRef({ w: Math.min(window.innerWidth, MAX_CANVAS_WIDTH) * _initDpr, h: (window.innerHeight - TOOLBAR_HEIGHT - GAME_BOTTOM_BAR_HEIGHT) * _initDpr });
  const fitScaleRef = useRef(1 / _initDpr);

  // zoomPercent：100 = fit-to-canvas（預設）；200 = fit-to-grid，可平移
  const [zoomPercent, setZoomPercent] = useState(100);
  const zoomPercentRef = useRef(100);

  // resize 遮罩
  const [isResizing, setIsResizing] = useState(false);
  const resizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // pan：CSS pixel 位移（zoom > 100% 時啟用）
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panRef = useRef({ x: 0, y: 0 });
  const panSnapshotRef = useRef({ x: 0, y: 0 });

  // 計算目前 zoom 下的最大 pan 範圍（CSS px），以實際容器尺寸為準
  const computeMaxPan = useCallback((zoom: number) => {
    const scale = fitScaleRef.current * zoom / 100;
    const { displayW, displayH } = getContainerDims();
    const { w: cW, h: cH } = baseDimsRef.current;
    return {
      maxPanX: Math.max(0, (cW * scale - displayW) / 2),
      maxPanY: Math.max(0, (cH * scale - displayH) / 2),
    };
  }, [getContainerDims]);

  const updatePan = useCallback((newX: number, newY: number) => {
    const { maxPanX, maxPanY } = computeMaxPan(zoomPercentRef.current);
    const clamped = {
      x: Math.max(-maxPanX, Math.min(maxPanX, newX)),
      y: Math.max(-maxPanY, Math.min(maxPanY, newY)),
    };
    panRef.current = clamped;
    setPan(clamped);
  }, [computeMaxPan]);

  const clampPan = useCallback((zoom: number) => {
    const { maxPanX, maxPanY } = computeMaxPan(zoom);
    const clamped = {
      x: Math.max(-maxPanX, Math.min(maxPanX, panRef.current.x)),
      y: Math.max(-maxPanY, Math.min(maxPanY, panRef.current.y)),
    };
    panRef.current = clamped;
    setPan(clamped);
  }, [computeMaxPan]);

  const changeZoom = useCallback((delta: number) => {
    const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoomPercentRef.current + delta));
    zoomPercentRef.current = next;
    setZoomPercent(next);
    clampPan(next);
  }, [clampPan]);

  const onPanStart = useCallback(() => {
    panSnapshotRef.current = { ...panRef.current };
  }, []);

  const onPanDelta = useCallback((dxCss: number, dyCss: number) => {
    updatePan(panSnapshotRef.current.x + dxCss, panSnapshotRef.current.y + dyCss);
  }, [updatePan]);

  // 初始 canvas 尺寸：在 DOM 掛載後、首次繪製前以實際容器測量（useLayoutEffect）
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { w, h } = getContainerDims();
    baseDimsRef.current = { w, h };
    fitScaleRef.current = 1 / getEffectiveDPR();
    canvas.width = w;
    canvas.height = h;

    // 檢查實際容器尺寸是否與 Redux 存的 boardW/boardH 一致
    // 不一致代表 continueGame/startGame 計算時 header 尚未展開（換行），需重算
    const { boardW, boardH, pieces } = boardDataRef.current;
    if (pieces.length > 0 && boardW > 0 && (Math.abs(w - boardW) > 4 || Math.abs(h - boardH) > 4)) {
      needsInitialRegenRef.current = { w, h };
      setIsResizing(true);
    }
  }, [getContainerDims]);

  // resize：立即更新 CSS display size + 防抖重生成拼圖片
  useEffect(() => {
    async function doRegenerate(curCanvasW: number, curCanvasH: number) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // 緩衝區已是正確大小，且 Redux 的 boardW/boardH 也一致（pieces 不需要重算）
      const { boardW: currentBoardW, boardH: currentBoardH } = boardDataRef.current;
      if (
        canvas.width === curCanvasW && canvas.height === curCanvasH &&
        currentBoardW === curCanvasW && currentBoardH === curCanvasH
      ) {
        clampPan(zoomPercentRef.current);
        if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
        resizeTimerRef.current = setTimeout(() => setIsResizing(false), 600);
        return;
      }

      // 正在重生成中，稍後重試
      if (isRegeneratingRef.current) {
        regenerateDebounceRef.current = setTimeout(() => doRegenerate(curCanvasW, curCanvasH), 100);
        return;
      }

      isRegeneratingRef.current = true;
      const { imageDataUrl, referenceDataUrl, cropRegion, cols, rows, pieces,
              pieceW: oldPieceW, pieceH: oldPieceH,
              puzzleOffsetX: oldOffsetX, puzzleOffsetY: oldOffsetY } = boardDataRef.current;

      // referenceDataUrl 優先（已裁切小圖，避免手機載入原始大圖的記憶體問題）
      const effectiveUrl = referenceDataUrl ?? imageDataUrl;
      const effectiveCrop = referenceDataUrl ? undefined : (cropRegion ?? undefined);

      if (pieces.length > 0 && effectiveUrl) {
        try {
          const result = await generatePieces(
            effectiveUrl, cols, rows,
            curCanvasW, curCanvasH,
            effectiveCrop,
            pieces
          );

          // resize：依新舊 pieceSize 比例縮放位置（與 continueGame 邏輯一致）
          const TAB_SIZE = Math.floor(result.pieceW * TAB_RATIO);
          const scaleX = oldPieceW > 0 ? result.pieceW / oldPieceW : 1;
          const scaleY = oldPieceH > 0 ? result.pieceH / oldPieceH : 1;
          const odx = result.puzzleOffsetX - oldOffsetX * scaleX;
          const ody = result.puzzleOffsetY - oldOffsetY * scaleY;
          const maxX = curCanvasW - result.pieceW - TAB_SIZE;
          const maxY = curCanvasH - result.pieceH - TAB_SIZE;

          const piecePositions: Record<number, { current: { x: number; y: number }; correct: { x: number; y: number }; isSnapped: boolean }> = {};
          for (const newPiece of result.pieces) {
            const oldPiece = pieces.find((p) => p.id === newPiece.id);
            if (!oldPiece) continue;
            const correct = newPiece.correctPosition;
            let current: { x: number; y: number };
            if (oldPiece.isSnapped) {
              current = correct;
            } else {
              const rawX = Math.round(oldPiece.currentPosition.x * scaleX + odx);
              const rawY = Math.round(oldPiece.currentPosition.y * scaleY + ody);
              current = {
                x: Math.max(TAB_SIZE, Math.min(maxX, rawX)),
                y: Math.max(TAB_SIZE, Math.min(maxY, rawY)),
              };
            }
            piecePositions[newPiece.id] = { current, correct, isSnapped: oldPiece.isSnapped };
          }

          canvasMapRef.current.clear();
          pathMapRef.current.clear();
          result.canvasMap.forEach((c, id) => canvasMapRef.current.set(id, c));
          result.pathMap.forEach((p, id) => pathMapRef.current.set(id, p));

          canvas.width = curCanvasW;
          canvas.height = curCanvasH;

          dispatch(rescalePieces({
            piecePositions,
            boardW: curCanvasW,
            boardH: curCanvasH,
            pieceW: result.pieceW,
            pieceH: result.pieceH,
            puzzleOffsetX: result.puzzleOffsetX,
            puzzleOffsetY: result.puzzleOffsetY,
          }));
        } catch (e) {
          console.error('canvas rescale failed', e);
          canvas.width = curCanvasW;
          canvas.height = curCanvasH;
        }
      } else {
        canvas.width = curCanvasW;
        canvas.height = curCanvasH;
      }

      isRegeneratingRef.current = false;
      clampPan(zoomPercentRef.current);
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
      resizeTimerRef.current = setTimeout(() => setIsResizing(false), 600);
    }

    function onResize() {
      // 讀取實際容器尺寸（自動反映 header 兩排的情況）
      const { w: newW, h: newH } = getContainerDims();

      baseDimsRef.current = { w: newW, h: newH };
      fitScaleRef.current = 1 / getEffectiveDPR();
      clampPan(zoomPercentRef.current);
      setZoomPercent((z) => z);
      setIsResizing(true);
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);

      if (regenerateDebounceRef.current) clearTimeout(regenerateDebounceRef.current);
      regenerateDebounceRef.current = setTimeout(() => doRegenerate(newW, newH), 300);
    }

    // 掛載時若 useLayoutEffect 發現尺寸不符（header 換行），立即重算
    const pending = needsInitialRegenRef.current;
    if (pending) {
      needsInitialRegenRef.current = null;
      doRegenerate(pending.w, pending.h);
    }

    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
      if (regenerateDebounceRef.current) clearTimeout(regenerateDebounceRef.current);
    };
  }, [clampPan, dispatch, getContainerDims]);

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

  const onZoomChange = useCallback((z: number) => {
    const clamped = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
    zoomPercentRef.current = clamped;
    setZoomPercent(clamped);
    clampPan(clamped);
  }, [clampPan]);

  usePointerDrag({
    canvasRef, pathMapRef,
    hoveredPieceIdRef, activePieceIdRef,
    dragDeltaRef, dragBasePositionsRef,
    onPanStart,
    onPanDelta,
    onZoomChange,
    zoomPercentRef,
  });

  // 公式：100% → scale=0.5 → fit-to-canvas；200% → scale=1.0 → fit-to-grid
  const actualCssScale = fitScaleRef.current * zoomPercent / 100;
  const { w: baseW, h: baseH } = baseDimsRef.current;

  const canPan = zoomPercent > ZOOM_MIN;

  return (
    <div className="flex flex-col w-full h-full">
      {/* 遊戲區域：深色桌面背景，佔滿剩餘高度 */}
      <div
        ref={gameAreaRef}
        className="flex-1 relative overflow-hidden"
        style={{ background: 'radial-gradient(140% 100% at 50% 40%, #3A2F25 0%, #1A140D 55%, #0D0906 100%)' }}
      >
        {isResizing && (
          <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none" style={{ background: 'rgba(13,9,6,.85)' }}>
            <span className="text-white text-lg font-semibold tracking-wide">調整版面中…</span>
          </div>
        )}

        {/* 暫停 overlay */}
        {isPaused && (
          <div
            className="fixed inset-0 flex flex-col items-center justify-center z-40 pointer-events-auto"
            style={{ background: 'rgba(13,9,6,.85)' }}
          >
            <div className="mb-3 text-brand-500" style={{ filter: 'drop-shadow(0 0 20px rgba(244,165,43,.5))' }}><Icon name="ic-pause" size={80} /></div>
            <p className="text-paper-100 text-xl sm:text-2xl font-black mb-5 tracking-wide">遊戲暫停</p>
            <button
              onClick={() => dispatch(resumeGame())}
              className="btn-primary px-6 sm:px-8 py-2.5 sm:py-3 text-sm sm:text-base"
            >
              繼續遊戲
            </button>
          </div>
        )}

        <canvas
          ref={canvasRef}
          className="block touch-none puzzle-frame"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: baseW,
            height: baseH,
            transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${actualCssScale})`,
            transformOrigin: 'center center',
            cursor: canPan ? 'grab' : 'default',
          }}
        />
      </div>

      {/* 底部控制 bar：縮放按鈕移出 canvas 疊層，消除遮擋問題 */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-4"
        style={{
          background: 'rgba(13,9,6,0.95)',
          borderTop: '1px solid #3A2F25',
          paddingTop: '10px',
          paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        }}
      >
        <span
          className="text-xs font-medium text-brand-500/70 transition-opacity duration-300 select-none"
          style={{ opacity: canPan ? 1 : 0 }}
        >
          雙指或拖曳空白處平移
        </span>

        <div
          className="flex items-center gap-1.5 rounded-xl px-2 py-1"
          style={{ background: 'rgba(58,47,37,0.8)', border: '1px solid #5A4B38' }}
        >
          <button
            onClick={() => changeZoom(-ZOOM_STEP)}
            disabled={zoomPercent <= ZOOM_MIN}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-brand-500 hover:bg-white/10 disabled:opacity-30 transition-colors"
          >
            <Icon name="ic-zoom-out" size={18} />
          </button>
          <span className="text-xs font-bold text-paper-100 w-10 text-center select-none font-mono">
            {Math.round(zoomPercent)}%
          </span>
          <button
            onClick={() => changeZoom(ZOOM_STEP)}
            disabled={zoomPercent >= ZOOM_MAX}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-brand-500 hover:bg-white/10 disabled:opacity-30 transition-colors"
          >
            <Icon name="ic-zoom-in" size={18} />
          </button>
        </div>
      </div>

      <ImagePreviewOverlay />
    </div>
  );
}
