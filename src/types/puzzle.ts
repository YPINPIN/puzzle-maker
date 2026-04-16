export type EdgeType = -1 | 0 | 1; // -1=blank(凹), 0=flat(平), 1=tab(凸)

export type Difficulty = 'easy' | 'normal' | 'hard' | 'expert';

export type GamePhase = 'upload' | 'config' | 'crop' | 'playing' | 'complete';

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
