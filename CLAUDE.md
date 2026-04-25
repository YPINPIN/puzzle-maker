# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 常用指令

```bash
npm run dev      # 啟動開發伺服器（含 HMR）
npm run build    # TypeScript 型別檢查 + Vite 打包
npm run lint     # ESLint 靜態分析
npm run preview  # 預覽 production 建置結果
```

## 技術架構

- **React 19 + TypeScript**，以 Vite 8 作為建置工具
- **Redux Toolkit**（`@reduxjs/toolkit` + `react-redux`）管理全局狀態，單一 `puzzleSlice`（`src/store/puzzleSlice.ts`）
- **Tailwind CSS v4**，透過 `@tailwindcss/vite` plugin 整合（無獨立設定檔）
- CSS 入口為 `src/index.css`，以 `@import "tailwindcss"` 引入 Tailwind
- **lz-string**：分享代碼壓縮用（`compressToBase64` / `decompressFromBase64`）

### Redux State 關鍵欄位說明

| 欄位 | 型別 | 說明 |
|------|------|------|
| `imageDataUrl` | `string \| null` | 原始上傳圖片（未裁切），僅在 upload→crop 階段使用；`startGame` 觸發時清除 |
| `referenceDataUrl` | `string \| null` | 裁切後的參考圖（≤600px JPEG），遊戲中「查看參考圖」使用；也是 `doRegenerate` 的圖片來源 |
| `cropRegion` | 物件 | 相對於原圖的裁切座標（x, y, width, height）；`startGame` 觸發時清除 |
| `draggingGroupId` | `number \| null` | 目前被拖曳的 group ID；renderer 以此決定渲染層次 |
| `showImagePreview` | `boolean` | 控制 `ImagePreviewOverlay` 顯示 |
| `isPaused` | `boolean` | 計時器是否暫停（影響計時計算） |
| `showPauseOverlay` | `boolean` | 是否顯示半透明暫停覆蓋層（**獨立於 `isPaused`**）；只有「暫停」按鈕觸發的 `userPauseGame()` 才同時設為 true；「保存並結束」、「結束」、back 攔截等系統暫停只呼叫 `pauseGame()`，不顯示 overlay |

## TypeScript 設定

採用 project references 分層設定：

- `tsconfig.json` — 根設定，僅包含 references
- `tsconfig.app.json` — 應用程式碼（`src/`）
- `tsconfig.node.json` — Vite 設定檔等 Node 環境程式碼

## 遊戲流程與狀態機

遊戲以 Redux `phase` 欄位驅動：

```
home → upload → config → crop → playing → complete
```

`resetGame()` 回到 `home`。`App.tsx` 根據 `phase` 條件渲染對應元件；`canvasMapRef`（offscreen canvas）與 `pathMapRef`（Path2D 形狀）在 App 層建立並向下傳遞，貫穿整個遊戲生命週期。

| Phase      | 元件                                | 說明                                         |
|------------|-------------------------------------|----------------------------------------------|
| `home`     | `HomePage`                          | 主選單：建立新拼圖、讀取存檔、快速開局       |
| `upload`   | `ImageUpload`                       | 上傳頁（拖放或選用內建圖片）；快捷設定滿時從首頁攔截 |
| `config`   | `DifficultySelector`                | 選擇難度，決定 cols × rows                   |
| `crop`     | `CropPreview`                       | 裁切圖片，生成拼圖片，建立快捷設定紀錄       |
| `playing`  | `PuzzleBoard` + `AppHeader`         | 主遊戲畫面，含暫停／儲存控制                 |
| `complete` | `PuzzleBoard` + `CompletionOverlay` | 完成覆蓋層，可儲存或離開                     |

### 首頁入口邏輯

- **繼續上局**：mount 時讀取 `getDraft()`，若存在則顯示湖水綠 `DraftCard`（最上方），顯示難度、格數、完成百分比、暫存時間、已拼片數／耗時；點擊呼叫 `resumeDraft`，以草稿資料構造假的 `GameHistoryRecord` 後呼叫 `continueGame`
- **建立新拼圖**：檢查 `getRecords().length >= 10`，若滿則攔截；否則呼叫 `guardDraft(() => dispatch(goToUpload()))`
- **讀取存檔**：開啟 `RecordsModal`（`mode='history'`）→ 選擇後 `setShowRecords(null)` → `guardDraft(() => continueGame(record))`
- **快速開局**：開啟 `RecordsModal`（`mode='quick'`）→ 選擇後 `setShowRecords(null)` → `guardDraft(() => applyRecord(record))`

`guardDraft(action)`：若 `getDraft()` 存在，將 action 存入 `pendingAction` state 並顯示草稿警告 dialog（確認後 `clearDraft()` → `setCurrentDraft(null)` → 執行 action）；否則直接執行 action。

`applyRecord`、`continueGame`、`resumeDraft` 的實作均在 `HomePage`（非 `ImageUpload`）。

## Canvas 渲染架構

### 座標系統

- Canvas 邏輯尺寸：**正方形**，邊長 = `effectiveDPR × min(viewportW, viewportH - TOOLBAR_HEIGHT)`；寬度另受 `MAX_CANVAS_WIDTH` 上限（1440px）限制
- `effectiveDPR = clamp(ceil(devicePixelRatio), 2, 3)`：DPR≤2 用 2（桌機與一般手機），DPR=3 用 3（iPhone Pro 等），避免模糊
- 縮放範圍：`ZOOM_MIN=100%`（fitScale=1/DPR，canvas 填滿視窗）至 `ZOOM_MAX=200%`（格線填滿視窗）；步進 `ZOOM_STEP=25%`；這三個常數定義於 `src/lib/constants.ts`
- 公式：`actualCssScale = fitScale × zoom / 100`
- 拼圖格線在 canvas 內**置中**，偏移量存為 `puzzleOffsetX / puzzleOffsetY`

視窗 resize 時，`PuzzleBoard` 以 debounce 偵測，若 canvas 尺寸改變則呼叫 `rescalePieces` action 重新比例縮放所有片子座標。

### 渲染層次（`src/lib/renderer.ts`）

每幀依序繪製：
1. 整體背景（深米色）+ 格線矩形（淺米色）+ 虛線格子
2. 已 snap 的片（row-major 順序）
3. 未 snap 且非拖曳中的片（含 hover 高亮、紅光警示）
4. 拖曳中的片（最上層，帶陰影、綠光預覽）

`useGameLoop` 以 `requestAnimationFrame` 驅動渲染；`usePointerDrag` 處理 pointer 事件。兩者都掛載在 `PuzzleBoard`。`usePointerDrag` 讀取 `isPausedRef`，暫停狀態下跳過所有拖曳。

### Offscreen Canvas 與 Path2D

每片拼圖在 `pieceFactory.ts` 初始化時建立：
- **offscreen canvas**：含 tab/blank 剪裁後的圖像，尺寸 = `pieceW + 2×TAB_SIZE`
- **Path2D**：拼圖輪廓，用於 hit-test（`isPointInPath`）與 glow 描邊

## 拼圖片機制

### 形狀生成

- `src/lib/edgeGenerator.ts`：生成 `rows × cols` 的邊緣矩陣，確保相鄰片凹凸互補（`EdgeType`: -1=凹, 0=平, 1=凸）
- `src/lib/pathGenerator.ts`：將邊緣描述轉為 Path2D 曲線

### Group 機制（合組邏輯）

每片初始為獨立 group（`groupId = piece.id`）。拖放結束時：

1. `shouldMerge`（`snapLogic.ts`）：檢查拖曳組與相鄰片的相對位置誤差 < `GROUP_THRESHOLD × DPR`，若成立則合組（`mergeGroups` action）
2. `findSnapCandidate`（`snapLogic.ts`）：若整組中最近片距 `correctPosition` < `SNAP_THRESHOLD × DPR`，觸發 `snapGroupToBoard`，直接將所有片設回 `correctPosition`
3. 全部片 `isSnapped` 時觸發 `setComplete`

Threshold 乘以 `getEffectiveDPR()` 是為了讓手機與桌機在 **CSS 像素**體感上保持一致（`GROUP_THRESHOLD=6 CSS px`，`SNAP_THRESHOLD=20 CSS px`）。

### 重要常數（`src/lib/constants.ts`）

| 常數／函式             | 值／說明                                                                  |
|----------------------|---------------------------------------------------------------------------|
| `TOOLBAR_HEIGHT`     | 64 — 全域 Header **最小**高度（px）；實際高度可能因 flex-wrap 而更高      |
| `MAX_CANVAS_WIDTH`   | 1440 — canvas 容器最大寬度（px），超寬螢幕上限                            |
| `TAB_RATIO`          | 0.2 — tab 大小 = pieceW × 0.2                                             |
| `SNAP_THRESHOLD`     | 20 — snap 至板子的吸附距離（canvas px）；實際使用時乘以 DPR               |
| `GROUP_THRESHOLD`    | 6 — 兩片合組的位置容差（canvas px）；實際使用時乘以 DPR                   |
| `ZOOM_MIN`           | 100 — 最小縮放比例（%）                                                   |
| `ZOOM_MAX`           | 200 — 最大縮放比例（%）                                                   |
| `ZOOM_STEP`          | 25 — 縮放步進（%）                                                        |
| `ZOOM_BUTTON_AVOID_W` | 170 — 散落排除右下角寬度（CSS px）；乘以 DPR 後傳給 `generatePieces`    |
| `ZOOM_BUTTON_AVOID_H` | 140 — 散落排除右下角高度（CSS px）；乘以 DPR 後傳給 `generatePieces`    |
| `GAME_BOTTOM_BAR_HEIGHT` | 50 — PuzzleBoard 底部控制 bar 的近似高度（CSS px，不含 safe-area inset）；用於在 PuzzleBoard 外計算 `canvasH`，使 `boardH` 與 `gameAreaRef.clientHeight` 一致，避免 `needsInitialRegenRef` 不必要觸發 |
| `getEffectiveDPR()`  | `clamp(ceil(devicePixelRatio), 2, 3)` — 決定 canvas 解析度倍率；所有 canvasW/H 計算均透過此函式 |

### generatePieces 散落邏輯（`src/lib/pieceFactory.ts`）

散片初始位置分布在格線矩形外圍的四個區域（按面積加權隨機）。`avoidW/avoidH/pickPosition` 已提升至迴圈外，避免每片重複宣告。支援可選的 `avoidBottomRight?: { w, h }` 參數（canvas 邏輯像素），用於排除右下角縮放按鈕疊層所在位置；遇到落在排除區內的片會重試最多 8 次。

**呼叫慣例**：`CropPreview.handleConfirm` 與 `HomePage.applyRecord`（新遊戲）傳入 `{ w: ZOOM_BUTTON_AVOID_W * dpr, h: ZOOM_BUTTON_AVOID_H * dpr }`；`PuzzleBoard` resize 與 `continueGame` 不傳（位置由 savedState 或 scale 覆蓋）。

**圖片來源**：所有進入遊戲的路徑（`handleConfirm`、`applyRecord`、`continueGame`）均傳入已裁切的小圖（≤800px JPEG），不再使用原始大圖。`startGame` reducer 會同時清除 Redux 中的 `imageDataUrl` 與 `cropRegion`，確保原始大圖在遊戲開始後立即釋放記憶體。`PuzzleBoard.doRegenerate`（視窗 resize 時觸發）改用 `referenceDataUrl ?? imageDataUrl`，優先使用已裁切的參考圖，確保 iOS safe-area 造成的殘餘 regen 也能正確渲染。

## 觸控與縮放（`src/features/game/usePointerDrag.ts`）

使用 Pointer Events API 統一處理滑鼠、觸控、手寫筆：

- **單指**：hit-test 命中拼圖片則拖曳，否則平移（pan）畫面
- **雙指**：自動切換為 pinch-to-zoom 模式；記錄初始指間距離與 zoom 基準值，按比例計算新 zoom（連續值，不四捨五入），同時追蹤中點偏移做平移補償；放開其中一指即退出 pinch 模式
- **暫停狀態**：`isPausedRef` guard 在 `pointerCacheRef.set()` 之後、pinch 判斷之前，暫停時所有 pointer 事件（含 pinch zoom）均被封鎖

重要行為細節：
- `onPointerUp` 早返前（另一指仍按著）會先清除進行中的拖曳（`dispatch(endDragGroup())`），防止 stale drag state
- `onZoomChange` 直接 clamp 到 [ZOOM_MIN, ZOOM_MAX]，不做 round，確保 pinch zoom 連續平滑

Props 需傳入：
- `onZoomChange(newZoom)` — 更新 PuzzleBoard 的 zoom 狀態
- `zoomPercentRef` — pinch 開始時讀取當前 zoom 基準值
- `onPanStart / onPanDelta` — pan 回調（pinch 平移補償也使用）

## 計時器機制

計時器以純數值計算，不使用 `setInterval` 驅動 Redux 狀態：

- **公式**：`elapsed = (isPaused ? pausedAt : Date.now()) - startTime - pauseOffset`
- `pauseOffset`：累計暫停毫秒數；每次 `resumeGame` 時加上本次暫停時長
- `AppHeader` 以 `setInterval(500ms)` 更新本地 `displayElapsed` state 做 UI 顯示
- 完成時的精確時間由 `usePointerDrag` 在觸發 `setComplete` 前計算並傳入

## 紀錄系統

三個獨立的 `localStorage` 儲存，互不依賴：

### 快捷設定（`src/lib/records.ts`）
- key：`puzzle-quick-settings`，最多 10 筆 `PuzzleRecord`
- 欄位：縮圖、裁切圖（≤800px JPEG）、難度、最佳時間、`isCompleted`
- 建立入口有兩處：CropPreview 確認開始時、透過分享代碼匯入時（`ShareCodeModal`）

### 歷史紀錄（`src/lib/gameHistory.ts`）
- key：`puzzle-game-history`，最多 10 筆 `GameHistoryRecord`
- 欄位：縮圖、裁切圖、難度、`configId`、`savedState`（含所有片位置與 group 狀態）、`isCompleted`
- 保存流程：`SavePanel`（10 格選位面板）→ `saveGameHistoryAtSlot(record, slotIndex)`
- 完成時若已有對應歷史紀錄（`gameId` 匹配），自動覆蓋並標記 `isCompleted: true`

### 遊戲草稿（`src/lib/gameDraft.ts`）
- key：`puzzle-game-draft`，最多 1 筆 `GameDraft`（隨時覆蓋）
- 欄位：`gameId`、`configId`、難度、格數、`croppedImageDataUrl`、`thumbnailDataUrl?`（200×200 JPEG，置中生成）、`savedAt?`（ms timestamp）、`savedState`
- **自動存時機**（`src/features/game/useGameDraft.ts`，掛載於 `App.tsx`）：pieces 變更後 1500ms debounce；`visibilitychange` 頁面隱藏時立刻存；back 攔截 / 「結束」按鈕觸發時也立即呼叫 `saveNow()`
- **縮圖生成**：`useGameDraft` 監聽 `referenceDataUrl` 變化，以 canvas 非同步生成 200×200 置中縮圖（背景 `paper-100 #F8F5F0`）並快取於 `thumbnailRef`，每次 `buildAndSave` 時一起存入草稿
- **清除時機**：「結束」確認（`App.tsx` ConfirmDialog `onConfirm`）、「保存並結束」完成（`AppHeader.handleSaveToSlot`）、`phase` 變為 `complete`（`useGameDraft` useEffect）
- 不會在 `resetGame` 後自動清除——back swipe 離開再回首頁時草稿仍保留，顯示「繼續上局」
- `useGameDraft` 回傳 `{ saveNow }` 供外部呼叫（`App.tsx` 在 back 攔截時使用）

### ID 設計（重要）

| 欄位 | 說明 |
|------|------|
| `configId`（Redux + `GameHistoryRecord`）| 快捷設定紀錄的 ID，由 CropPreview 產生；完成時用來回寫最佳時間 |
| `gameId`（Redux + `GameHistoryRecord.id`）| 每次新開遊戲的 UUID；續玩時沿用原 `historyRecord.id` |

每次新開遊戲（不論從 CropPreview 或快速開局重玩）都會各自產生新的 `configId` 與 `gameId`。從歷史紀錄續玩時，`gameId = historyRecord.id`、`configId = historyRecord.configId`。

刪除快捷設定不會造成錯誤，`configId` 成為懸空參照時，`CompletionOverlay` 的查找會安全返回 null。

## 全域 Header（`src/features/layout/AppHeader.tsx`）

所有 phase 均顯示。`playing` phase 額外顯示難度、格數、計時器與操作按鈕（查看參考圖、暫停/繼續、保存並結束、結束遊戲）。

Header 使用 `flex-wrap`，`min-h-[64px]`（= `TOOLBAR_HEIGHT`），窄螢幕上按鈕可能換行導致實際高度 > 64px。因此 `PuzzleBoard.getContainerDims()` 從 `gameAreaRef.current.clientHeight` 讀取真實容器高度，而非 `window.innerHeight - 64`；掛載後若兩者差距 > 4px，`needsInitialRegenRef` 會觸發自動重算。

`handleSaveToSlot` 使用 `saveDataRef` pattern：每次 render 將最新 Redux 狀態同步至 ref，讓 `useCallback` 不需列舉依賴也能讀到最新值，避免 stale closure 導致計時錯誤。

### 暫停行為區分（重要）

| action | `isPaused` | `showPauseOverlay` | 使用場景 |
|--------|-----------|-------------------|--------|
| `userPauseGame()` | true | true | 使用者按「暫停」按鈕 |
| `pauseGame()` | true（有 guard，已暫停則 no-op）| 不變 | 系統暫停（SavePanel、結束 dialog、back 攔截）|
| `resumeGame()` | false（有 guard，未暫停則 no-op）| false | 所有恢復場景 |

「保存並結束」開啟 SavePanel 時呼叫 `pauseGame()`，SavePanel `onClose` 呼叫 `resumeGame()`；「結束」按鈕呼叫 `onExitRequest?.()`（由 `App.tsx` 處理），不在 Header 內直接 dispatch。

`AppHeader` 接受 `onExitRequest?: () => void` prop，「結束」按鈕的 onClick 呼叫此 callback，將離開確認邏輯集中在 `App.tsx`。

## 手機適配

- **Viewport**：`App.tsx` 使用 `height: 100dvh`（動態 viewport 高度，隨瀏覽器 UI 顯示/隱藏調整）+ `overscroll-none`；`index.html` 設 `viewport-fit=cover` 啟用 iOS 安全區 API
- **底部 bar**：縮放控制（zoom % 顯示 + ± 按鈕）移至 canvas 下方的固定高度底部 bar（`PuzzleBoard`），完全位於 canvas 疊層之外，拼圖碎片不再被遮擋；bar 底部加 `padding-bottom: max(12px, env(safe-area-inset-bottom))` 防止被 iOS home indicator 遮蓋；左側顯示平移操作提示（`canPan` 為 true 時才顯示）
- **瀏覽器返回導航**（`src/features/game/usePhaseHistory.ts`，掛載於 `App.tsx`）：每次向前進入非 home phase 時各 push 一筆 `{ puzzle: true, phase }` + `'#app'` URL；`popstate` 時比較 `storedPhase` 與 `currentPhase` 在 `PHASE_ORDER` 中的 index——backward（storedIdx < currentIdx）→ dispatch 對應 action；forward / stale 舊 session entry（storedIdx > currentIdx）→ `isUndoingForward` flag + `history.back()` 連續略過直到合法 entry；無 puzzle state（app_url）→ `dispatch(goToHome())`。`isBackNav` flag 確保 back 觸發的 phase 變化不重複 push。各 phase 元件的返回按鈕（`ImageUpload`、`DifficultySelector`、`CropPreview`）一律呼叫 `history.back()` 而非直接 dispatch，行為與手勢返回完全一致。
- **Playing phase 返回攔截**：`playing` case 改為 `history.pushState(...)` 把 history 推回原位，然後呼叫 `opts?.onInterceptBackFromPlaying?.()`（**不 dispatch、不設 isBackNav**）。回呼存於 `interceptCallbackRef`（每 render 同步）以避免 stale closure，同時不造成 useEffect 重複註冊。`App.tsx` 的 `handleExitRequest` 實作：`saveNow()` → `dispatch(pauseGame())` → `setShowExitConfirm(true)`；confirm 時 `dispatch(resetGame())`（**不 clearDraft**，讓草稿保留供首頁「繼續上局」）；cancel 時 `dispatch(resumeGame())`。
- **Back swipe 進度保護**（playing phase）：改以 `useGameDraft`（`App.tsx`）自動暫存遊戲草稿至 localStorage；用戶 back swipe 離開後，回首頁時「繼續上局」卡片可恢復進度。明確按「結束」確認後才清除草稿（`clearDraft` 在 AppHeader `handleSaveToSlot` 與 App.tsx 完成 dialog 的 `onConfirm` 中呼叫）。
- **CropPreview 雙指縮放**：裁切框支援 pinch gesture 調整大小（與滾輪共用 `minW/maxW` 邊界邏輯），`pointerCache` 追蹤所有活動指標；`img.onload` 優先讀取 `offsetWidth/offsetHeight`（防止 iOS WebKit data URL 同步觸發時讀到 canvas 預設值 300）；使用 `ResizeObserver` 取代 `window.resize` 監聽 canvas 尺寸

## 配色設計與共用樣式（`src/index.css`）

### Tailwind CSS 自訂色票

| 群組 | Token | 代表色 | 用途 |
|------|-------|--------|------|
| Brand 琥珀金 | `brand-500` | `#F4A52B` | 主 CTA、強調文字 |
| | `brand-600` | `#E08A10` | hover 狀態 |
| | `brand-700` | `#B96A00` | 相框邊框 |
| Accent 湖水綠 | `accent-500` | `#2AA39A` | 次要強調 |
| 米白紙張 | `paper-50` | `#FDFBF7` | 最淺背景 |
| | `paper-100` | `#F8F5F0` | 頁面背景 |
| | `paper-300` | `#E6DFD3` | 分隔線、邊框 |
| | `paper-900` | `#201A13` | 主要文字 |
| 木質遊戲區 | `wood-950` | `#1A140D` | Canvas 外框深色 |
| 狀態色 | `success` | `#22A36A` | 成功訊息 |
| | `warning` | `#E89813` | 警示訊息 |
| | `danger` | `#D94B3B` | 危險操作 |

頁面暖色漸層背景：CSS 變數 `--pg-warm`（`radial-gradient`，各頁共用）。

### 共用 CSS 類別

| 類別 | 說明 |
|------|------|
| `.btn-primary` | 金屬琥珀漸層主按鈕（`brand-500→brand-600`），圓角 14px；`inline-flex items-center justify-content: center; gap: 6px`，可直接放 `<Icon>` |
| `.btn-secondary` | 白底次要按鈕，hover 時邊框轉 `brand-600`；同上 flex + gap 設定 |
| `.btn-danger` | 紅色漸層危險按鈕；同上 flex + gap 設定 |
| `.timer-box` | LED 計時器外框，黑底琥珀光暈；`font-size: 0.875rem; line-height: 1; display: inline-flex; align-items: center; gap: 6px`；不需另加 `text-sm`（已包含） |
| `.amber-glow` | 完成 Overlay 金色光暈 box-shadow |
| `.card-lift` | 卡片 hover 上移 2px + 陰影加深 |
| `.puzzle-frame` | Canvas 金屬相框（三層 outline + 內發光） |

### Canvas 硬碼顏色（`src/lib/renderer.ts`）

| 用途 | 顏色值 |
|------|--------|
| 待放區背景 | `#d8d3cc` |
| 格線矩形 | `#f0ede8` |
| 格子虛線 | `rgba(150,140,130,0.5)` |
| 拖曳陰影 | `rgba(0,0,0,0.4)` |
| 紅光（錯位警示） | stroke `rgba(220,50,50,0.75)`，shadow `rgba(255,60,60,0.9)` |
| 綠光（放下預覽） | stroke `rgba(50,200,80,0.85)`，shadow `rgba(60,255,100,0.9)` |

## Icon 元件（`src/components/Icon.tsx`）

全專案統一以 SVG sprite 顯示 icon，不使用 emoji：

```tsx
import { Icon } from '../../components/Icon';

<Icon name="ic-timer" size={16} />
<Icon name="ic-save" size={16} />
<Icon name="brand-mark" size={24} />
```

- **Sprite 檔**：`public/icons.svg`（77 個 `<symbol>`），路徑以 `import.meta.env.BASE_URL` 前綴（部署子路徑適配）
- **型別**：`IconName` union type，定義於 `ICON_NAMES` 陣列；IDE 有自動補全
- **預設 class**：`inline-block shrink-0 align-[-2px]`；`align-[-2px]` 在 flex 容器內無效，但對行內脈絡（純文字旁）有 2px 下移補償
- **`spin` prop**：`true` 時加入 `animate-spin`，用於載入動畫
- **無障礙**：傳入 `title` prop 會設 `role="img"` + `aria-label`；否則 `aria-hidden=true`

### 可用 icon 分類

| 前綴 | 說明 |
|------|------|
| `brand-mark` | 品牌標誌，3 種變體：`brand-mark`（淺色，深色背景用）、`brand-mark-dark`（同色系深底版）、`brand-mark-mono`（`currentColor` 單色） |
| `ic-*` | UI 功能 icon（navigation、action、state、media 等） |
| `crest-*` | 難度徽章：`crest-easy` / `crest-normal` / `crest-hard` / `crest-expert` |

### Flex 容器內的文字對齊

`.timer-box`（及其他含 icon + 文字的 flex 容器）使用以下模式解決字型 metrics 偏移：

```tsx
<div className="timer-box whitespace-nowrap">
  <Icon name="ic-timer" size={16} />
  <span className="translate-y-px">{time}</span>  {/* 補償 JetBrains Mono 底部留白 */}
</div>
```

- 匿名文字節點在 flex 中尺寸不穩定，應用 `<span>` 包裹成明確 flex item
- JetBrains Mono 數字字元無 descender，但 em-square 保留 descender 空間，視覺偏上；`translate-y-px`（1px）補償此偏移

### 響應式 icon 尺寸

`size` prop 接受字串，可傳 `"100%"` 並以響應式 wrapper 控制實際大小，避免重複渲染兩個 icon：

```tsx
<span className="block w-6 h-6 sm:w-10 sm:h-10">
  <Icon name="crest-easy" size="100%" />
</span>
```

### 難度徽章（crest）套用慣例

所有顯示難度的元件（`AppHeader`、`DifficultySelector`、`RecordsModal`、`SavePanel`）均以相同 mapping 套用徽章：

```tsx
const CREST: Record<string, IconName> = {
  easy: 'crest-easy', normal: 'crest-normal',
  hard: 'crest-hard', expert: 'crest-expert',
};

// 行內難度標籤
<span className="inline-flex items-center gap-1 text-xs font-medium text-paper-800">
  <Icon name={CREST[difficulty] ?? 'crest-easy'} size={14} />
  <span className="translate-y-px">{DIFFICULTY_LABEL[difficulty]}</span>
</span>
```

## 共用元件

- `src/components/Icon.tsx`：SVG sprite icon 元件，見上方說明
- `src/components/ConfirmDialog.tsx`：通用二次確認對話框，支援 `danger` 紅色模式；`message` 接受 `ReactNode`，同檔案匯出 `Hi`（品牌金）、`HiAccent`（湖水綠）、`HiDanger`（紅）三個 helper span，用於在 dialog 訊息中標記重點文字
- `src/components/ShareCodeModal.tsx`：分享代碼 Modal，雙模式（`mode='share'` 顯示代碼供複製；`mode='import'` 讓使用者貼入代碼）；匯入前檢查快捷設定是否已達 10 筆上限
- `src/features/game/SavePanel.tsx`：10 格存檔選位面板；以 `gameId` 比對標示「目前紀錄」格；佔用格點擊前顯示 `ConfirmDialog` 確認覆蓋（原始 slot 除外）
- `src/features/upload/PresetImagesModal.tsx`：內建圖片選擇 Modal；8 張圖片定義於元件頂部常數（`PRESET_IMAGES`）；點選後以 `fetch → blob → canvas.toDataURL('image/jpeg', 0.92)` 轉換（與 `ImageUpload.processFile` 一致），結果快取於 `useRef<Map>`
- `src/features/upload/RecordsModal.tsx`：雙模式清單 Modal（`mode='quick'` 顯示快捷設定；`mode='history'` 顯示歷史紀錄）；各筆紀錄可刪除（需 `ConfirmDialog` 確認）；quick 模式的 Header 有「匯入代碼」按鈕，每筆卡片有「分享」按鈕
- `src/features/game/ImagePreviewOverlay.tsx`：遊戲中查看參考圖的全螢幕覆蓋層；由 `toggleImagePreview` action 控制 `showImagePreview` Redux 欄位；顯示 `referenceDataUrl`（裁切後圖片），點擊背景或 ✕ 鈕關閉

## 分享代碼系統（`src/lib/shareCode.ts`）

將快捷設定序列化為可複製的文字代碼，讓使用者分享拼圖給他人：

- **格式**：`{ v: 1, difficulty, cols, rows, img }`（img 為去除前綴的 JPEG base64），JSON → lz-string `compressToBase64` → 代碼字串
- `encodeShareCode(record)` — 從 `PuzzleRecord` 產生代碼
- `decodeShareCode(code)` — 解壓縮並驗證（版本號、cols/rows 範圍 2–20、img 長度），失敗回傳 `null`
- `shareDataToRecord(data)` — 產生新 `PuzzleRecord`（重新生成 `id`、`createdAt`，`isCompleted=false`）

UI 入口：`RecordsModal`（`mode='quick'`）的 Header 有「匯入代碼」按鈕，每筆紀錄卡片有「分享」按鈕；兩者皆由 `HomePage` 管理 Modal 狀態。

## 靜態資源與部署注意事項

### public 目錄資源的路徑規則

Vite 的 `base` 設定（`vite.config.ts`：production 為 `/puzzle-maker/`）只會自動轉換：
- `import` 語句
- CSS `url()`
- HTML 屬性（`src`、`href`）

**JavaScript 字串常數不會被轉換**。凡是在 JS/TS 程式碼中以字串引用 `public/` 目錄資源，必須使用 `import.meta.env.BASE_URL` 前綴：

```typescript
// 錯誤（部署後 404）
const url = '/presets/puzzle-1.png';

// 正確
const url = `${import.meta.env.BASE_URL}presets/puzzle-1.png`;
```

`import.meta.env.BASE_URL` 已含尾部斜線（production: `/puzzle-maker/`，dev: `/`），路徑不需加前綴 `/`。

### 靜態 SVG 資源

| 檔案 | 說明 |
|------|------|
| `public/favicon.svg` | 4 路徑品牌標誌（琥珀 `#F5B13F` × 奶油 `#F4ECDE`），viewBox 0 0 24 24 |
| `public/apple-touch-icon.svg` | iOS 主畫面圖示，180×180，深色背景 + 5× 放大品牌標誌 |
| `public/icons.svg` | SVG sprite，77 個 `<symbol>`（`brand-mark*`、`ic-*`、`crest-*`）；JS 中須以 `${import.meta.env.BASE_URL}icons.svg` 引用 |

### 內建拼圖圖片

放於 `public/presets/`，Vite 掛於 `/presets/*.png`：

| 檔案 | 主題 |
|------|------|
| `puzzle-1.png` | 虹彩貓頭鷹 |
| `puzzle-2.png` | 漫步星塵海 |
| `puzzle-3.png` | 祕境樹之屋 |
| `puzzle-4.png` | 賽博不夜城 |
| `puzzle-5.png` | 萌貓午茶時 |
| `puzzle-6.png` | 幻境古木林 |
| `puzzle-7.png` | 星際觀測站 |
| `puzzle-8.png` | 魔法藏書閣 |

## 完成流程

- **有對應歷史紀錄**（`gameId` 能在 `gameHistory` 找到）：自動覆蓋儲存並標記 `isCompleted`，顯示「已自動保存」提示
- **無歷史紀錄**：顯示「保存紀錄」與「離開」按鈕；選擇保存則開啟 `SavePanel`

## 續玩位置縮放

從歷史紀錄續玩時，若視窗尺寸不同，`HomePage.continueGame` 用仿射變換重新對齊座標，並對非 snap 的片子做邊界 clamp：

```
scale = result.pieceW / savedState.pieceW
newX  = oldX * scale + (newPuzzleOffsetX - oldPuzzleOffsetX * scale)
// 非 snap 片：x clamped to [0, canvasSize - pieceW]
```
