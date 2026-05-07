# 遊戲流程

> 本文件說明遊戲的路由架構、各首頁入口行為、完成流程，以及續玩時的座標縮放邏輯。

## 路由架構

遊戲以 **React Router v7 Hash Router** 驅動頁面切換，取代原有的 Redux `phase` 狀態機。`App.tsx` 使用 `createHashRouter` 宣告路由，`AppLayout` 為共用 layout，各功能元件為 `React.lazy`（互動後才下載對應 chunk）。

```
/         → HomePage
/upload   → ImageUpload
/config   → DifficultySelector
/crop     → CropPreview
/play     → PlayRoute  (PuzzleBoard + CompletionOverlay)
```

`canvasMapRef`（offscreen canvas）與 `pathMapRef`（Path2D 形狀）在 `App.tsx` 層建立並向下傳遞，貫穿整個遊戲生命週期。

| 路由 | 元件 | 說明 |
|------|------|------|
| `/` | `HomePage` | 主選單：建立新拼圖、讀取存檔、快速開局 |
| `/upload` | `ImageUpload` | 上傳頁（拖放或選用內建圖片）；快捷設定滿時從首頁攔截 |
| `/config` | `DifficultySelector` | 選擇難度，決定 cols × rows |
| `/crop` | `CropPreview` | 裁切圖片，生成拼圖片，建立快捷設定紀錄 |
| `/play` | `PlayRoute` | 主遊戲畫面（`PuzzleBoard`）+ 完成覆蓋層（`CompletionOverlay`）|

### AppLayout（`src/features/layout/AppLayout.tsx`）

所有路由的共用 layout 元件（`<Outlet />` 包裝）。掛載時初始化：

- `usePreventForwardNav()`：攔截瀏覽器前進導航
- `useBackgroundMusic()`：背景音樂生命週期
- 全域 click handler：所有 `<button>` 點擊觸發 `playClick()` 音效
- `initImageCache()`：從 IDB 載入全部圖片至 `_mem`

---

## Guard 邏輯

各路由元件在 hooks 之後、return JSX 之前加入 Guard，防止直接輸入 URL 或無效狀態下渲染：

| 路由 | Guard 條件（觸發 `<Navigate to="/" replace />`）|
|------|------------------------------------------------|
| `/upload` | `isComplete` 或（非 PUSH 導航且 `!imageDataUrl`）|
| `/config` | `!imageDataUrl` 或 `isComplete` |
| `/crop` | `isComplete` 或（`!pieces.length` 且 `(!imageDataUrl \|\| !cols)`）|
| `/play` | `!pieces.length && !isComplete && !confirmedLeave`（`confirmedLeave` 為 state，與 `confirmedLeaveRef` 同步更新） |

---

## PlayRoute 與離開確認（`src/features/game/PlayRoute.tsx`）

`/play` 路由由 `PlayRoute` 處理。遊戲未完成時，任何離開 `/play` 的行為（返回、navigate）均以 **`useBlocker`** 攔截：

1. Blocker 觸發時：`saveNow()` → `dispatch(pauseGame())`
2. 顯示 `ConfirmDialog`
3. 確認離開：`saveNow()` → `markConfirmedLeave()`（同步設 ref 與 state）→ `dispatch(resetGame())` → `blocker.reset()` → `navigate(-idx)` 或 `navigate('/')`
4. 取消：`dispatch(resumeGame())` → `blocker.reset()`

遊戲完成（`isComplete = true`）後 blocker 自動放行，離開不再攔截。

### CompletionOverlay 顯示時序

`CompletionOverlay` 採**直接 import**（非 `lazy()`），避免首次渲染時的空白閃爍。顯示時序由 `overlayVisible` state 控制（初始為 false），而非直接依 `isComplete`：

```
isComplete → true
    ↓ PuzzleBoard.useEffect 感知
    ↓ completionZooming = true → CSS transform transition（200ms ease-out）
    ↓ centerAtZoomMax()：zoom 設為 150%（ZOOM_MAX），pan 置中於格線
    ↓（ZOOM_IN_DURATION_MS = 200ms 後）
    ↓ completionZooming = false
    ↓ completionAnimStartRef.current = performance.now()
    ↓ isAnimating = true → 渲染全螢幕封鎖 div（fixed inset-0 z-30）
    ↓ playComplete()（音效與掃光同步）
    ↓ useGameLoop 計算 completionProgress → renderFrame 繪製掃光
    ↓（COMPLETION_ANIM_DURATION_MS + 200ms = 1700ms 後）
    ↓ isAnimating = false → onAnimationEnd() 回呼
    ↓ PlayRoute: overlayVisible = true → 渲染 CompletionOverlay
```

互動封鎖層在 `completionZooming || isAnimating` 期間均顯示，整段動畫（縮放 + 掃光，共約 1.9 秒）無法拖曳或縮放。

`onAnimationEnd` 由 PlayRoute 以 `useCallback` 定義並傳入 `PuzzleBoard` 作為 prop。

### usePreventForwardNav（`src/lib/usePreventForwardNav.ts`）

掛載於 `AppLayout`。以 `useBlocker` 偵測 POP 動作中「新 idx > 舊 idx」的前進導航，自動呼叫 `blocker.reset()` 阻止前進，確保使用者無法透過手勢/按鈕前進到已離開的頁面。

---

## 首頁入口邏輯

`applyRecord`、`continueGame`、`resumeDraft` 的實作均在 `HomePage`（非 `ImageUpload`）。

### 繼續上局

mount 時（及 `locationKey` 變化時）讀取 `getDraft()`，若存在則顯示湖水綠 `DraftCard`（最上方），顯示難度、格數、完成百分比、暫存時間、已拼片數／耗時；點擊呼叫 `resumeDraft`，以草稿資料構造假的 `GameHistoryRecord` 後呼叫 `continueGame`。

> `locationKey` 監聽：從 `/play` 返回首頁時 key 改變，確保 draft 狀態即時更新。

### 建立新拼圖

檢查 `getRecords().length >= 10`，若滿則攔截；否則呼叫 `guardDraft(() => navigate('/upload'))`。

### 讀取存檔

開啟 `RecordsModal`（`mode='history'`）→ 選擇後 `setShowRecords(null)` → `guardDraft(() => continueGame(record))`。

### 快速開局

開啟 `RecordsModal`（`mode='quick'`）→ 選擇後 `setShowRecords(null)` → `guardDraft(() => applyRecord(record))`。

### `guardDraft(action)`

若 `getDraft()` 存在，將 action 存入 `pendingAction` state 並顯示草稿警告 dialog（確認後 `clearDraft()` → `setCurrentDraft(null)` → 執行 action）；否則直接執行 action。

---

## 完成流程

拼完最後一片 → `usePointerDrag` 觸發 `dispatch(setComplete(elapsed))` → `PuzzleBoard` 先以 CSS transition **縮放至 150% 並置中格線**（200ms），再播放 **掃光動畫**（約 1.5 秒，兩段期間均封鎖互動）→ 動畫結束後顯示 `CompletionOverlay`。

| 情境 | 行為 |
|------|------|
| **有對應歷史紀錄**（`gameId` 能在 `gameHistory` 找到） | 自動覆蓋儲存並標記 `isCompleted`，顯示「已自動保存」提示 |
| **無歷史紀錄** | 顯示「保存紀錄」與「離開」按鈕；選擇保存則開啟 `SavePanel` |

完成後按鈕均呼叫 `onLeave?.()` 觸發 `markConfirmedLeave()`（讓 PlayRoute 的 blocker 放行），再呼叫 `dispatch(resetGame())` 與 `navigateToHome()`（`navigate(-idx)` 或 `navigate('/')`）。

---

## 續玩位置縮放

從歷史紀錄續玩時，若視窗尺寸不同，`HomePage.continueGame` 用仿射變換重新對齊座標，並對非 snap 的片子做邊界 clamp：

```
scale = result.pieceW / savedState.pieceW
newX  = oldX * scale + (newPuzzleOffsetX - oldPuzzleOffsetX * scale)
// 非 snap 片：x clamped to [0, canvasSize - pieceW]
```
