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
  canvasW: number,
  canvasH: number,
  cropRegion?: { x: number; y: number; width: number; height: number },
  existingPieces?: PuzzlePiece[],
  avoidBottomRight?: { w: number; h: number }
): Promise<PieceFactoryResult> {
  const image = await loadImage(imageDataUrl);

  // pieceSize 設計：200% zoom (scale=1.0) 時格線恰好 fit-to-window
  // canvasW/2 = displayW，pieceSize = min(displayW/cols, displayH/rows)
  const pieceSize = Math.min(
    Math.floor(canvasW / 2 / cols),
    Math.floor(canvasH / 2 / rows),
  );
  const pieceW = pieceSize;
  const pieceH = pieceSize;
  const TAB_SIZE = Math.floor(pieceW * TAB_RATIO);
  const offW = pieceW + 2 * TAB_SIZE;
  const offH = pieceH + 2 * TAB_SIZE;

  // 拼圖格線在矩形 canvas 中置中
  const puzzleOffsetX = Math.floor((canvasW - cols * pieceW) / 2);
  const puzzleOffsetY = Math.floor((canvasH - rows * pieceH) / 2);

  // 圖片來源區域（使用裁切範圍或完整圖片）
  const srcX = cropRegion?.x ?? 0;
  const srcY = cropRegion?.y ?? 0;
  const srcW = cropRegion?.width ?? image.width;
  const srcH = cropRegion?.height ?? image.height;

  // 有既有片子時重用邊緣（resize/續玩），否則隨機生成（新開局）
  const existingEdgeMap = existingPieces
    ? new Map(existingPieces.map(p => [p.id, p.edges]))
    : null;
  const edgeMatrix = existingEdgeMap ? null : generateEdges(rows, cols);

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
    { x0: m,         x1: canvasW - pieceW - m, y0: m,         y1: gridT - pieceH - m },  // 上
    { x0: m,         x1: canvasW - pieceW - m, y0: gridB + m, y1: canvasH - pieceH - m }, // 下
    { x0: m,         x1: gridL - pieceW - m,   y0: Math.max(m, gridT), y1: Math.min(canvasH - pieceH - m, gridB - pieceH) },  // 左
    { x0: gridR + m, x1: canvasW - pieceW - m, y0: Math.max(m, gridT), y1: Math.min(canvasH - pieceH - m, gridB - pieceH) }, // 右
  ].filter(z => z.x1 > z.x0 && z.y1 > z.y0);

  const zoneAreas = zones.map(z => (z.x1 - z.x0) * (z.y1 - z.y0));
  const totalArea = zoneAreas.reduce((s, a) => s + a, 0);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const id = r * cols + c;
      const edges = existingEdgeMap
        ? existingEdgeMap.get(id)!
        : edgeMatrix![r][c].edges;

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

      // 散片初始位置：分布在格線矩形外圍區域（按面積加權隨機）
      // 可選排除右下角（縮放按鈕疊層區域）
      const avoidW = avoidBottomRight?.w ?? 0;
      const avoidH = avoidBottomRight?.h ?? 0;
      let currentX: number, currentY: number;
      const pickPosition = () => {
        if (zones.length > 0 && totalArea > 0) {
          let pick = Math.random() * totalArea;
          let zone = zones[0];
          for (let i = 0; i < zones.length; i++) {
            pick -= zoneAreas[i];
            if (pick <= 0) { zone = zones[i]; break; }
          }
          return {
            x: zone.x0 + Math.random() * (zone.x1 - zone.x0),
            y: zone.y0 + Math.random() * (zone.y1 - zone.y0),
          };
        }
        return {
          x: m + Math.random() * Math.max(0, canvasW - pieceW - 2 * m),
          y: m + Math.random() * Math.max(0, canvasH - pieceH - 2 * m),
        };
      };
      let pos = pickPosition();
      if (avoidW > 0 && avoidH > 0) {
        for (let attempt = 0; attempt < 8; attempt++) {
          if (pos.x + pieceW > canvasW - avoidW && pos.y + pieceH > canvasH - avoidH) {
            pos = pickPosition();
          } else break;
        }
      }
      currentX = pos.x;
      currentY = pos.y;

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
