export type EdgeType = -1 | 0 | 1; // -1=blank(凹), 0=flat(平), 1=tab(凸)

export type Difficulty = 'easy' | 'normal' | 'hard' | 'expert';

export type GamePhase = 'home' | 'upload' | 'config' | 'crop' | 'playing' | 'complete';

export type InProgressGameState = {
  pieces: PuzzlePiece[];
  groups: Record<number, number[]>;
  pieceGroup: Record<number, number>;
  nextGroupId: number;
  elapsedAtSave: number;
  boardW: number;
  boardH: number;
  pieceW: number;
  pieceH: number;
  puzzleOffsetX: number;
  puzzleOffsetY: number;
};

export type GameHistoryRecord = {
  id: string;
  configId: string | null;
  createdAt: number;
  updatedAt: number;
  difficulty: string;
  cols: number;
  rows: number;
  thumbnailDataUrl: string;
  croppedImageDataUrl: string;
  savedState: InProgressGameState;
  isCompleted?: boolean;
};

export type PuzzlePiece = {
  id: number;
  row: number;
  col: number;
  edges: {
    top: EdgeType;
    right: EdgeType;
    bottom: EdgeType;
    left: EdgeType;
  };
  correctPosition: { x: number; y: number };
  currentPosition: { x: number; y: number };
  isSnapped: boolean;
  groupId: number;
};
