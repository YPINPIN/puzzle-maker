# Redux State 與計時器

> 本文件說明 Redux store 的核心狀態欄位設計，以及計時器的純數值計算機制。

## Redux State 關鍵欄位

以下欄位定義於 `src/store/puzzleSlice.ts`，為跨元件共享的遊戲狀態核心：

| 欄位 | 型別 | 說明 |
|------|------|------|
| `imageDataUrl` | `string \| null` | 原始上傳圖片（未裁切），僅在 upload→crop 階段使用；`startGame` 觸發時清除 |
| `referenceDataUrl` | `string \| null` | 裁切後的參考圖（≤800px JPEG），遊戲中「查看參考圖」使用；也是 `doRegenerate` 的圖片來源；值與 `croppedImageDataUrl` 相同，所有路徑統一 |
| `cropRegion` | 物件 | 相對於原圖的裁切座標（x, y, width, height）；`startGame` 觸發時清除 |
| `draggingGroupId` | `number \| null` | 目前被拖曳的 group ID；renderer 以此決定渲染層次 |
| `showImagePreview` | `boolean` | 控制 `ImagePreviewOverlay` 顯示 |
| `isPaused` | `boolean` | 計時器是否暫停（影響計時計算） |
| `showPauseOverlay` | `boolean` | 是否顯示半透明暫停覆蓋層（**獨立於 `isPaused`**）；只有「暫停」按鈕觸發的 `userPauseGame()` 才同時設為 true；「保存並結束」、「結束」、back 攔截等系統暫停只呼叫 `pauseGame()`，不顯示 overlay |

### 圖片欄位生命週期

```
imageDataUrl     → 上傳後設定  → startGame 時清除
cropRegion       → 裁切後設定  → startGame 時清除
referenceDataUrl → CropPreview 確認後設定 → 遊戲中持續使用
```

`startGame` reducer 同時清除 `imageDataUrl` 與 `cropRegion`，確保原始大圖在遊戲開始後立即釋放記憶體。

---

## 計時器機制

計時器以純數值計算，不使用 `setInterval` 驅動 Redux 狀態，避免頻繁 re-render。

### 計算公式

```
elapsed = (isPaused ? pausedAt : Date.now()) - startTime - pauseOffset
```

| 欄位 | 說明 |
|------|------|
| `startTime` | 遊戲開始的 timestamp（ms） |
| `pauseOffset` | 累計暫停毫秒數；每次 `resumeGame` 時加上本次暫停時長 |
| `pausedAt` | 暫停發生的 timestamp；暫停中用來替代 `Date.now()` |

### 顯示更新

`AppHeader` 以 `setInterval(500ms)` 定期更新本地 `tick` state 觸發 re-render；`displayElapsed` 於 render 期間呼叫 `computeElapsed()` 直接計算（純粹計算，不存入 state）。

暫停／恢復時 Redux 觸發 re-render 即自動更新顯示值。完成時的精確時間由 `usePointerDrag` 在觸發 `setComplete` 前計算並傳入。
