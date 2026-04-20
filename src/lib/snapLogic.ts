import type { PuzzlePiece } from '../types/puzzle';
import { GROUP_THRESHOLD, SNAP_THRESHOLD, getEffectiveDPR } from './constants';

/**
 * 判斷兩片是否應合組。
 * piece p 與其鄰居 neighbor（相差 dr, dc 格）的相對位置是否對齊。
 */
export function shouldMerge(
  p: PuzzlePiece,
  neighbor: PuzzlePiece,
  pieceW: number,
  pieceH: number
): boolean {
  const dr = neighbor.row - p.row;
  const dc = neighbor.col - p.col;
  // 期望的相對位置
  const expectedDx = dc * pieceW;
  const expectedDy = dr * pieceH;
  // 實際的相對位置
  const actualDx = neighbor.currentPosition.x - p.currentPosition.x;
  const actualDy = neighbor.currentPosition.y - p.currentPosition.y;

  const diffX = Math.abs(actualDx - expectedDx);
  const diffY = Math.abs(actualDy - expectedDy);
  const threshold = GROUP_THRESHOLD * getEffectiveDPR();
  return diffX < threshold && diffY < threshold;
}

/**
 * 找到 group 中距 correctPosition 最近的片。
 * 若該片距離 < SNAP_THRESHOLD，回傳它（代表整組應 snap）。
 */
export function findSnapCandidate(group: PuzzlePiece[]): PuzzlePiece | null {
  let best: PuzzlePiece | null = null;
  let bestDist = Infinity;
  for (const p of group) {
    const dx = p.currentPosition.x - p.correctPosition.x;
    const dy = p.currentPosition.y - p.correctPosition.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < bestDist) {
      bestDist = dist;
      best = p;
    }
  }
  return bestDist < SNAP_THRESHOLD * getEffectiveDPR() ? best : null;
}
