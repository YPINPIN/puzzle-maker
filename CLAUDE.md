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
- **Redux Toolkit**（`@reduxjs/toolkit` + `react-redux`）管理全局狀態，單一 `puzzleSlice`
- **Tailwind CSS v4**，透過 `@tailwindcss/vite` plugin 整合（無獨立設定檔）
- CSS 入口為 `src/index.css`，以 `@import "tailwindcss"` 引入 Tailwind

## TypeScript 設定

採用 project references 分層設定：

- `tsconfig.json` — 根設定，僅包含 references
- `tsconfig.app.json` — 應用程式碼（`src/`）
- `tsconfig.node.json` — Vite 設定檔等 Node 環境程式碼

## 遊戲流程與狀態機

遊戲以 Redux `phase` 欄位驅動，依序為：

```
upload → config → crop → playing → complete
```

`App.tsx` 根據 `phase` 條件渲染對應元件；`canvasMapRef`（offscreen canvas）與 `pathMapRef`（Path2D 形狀）在 App 層建立並向下傳遞，貫穿整個遊戲生命週期。

| Phase      | 元件                    | 說明                          |
|------------|-------------------------|-------------------------------|
| `upload`   | `ImageUpload`           | 上傳或重新遊玩舊紀錄           |
| `config`   | `DifficultySelector`    | 選擇難度，決定 cols × rows     |
| `crop`     | `CropPreview`           | 裁切圖片，生成拼圖片            |
| `playing`  | `PuzzleBoard`           | 主遊戲畫面                     |
| `complete` | `PuzzleBoard` + `CompletionOverlay` | 完成覆蓋層              |

## Canvas 渲染架構

### 座標系統

- Canvas 邏輯尺寸：**正方形**，邊長 = `2 × min(viewportW, viewportH - TOOLBAR_HEIGHT)`
- 200% zoom 時 CSS scale = 1（1:1 pixel，最清晰）；預設 100% 時以 `fitScale = 0.5` 縮放至視窗
- 拼圖格線在 canvas 內**置中**，偏移量存為 `puzzleOffsetX / puzzleOffsetY`

### 渲染層次（`src/lib/renderer.ts`）

每幀依序繪製：
1. 整體背景（深米色）+ 格線矩形（淺米色）+ 虛線格子
2. 已 snap 的片（row-major 順序）
3. 未 snap 且非拖曳中的片（含 hover 高亮、紅光警示）
4. 拖曳中的片（最上層，帶陰影、綠光預覽）

`useGameLoop` 以 `requestAnimationFrame` 驅動渲染；`usePointerDrag` 處理 pointer 事件。兩者都掛載在 `PuzzleBoard`。

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

1. `shouldMerge`（`snapLogic.ts`）：檢查拖曳組與相鄰片的相對位置誤差 < `GROUP_THRESHOLD`（6px），若成立則合組（`mergeGroups` action）
2. `findSnapCandidate`（`snapLogic.ts`）：若整組中最近片距 `correctPosition` < `SNAP_THRESHOLD`（20px），觸發 `snapGroupToBoard`，直接將所有片設回 `correctPosition`
3. 全部片 `isSnapped` 時觸發 `setComplete`

### 重要常數（`src/lib/constants.ts`）

| 常數              | 值   | 說明                     |
|------------------|------|--------------------------|
| `TOOLBAR_HEIGHT` | 48   | 工具列高度（px）          |
| `TAB_RATIO`      | 0.2  | tab 大小 = pieceW × 0.2  |
| `SNAP_THRESHOLD` | 20   | snap 至板子的吸附距離（px）|
| `GROUP_THRESHOLD`| 6    | 兩片合組的位置容差（px）  |

## 紀錄系統

`src/lib/records.ts` 使用 `localStorage`（key: `puzzle-records`）儲存最多 10 筆遊戲紀錄（`PuzzleRecord`）。欄位包含縮圖、裁切圖（≤800px JPEG）、最佳時間、難度。`ImageUpload` 元件可從紀錄重新開始遊戲。
