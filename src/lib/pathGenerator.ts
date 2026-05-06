import type { EdgeType, PuzzlePiece } from '../types/puzzle';
import { TAB_RATIO } from './constants';

export { TAB_RATIO };

function getTab(dir: number, size: number) {
  const height = size * TAB_RATIO * dir;

  return {
    height,
    neck: size * 0.1,
    head: size * 0.35,
  };
}

function drawHorizontalEdge(path: Path2D, x0: number, y: number, x1: number, edgeType: EdgeType) {
  if (edgeType === 0) {
    path.lineTo(x1, y);
    return;
  }

  const W = x1 - x0;
  const cx = x0 + W / 2;

  const { height, neck, head } = getTab(edgeType, W);

  const left = cx - neck;
  const right = cx + neck;

  path.lineTo(left, y);

  path.bezierCurveTo(cx - neck * 0.6, y, cx - head, y - height, cx, y - height);

  path.bezierCurveTo(cx + head, y - height, cx + neck * 0.6, y, right, y);

  path.lineTo(x1, y);
}

function drawVerticalEdge(path: Path2D, x: number, y0: number, y1: number, edgeType: EdgeType) {
  if (edgeType === 0) {
    path.lineTo(x, y1);
    return;
  }

  const H = y1 - y0;
  const cy = y0 + H / 2;

  const { height, neck, head } = getTab(edgeType, H);

  const top = cy - neck;
  const bottom = cy + neck;

  path.lineTo(x, top);

  path.bezierCurveTo(x, cy - neck * 0.6, x + height, cy - head, x + height, cy);

  path.bezierCurveTo(x + height, cy + head, x, cy + neck * 0.6, x, bottom);

  path.lineTo(x, y1);
}

export function buildPiecePath(edges: PuzzlePiece['edges'], pieceW: number, pieceH: number, offset: number): Path2D {
  const path = new Path2D();

  const x0 = offset;
  const y0 = offset;
  const x1 = offset + pieceW;
  const y1 = offset + pieceH;

  path.moveTo(x0, y0);

  drawHorizontalEdge(path, x0, y0, x1, edges.top);

  drawVerticalEdge(path, x1, y0, y1, edges.right);

  drawHorizontalEdge(path, x1, y1, x0, edges.bottom);

  drawVerticalEdge(path, x0, y1, y0, edges.left);

  path.closePath();

  return path;
}
