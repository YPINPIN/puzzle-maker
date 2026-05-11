# 紀錄系統

> 本文件說明圖片快取（IndexedDB）與三個 localStorage 儲存（快捷設定、歷史紀錄、遊戲草稿）的資料結構與操作邏輯。

**圖片快取**是共用層，其餘三個儲存不再重複儲存圖片，僅保留 `configId` 作為查找鍵。

---

## 圖片快取（`src/lib/imageCache.ts`）

**目的**：集中儲存所有 `croppedImageDataUrl`，讓快捷設定、歷史紀錄、草稿不再各自存一份重複圖片，並解決 localStorage 5 MB 配額限制（每張圖 base64 約 500 KB，10 張即達上限）。

| 項目 | 說明 |
|------|------|
| 儲存方式 | **IndexedDB**（資料庫 `puzzle-image-db`，object store `images`） |
| 資料型別 | `key: configId → value: croppedImageDataUrl`（IDB key-value） |
| 記憶體層 | `_mem: Record<configId, dataUrl>`，App 啟動時由 `initImageCache()` 從 IDB 一次載入，後續所有讀取走記憶體，無 async 開銷 |
| 主要 API | `initImageCache()`, `saveImage(configId, dataUrl)`, `getImage(configId)`, `pruneImageCache()` |

**選用 IndexedDB 的原因**：localStorage 為 UTF-16 編碼，圖片 base64 字元佔雙倍空間（每張 ~500 KB），10 張即逼近 5 MB 上限；IndexedDB quota 通常 50 MB 以上，從根本解決問題。文字紀錄（records / history / draft，合計 ~100 KB）仍保留於 localStorage。

**Key 設計**：使用 `configId` 作為圖片 ID。同一 `configId` 永遠對應同一張裁切圖（由 CropPreview 同時產生），因此零重複。

**初始化流程**（`AppLayout` 啟動時）：
1. `initImageCache()`（非同步）：從 IDB 讀取全部圖片至 `_mem`

**圖片寫入時機**：
1. CropPreview 確認開始時：`saveImage(configId, croppedImageDataUrl)`（同步更新 `_mem`，fire-and-forget 寫入 IDB）
2. 分享代碼匯入時：`shareDataToRecord()` 呼叫 `saveImage()` 直接將圖片存入快取

**圖片讀取**：`getImage(configId)` 從 `_mem` 同步讀取

**Prune 時機**：`deleteRecord()`、`deleteGameHistory()`、`clearDraft()` 後自動呼叫，掃描三個 localStorage key 收集仍在使用的 `configId`，同步從 `_mem` 刪除孤立項目，並 fire-and-forget 從 IDB 刪除。

---

## 快捷設定（`src/lib/records.ts`）

**目的**：儲存使用者曾玩過的拼圖設定，供「快速開局」重新使用，並記錄最佳完成時間。

| 項目 | 說明 |
|------|------|
| localStorage key | `puzzle-quick-settings` |
| 上限 | 最多 10 筆 `PuzzleRecord` |
| 主要 API | `getRecords()`, `saveRecord()`, `updateRecord()`, `deleteRecord()`, `isNewUser()`, `isTutorialDone()` |

**欄位**：`id`（`configId`）、難度、格數、`isCompleted`、`bestTimeMs`

**建立入口**有兩處：
1. CropPreview 確認開始時（教學期間抑制，完成後由 PlayRoute 補存）
2. 透過分享代碼匯入時（`ShareCodeModal`）

### isTutorialDone()

```typescript
const TUTORIAL_DONE_KEY = 'puzzle-tutorial-done';

export function isTutorialDone(): boolean {
  return !!localStorage.getItem(TUTORIAL_DONE_KEY);
}
```

用於：① `useGameDraft.buildAndSave()` guard；② `CropPreview` saveRecord / saveImage guard；③ `PlayRoute` 教學完成後初次存檔觸發條件。

### isNewUser()

```typescript
export function isNewUser(): boolean {
  return getRecords().length === 0 && getGameHistory().length === 0 && getDraft() === null;
}
```

`TutorialContext` 初始化時用此函式判斷是否為全新使用者（無任何存檔資料）。

---

## 歷史紀錄（`src/lib/gameHistory.ts`）

**目的**：儲存可繼續遊玩的完整存檔，含所有片的位置與 group 狀態。

| 項目 | 說明 |
|------|------|
| localStorage key | `puzzle-game-history` |
| 結構 | 固定 10 元素陣列 `(GameHistoryRecord \| null)[]`，空槽為 null |
| 主要 API | `getGameHistorySlots()`, `getGameHistory()`, `saveGameHistoryAtSlot()`, `deleteGameHistory()` |

**欄位**：`id`（`gameId`）、`configId`、難度、格數、`savedState`（含所有片位置、group 狀態與 `showPreviewHint`）、`isCompleted`

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

**欄位**：`gameId`、`configId`、難度、格數、`savedAt?`（ms timestamp）、`savedState`（含 `showPreviewHint`）。不儲存圖片（由 `getImage(configId)` 從圖片快取查找）

### 自動存時機（`src/features/game/useGameDraft.ts`，掛載於 `App.tsx`）

- pieces 變更後 1500ms debounce
- `visibilitychange` 頁面隱藏時立刻存
- back 攔截 / 「結束」按鈕觸發時也立即呼叫 `saveNow()`

`useGameDraft` 回傳 `{ saveNow }` 供外部呼叫（`App.tsx` 在 back 攔截時使用）。

**教學期間抑制**：`buildAndSave()` 最前端有 `if (!isTutorialDone()) return` guard，教學完成前所有存檔路徑均短路返回，不寫任何資料。教學完成（`play` → `inactive`）後，`PlayRoute` 立即呼叫 `saveNow()` 做初次草稿存檔。

### 清除時機

| 時機 | 觸發位置 |
|------|---------|
| 「結束」確認 | `PlayRoute` ConfirmDialog `onConfirm` |
| 「保存並結束」完成 | `AppHeader.handleSaveToSlot` |
| `isComplete` 變為 true | `useGameDraft` useEffect |

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
