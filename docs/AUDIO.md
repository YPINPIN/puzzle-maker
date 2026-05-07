# 音效系統

> 本文件說明以 Web Audio API 合成的 SFX 音效、程序化背景音樂，以及音量控制架構。

音效系統為模組層級單例（`src/lib/soundEngine.ts`），零外部音頻檔，完全以 Web Audio API 合成。

---

## SFX（音效）

| 函式 | 音色 | 說明 |
|------|------|------|
| `playPickup()` | 350Hz triangle，短促 | 抓起拼圖片 |
| `playMerge()` | 440+880Hz 疊加 | 兩片合組 |
| `playSnap()` | 523+784Hz | 吸附至正確位置 |
| `playComplete()` | C5→E5→G5→C6 四音琶音 | 拼圖完成 |
| `playClick()` | 900Hz triangle，極短促 | 按鈕點擊 |

### SFX 觸發點

**拼圖互動**（`usePointerDrag.ts`）：
- `pointerdown` 時呼叫 `playPickup()`
- `pointerup` 結束後依順序以 `if/else if` 判斷，確保同一次放下最多觸發一個音效：合組（`playMerge`）→ 吸附（`playSnap`）
- 完成（`playComplete`）**不在** `usePointerDrag` 觸發；改由 `PuzzleBoard.tsx` 在縮放置中結束、掃光動畫開始的瞬間呼叫，使音效與視覺完全同步

**按鈕點擊**（`App.tsx`）：全域 **capture-phase** click listener（`addEventListener('click', fn, true)`），對所有 `button` 元素生效，可繞過元件內的 `stopPropagation`。

---

## 背景音樂

- **音色**：每音符 4 個 sine 諧波（基音、2nd、3rd、4th）+ ADSR 包絡（12ms 起音 → 80ms 衰減 → 長尾最長 2 秒）模擬鋼琴
- **樂曲**：C 大調、150 BPM、~25.6 秒四段循環（A 段 C5-G5 柔和起 → B 段中低音 → C 段高音變奏含 A5 → D 段 F 音色點綴後下行收 C5 接回 A）
- **排程**：`setTimeout` 逐音符遞迴，每步讀 `ac.currentTime` 即時排入 Web Audio timeline
- **自動播放限制**：`AudioContext` 初始為 `suspended`；`startMusic()` 在 suspended 狀態時掛載一次性 `pointerdown` 監聽，用戶首次互動後自動呼叫 `ac.resume()` 再建立音樂
- **靜音控制**：`setMuted(true)` → `stopMusic()`（800ms 淡出）；`setMuted(false)` → `startMusic()`（幂等，已播放則 no-op）；遊戲暫停（`isPaused`）**不影響音樂**

`pauseForBackground()` / `resumeFromBackground()`：分別清除 melody timeout + suspend / resume AudioContext，防止頁面回到前台時爆發積壓音符。

---

## 音量控制

三個分類 GainNode（lazy 建立），各自連接至 `ac.destination`：

| 節點 | 作用 | localStorage key | 預設值 |
|------|------|-----------------|--------|
| `musicCatGain` | 背景音樂 | `puzzle-vol-music` | 0.5 |
| `buttonCatGain` | 按鈕音效 | `puzzle-vol-button` | 0.8 |
| `pieceCatGain` | 拼圖片音效 | `puzzle-vol-piece` | 0.8 |

**`toGain(vol)` 公式**：`gain = vol × 2`

| slider 值 | gain | 效果 |
|-----------|------|------|
| 0.0 | 0.0 | 靜音 |
| 0.5 | 1.0 | 原始音量（等於不調整） |
| 1.0 | 2.0 | 放大一倍 |

UI 以 0–100% 步進 10% 顯示，內部儲存 0.0–1.0。

**匯出 API**：`getMusicVolume()`, `getButtonVolume()`, `getPieceVolume()`, `setMusicVolume(vol)`, `setButtonVolume(vol)`, `setPieceVolume(vol)`

---

## `useBackgroundMusic`（`src/features/game/useBackgroundMusic.ts`）

掛載於 `App.tsx`（`usePhaseHistory` 之後）：

- mount 時呼叫 `startMusic()`，unmount 時呼叫 `stopMusic()`
- 不監聽 `isPaused`，音樂跨所有 phase 持續播放
- 監聽 `visibilitychange`：頁面隱藏時呼叫 `pauseForBackground()`，頁面恢復時呼叫 `resumeFromBackground()`（已靜音則跳過）
