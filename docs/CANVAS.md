# Canvas 渲染與拼圖片機制

> 本文件說明 Canvas 座標系統與渲染架構、拼圖片的形狀生成與合組邏輯，以及觸控與縮放的互動實作。

## Canvas 渲染架構

### 座標系統

- Canvas 邏輯尺寸：**正方形**，邊長 = `effectiveDPR × min(viewportW, viewportH - TOOLBAR_HEIGHT)`；寬度另受 `MAX_CANVAS_WIDTH` 上限（1440px）限制
- `effectiveDPR = clamp(ceil(devicePixelRatio), 2, 3)`：DPR≤2 用 2（桌機與一般手機），DPR=3 用 3（iPhone Pro 等），避免模糊
- 縮放範圍：`ZOOM_MIN=100%`（fitScale=1/DPR，canvas 填滿視窗）至 `ZOOM_MAX=150%`（格線約填滿視窗 94%）；步進 `ZOOM_STEP=25%`，級別：100 / 125 / 150%；這三個常數定義於 `src/lib/constants.ts`
- 公式：`actualCssScale = fitScale × zoom / 100`
- 拼圖格線在 canvas 內**置中**，偏移量存為 `puzzleOffsetX / puzzleOffsetY`

視窗 resize 時，`PuzzleBoard` 以 debounce 偵測，若 canvas 尺寸改變則呼叫 `rescalePieces` action 重新比例縮放所有片子座標。

### 渲染層次（`src/lib/renderer.ts`）

每幀依序繪製：

1. 整體背景（深米色）+ 格線矩形（淺米色）+ 格線預覽圖（`showPreviewHintRef.current` 為 true 且 `previewImageRef.current` 已載入時，以 22% 透明度繪製 `referenceDataUrl` 縮圖）+ 虛線格子
2. 已 snap 的片（row-major 順序）+ 縫隙線描邊
3. 未 snap 且非拖曳中的片（含縫隙線描邊、hover 白色填色+描邊、紅光警示）；hover 狀態下略過縫隙線（白色描邊優先）
4. 拖曳中的片（最上層，帶陰影）；格線外疊白色描邊，格線上改顯示綠光（兩者不疊加）；拖曳中不畫縫隙線
5. 完成掃光動畫（`completionProgress > 0` 時）：斜向白色光帶從左上掃至右下，限制在格線矩形 clip 範圍內

`useGameLoop` 以 `requestAnimationFrame` 驅動渲染；`usePointerDrag` 處理 pointer 事件。兩者都掛載在 `PuzzleBoard`。`usePointerDrag` 讀取 `isPausedRef`，暫停狀態下跳過所有拖曳。

#### Canvas 硬碼顏色

| 用途 | 顏色值 |
|------|--------|
| 待放區背景 | `#d8d3cc` |
| 格線矩形 | `#f0ede8` |
| 格子虛線 | `rgba(150,140,130,0.5)` |
| 拖曳陰影 | `rgba(0,0,0,0.4)` |
| 縫隙線（snap 片與非 hover 散片） | stroke `rgba(0,0,0,0.28)`，lineWidth 2 |
| Hover 填色 | fill `rgba(255,255,255,0.22)` |
| Hover 描邊 / 拖曳白框（格線外） | stroke `rgba(255,255,255,0.8)`，lineWidth 2 |
| 紅光（錯位警示） | stroke `rgba(220,50,50,0.75)`，shadow `rgba(255,60,60,0.9)` |
| 綠光（放下預覽） | stroke `rgba(50,200,80,0.85)`，shadow `rgba(60,255,100,0.9)` |
| 完成掃光光帶核心 | fill `rgba(255,255,255,0.45)`（峰值），兩側漸淡至 0 |

### Offscreen Canvas 與 Path2D

每片拼圖在 `pieceFactory.ts` 初始化時建立：

- **offscreen canvas**：含 tab/blank 剪裁後的圖像，尺寸 = `pieceW + 2×TAB_SIZE`
- **Path2D**：拼圖輪廓，用於 hit-test（`isPointInPath`）與 glow 描邊

---

## 拼圖片機制

### 形狀生成

- `src/lib/edgeGenerator.ts`：生成 `rows × cols` 的邊緣矩陣，確保相鄰片凹凸互補（`EdgeType`: -1=凹, 0=平, 1=凸）
- `src/lib/pathGenerator.ts`：將邊緣描述轉為 Path2D 曲線

**`getTab(dir, size)` 輔助函式**（`pathGenerator.ts`）

| 參數 | 說明 |
|------|------|
| `height = size × TAB_RATIO × dir` | 凸起高度，帶方向符號。水平邊以 `y − height` 偏移（正值向上），垂直邊以 `x + height` 偏移（正值向右） |
| `neck = size × 0.1` | 頸部半寬（邊長 10%），帶符號，負值時自動對應反向繪製 |
| `head = size × 0.35` | 頭部 bezier 控制點展開量（邊長 35%），帶符號 |

繪製流程（以上邊 tab 為例）：直線到頸部左端 → 第一段 bezier（頸部左 → 弧頂中心）→ 第二段 bezier（弧頂中心 → 頸部右）→ 直線到邊終點。兩段 bezier 的控制點分別在 `cx ± head` 處，使弧頂向外擴張。底邊與左邊藉由 W / H 的負號，無需額外 flip 參數即可自動處理方向。

### 重要常數（`src/lib/constants.ts`）

| 常數／函式 | 值／說明 |
|-----------|---------|
| `TOOLBAR_HEIGHT` | 64 — 全域 Header **最小**高度（px）；實際高度可能因 flex-wrap 而更高 |
| `MAX_CANVAS_WIDTH` | 1440 — canvas 容器最大寬度（px），超寬螢幕上限 |
| `TAB_RATIO` | 0.3 — tab 大小 = pieceW × 0.3；offscreen canvas padding = `TAB_SIZE = ⌊pieceW × TAB_RATIO⌋`，凸起最大高度 = `pieceW × TAB_RATIO`，恰好填滿留白 |
| `SNAP_THRESHOLD` | 20 — snap 至板子的吸附距離（canvas px）；實際使用時乘以 DPR |
| `GROUP_THRESHOLD` | 6 — 兩片合組的位置容差（canvas px）；實際使用時乘以 DPR |
| `ZOOM_MIN` | 100 — 最小縮放比例（%） |
| `ZOOM_MAX` | 150 — 最大縮放比例（%）；150% 時格線約填滿視窗（94%），完成動畫縮放目標亦為此值 |
| `ZOOM_STEP` | 25 — 縮放步進（%）；zoom 級別：100 / 125 / 150% |
| `ZOOM_BUTTON_AVOID_W` | 170 — 散落排除右下角寬度（CSS px）；乘以 DPR 後傳給 `generatePieces` |
| `ZOOM_BUTTON_AVOID_H` | 140 — 散落排除右下角高度（CSS px）；乘以 DPR 後傳給 `generatePieces` |
| `SCATTER_EDGE_PAD_CSS` | 30 — 散落區距螢幕邊框的額外 padding（CSS px）；新遊戲時乘以 DPR 後以 `scatterEdgePad` 傳給 `generatePieces`，避免散片靠近邊框觸發手機返回手勢 |
| `COMPLETION_ANIM_DURATION_MS` | 1500 — 完成掃光動畫持續時間（ms）；`useGameLoop` 以此計算 `completionProgress`，`PuzzleBoard` 在動畫結束後（+200ms 緩衝）觸發 `onAnimationEnd` |
| `ZOOM_IN_DURATION_MS` | 200 — 完成縮放置中的 CSS transition 時間（ms）；`PuzzleBoard` completionZooming state 搭配 `transform` transition 使用 |
| `GAME_BOTTOM_BAR_HEIGHT` | 50 — PuzzleBoard 底部控制 bar 的近似高度（CSS px，不含 safe-area inset）；用於在 PuzzleBoard 外計算 `canvasH`，使 `boardH` 與 `gameAreaRef.clientHeight` 一致，避免 `needsInitialRegenRef` 不必要觸發 |
| `getEffectiveDPR()` | `clamp(ceil(devicePixelRatio), 2, 3)` — 決定 canvas 解析度倍率；所有 canvasW/H 計算均透過此函式 |

### Group 機制（合組邏輯）

每片初始為獨立 group（`groupId = piece.id`）。拖放結束時：

1. `shouldMerge`（`snapLogic.ts`）：檢查拖曳組與相鄰片的相對位置誤差 < `GROUP_THRESHOLD × DPR`，若成立則合組（`mergeGroups` action）
2. `findSnapCandidate`（`snapLogic.ts`）：若整組中最近片距 `correctPosition` < `SNAP_THRESHOLD × DPR`，觸發 `snapGroupToBoard`，直接將所有片設回 `correctPosition`
3. 全部片 `isSnapped` 時觸發 `setComplete`

Threshold 乘以 `getEffectiveDPR()` 是為了讓手機與桌機在 **CSS 像素**體感上保持一致（`GROUP_THRESHOLD=6 CSS px`，`SNAP_THRESHOLD=20 CSS px`）。

### `generatePieces` 散落邏輯（`src/lib/pieceFactory.ts`）

**pieceSize 設計**：`pieceSize = min(⌊canvasW × 5 / (8 × cols)⌋, ⌊canvasH × 5 / (8 × rows)⌋)`。100% zoom（scale=0.5）時格線視覺寬度約為 62.5% 視窗寬，對應舊版 125% zoom 的視覺大小。150% zoom（scale=0.75）時格線約填滿視窗（94%）。

散片初始位置分布在格線矩形外圍的四個區域（按面積加權隨機）。`avoidW/avoidH/pickPosition` 已提升至迴圈外，避免每片重複宣告。

Zone 邊界分為兩個概念：
- `gridM = TAB_SIZE + 4`：散片與格線矩形之間的最小間距
- `edgeM = gridM + scatterEdgePad`：散片距 canvas 外框的最小間距（避免靠近螢幕邊緣觸發返回手勢）

當四個 zone 面積均為 0（極小螢幕或大格線比例），fallback 以相同四 zone 結構重新計算但不套 `scatterEdgePad`（邊距降至 0），仍保持 `gridM` 間距確保不落在格線上；最極端情況才退回 `{x:0, y:0}`。

可選參數：
- `avoidBottomRight?: { w, h }`（canvas 邏輯像素）：排除右下角縮放按鈕疊層位置，最多重試 8 次
- `scatterEdgePad?: number`（canvas 邏輯像素）：距螢幕邊框的額外 padding；新遊戲時傳入 `SCATTER_EDGE_PAD_CSS * dpr`

**呼叫慣例**

| 呼叫來源 | `avoidBottomRight` | `scatterEdgePad` |
|---------|--------------------|--------------------|
| `CropPreview.handleConfirm`（新遊戲） | `{ w: ZOOM_BUTTON_AVOID_W * dpr, h: ZOOM_BUTTON_AVOID_H * dpr }` | `SCATTER_EDGE_PAD_CSS * dpr` |
| `HomePage.applyRecord`（新遊戲） | `{ w: ZOOM_BUTTON_AVOID_W * dpr, h: ZOOM_BUTTON_AVOID_H * dpr }` | `SCATTER_EDGE_PAD_CSS * dpr` |
| `PuzzleBoard` resize | 不傳（位置由 scale 覆蓋） | 不傳 |
| `continueGame` | 不傳（位置由 savedState 覆蓋） | 不傳 |

**圖片來源**：所有進入遊戲的路徑均傳入已裁切的小圖（≤800px JPEG）。`PuzzleBoard.doRegenerate` 使用 `referenceDataUrl ?? imageDataUrl`；`referenceDataUrl` 所有路徑均為 800px，確保 doRegenerate 行為一致。

---

## 觸控與縮放（`src/features/game/usePointerDrag.ts`）

使用 Pointer Events API 統一處理滑鼠、觸控、手寫筆。

### 互動模式

| 模式 | 觸發條件 | 行為 |
|------|---------|------|
| 拖曳 | 單指 hit-test 命中拼圖片 | 拖曳該片 |
| 平移 | 單指 hit-test 未命中 | 平移（pan）畫面 |
| Pinch zoom | 雙指 | 記錄初始指間距離與 zoom 基準值，按比例計算新 zoom（連續值，不四捨五入）；同時追蹤中點偏移做平移補償；放開其中一指即退出 |

**暫停狀態**：`isPausedRef` guard 在 `pointerCacheRef.set()` 之後、pinch 判斷之前，暫停時所有 pointer 事件（含 pinch zoom）均被封鎖。

### 重要行為細節

- `onPointerUp` 早返前（另一指仍按著）會先清除進行中的拖曳（`dispatch(endDragGroup())`），防止 stale drag state
- `onZoomChange` 直接 clamp 到 [ZOOM_MIN, ZOOM_MAX]，不做 round，確保 pinch zoom 連續平滑

### Props 介面

- `onZoomChange(newZoom)` — 更新 PuzzleBoard 的 zoom 狀態
- `zoomPercentRef` — pinch 開始時讀取當前 zoom 基準值
- `onPanStart / onPanDelta` — pan 回調（pinch 平移補償也使用）
