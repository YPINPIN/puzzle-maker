import type { EdgeType, PuzzlePiece } from '../types/puzzle';
import { TAB_RATIO } from './constants';

export { TAB_RATIO };

/**
 * 繪製單邊（水平方向）。
 * 從 (x0,y0) 繪製到 (x1,y0)，edgeType 決定凸起方向。
 * tab(1)  → 向上凸（負 y）
 * blank(-1) → 向下凹（正 y）
 * flat(0)  → 直線
 */
function drawHorizontalEdge(
  path: Path2D,
  x0: number,
  y: number,
  x1: number,
  edgeType: EdgeType,
  flip: boolean
): void {
  if (edgeType === 0) {
    path.lineTo(x1, y);
    return;
  }

  const W = x1 - x0;
  const dir = flip ? -edgeType : edgeType;
  const tabH = Math.abs(W) * TAB_RATIO * dir;

  const p1x = x0 + W * 0.25;
  const p2x = x0 + W * 0.4;
  const p3x = x0 + W * 0.5;
  const p4x = x0 + W * 0.6;
  const p5x = x0 + W * 0.75;

  path.lineTo(p1x, y);
  path.bezierCurveTo(p2x, y, p2x, y - tabH, p3x, y - tabH);
  path.bezierCurveTo(p4x, y - tabH, p4x, y, p5x, y);
  path.lineTo(x1, y);
}

/**
 * 繪製單邊（垂直方向）。
 * 從 (x,y0) 繪製到 (x,y1)，edgeType 決定凸起方向（向右為正）。
 */
function drawVerticalEdge(
  path: Path2D,
  x: number,
  y0: number,
  y1: number,
  edgeType: EdgeType,
  flip: boolean
): void {
  if (edgeType === 0) {
    path.lineTo(x, y1);
    return;
  }

  const H = y1 - y0;
  const dir = flip ? -edgeType : edgeType;
  const tabW = Math.abs(H) * TAB_RATIO * dir;

  const p1y = y0 + H * 0.25;
  const p2y = y0 + H * 0.4;
  const p3y = y0 + H * 0.5;
  const p4y = y0 + H * 0.6;
  const p5y = y0 + H * 0.75;

  path.lineTo(x, p1y);
  path.bezierCurveTo(x, p2y, x + tabW, p2y, x + tabW, p3y);
  path.bezierCurveTo(x + tabW, p4y, x, p4y, x, p5y);
  path.lineTo(x, y1);
}

/**
 * 建立單片拼圖的 Path2D。
 * offset = TAB_SIZE，讓凸起有繪製空間。
 */
export function buildPiecePath(
  edges: PuzzlePiece['edges'],
  pieceW: number,
  pieceH: number,
  offset: number
): Path2D {
  const path = new Path2D();
  const x0 = offset;
  const y0 = offset;
  const x1 = offset + pieceW;
  const y1 = offset + pieceH;

  path.moveTo(x0, y0);
  drawHorizontalEdge(path, x0, y0, x1, edges.top, false);
  drawVerticalEdge(path, x1, y0, y1, edges.right, false);
  drawHorizontalEdge(path, x1, y1, x0, edges.bottom, true);
  drawVerticalEdge(path, x0, y1, y0, edges.left, true);
  path.closePath();
  return path;
}
