import { useRef, useEffect, useCallback } from 'react';
import { Icon } from '../../components/Icon';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import { setPieces, startGame, setReferenceImage, setGameId, setConfigId } from '../../store/puzzleSlice';
import { generatePieces } from '../../lib/pieceFactory';
import { TOOLBAR_HEIGHT, MAX_CANVAS_WIDTH, getEffectiveDPR, ZOOM_BUTTON_AVOID_W, ZOOM_BUTTON_AVOID_H, GAME_BOTTOM_BAR_HEIGHT } from '../../lib/constants';
import { saveRecord } from '../../lib/records';

type Props = {
  canvasMapRef: React.RefObject<Map<number, HTMLCanvasElement>>;
  pathMapRef: React.RefObject<Map<number, Path2D>>;
};

type ImgTransform = { offsetX: number; offsetY: number; scale: number };
type CropRect = { x: number; y: number; w: number; h: number };

export default function CropPreview({ canvasMapRef, pathMapRef }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const imageDataUrl = useSelector((s: RootState) => s.puzzle.imageDataUrl);
  const cols = useSelector((s: RootState) => s.puzzle.cols);
  const rows = useSelector((s: RootState) => s.puzzle.rows);
  const difficulty = useSelector((s: RootState) => s.puzzle.difficulty);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  // 圖片顯示位置（固定，load 後只計算一次）
  const imgTransformRef = useRef<ImgTransform>({ offsetX: 0, offsetY: 0, scale: 1 });
  // 裁切框在 image-native 座標
  const cropRef = useRef<CropRect>({ x: 0, y: 0, w: 0, h: 0 });
  const rafRef = useRef<number>(0);
  const isConfirmingRef = useRef(false);

  // 初始化圖片與裁切框（圖片 fit-to-screen，裁切框置中最大化）
  useEffect(() => {
    if (!imageDataUrl) return;
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const canvas = canvasRef.current;
      if (!canvas) return;

      // 優先使用 offsetWidth/Height（CSS layout 尺寸），防止 onload 在 resize effect 前同步觸發時讀到預設值 300
      const w = canvas.offsetWidth || canvas.width;
      const h = canvas.offsetHeight || canvas.height;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      const pad = 48;
      const scaleX = (w - pad * 2) / img.width;
      const scaleY = (h - pad * 2) / img.height;
      const scale = Math.max(Math.min(scaleX, scaleY, 1), 0.001);

      imgTransformRef.current = {
        scale,
        offsetX: (w - img.width * scale) / 2,
        offsetY: (h - img.height * scale) / 2,
      };

      // 裁切框比例 = cols : rows，初始盡量大、置中
      const cropAspect = cols / rows;
      const imgAspect = img.width / img.height;
      let cropW: number, cropH: number;
      if (imgAspect > cropAspect) {
        cropH = img.height;
        cropW = cropH * cropAspect;
      } else {
        cropW = img.width;
        cropH = cropW / cropAspect;
      }
      cropRef.current = {
        x: (img.width - cropW) / 2,
        y: (img.height - cropH) / 2,
        w: cropW,
        h: cropH,
      };
    };
    img.src = imageDataUrl;
  }, [imageDataUrl, cols, rows]);

  // Canvas 尺寸設定（用 ResizeObserver 偵測 element 真實尺寸，比 window.resize 更可靠）
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    function resize() {
      if (!canvas) return;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      if (w === 0 || h === 0) return; // 元素尚未 layout，跳過
      canvas.width = w;
      canvas.height = h;
      const img = imgRef.current;
      if (!img) return;
      const pad = 48;
      const scaleX = (w - pad * 2) / img.width;
      const scaleY = (h - pad * 2) / img.height;
      const scale = Math.max(Math.min(scaleX, scaleY, 1), 0.001);
      imgTransformRef.current = {
        scale,
        offsetX: (w - img.width * scale) / 2,
        offsetY: (h - img.height * scale) / 2,
      };
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  // Render loop
  useEffect(() => {
    function draw() {
      const canvas = canvasRef.current;
      const img = imgRef.current;
      if (!canvas) { rafRef.current = requestAnimationFrame(draw); return; }
      const ctx = canvas.getContext('2d');
      if (!ctx) { rafRef.current = requestAnimationFrame(draw); return; }

      const { offsetX, offsetY, scale } = imgTransformRef.current;
      const crop = cropRef.current;
      const W = canvas.width;
      const H = canvas.height;

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, W, H);

      if (!img) { rafRef.current = requestAnimationFrame(draw); return; }

      // 繪製圖片（固定位置）
      ctx.drawImage(img, offsetX, offsetY, img.width * scale, img.height * scale);

      // 裁切框在 canvas 座標
      const cx = offsetX + crop.x * scale;
      const cy = offsetY + crop.y * scale;
      const cw = crop.w * scale;
      const ch = crop.h * scale;

      // 暗色遮罩（裁切框外側）
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, W, cy);
      ctx.fillRect(0, cy + ch, W, H - cy - ch);
      ctx.fillRect(0, cy, cx, ch);
      ctx.fillRect(cx + cw, cy, W - cx - cw, ch);

      // 裁切框邊框
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(cx, cy, cw, ch);

      // 三等分參考線
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 1; i < 3; i++) {
        ctx.moveTo(cx + cw * i / 3, cy);
        ctx.lineTo(cx + cw * i / 3, cy + ch);
        ctx.moveTo(cx, cy + ch * i / 3);
        ctx.lineTo(cx + cw, cy + ch * i / 3);
      }
      ctx.stroke();

      // 四個角落的 L 形把手
      const handleLen = 16;
      const handleW = 3;
      ctx.fillStyle = '#ffffff';
      const corners = [
        { hx: cx,      hy: cy,      dx: 1,  dy: 1  },
        { hx: cx + cw, hy: cy,      dx: -1, dy: 1  },
        { hx: cx,      hy: cy + ch, dx: 1,  dy: -1 },
        { hx: cx + cw, hy: cy + ch, dx: -1, dy: -1 },
      ];
      for (const { hx, hy, dx, dy } of corners) {
        ctx.fillRect(hx - (dx < 0 ? handleLen : 0), hy - handleW / 2, handleLen, handleW);
        ctx.fillRect(hx - handleW / 2, hy - (dy < 0 ? handleLen : 0), handleW, handleLen);
      }

      // 尺寸提示（不顯示 px，只顯示格數）
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '13px monospace';
      ctx.textAlign = 'center';
      const sizeText = `${cols} × ${rows} 格`;
      ctx.fillText(sizeText, cx + cw / 2, cy + ch + 20);

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [cols, rows]);

  // 將裁切框夾在圖片範圍內
  function clampCrop(crop: CropRect, imgW: number, imgH: number): CropRect {
    const x = Math.max(0, Math.min(imgW - crop.w, crop.x));
    const y = Math.max(0, Math.min(imgH - crop.h, crop.y));
    return { ...crop, x, y };
  }

  // Pointer events（拖曳移動裁切框 + 雙指縮放）
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pointerCache = new Map<number, { x: number; y: number }>();
    type PinchState = { dist0: number; cropW0: number; centerX0: number; centerY0: number };
    let pinch: PinchState | null = null;
    let isDragging = false;
    let lastX = 0;
    let lastY = 0;

    function getCropWBounds(img: HTMLImageElement, cropAspect: number) {
      const maxW = Math.min(img.width, img.height * cropAspect);
      const imgShortSide = Math.min(img.width, img.height);
      const minW = cropAspect >= 1
        ? (imgShortSide / 2) * cropAspect
        : imgShortSide / 2;
      return { minW, maxW };
    }

    function onPointerDown(e: PointerEvent) {
      pointerCache.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointerCache.size === 2) {
        isDragging = false;
        const pts = [...pointerCache.values()];
        const dist0 = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        const crop = cropRef.current;
        const img = imgRef.current;
        if (img) {
          const { scale, offsetX, offsetY } = imgTransformRef.current;
          const midClientX = (pts[0].x + pts[1].x) / 2;
          const midClientY = (pts[0].y + pts[1].y) / 2;
          const rect = canvas!.getBoundingClientRect();
          const canvasMidX = (midClientX - rect.left) * (canvas!.width / rect.width);
          const canvasMidY = (midClientY - rect.top) * (canvas!.height / rect.height);
          pinch = {
            dist0: Math.max(dist0, 1),
            cropW0: crop.w,
            centerX0: (canvasMidX - offsetX) / scale,
            centerY0: (canvasMidY - offsetY) / scale,
          };
        }
        return;
      }

      isDragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      canvas!.setPointerCapture(e.pointerId);
    }

    function onPointerMove(e: PointerEvent) {
      pointerCache.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointerCache.size >= 2 && pinch) {
        const img = imgRef.current;
        if (!img) return;
        const pts = [...pointerCache.values()];
        const newDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        const cropAspect = cols / rows;
        const { minW, maxW } = getCropWBounds(img, cropAspect);
        const newW = Math.min(maxW, Math.max(minW, pinch.cropW0 * newDist / pinch.dist0));
        const newH = newW * (rows / cols);
        cropRef.current = clampCrop(
          { w: newW, h: newH, x: pinch.centerX0 - newW / 2, y: pinch.centerY0 - newH / 2 },
          img.width, img.height
        );
        return;
      }

      if (!isDragging) return;
      const img = imgRef.current;
      if (!img) return;

      const scale = imgTransformRef.current.scale;
      const dx = (e.clientX - lastX) / scale;
      const dy = (e.clientY - lastY) / scale;
      lastX = e.clientX;
      lastY = e.clientY;

      const crop = cropRef.current;
      cropRef.current = clampCrop(
        { ...crop, x: crop.x + dx, y: crop.y + dy },
        img.width, img.height
      );
    }

    function onPointerUp(e: PointerEvent) {
      pointerCache.delete(e.pointerId);
      if (pointerCache.size < 2) pinch = null;
      if (pointerCache.size === 0) {
        isDragging = false;
        canvas!.releasePointerCapture(e.pointerId);
      }
    }

    // 滾輪縮放裁切框（維持 cols:rows 比例，裁切框中心不動）
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const img = imgRef.current;
      if (!img) return;

      const crop = cropRef.current;
      const factor = e.deltaY < 0 ? 1.05 : 0.95;
      const cropAspect = cols / rows;
      const { minW, maxW } = getCropWBounds(img, cropAspect);
      const newW = Math.min(maxW, Math.max(minW, crop.w * factor));
      const newH = newW * (rows / cols);

      const centerX = crop.x + crop.w / 2;
      const centerY = crop.y + crop.h / 2;
      cropRef.current = clampCrop(
        { w: newW, h: newH, x: centerX - newW / 2, y: centerY - newH / 2 },
        img.width, img.height
      );
    }

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
      pointerCache.clear();
    };
  }, [cols, rows]);

  const handleConfirm = useCallback(async () => {
    if (isConfirmingRef.current || !imageDataUrl) return;
    isConfirmingRef.current = true;

    const img = imgRef.current;
    if (!img) { isConfirmingRef.current = false; return; }

    const crop = cropRef.current;
    const cropRegion = {
      x:      Math.max(0, Math.round(crop.x)),
      y:      Math.max(0, Math.round(crop.y)),
      width:  Math.min(img.width  - Math.round(crop.x), Math.round(crop.w)),
      height: Math.min(img.height - Math.round(crop.y), Math.round(crop.h)),
    };

    // 生成裁切後參考圖（最大寬度 600px）
    const refAspect = cropRegion.width / cropRegion.height;
    const refW = Math.min(600, cropRegion.width);
    const refH = Math.round(refW / refAspect);
    const refCanvas = document.createElement('canvas');
    refCanvas.width = refW;
    refCanvas.height = refH;
    const refCtx = refCanvas.getContext('2d')!;
    refCtx.drawImage(
      img,
      cropRegion.x, cropRegion.y, cropRegion.width, cropRegion.height,
      0, 0, refW, refH
    );
    const referenceDataUrl = refCanvas.toDataURL('image/jpeg', 0.85);
    dispatch(setReferenceImage(referenceDataUrl));

    // 生成 200×200 縮圖
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = 200;
    thumbCanvas.height = 200;
    const thumbCtx = thumbCanvas.getContext('2d')!;
    const thumbAspect = cropRegion.width / cropRegion.height;
    const tw = thumbAspect > 1 ? 200 : Math.round(200 * thumbAspect);
    const th = thumbAspect > 1 ? Math.round(200 / thumbAspect) : 200;
    thumbCtx.fillStyle = '#ffffff';
    thumbCtx.fillRect(0, 0, 200, 200);
    thumbCtx.drawImage(
      img,
      cropRegion.x, cropRegion.y, cropRegion.width, cropRegion.height,
      Math.round((200 - tw) / 2), Math.round((200 - th) / 2), tw, th,
    );
    const thumbnailDataUrl = thumbCanvas.toDataURL('image/jpeg', 0.7);

    // 生成壓縮裁切圖（供重新遊玩用，≤800px JPEG 0.75）
    const REPLAY_MAX = 800;
    const replayAspect = cropRegion.width / cropRegion.height;
    const replayW = Math.min(REPLAY_MAX, cropRegion.width);
    const replayH = Math.round(replayW / replayAspect);
    const replayCanvas = document.createElement('canvas');
    replayCanvas.width = replayW;
    replayCanvas.height = replayH;
    replayCanvas.getContext('2d')!.drawImage(
      img,
      cropRegion.x, cropRegion.y, cropRegion.width, cropRegion.height,
      0, 0, replayW, replayH,
    );
    const croppedImageDataUrl = replayCanvas.toDataURL('image/jpeg', 0.75);

    const configId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    saveRecord({
      id: configId,
      createdAt: Date.now(),
      difficulty,
      cols,
      rows,
      thumbnailDataUrl,
      croppedImageDataUrl,
      isCompleted: false,
      bestTimeMs: 0,
    });
    dispatch(setConfigId(configId));
    dispatch(setGameId(crypto.randomUUID()));

    const displayW = Math.min(window.innerWidth, MAX_CANVAS_WIDTH);
    const displayH = window.innerHeight - TOOLBAR_HEIGHT - GAME_BOTTOM_BAR_HEIGHT;
    const dpr = getEffectiveDPR();
    const canvasW = displayW * dpr;
    const canvasH = displayH * dpr;

    try {
      const result = await generatePieces(
        croppedImageDataUrl, cols, rows, canvasW, canvasH,
        undefined,
        undefined,
        { w: ZOOM_BUTTON_AVOID_W * dpr, h: ZOOM_BUTTON_AVOID_H * dpr }
      );

      canvasMapRef.current.clear();
      result.canvasMap.forEach((c, id) => canvasMapRef.current.set(id, c));
      pathMapRef.current.clear();
      result.pathMap.forEach((p, id) => pathMapRef.current.set(id, p));

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
      dispatch(startGame());
    } finally {
      isConfirmingRef.current = false;
    }
  }, [imageDataUrl, cols, rows, difficulty, canvasMapRef, pathMapRef, dispatch]);

  return (
    <div className="flex flex-col w-full h-full" style={{ background: '#0D0906' }}>
      {/* 頂部 toolbar（非 fixed，不擋圖片） */}
      <div
        className="px-4 py-3 backdrop-blur-sm flex-shrink-0"
        style={{
          background: 'linear-gradient(180deg, #251E15 0%, rgba(26,20,13,.9) 100%)',
          borderBottom: '1px solid #3A2F25',
        }}
      >
        <div className="max-w-[1440px] mx-auto w-full flex items-center justify-between">
          <button
            onClick={() => history.back()}
            className="inline-flex items-center gap-1.5 text-paper-400 text-sm font-bold px-4 py-2 rounded-lg hover:brightness-110 transition-all"
            style={{ background: '#3A2F25', border: '1px solid #5A4B38' }}
          >
            <Icon name="ic-arrow-left" size={16} />
            返回難度選擇
          </button>
          <button
            onClick={handleConfirm}
            className="btn-primary text-sm px-5 py-2"
          >
            <Icon name="ic-play" size={16} />
            開始拼圖
          </button>
        </div>
      </div>

      {/* 裁切畫布（佔滿剩餘高度） */}
      <div className="relative flex-1 overflow-hidden">
        <canvas
          ref={canvasRef}
          className="block w-full h-full touch-none cursor-grab active:cursor-grabbing"
        />
        {/* 操作提示 */}
        <div
          className="absolute top-3 left-1/2 -translate-x-1/2 text-brand-500/80 text-xs font-medium pointer-events-none whitespace-nowrap px-3 py-1 rounded-full"
          style={{ background: 'rgba(26,20,13,.6)', border: '1px solid rgba(244,165,43,.25)' }}
        >
          拖曳移動裁切框 · 滾輪或雙指縮放
        </div>
      </div>
    </div>
  );
}
