import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { renderFrame } from '../../lib/renderer';
import { COMPLETION_ANIM_DURATION_MS } from '../../lib/constants';

type Props = {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  canvasMapRef: React.RefObject<Map<number, HTMLCanvasElement>>;
  pathMapRef: React.RefObject<Map<number, Path2D>>;
  hoveredPieceIdRef: React.MutableRefObject<number | null>;
  activePieceIdRef: React.MutableRefObject<number | null>;
  dragDeltaRef: React.MutableRefObject<{ x: number; y: number }>;
  dragBasePositionsRef: React.MutableRefObject<Record<number, { x: number; y: number }>>;
  completionAnimStartRef?: React.MutableRefObject<number | null>;
  previewImageRef?: React.RefObject<HTMLImageElement | null>;
  showPreviewHintRef?: React.MutableRefObject<boolean>;
};

export function useGameLoop({
  canvasRef,
  canvasMapRef,
  pathMapRef,
  hoveredPieceIdRef,
  activePieceIdRef,
  dragDeltaRef,
  dragBasePositionsRef,
  completionAnimStartRef,
  previewImageRef,
  showPreviewHintRef,
}: Props) {
  const pieces = useSelector((s: RootState) => s.puzzle.pieces);
  const groups = useSelector((s: RootState) => s.puzzle.groups);
  const draggingGroupId = useSelector((s: RootState) => s.puzzle.draggingGroupId);
  const pieceW = useSelector((s: RootState) => s.puzzle.pieceW);
  const pieceH = useSelector((s: RootState) => s.puzzle.pieceH);
  const puzzleOffsetX = useSelector((s: RootState) => s.puzzle.puzzleOffsetX);
  const puzzleOffsetY = useSelector((s: RootState) => s.puzzle.puzzleOffsetY);
  const rows = useSelector((s: RootState) => s.puzzle.rows);
  const cols = useSelector((s: RootState) => s.puzzle.cols);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const ctx2d: CanvasRenderingContext2D = ctx;

    let rafId: number;
    function loop() {
      const animStart = completionAnimStartRef?.current ?? null;
      const completionProgress = animStart !== null
        ? Math.min(1, (performance.now() - animStart) / COMPLETION_ANIM_DURATION_MS)
        : 0;
      renderFrame({
        ctx: ctx2d,
        pieces,
        canvasMap: canvasMapRef.current,
        pathMap: pathMapRef.current,
        pieceW,
        pieceH,
        puzzleOffsetX,
        puzzleOffsetY,
        rows,
        cols,
        draggingGroupId,
        groups,
        hoveredPieceId: hoveredPieceIdRef.current,
        activePieceId: activePieceIdRef.current,
        dragDelta: dragDeltaRef.current,
        dragBasePositions: dragBasePositionsRef.current,
        completionProgress,
        previewImage: showPreviewHintRef?.current ? (previewImageRef?.current ?? null) : null,
      });
      rafId = requestAnimationFrame(loop);
    }
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [
    canvasRef, canvasMapRef, pathMapRef,
    hoveredPieceIdRef, activePieceIdRef,
    dragDeltaRef, dragBasePositionsRef,
    completionAnimStartRef, previewImageRef, showPreviewHintRef,
    pieces, groups, draggingGroupId, pieceW, pieceH,
    puzzleOffsetX, puzzleOffsetY, rows, cols,
  ]);
}
