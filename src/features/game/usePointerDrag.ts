import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import {
  setDraggingGroup,
  moveDragGroup,
  endDragGroup,
  mergeGroups,
  snapGroupToBoard,
  setComplete,
} from '../../store/puzzleSlice';
import type { PuzzlePiece } from '../../types/puzzle';
import { shouldMerge, findSnapCandidate } from '../../lib/snapLogic';
import { TAB_RATIO } from '../../lib/constants';

type Props = {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  pathMapRef: React.RefObject<Map<number, Path2D>>;
  hoveredPieceIdRef: React.MutableRefObject<number | null>;
  activePieceIdRef: React.MutableRefObject<number | null>;
  dragDeltaRef: React.MutableRefObject<{ x: number; y: number }>;
  dragBasePositionsRef: React.MutableRefObject<Record<number, { x: number; y: number }>>;
  /** pan 開始時通知（snapshot 當前 pan 用） */
  onPanStart: () => void;
  /** pan 移動時，傳入從拖曳起點到現在的 CSS pixel delta */
  onPanDelta: (dxCss: number, dyCss: number) => void;
};

export function usePointerDrag({
  canvasRef,
  pathMapRef,
  hoveredPieceIdRef,
  activePieceIdRef,
  dragDeltaRef,
  dragBasePositionsRef,
  onPanStart,
  onPanDelta,
}: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const pieces = useSelector((s: RootState) => s.puzzle.pieces);
  const groups = useSelector((s: RootState) => s.puzzle.groups);
  const pieceGroup = useSelector((s: RootState) => s.puzzle.pieceGroup);
  const draggingGroupId = useSelector((s: RootState) => s.puzzle.draggingGroupId);
  const startTime = useSelector((s: RootState) => s.puzzle.startTime);
  const isPaused = useSelector((s: RootState) => s.puzzle.isPaused);
  const pauseOffset = useSelector((s: RootState) => s.puzzle.pauseOffset);
  const pieceW = useSelector((s: RootState) => s.puzzle.pieceW);
  const pieceH = useSelector((s: RootState) => s.puzzle.pieceH);

  const piecesRef = useRef(pieces);
  const groupsRef = useRef(groups);
  const pieceGroupRef = useRef(pieceGroup);
  const draggingGroupIdRef = useRef(draggingGroupId);
  const isPausedRef = useRef(isPaused);
  const pauseOffsetRef = useRef(pauseOffset);

  useEffect(() => { piecesRef.current = pieces; }, [pieces]);
  useEffect(() => { groupsRef.current = groups; }, [groups]);
  useEffect(() => { pieceGroupRef.current = pieceGroup; }, [pieceGroup]);
  useEffect(() => { draggingGroupIdRef.current = draggingGroupId; }, [draggingGroupId]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { pauseOffsetRef.current = pauseOffset; }, [pauseOffset]);

  // Stable refs for callbacks（避免 useEffect 重新掛載）
  const onPanStartRef = useRef(onPanStart);
  const onPanDeltaRef = useRef(onPanDelta);
  useEffect(() => { onPanStartRef.current = onPanStart; }, [onPanStart]);
  useEffect(() => { onPanDeltaRef.current = onPanDelta; }, [onPanDelta]);

  const dragStartMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const panStartClientRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const TAB_SIZE = Math.floor(pieceW * TAB_RATIO);

    /** pointer 的 display 座標轉為 canvas 邏輯座標（getBoundingClientRect 已含 pan + cssScale） */
    function getCanvasPos(e: PointerEvent): { x: number; y: number } {
      const rect = canvas!.getBoundingClientRect();
      const scaleX = canvas!.width / rect.width;
      const scaleY = canvas!.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    }

    function hitTest(x: number, y: number): number | null {
      const ctx = canvas!.getContext('2d');
      if (!ctx) return null;

      for (let i = piecesRef.current.length - 1; i >= 0; i--) {
        const p = piecesRef.current[i];
        if (p.isSnapped) continue;
        const path = pathMapRef.current.get(p.id);
        if (!path) continue;

        const px = p.currentPosition.x - TAB_SIZE;
        const py = p.currentPosition.y - TAB_SIZE;

        ctx.save();
        ctx.translate(px, py);
        const hit = ctx.isPointInPath(path, x, y);
        ctx.restore();

        if (hit) return p.id;
      }
      return null;
    }

    function onPointerDown(e: PointerEvent) {
      if (isPausedRef.current) return;
      const { x, y } = getCanvasPos(e);
      const hitId = hitTest(x, y);

      if (hitId === null) {
        // 無拼圖片 → 開始 pan
        isPanningRef.current = true;
        panStartClientRef.current = { x: e.clientX, y: e.clientY };
        onPanStartRef.current();
        canvas!.setPointerCapture(e.pointerId);
        canvas!.style.cursor = 'grabbing';
        return;
      }

      const groupId = pieceGroupRef.current[hitId];
      if (groupId === undefined) return;

      activePieceIdRef.current = hitId;

      const groupPieceIds = groupsRef.current[groupId] ?? [];
      const basePositions: Record<number, { x: number; y: number }> = {};
      for (const pid of groupPieceIds) {
        const p = piecesRef.current.find((pp) => pp.id === pid);
        if (p) basePositions[pid] = { x: p.currentPosition.x, y: p.currentPosition.y };
      }
      dragBasePositionsRef.current = basePositions;
      dragDeltaRef.current = { x: 0, y: 0 };
      dragStartMouseRef.current = { x, y };

      dispatch(setDraggingGroup({ groupId }));
      canvas!.setPointerCapture(e.pointerId);
    }

    function onPointerMove(e: PointerEvent) {
      if (isPanningRef.current) {
        const dxCss = e.clientX - panStartClientRef.current.x;
        const dyCss = e.clientY - panStartClientRef.current.y;
        onPanDeltaRef.current(dxCss, dyCss);
        return;
      }

      const { x, y } = getCanvasPos(e);

      if (draggingGroupIdRef.current !== null) {
        const rawDx = x - dragStartMouseRef.current.x;
        const rawDy = y - dragStartMouseRef.current.y;

        const W = canvas!.width;
        const H = canvas!.height;
        let minDx = -Infinity, maxDx = Infinity;
        let minDy = -Infinity, maxDy = Infinity;
        for (const base of Object.values(dragBasePositionsRef.current)) {
          minDx = Math.max(minDx, TAB_SIZE - base.x);
          maxDx = Math.min(maxDx, W - pieceW - TAB_SIZE - base.x);
          minDy = Math.max(minDy, TAB_SIZE - base.y);
          maxDy = Math.min(maxDy, H - pieceH - TAB_SIZE - base.y);
        }
        dragDeltaRef.current = {
          x: Math.max(minDx, Math.min(maxDx, rawDx)),
          y: Math.max(minDy, Math.min(maxDy, rawDy)),
        };
        hoveredPieceIdRef.current = null;
      } else {
        const hitId = hitTest(x, y);
        hoveredPieceIdRef.current = hitId;
        canvas!.style.cursor = hitId !== null ? 'grab' : 'default';
      }
    }

    function onPointerUp() {
      activePieceIdRef.current = null;

      if (isPanningRef.current) {
        isPanningRef.current = false;
        canvas!.style.cursor = 'default';
        return;
      }

      const groupId = draggingGroupIdRef.current;
      if (groupId === null) return;

      canvas!.style.cursor = 'default';

      const delta = dragDeltaRef.current;
      const basePositions = dragBasePositionsRef.current;
      const finalPositions: Record<number, { x: number; y: number }> = {};
      for (const [pidStr, base] of Object.entries(basePositions)) {
        const pid = Number(pidStr);
        finalPositions[pid] = { x: base.x + delta.x, y: base.y + delta.y };
      }
      dispatch(moveDragGroup({ positions: finalPositions }));

      dragDeltaRef.current = { x: 0, y: 0 };
      dragBasePositionsRef.current = {};

      const currentPieces = piecesRef.current;
      const currentGroups = groupsRef.current;
      const currentPieceGroup = pieceGroupRef.current;
      const groupPieceIds = currentGroups[groupId] ?? [];

      const pieceById = new Map<number, PuzzlePiece>(currentPieces.map((p) => [p.id, p]));
      for (const [pidStr, finalPos] of Object.entries(finalPositions)) {
        const pid = Number(pidStr);
        const p = pieceById.get(pid);
        if (p) pieceById.set(pid, { ...p, currentPosition: finalPos });
      }

      const toMerge: number[] = [];
      for (const pid of groupPieceIds) {
        const p = pieceById.get(pid);
        if (!p) continue;

        const neighbors = [
          { dr: -1, dc: 0 }, { dr: 1, dc: 0 },
          { dr: 0, dc: -1 }, { dr: 0, dc: 1 },
        ];
        for (const { dr, dc } of neighbors) {
          const nr = p.row + dr;
          const nc = p.col + dc;
          if (nr < 0 || nc < 0) continue;

          const neighbor = [...pieceById.values()].find(
            (pp) => pp.row === nr && pp.col === nc
          );
          if (!neighbor) continue;

          const neighborGroupId = currentPieceGroup[neighbor.id];
          if (neighborGroupId === groupId) continue;

          if (shouldMerge(p, neighbor, pieceW, pieceH)) {
            if (!toMerge.includes(neighborGroupId)) toMerge.push(neighborGroupId);
          }
        }
      }

      for (const absorbId of toMerge) {
        dispatch(mergeGroups({ keepId: groupId, absorbId }));
      }

      const mergedIds = new Set(groupPieceIds);
      for (const absorbId of toMerge) {
        for (const pid of (currentGroups[absorbId] ?? [])) mergedIds.add(pid);
      }
      const mergedPieces = [...mergedIds]
        .map((pid) => pieceById.get(pid))
        .filter(Boolean) as PuzzlePiece[];

      const snapCandidate = findSnapCandidate(mergedPieces);
      if (snapCandidate) {
        dispatch(snapGroupToBoard({ groupId }));
        for (const absorbId of toMerge) dispatch(snapGroupToBoard({ groupId: absorbId }));
      }

      dispatch(endDragGroup());

      const allSnapped = currentPieces.every((p) => {
        if (mergedIds.has(p.id)) return snapCandidate !== null;
        return p.isSnapped;
      });
      if (allSnapped && snapCandidate) {
        const elapsed = startTime ? Date.now() - startTime - pauseOffsetRef.current : 0;
        dispatch(setComplete(elapsed));
      }
    }

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
    };
  }, [
    canvasRef, pathMapRef, hoveredPieceIdRef, activePieceIdRef,
    dragDeltaRef, dragBasePositionsRef,
    dispatch, pieceW, pieceH, startTime, isPaused, pauseOffset,
  ]);
}
