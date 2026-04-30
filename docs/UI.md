# UI 與樣式

> 本文件說明全域 Header 的行為規格、配色系統、Icon 元件使用方式、RWD 版型慣例，以及手機適配的各項技術細節。

## 全域 Header（`src/features/layout/AppHeader.tsx`）

所有 phase 均顯示。右側常駐一顆**音量按鈕**（`ic-volume` / `ic-volume-off`，靜音時 opacity 0.65），點擊開啟 `VolumeModal`；`onClose` callback 同步更新 Header 的 muted state。

`playing` phase 額外顯示難度、格數、計時器與操作按鈕（查看參考圖、暫停/繼續、保存並結束、結束遊戲）。

Header 使用 `flex-wrap`，`min-h-[64px]`（= `TOOLBAR_HEIGHT`），窄螢幕上按鈕可能換行導致實際高度 > 64px。因此 `PuzzleBoard.getContainerDims()` 從 `gameAreaRef.current.clientHeight` 讀取真實容器高度，而非 `window.innerHeight - 64`；掛載後若兩者差距 > 4px，`needsInitialRegenRef` 會觸發自動重算。

`handleSaveToSlot` 使用 `saveDataRef` pattern：每次 render 後以 `useLayoutEffect`（無 deps 陣列）將最新 Redux 狀態同步至 ref，讓 `useCallback` 不需列舉依賴也能讀到最新值，避免 stale closure 導致計時錯誤。

`AppHeader` 接受 `onExitRequest?: () => void` prop，「結束」按鈕的 onClick 呼叫此 callback，將離開確認邏輯集中在 `App.tsx`。

### 暫停行為區分

| action | `isPaused` | `showPauseOverlay` | 使用場景 |
|--------|-----------|-------------------|--------|
| `userPauseGame()` | true | true | 使用者按「暫停」按鈕 |
| `pauseGame()` | true（有 guard，已暫停則 no-op）| 不變 | 系統暫停（SavePanel、結束 dialog、back 攔截）|
| `resumeGame()` | false（有 guard，未暫停則 no-op）| false | 所有恢復場景 |

「保存並結束」開啟 SavePanel 時呼叫 `pauseGame()`，SavePanel `onClose` 呼叫 `resumeGame()`。

---

## 配色設計（`src/index.css`）

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

---

## Icon 元件（`src/components/Icon.tsx`）

全專案統一以 SVG sprite 顯示 icon，不使用 emoji：

```tsx
import { Icon } from '../../components/Icon';

<Icon name="ic-timer" size={16} />
<Icon name="ic-save" size={16} />
<Icon name="brand-mark" size={24} />
```

- **Sprite 檔**：`public/icons.svg`（78 個 `<symbol>`），路徑以 `import.meta.env.BASE_URL` 前綴（部署子路徑適配）
- **型別**：`IconName` union type 定義於 `src/components/iconNames.ts`（`ICON_NAMES as const` 陣列衍生），`Icon.tsx` 以 `export type { IconName }` 對外暴露；IDE 有自動補全
- **預設 class**：`inline-block shrink-0 align-[-2px]`；`align-[-2px]` 在 flex 容器內無效，但對行內脈絡（純文字旁）有 2px 下移補償
- **`spin` prop**：`true` 時加入 `animate-spin`，用於載入動畫
- **無障礙**：傳入 `title` prop 會設 `role="img"` + `aria-label`；否則 `aria-hidden=true`

### 可用 Icon 分類

| 前綴 | 說明 |
|------|------|
| `brand-mark` | 品牌標誌，3 種變體：`brand-mark`（淺色，深色背景用）、`brand-mark-dark`（同色系深底版）、`brand-mark-mono`（`currentColor` 單色） |
| `ic-*` | UI 功能 icon（navigation、action、state、media 等）；`ic-github` 為唯一外部品牌 icon，用於 footer 的 GitHub 連結 |
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

### 響應式 Icon 尺寸

`size` prop 接受字串，可傳 `"100%"` 並以響應式 wrapper 控制實際大小，**只渲染一個 icon**：

```tsx
<span className="block w-6 h-6 sm:w-10 sm:h-10">
  <Icon name="crest-easy" size="100%" />
</span>
```

> **陷阱**：不要用兩個 icon 搭配 `sm:hidden` / `hidden sm:inline-block` 切換——Icon 元件的預設 `inline-block` class 與 `hidden` 同屬 `display` 屬性，在 Tailwind v4 的 CSS 輸出順序下 `inline-block` 會蓋掉 `hidden`，導致兩個 icon 同時顯示。

### 難度徽章（crest）套用慣例

`CREST` 與 `DIFFICULTY_LABEL` 集中定義於 `src/lib/difficulty.ts`，所有顯示難度的元件（`AppHeader`、`DifficultySelector`、`RecordsModal`、`SavePanel`）統一從此 import：

```tsx
import { CREST, DIFFICULTY_LABEL } from '../../lib/difficulty';

<span className="inline-flex items-center gap-1 text-xs font-medium text-paper-800">
  <Icon name={CREST[difficulty] ?? 'crest-easy'} size={14} />
  <span className="translate-y-px">{DIFFICULTY_LABEL[difficulty]}</span>
</span>
```

---

## RWD 版型慣例

### Bar 最大寬度

所有頁面的頂部 bar 與底部 bar 均採「外層全寬背景 + 內層限寬」結構，使寬螢幕上內容不無限延伸：

```tsx
{/* 外層：全寬背景色 */}
<div className="px-4 py-3 ..." style={{ background: '...', borderBottom: '...' }}>
  {/* 內層：內容限制最大寬度，與 MAX_CANVAS_WIDTH 對齊 */}
  <div className="max-w-[1440px] mx-auto w-full flex items-center justify-between">
    {/* 按鈕等內容 */}
  </div>
</div>
```

適用範圍：`AppHeader`、`PuzzleBoard` 底部 zoom bar、`ImageUpload` / `DifficultySelector` / `CropPreview` 的頂部 toolbar。

### Copyright Footer

三個頁面底部共用版權 footer，統一使用 `<PageFooter />` 元件（`src/components/PageFooter.tsx`）渲染，內容為版權文字 + GitHub icon 連結（`ic-github`）+ 非商業聲明。若需修改版權文字（年份、連結等），只需更新 `PageFooter.tsx` 一個檔案。

---

## 手機適配

### Viewport

`App.tsx` 使用 `height: 100dvh`（動態 viewport 高度，隨瀏覽器 UI 顯示/隱藏調整）+ `overscroll-none`；`index.html` 設 `viewport-fit=cover` 啟用 iOS 安全區 API。

### 底部 Bar

縮放控制（zoom % 顯示 + ± 按鈕）移至 canvas 下方的固定高度底部 bar（`PuzzleBoard`），完全位於 canvas 疊層之外，拼圖碎片不再被遮擋；bar 底部加 `padding-bottom: max(12px, env(safe-area-inset-bottom))` 防止被 iOS home indicator 遮蓋；左側顯示平移操作提示（`canPan` 為 true 時才顯示）。

### 瀏覽器返回導航（`src/features/game/usePhaseHistory.ts`）

掛載於 `App.tsx`。每次向前進入非 home phase 時各 push 一筆 `{ puzzle: true, phase }` + `'#app'` URL。

`popstate` 時比較 `storedPhase` 與 `currentPhase` 在 `PHASE_ORDER` 中的 index：

- **backward**（storedIdx < currentIdx）→ dispatch 對應 action
- **forward / stale 舊 session entry**（storedIdx > currentIdx）→ `isUndoingForward` flag + `history.back()` 連續略過直到合法 entry
- **無 puzzle state（null entry）**→ 若 phase 為 `playing` 則觸發返回攔截，否則 `dispatch(goToHome())`

phase 轉為 `home` 時有兩條清理路徑，防止殘留 puzzle entries 讓使用者需要多按一次才能離開 app：

1. **非 back nav 路徑**（`resetGame`、保存並結束、結束確認）：`replaceState(null, '')` 取代 stale entry，若之前位於 puzzle entry（`hadPuzzleEntry=true`），設 `isUndoingForward=true` + `history.back()` 觸發清理鏈
2. **isBackNav 路徑**（playing 攔截後返回、complete back nav）：`isBackNav` 重置後，若 `history.state?.puzzle` 仍為 truthy，同樣啟動清理鏈

各 phase 元件的返回按鈕（`ImageUpload`、`DifficultySelector`、`CropPreview`）一律呼叫 `history.back()` 而非直接 dispatch，行為與手勢返回完全一致。

### Playing Phase 返回攔截

`playing` case 改為 `history.pushState(...)` 把 history 推回原位，然後呼叫 `opts?.onInterceptBackFromPlaying?.()`（不 dispatch、不設 isBackNav）。

回呼存於 `interceptCallbackRef`（每 render 同步）以避免 stale closure，同時不造成 useEffect 重複註冊。

**直接從首頁進入遊戲**（快速開局 / 讀取存檔）只 push 一筆 `{playing}`，前一筆為 null entry；`popstate` 落在 null entry 時同樣觸發此攔截邏輯（`!state?.puzzle` 分支中的 `phaseRef.current === 'playing'` 判斷），確保攔截行為與經過完整新遊戲流程一致。

`App.tsx` 的 `handleExitRequest` 實作：`saveNow()` → `dispatch(pauseGame())` → `setShowExitConfirm(true)`；confirm 時 `dispatch(resetGame())`（不 clearDraft，讓草稿保留供首頁「繼續上局」）；cancel 時 `dispatch(resumeGame())`。

### Back Swipe 進度保護

改以 `useGameDraft`（`App.tsx`）自動暫存遊戲草稿至 localStorage；用戶 back swipe 離開後，回首頁時「繼續上局」卡片可恢復進度。明確按「結束」確認後才清除草稿。

### CropPreview 雙指縮放

裁切框支援 pinch gesture 調整大小（與滾輪共用 `minW/maxW` 邊界邏輯），`pointerCache` 追蹤所有活動指標；`img.onload` 優先讀取 `offsetWidth/offsetHeight`（防止 iOS WebKit data URL 同步觸發時讀到 canvas 預設值 300）；使用 `ResizeObserver` 取代 `window.resize` 監聽 canvas 尺寸。
