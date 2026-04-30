# 遊戲流程

> 本文件說明遊戲的 phase 狀態機、各首頁入口行為、完成流程，以及續玩時的座標縮放邏輯。

## Phase 狀態機

遊戲以 Redux `phase` 欄位驅動，`App.tsx` 根據 `phase` 條件渲染對應元件：

```
home → upload → config → crop → playing → complete
```

`resetGame()` 回到 `home`。`HomePage` 為靜態 import（首頁無白屏），其餘 5 個 phase 元件均為 `React.lazy`（使用者互動後才下載對應 chunk）。

`canvasMapRef`（offscreen canvas）與 `pathMapRef`（Path2D 形狀）在 App 層建立並向下傳遞，貫穿整個遊戲生命週期。

| Phase      | 元件                                | 說明                                         |
|------------|-------------------------------------|----------------------------------------------|
| `home`     | `HomePage`                          | 主選單：建立新拼圖、讀取存檔、快速開局       |
| `upload`   | `ImageUpload`                       | 上傳頁（拖放或選用內建圖片）；快捷設定滿時從首頁攔截 |
| `config`   | `DifficultySelector`                | 選擇難度，決定 cols × rows                   |
| `crop`     | `CropPreview`                       | 裁切圖片，生成拼圖片，建立快捷設定紀錄       |
| `playing`  | `PuzzleBoard` + `AppHeader`         | 主遊戲畫面，含暫停／儲存控制                 |
| `complete` | `PuzzleBoard` + `CompletionOverlay` | 完成覆蓋層，可儲存或離開                     |

---

## 首頁入口邏輯

`applyRecord`、`continueGame`、`resumeDraft` 的實作均在 `HomePage`（非 `ImageUpload`）。

### 繼續上局

mount 時讀取 `getDraft()`，若存在則顯示湖水綠 `DraftCard`（最上方），顯示難度、格數、完成百分比、暫存時間、已拼片數／耗時；點擊呼叫 `resumeDraft`，以草稿資料構造假的 `GameHistoryRecord` 後呼叫 `continueGame`。

### 建立新拼圖

檢查 `getRecords().length >= 10`，若滿則攔截；否則呼叫 `guardDraft(() => dispatch(goToUpload()))`。

### 讀取存檔

開啟 `RecordsModal`（`mode='history'`）→ 選擇後 `setShowRecords(null)` → `guardDraft(() => continueGame(record))`。

### 快速開局

開啟 `RecordsModal`（`mode='quick'`）→ 選擇後 `setShowRecords(null)` → `guardDraft(() => applyRecord(record))`。

### `guardDraft(action)`

若 `getDraft()` 存在，將 action 存入 `pendingAction` state 並顯示草稿警告 dialog（確認後 `clearDraft()` → `setCurrentDraft(null)` → 執行 action）；否則直接執行 action。

---

## 完成流程

| 情境 | 行為 |
|------|------|
| **有對應歷史紀錄**（`gameId` 能在 `gameHistory` 找到） | 自動覆蓋儲存並標記 `isCompleted`，顯示「已自動保存」提示 |
| **無歷史紀錄** | 顯示「保存紀錄」與「離開」按鈕；選擇保存則開啟 `SavePanel` |

---

## 續玩位置縮放

從歷史紀錄續玩時，若視窗尺寸不同，`HomePage.continueGame` 用仿射變換重新對齊座標，並對非 snap 的片子做邊界 clamp：

```
scale = result.pieceW / savedState.pieceW
newX  = oldX * scale + (newPuzzleOffsetX - oldPuzzleOffsetX * scale)
// 非 snap 片：x clamped to [0, canvasSize - pieceW]
```
