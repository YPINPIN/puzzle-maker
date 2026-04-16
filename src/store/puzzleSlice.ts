import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Difficulty, GamePhase, PuzzlePiece } from '../types/puzzle';

type PuzzleState = {
  phase: GamePhase;
  difficulty: Difficulty;
  imageDataUrl: string | null;
  cropRegion: { x: number; y: number; width: number; height: number } | null;
  referenceDataUrl: string | null;
  pieces: PuzzlePiece[];
  // Group 機制
  groups: Record<number, number[]>;   // groupId → pieceIds[]
  pieceGroup: Record<number, number>; // pieceId → groupId
  nextGroupId: number;
  draggingGroupId: number | null;
  // Layout info
  boardH: number;
  pieceW: number;
  pieceH: number;
  puzzleOffsetX: number;
  puzzleOffsetY: number;
  cols: number;
  rows: number;
  // Game state
  startTime: number | null;
  elapsedMs: number;
  showImagePreview: boolean;
  currentGameId: string | null;
};

const initialState: PuzzleState = {
  phase: 'upload',
  difficulty: 'normal',
  imageDataUrl: null,
  cropRegion: null,
  referenceDataUrl: null,
  pieces: [],
  groups: {},
  pieceGroup: {},
  nextGroupId: 0,
  draggingGroupId: null,
  boardH: 0,
  pieceW: 0,
  pieceH: 0,
  puzzleOffsetX: 0,
  puzzleOffsetY: 0,
  cols: 0,
  rows: 0,
  startTime: null,
  elapsedMs: 0,
  showImagePreview: false,
  currentGameId: null,
};

const puzzleSlice = createSlice({
  name: 'puzzle',
  initialState,
  reducers: {
    setImage(state, action: PayloadAction<string>) {
      state.imageDataUrl = action.payload;
      state.cropRegion = null;
      state.phase = 'config';
    },

    setDifficulty(state, action: PayloadAction<Difficulty>) {
      state.difficulty = action.payload;
    },

    confirmConfig(
      state,
      action: PayloadAction<{ cols: number; rows: number; difficulty: Difficulty }>
    ) {
      state.cols = action.payload.cols;
      state.rows = action.payload.rows;
      state.difficulty = action.payload.difficulty;
      state.cropRegion = null;
      state.phase = 'crop';
    },

    saveCropRegion(
      state,
      action: PayloadAction<{ x: number; y: number; width: number; height: number }>
    ) {
      state.cropRegion = action.payload;
    },

    setReferenceImage(state, action: PayloadAction<string>) {
      state.referenceDataUrl = action.payload;
    },

    boardResized(
      state,
      action: PayloadAction<{ scaleX: number; scaleY: number }>
    ) {
      const { scaleX, scaleY } = action.payload;
      state.boardH = Math.round(state.boardH * scaleY);
      state.pieceW = Math.round(state.pieceW * scaleX);
      state.pieceH = Math.round(state.pieceH * scaleY);
      state.puzzleOffsetX = Math.round(state.puzzleOffsetX * scaleX);
      state.puzzleOffsetY = Math.round(state.puzzleOffsetY * scaleY);
      for (const piece of state.pieces) {
        piece.correctPosition.x = Math.round(piece.correctPosition.x * scaleX);
        piece.correctPosition.y = Math.round(piece.correctPosition.y * scaleY);
        piece.currentPosition.x = Math.round(piece.currentPosition.x * scaleX);
        piece.currentPosition.y = Math.round(piece.currentPosition.y * scaleY);
      }
    },

    setPieces(
      state,
      action: PayloadAction<{
        pieces: PuzzlePiece[];
        rows: number;
        cols: number;
        boardH: number;
        pieceW: number;
        pieceH: number;
        puzzleOffsetX: number;
        puzzleOffsetY: number;
      }>
    ) {
      const { pieces, rows, cols, boardH, pieceW, pieceH, puzzleOffsetX, puzzleOffsetY } = action.payload;
      state.pieces = pieces;
      state.rows = rows;
      state.cols = cols;
      state.boardH = boardH;
      state.pieceW = pieceW;
      state.pieceH = pieceH;
      state.puzzleOffsetX = puzzleOffsetX;
      state.puzzleOffsetY = puzzleOffsetY;

      // 初始化 groups：每片為獨立的 group（groupId = piece.id）
      const groups: Record<number, number[]> = {};
      const pieceGroup: Record<number, number> = {};
      let maxId = 0;
      for (const p of pieces) {
        groups[p.id] = [p.id];
        pieceGroup[p.id] = p.id;
        if (p.id > maxId) maxId = p.id;
      }
      state.groups = groups;
      state.pieceGroup = pieceGroup;
      state.nextGroupId = maxId + 1;
    },

    startGame(state) {
      state.phase = 'playing';
      state.startTime = Date.now();
    },

    setDraggingGroup(
      state,
      action: PayloadAction<{ groupId: number }>
    ) {
      const { groupId } = action.payload;
      state.draggingGroupId = groupId;

      // z-order：將 group 的所有片移到陣列末尾
      const pieceIds = new Set(state.groups[groupId] ?? []);
      const others = state.pieces.filter((p) => !pieceIds.has(p.id));
      const dragging = state.pieces.filter((p) => pieceIds.has(p.id));
      state.pieces = [...others, ...dragging];
    },

    moveDragGroup(
      state,
      action: PayloadAction<{ positions: Record<number, { x: number; y: number }> }>
    ) {
      for (const piece of state.pieces) {
        const pos = action.payload.positions[piece.id];
        if (pos) {
          piece.currentPosition.x = pos.x;
          piece.currentPosition.y = pos.y;
        }
      }
    },

    endDragGroup(state) {
      state.draggingGroupId = null;
    },

    mergeGroups(
      state,
      action: PayloadAction<{ keepId: number; absorbId: number }>
    ) {
      const { keepId, absorbId } = action.payload;
      if (keepId === absorbId) return;
      if (!state.groups[keepId] || !state.groups[absorbId]) return;

      // 以 keepId 的第一片為錨點，將 absorbed 的片精確對齊
      const keepPieceIds = state.groups[keepId];
      const anchorId = keepPieceIds[0];
      const anchor = state.pieces.find((p) => p.id === anchorId);

      const absorbed = state.groups[absorbId];
      for (const pid of absorbed) {
        state.pieceGroup[pid] = keepId;
        const piece = state.pieces.find((p) => p.id === pid);
        if (piece) {
          piece.groupId = keepId;
          // 精確對齊：根據 row/col 差計算正確的相對位置
          if (anchor) {
            piece.currentPosition.x =
              anchor.currentPosition.x + (piece.col - anchor.col) * state.pieceW;
            piece.currentPosition.y =
              anchor.currentPosition.y + (piece.row - anchor.row) * state.pieceH;
          }
        }
      }
      state.groups[keepId] = [...keepPieceIds, ...absorbed];
      delete state.groups[absorbId];
    },

    snapGroupToBoard(
      state,
      action: PayloadAction<{ groupId: number }>
    ) {
      const { groupId } = action.payload;
      const pieceIds = state.groups[groupId];
      if (!pieceIds) return;

      // 每片直接設到各自的 correctPosition（不用 delta，避免 anchor 誤差傳播）
      for (const pid of pieceIds) {
        const piece = state.pieces.find((p) => p.id === pid);
        if (piece) {
          piece.currentPosition.x = piece.correctPosition.x;
          piece.currentPosition.y = piece.correctPosition.y;
          piece.isSnapped = true;
        }
      }
    },

    backToConfig(state) {
      state.phase = 'config';
    },

    setComplete(state, action: PayloadAction<number>) {
      state.elapsedMs = action.payload;
      state.phase = 'complete';
    },

    toggleImagePreview(state) {
      state.showImagePreview = !state.showImagePreview;
    },

    setCurrentGameId(state, action: PayloadAction<string>) {
      state.currentGameId = action.payload;
    },

    resetGame() {
      return initialState;
    },
  },
});

export const {
  setImage,
  setDifficulty,
  confirmConfig,
  saveCropRegion,
  setReferenceImage,
  boardResized,
  setPieces,
  startGame,
  setDraggingGroup,
  moveDragGroup,
  endDragGroup,
  mergeGroups,
  snapGroupToBoard,
  backToConfig,
  setComplete,
  toggleImagePreview,
  setCurrentGameId,
  resetGame,
} = puzzleSlice.actions;

export default puzzleSlice.reducer;
