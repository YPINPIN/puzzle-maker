import type { PuzzlePiece } from '../types/puzzle';
import { TAB_RATIO } from './constants';

export type RenderOptions = {
  ctx: CanvasRenderingContext2D;
  pieces: PuzzlePiece[];
  canvasMap: Map<number, HTMLCanvasElement>;
  pathMap: Map<number, Path2D>;
  pieceW: number;
  pieceH: number;
  puzzleOffsetX: number;
  puzzleOffsetY: number;
  rows: number;
  cols: number;
  draggingGroupId: number | null;
  groups: Record<number, number[]>;
  hoveredPieceId: number | null;
  activePieceId: number | null;
  dragDelta: { x: number; y: number };
  dragBasePositions: Record<number, { x: number; y: number }>;
};

export function renderFrame(opts: RenderOptions): void {
  const {
    ctx, pieces, canvasMap, pathMap,
    pieceW, pieceH,
    puzzleOffsetX, puzzleOffsetY, rows, cols,
    draggingGroupId, groups,
    hoveredPieceId, activePieceId,
    dragDelta, dragBasePositions,
  } = opts;

  const TAB_SIZE = Math.floor(pieceW * TAB_RATIO);
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;

  const scaledOffW = pieceW + 2 * TAB_SIZE;
  const scaledOffH = pieceH + 2 * TAB_SIZE;

  const draggingIds = draggingGroupId !== null
    ? new Set(groups[draggingGroupId] ?? [])
    : new Set<number>();

  // 格線矩形邊界
  const gridX = puzzleOffsetX;
  const gridY = puzzleOffsetY;
  const gridW = cols * pieceW;
  const gridH = rows * pieceH;

  // 判斷 piece 邏輯座標是否與格線矩形重疊
  function overlapsGrid(px: number, py: number): boolean {
    return (
      px + pieceW > gridX &&
      px < gridX + gridW &&
      py + pieceH > gridY &&
      py < gridY + gridH
    );
  }

  function drawGlow(
    path: Path2D | undefined,
    offsetX: number,
    offsetY: number,
    color: 'red' | 'green',
  ) {
    if (!path) return;
    const [stroke, shadow] = color === 'red'
      ? ['rgba(220, 50, 50, 0.75)', 'rgba(255, 60, 60, 0.9)']
      : ['rgba(50, 200, 80, 0.85)', 'rgba(60, 255, 100, 0.9)'];
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 3;
    ctx.shadowColor = shadow;
    ctx.shadowBlur = 14;
    ctx.stroke(path);
    ctx.restore();
  }

  ctx.clearRect(0, 0, W, H);

  // ── 整個 canvas 背景（待放區色）──
  ctx.fillStyle = '#d8d3cc';
  ctx.fillRect(0, 0, W, H);

  // ── 格線矩形背景（明亮米色）──
  ctx.fillStyle = '#f0ede8';
  ctx.fillRect(gridX, gridY, gridW, gridH);

  // ── 格子虛線 ──
  ctx.save();
  ctx.strokeStyle = 'rgba(150,140,130,0.5)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = puzzleOffsetX + c * pieceW;
      const y = puzzleOffsetY + r * pieceH;
      ctx.strokeRect(x, y, pieceW, pieceH);
    }
  }
  ctx.restore();

  // ── 1. 畫已 snap 的片（row-major 順序，凸榫自然填入相鄰片的凹槽）──
  for (const piece of pieces) {
    if (!piece.isSnapped) continue;
    const offscreen = canvasMap.get(piece.id);
    if (!offscreen) continue;
    const px = piece.currentPosition.x - TAB_SIZE;
    const py = piece.currentPosition.y - TAB_SIZE;
    ctx.drawImage(offscreen, px, py, scaledOffW, scaledOffH);
  }

  // ── 2. 畫未 snap 且非拖曳中的片 ──
  for (const piece of pieces) {
    if (piece.isSnapped) continue;
    if (draggingIds.has(piece.id)) continue;

    const offscreen = canvasMap.get(piece.id);
    if (!offscreen) continue;
    const path = pathMap.get(piece.id);
    const isHovered = piece.id === hoveredPieceId;
    const isActive = piece.id === activePieceId;

    const px = piece.currentPosition.x - TAB_SIZE;
    const py = piece.currentPosition.y - TAB_SIZE;

    ctx.save();
    if (isActive) {
      const cx = px + scaledOffW / 2;
      const cy = py + scaledOffH / 2;
      ctx.translate(cx, cy);
      ctx.scale(0.97, 0.97);
      ctx.translate(-cx, -cy);
    }
    ctx.drawImage(offscreen, px, py, scaledOffW, scaledOffH);
    if (isHovered && path) {
      ctx.translate(px, py);
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.fill(path);
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 2;
      ctx.stroke(path);
    }
    ctx.restore();

    // 紅光：靜置在格線上但位置錯誤
    if (overlapsGrid(piece.currentPosition.x, piece.currentPosition.y)) {
      drawGlow(path, px, py, 'red');
    }
  }

  // ── 3. 畫拖曳中的片（最上層，有陰影）──
  for (const piece of pieces) {
    if (!draggingIds.has(piece.id)) continue;
    const offscreen = canvasMap.get(piece.id);
    if (!offscreen) continue;

    const logicX = dragBasePositions[piece.id] !== undefined
      ? dragBasePositions[piece.id].x + dragDelta.x
      : piece.currentPosition.x;
    const logicY = dragBasePositions[piece.id] !== undefined
      ? dragBasePositions[piece.id].y + dragDelta.y
      : piece.currentPosition.y;
    const px = logicX - TAB_SIZE;
    const py = logicY - TAB_SIZE;

    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 5;
    ctx.drawImage(offscreen, px, py, scaledOffW, scaledOffH);
    ctx.restore();

    // 綠光：拖曳中懸停在格線上（放下前的預覽提示）
    if (overlapsGrid(logicX, logicY)) {
      const path = pathMap.get(piece.id);
      drawGlow(path, px, py, 'green');
    }
  }
}
