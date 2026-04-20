export const TOOLBAR_HEIGHT = 64;
export const MAX_CANVAS_WIDTH = 1440;
export const TAB_RATIO = 0.2;
export const SNAP_THRESHOLD = 20;
export const GROUP_THRESHOLD = 6;
export const ZOOM_MIN = 100;
export const ZOOM_MAX = 200;
export const ZOOM_STEP = 25;
export const ZOOM_BUTTON_AVOID_W = 170;
export const ZOOM_BUTTON_AVOID_H = 140;

// DPR clamped to [2, 3]：DPR≤2 行為與原本相同；DPR=3 升至 3x 解析度；DPR>3 避免過度耗記憶體
export function getEffectiveDPR(): number {
  return Math.min(Math.max(Math.ceil(window.devicePixelRatio || 1), 2), 3);
}
