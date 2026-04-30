# 紀錄系統

> 本文件說明三個獨立的 localStorage 儲存（快捷設定、歷史紀錄、遊戲草稿）的資料結構與操作邏輯。

三個儲存互不依賴，各有獨立的 key 與管理模組。

---

## 快捷設定（`src/lib/records.ts`）

**目的**：儲存使用者曾玩過的拼圖設定，供「快速開局」重新使用，並記錄最佳完成時間。

| 項目 | 說明 |
|------|------|
| localStorage key | `puzzle-quick-settings` |
| 上限 | 最多 10 筆 `PuzzleRecord` |
| 主要 API | `getRecords()`, `saveRecord()`, `updateBestTime()` |

**欄位**：縮圖、裁切圖（≤800px JPEG）、難度、最佳時間、`isCompleted`

**建立入口**有兩處：
1. CropPreview 確認開始時
2. 透過分享代碼匯入時（`ShareCodeModal`）

---

## 歷史紀錄（`src/lib/gameHistory.ts`）

**目的**：儲存可繼續遊玩的完整存檔，含所有片的位置與 group 狀態。

| 項目 | 說明 |
|------|------|
| localStorage key | `puzzle-game-history` |
| 結構 | 固定 10 元素陣列 `(GameHistoryRecord \| null)[]`，空槽為 null |
| 主要 API | `getGameHistorySlots()`, `getGameHistory()`, `saveGameHistoryAtSlot()`, `deleteGameHistory()` |

**欄位**：縮圖、裁切圖、難度、`configId`、`savedState`（含所有片位置與 group 狀態）、`isCompleted`

### 關鍵 API 說明

| 函式 | 行為 |
|------|------|
| `getGameHistorySlots()` | 永遠回傳 10 元素陣列（含 null 空槽），供 `SavePanel`、`RecordsModal` 顯示固定 10 格 |
| `getGameHistory()` | 過濾 null，回傳非空紀錄陣列（供不需位置資訊的呼叫方使用） |
| `saveGameHistoryAtSlot(record, slotIndex)` | 直接 `slots[slotIndex] = record`，確保存入指定槽位（**不使用 push**，避免槽位錯位） |
| `deleteGameHistory(id)` | 將對應槽設為 null（保留其他槽位置） |

**保存流程**：`SavePanel`（10 格選位面板）→ `saveGameHistoryAtSlot(record, slotIndex)`

完成時若已有對應歷史紀錄（`gameId` 匹配），自動覆蓋並標記 `isCompleted: true`。

---

## 遊戲草稿（`src/lib/gameDraft.ts`）

**目的**：自動暫存進行中的遊戲，讓使用者離開後回首頁仍能「繼續上局」。

| 項目 | 說明 |
|------|------|
| localStorage key | `puzzle-game-draft` |
| 上限 | 最多 1 筆 `GameDraft`（隨時覆蓋） |
| 主要 API | `getDraft()`, `saveDraft()`, `clearDraft()` |

**欄位**：`gameId`、`configId`、難度、格數、`croppedImageDataUrl`、`thumbnailDataUrl?`（200×200 JPEG）、`savedAt?`（ms timestamp）、`savedState`

### 自動存時機（`src/features/game/useGameDraft.ts`，掛載於 `App.tsx`）

- pieces 變更後 1500ms debounce
- `visibilitychange` 頁面隱藏時立刻存
- back 攔截 / 「結束」按鈕觸發時也立即呼叫 `saveNow()`

`useGameDraft` 回傳 `{ saveNow }` 供外部呼叫（`App.tsx` 在 back 攔截時使用）。

### 縮圖生成

`useGameDraft` 監聽 `referenceDataUrl` 變化，呼叫 `generateThumbnail()`（`src/lib/imageUtils.ts`）非同步生成 200×200 置中縮圖（背景 `paper-100 #F8F5F0`，JPEG 0.7）並快取於 `thumbnailRef`，每次 `buildAndSave` 時一起存入草稿。`AppHeader`、`CompletionOverlay` 也使用同一函式生成存檔縮圖。

### 清除時機

| 時機 | 觸發位置 |
|------|---------|
| 「結束」確認 | `App.tsx` ConfirmDialog `onConfirm` |
| 「保存並結束」完成 | `AppHeader.handleSaveToSlot` |
| `phase` 變為 `complete` | `useGameDraft` useEffect |

不會在 `resetGame` 後自動清除——back swipe 離開再回首頁時草稿仍保留，顯示「繼續上局」。

---

## ID 設計

| 欄位 | 存在位置 | 說明 | 使用場景 |
|------|---------|------|---------|
| `configId` | Redux + `GameHistoryRecord` | 快捷設定紀錄的 ID，由 CropPreview 產生 | 完成時用來回寫最佳時間 |
| `gameId` | Redux + `GameHistoryRecord.id` | 每次新開遊戲的 UUID | 自動存檔覆蓋比對依據；續玩時沿用原 `historyRecord.id` |

**新開遊戲**（不論從 CropPreview 或快速開局重玩）都會各自產生新的 `configId` 與 `gameId`。

**從歷史紀錄續玩**時，`gameId = historyRecord.id`、`configId = historyRecord.configId`。

刪除快捷設定不會造成錯誤，`configId` 成為懸空參照時，`CompletionOverlay` 的查找會安全返回 null。
