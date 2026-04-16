import type { PuzzlePiece } from '../types/puzzle';
import { generateEdges } from './edgeGenerator';
import { buildPiecePath } from './pathGenerator';
import { TAB_RATIO } from './constants';

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

export type PieceFactoryResult = {
  pieces: PuzzlePiece[];
  canvasMap: Map<number, HTMLCanvasElement>;
  pathMap: Map<number, Path2D>;
  rows: number;
  cols: number;
  pieceW: number;
  pieceH: number;
  puzzleOffsetX: number;
  puzzleOffsetY: number;
};

export async function generatePieces(
  imageDataUrl: string,
  cols: number,
  rows: number,
  viewportW: number,
  viewportH: number,
  canvasSize: number,
  cropRegion?: { x: number; y: number; width: number; height: number }
): Promise<PieceFactoryResult> {
  const image = await loadImage(imageDataUrl);

  // 拼圖片大小由視窗尺寸決定：200% 時格線恰好填滿視窗（1:1 pixel）
  const pieceSize = Math.min(
    Math.floor(viewportW / cols),
    Math.floor(viewportH / rows),
  );
  const pieceW = pieceSize;
  const pieceH = pieceSize;
  const TAB_SIZE = Math.floor(pieceW * TAB_RATIO);
  const offW = pieceW + 2 * TAB_SIZE;
  const offH = pieceH + 2 * TAB_SIZE;

  // 拼圖格線在正方形 canvas 中置中
  const puzzleOffsetX = Math.floor((canvasSize - cols * pieceW) / 2);
  const puzzleOffsetY = Math.floor((canvasSize - rows * pieceH) / 2);

  // 圖片來源區域（使用裁切範圍或完整圖片）
  const srcX = cropRegion?.x ?? 0;
  const srcY = cropRegion?.y ?? 0;
  const srcW = cropRegion?.width ?? image.width;
  const srcH = cropRegion?.height ?? image.height;

  const edgeMatrix = generateEdges(rows, cols);
  const pieces: PuzzlePiece[] = [];
  const canvasMap = new Map<number, HTMLCanvasElement>();
  const pathMap = new Map<number, Path2D>();

  // 格線矩形邊界（用於計算散片初始位置的外圍 4 個區域）
  const gridL = puzzleOffsetX;
  const gridT = puzzleOffsetY;
  const gridR = puzzleOffsetX + cols * pieceW;
  const gridB = puzzleOffsetY + rows * pieceH;
  const m = TAB_SIZE + 4;

  const zones = [
    { x0: m,         x1: canvasSize - pieceW - m,  y0: m,         y1: gridT - pieceH - m },  // 上
    { x0: m,         x1: canvasSize - pieceW - m,  y0: gridB + m, y1: canvasSize - pieceH - m }, // 下
    { x0: m,         x1: gridL - pieceW - m,        y0: gridT,    y1: gridB - pieceH },       // 左
    { x0: gridR + m, x1: canvasSize - pieceW - m,  y0: gridT,     y1: gridB - pieceH },       // 右
  ].filter(z => z.x1 > z.x0 && z.y1 > z.y0);

  const zoneAreas = zones.map(z => (z.x1 - z.x0) * (z.y1 - z.y0));
  const totalArea = zoneAreas.reduce((s, a) => s + a, 0);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const id = r * cols + c;
      const { edges } = edgeMatrix[r][c];

      // correctPosition 在 canvas 座標系（含居中偏移）
      const correctX = puzzleOffsetX + c * pieceW;
      const correctY = puzzleOffsetY + r * pieceH;

      // 建立 Path2D（以 TAB_SIZE 為 offset，與 offscreen canvas 座標系一致）
      const path = buildPiecePath(edges, pieceW, pieceH, TAB_SIZE);
      pathMap.set(id, path);

      // 建立 offscreen canvas
      const offscreen = document.createElement('canvas');
      offscreen.width = offW;
      offscreen.height = offH;
      const ctx = offscreen.getContext('2d')!;

      ctx.save();
      ctx.clip(path);
      // 從裁切區域繪製圖片，縮放至拼圖完整大小
      ctx.drawImage(
        image,
        srcX, srcY, srcW, srcH,               // source：裁切區域
        TAB_SIZE - c * pieceW,                  // dest x
        TAB_SIZE - r * pieceH,                  // dest y
        cols * pieceW,                          // dest width
        rows * pieceH                           // dest height
      );
      ctx.restore();

      canvasMap.set(id, offscreen);

      // 散片初始位置：分布在格線矩形外圍 4 個區域（按面積加權隨機）
      let currentX: number, currentY: number;
      if (zones.length > 0) {
        let pick = Math.random() * totalArea;
        let zone = zones[0];
        for (let i = 0; i < zones.length; i++) {
          pick -= zoneAreas[i];
          if (pick <= 0) { zone = zones[i]; break; }
        }
        currentX = zone.x0 + Math.random() * (zone.x1 - zone.x0);
        currentY = zone.y0 + Math.random() * (zone.y1 - zone.y0);
      } else {
        // fallback（格線幾乎佔滿 canvas）
        currentX = m + Math.random() * Math.max(0, canvasSize - pieceW - 2 * m);
        currentY = m + Math.random() * Math.max(0, canvasSize - pieceH - 2 * m);
      }

      pieces.push({
        id,
        row: r,
        col: c,
        edges,
        correctPosition: { x: correctX, y: correctY },
        currentPosition: { x: currentX, y: currentY },
        isSnapped: false,
        groupId: id,
      });
    }
  }

  return { pieces, canvasMap, pathMap, rows, cols, pieceW, pieceH, puzzleOffsetX, puzzleOffsetY };
}
