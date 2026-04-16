import type { EdgeType, PuzzlePiece } from '../types/puzzle';

/**
 * 生成 rows × cols 的邊緣矩陣，確保相鄰邊互補。
 * hEdges[r][c] = piece(r,c) 的 bottom edge（= piece(r+1,c) 的 top 的相反值）
 * vEdges[r][c] = piece(r,c) 的 right edge（= piece(r,c+1) 的 left 的相反值）
 */
export function generateEdges(
  rows: number,
  cols: number
): Pick<PuzzlePiece, 'edges'>[][] {
  // 只生成 internal edges；外框邊不存在此矩陣中
  const hEdges: EdgeType[][] = Array.from({ length: rows - 1 }, () =>
    Array.from({ length: cols }, () => (Math.random() < 0.5 ? 1 : -1) as EdgeType)
  );
  const vEdges: EdgeType[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols - 1 }, () => (Math.random() < 0.5 ? 1 : -1) as EdgeType)
  );

  const result: Pick<PuzzlePiece, 'edges'>[][] = [];
  for (let r = 0; r < rows; r++) {
    result[r] = [];
    for (let c = 0; c < cols; c++) {
      const top: EdgeType = r === 0 ? 0 : (-hEdges[r - 1][c] as EdgeType);
      // 相鄰片的對應邊取負值：piece(r+1).top = -(piece(r).bottom)
      const bottom: EdgeType = r === rows - 1 ? 0 : hEdges[r][c];
      const left: EdgeType = c === 0 ? 0 : ((-vEdges[r][c - 1]) as EdgeType);
      const right: EdgeType = c === cols - 1 ? 0 : vEdges[r][c];

      result[r][c] = { edges: { top, bottom, left, right } };
    }
  }
  return result;
}
