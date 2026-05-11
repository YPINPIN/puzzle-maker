# 新手教學系統

> 本文件說明新手教學（Onboarding Tutorial）的架構、狀態機、步驟定義、Spotlight 技術，以及教學期間的資料抑制邏輯。

---

## 架構概覽

| 檔案 | 說明 |
|------|------|
| `src/features/tutorial/tutorialContext.ts` | `TutorialPhase` 型別、`TutorialContextValue` 介面、`TutorialContext` 建立（純 TypeScript，無元件） |
| `src/features/tutorial/useTutorial.ts` | `useTutorial()` hook（`useContext(TutorialContext)`） |
| `src/features/tutorial/TutorialContext.tsx` | 教學狀態機（phase 推導、step 管理）、Context Provider（僅匯出 `TutorialProvider`） |
| `src/features/tutorial/TutorialOverlay.tsx` | Spotlight + 對話卡片渲染、高亮文字、配色 |
| `src/features/tutorial/tutorialData.ts` | 所有步驟定義（`TutorialStep` 陣列） |

---

## Phase 狀態機

### TutorialPhase

```typescript
type TutorialPhase = 'inactive' | 'home' | 'upload' | 'config' | 'crop' | 'play';
```

### 初始化邏輯（TutorialContext）

```typescript
const [tutorialDone, setTutorialDone] = useState<boolean>(() => {
  if (localStorage.getItem(TUTORIAL_DONE_KEY)) return true;
  if (!isNewUser()) {
    // 現有使用者自動補 key，一次性遷移
    localStorage.setItem(TUTORIAL_DONE_KEY, 'true');
    return true;
  }
  return false;
});
```

`isNewUser()` 定義於 `src/lib/records.ts`：records + gameHistory + draft 均為空時才成立。

### Phase 推導（render 期間，非 effect）

`phase` 直接從 `location.pathname` 推導，**不需要 effect 或額外 state**：

```typescript
let phase: TutorialPhase = 'inactive';
if (!tutorialDone) {
  if (location.pathname === '/') phase = 'home';
  else if (location.pathname === '/upload') phase = 'upload';
  else if (location.pathname === '/config') phase = 'config';
  else if (location.pathname === '/crop') phase = 'crop';
  else if (location.pathname === '/play') phase = 'play';
}
```

導航時 React Router 的 `location.pathname` 變動，自動觸發 re-render，phase 跟著更新，無需額外同步。

### midStepDone 重置（render-phase 派生狀態更新）

upload / config / crop 三個 mid-page 各只有一個步驟，以 `midStepDone` 追蹤 CTA 是否已觸發。切換頁面時需重置：

```typescript
const [midStepDone, setMidStepDone] = useState(false);
const [midStepPathname, setMidStepPathname] = useState(location.pathname);
if (!tutorialDone && midStepPathname !== location.pathname) {
  setMidStepPathname(location.pathname);
  setMidStepDone(false);  // render 期間的派生狀態更新，符合 React 規範
}
```

### Step 常數

| 常數 | 值 | 說明 |
|------|----|------|
| `HOME_LAST_STEP` | 4 | homeStep 0–4，達到後 navigate('/upload') |
| `PLAY_LAST_STEP` | 9 | playStep 0–9，達到後設 inactive |

---

## 調整教學文案

所有教學步驟的標題、說明文字、CTA 按鈕文字，以及要高亮的短語，一律集中定義於：

```
src/features/tutorial/tutorialData.ts
```

該檔案匯出 `homeSteps`、`uploadStep`、`configStep`、`cropStep`、`playSteps` 五個陣列 / 物件，修改對應步驟的 `title`、`message`、`ctaLabel`、`highlights` 欄位即可，**無需動其他檔案**。

---

## TutorialStep 型別

```typescript
type TutorialStep = {
  targetId: string | null;     // data-tutorial 屬性值；null 表示不 Spotlight
  titleIcon: IconName | null;  // 標題前的 Icon（取代 emoji）
  title: string;
  message: string;
  highlights?: string[];       // 要高亮的短語（teal 粗體）
  ctaLabel: string;            // CTA 按鈕文字
};
```

---

## data-tutorial 屬性對應表

| 屬性值 | DOM 位置 | 對應步驟 |
|--------|---------|---------|
| `home-new-puzzle` | `HomePage` 建立新拼圖按鈕 | homeStep[1]、homeStep[4] |
| `home-quick-start` | `HomePage` 快速開局區塊 | homeStep[2] |
| `home-load-save` | `HomePage` 讀取存檔區塊 | homeStep[3] |
| `upload-area` | `ImageUpload` 上傳區域 div | uploadStep |
| `config-difficulty` | `DifficultySelector` 難度格數 wrapper div | configStep |
| `crop-image` | `CropPreview` imgOverlayRef（追蹤圖片在 Canvas 內的位置） | cropStep |
| `play-timer` | `AppHeader` 計時器 | playStep[1] |
| `play-difficulty` | `AppHeader` 難度徽章 + 燈泡按鈕所在 div | playStep[2] |
| `play-reference` | `AppHeader` 查看參考圖按鈕 | playStep[3] |
| `play-pause` | `AppHeader` 暫停按鈕 | playStep[4] |
| `play-save` | `AppHeader` 保存並結束按鈕 | playStep[5] |
| `play-end` | `AppHeader` 結束按鈕 | playStep[6] |
| `play-zoom-control` | `PuzzleBoard` 縮放 +/- 控制組 | playStep[7] |
| `play-board` | `PuzzleBoard` 遊戲畫布區域（gameAreaRef） | playStep[8] |

### crop-image 特殊實作

`CropPreview` canvas 填滿整個容器，無法直接以容器框住圖片區域。解法：在 canvas 容器內放一個透明 `<div ref={imgOverlayRef} data-tutorial="crop-image">`，每次圖片 transform 更新後（`img.onload` / `ResizeObserver`）呼叫 `updateImgOverlay()` 直接設定 overlay div 的 `left`、`top`、`width`、`height` style，讓它精準覆蓋圖片實際顯示範圍。

---

## Spotlight 機制（TutorialOverlay）

```
TutorialOverlay mount / step 更新（currentStep 變動）
  ↓ useLayoutEffect
  ↓ document.querySelector(`[data-tutorial="${targetId}"]`)
  ↓ getBoundingClientRect()
  ↓ setSpotlightRect(rect)
  ↓ Spotlight div: position:fixed; box-shadow: 0 0 0 9999px rgba(0,0,0,0.72); outline: teal
```

Spotlight div 以 `position: fixed; pointer-events: none; border-radius: 12px` 浮在全頁面上方，跟隨目標元素的實際 viewport 位置。

### 動態更新

- **`window.addEventListener('resize', update)`**：視窗縮放時重新計算矩形
- **`MutationObserver({ attributes: true, attributeFilter: ['style'] })`**：監聽目標元素 `style` 屬性變化（用於 `crop-image`：`updateImgOverlay()` 在 `img.onload` 非同步更新 overlay div 的 style 後，Spotlight 自動跟著更新，無需手動延遲）
- 兩者均在 `useLayoutEffect` cleanup 中移除，避免記憶體洩漏

---

## 配色規格

教學使用 **teal（青綠）** 色系，與主題琥珀金明確區分：

| 元素 | 值 |
|------|----|
| Spotlight 邊框 | `outline: 2px solid rgba(44,196,186,0.8)` |
| 卡片邊框 | `border: 1.5px solid rgba(42,163,154,0.35)` |
| CTA 按鈕漸層 | `linear-gradient(135deg, #2EC4BA 0%, #1A8C85 100%)` |
| CTA 文字 | `#FFFFFF` |
| CTA 陰影 | `rgba(42,163,154,0.4)` |
| 卡片背景 | `linear-gradient(145deg, #FFF9EE 0%, #FFF3DC 100%)（不變）` |
| titleIcon 色 | `#1A8C85`（CSS `color`） |
| 高亮短語 | `color: #1A8C85; fontWeight: 700` |

---

## 高亮文字渲染（highlightText）

`TutorialOverlay.tsx` 中的 `highlightText(text, highlights)` 函式：

```typescript
type Part = string | React.ReactElement;

function highlightText(text: string, highlights: string[]): React.ReactNode {
  // 依序用 highlights 短語分割字串
  // 命中的短語包在 <span style={{ color: '#1A8C85', fontWeight: 700 }}> 中
  // 回傳 React.ReactNode 供 <p> 渲染
}
```

---

## 教學期間資料抑制

教學進行中不建立快捷設定、不寫圖片快取、不儲存草稿，教學完成後才做初次存檔。

### 草稿抑制（useGameDraft）

`buildAndSave()` 最前端加入 guard：

```typescript
if (!isTutorialDone()) return;
```

影響範圍：debounce 自動存、`visibilitychange` 即時存、外部 `saveNow()` 呼叫，均受此 guard 抑制。

### 快捷設定 + 圖片抑制（CropPreview）

```typescript
if (isTutorialDone()) {
  saveRecord({ id: configId, ... });
  saveImage(configId, croppedImageDataUrl);
}
```

教學進行中，裁切完成後不寫 localStorage 也不寫 IDB。

### 教學完成後初次存檔（PlayRoute）

```typescript
const prevTutorialPhase = useRef<string | null>(null);
useEffect(() => {
  if (prevTutorialPhase.current === null) {
    // mount：教學進行中則暫停計時（system pause，不顯示 PauseOverlay）
    if (tutorialPhase === 'play' && startTime) dispatch(pauseGame());
  } else if (prevTutorialPhase.current === 'play' && tutorialPhase === 'inactive') {
    // 教學完成：恢復計時，一次性補存快捷設定 + 圖片 + 草稿
    dispatch(resumeGame());
    if (isTutorialDone()) {
      if (configId && referenceDataUrl) {
        saveRecord({ id: configId, createdAt: Date.now(), difficulty, cols, rows, isCompleted: false, bestTimeMs: 0 });
        saveImage(configId, referenceDataUrl);
      }
      saveNow();
    }
  }
  prevTutorialPhase.current = tutorialPhase;
}, [tutorialPhase, startTime, dispatch, saveNow, configId, difficulty, cols, rows, referenceDataUrl]);
```

`prevTutorialPhase = useRef<string | null>(null)` 以 `null` 作為「首次執行」的哨兵值，合併 mount 邏輯與 phase 轉換邏輯於同一 effect。

---

## PlayRoute 教學整合

- **mount 時**（`prevTutorialPhase.current === null`）：若 `tutorialPhase === 'play'` 且遊戲已計時，呼叫 `dispatch(pauseGame())`（系統暫停，不顯示 PauseOverlay）
- **教學進行中的 blocker**：`blocker.state === 'blocked'` 且 `tutorialPhase === 'play'` 時，靜默呼叫 `blocker.reset()` 阻止離開，不顯示 ConfirmDialog（避免教學引導被打斷）
- **ConfirmDialog 顯示條件**：`blocker.state === 'blocked' && tutorialPhase !== 'play'`

---

## localStorage key

| Key | 說明 |
|-----|------|
| `puzzle-tutorial-done` | 存在即代表教學已完成；初始化時若使用者有既有資料也會自動補寫（一次性遷移） |
