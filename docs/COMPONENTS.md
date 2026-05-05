# 共用元件與工具函式

> 本文件說明專案中的共用 React 元件、`src/lib/` 工具函式庫，以及分享代碼的編解碼系統。

---

## 共用元件

| 元件 | 路徑 | 用途 |
|------|------|------|
| `Icon` | `src/components/Icon.tsx` | SVG sprite icon 元件；詳見 [UI.md](UI.md) |
| `PageFooter` | `src/components/PageFooter.tsx` | 版權 footer（無 props）；含版權文字、GitHub icon 連結與非商業聲明；由 `HomePage`、`ImageUpload`、`DifficultySelector` 使用 |
| `ConfirmDialog` | `src/components/ConfirmDialog.tsx` | 通用二次確認對話框，支援 `danger` 紅色模式；`message` 接受 `ReactNode`；同檔案匯出 `Hi`（品牌金）、`HiAccent`（湖水綠）、`HiDanger`（紅）三個 helper span |
| `ShareCodeModal` | `src/components/ShareCodeModal.tsx` | 分享代碼 Modal；`mode='share'` 顯示代碼供複製；`mode='import'` 讓使用者貼入代碼；匯入前檢查快捷設定是否已達 10 筆上限 |
| `VolumeModal` | `src/components/VolumeModal.tsx` | 音量設定 Modal；頂部「全部靜音」toggle switch；靜音時三個 range 均 disabled；三個分類滑桿（背景音樂、按鈕音效、拼圖片，`step={10}`，0–100%）；即時預覽音量 |
| `SavePanel` | `src/features/game/SavePanel.tsx` | 10 格存檔選位面板；以 `gameId` 比對標示「目前紀錄」格；佔用格點擊前顯示 `ConfirmDialog` 確認覆蓋（原始 slot 除外） |
| `PresetImagesModal` | `src/features/upload/PresetImagesModal.tsx` | 內建圖片選擇 Modal；8 張圖片定義於元件頂部常數（`PRESET_IMAGES`）；各圖片以 `onLoad` 追蹤載入狀態，未載入時顯示 spinner；點選後以 `fetch → blob → canvas.toDataURL('image/jpeg', 0.92)` 轉換，結果快取於 `useRef<Map>` |
| `RecordsModal` | `src/features/upload/RecordsModal.tsx` | 雙模式清單 Modal；`mode='quick'` 顯示快捷設定；`mode='history'` 顯示歷史紀錄固定 10 槽（空槽顯示虛線框）；縮圖以 `object-contain` 顯示完整圖片；各筆紀錄可刪除；quick 模式 Header 有「匯入代碼」按鈕，每筆卡片有「分享」按鈕 |
| `ImagePreviewOverlay` | `src/features/game/ImagePreviewOverlay.tsx` | 遊戲中查看參考圖的全螢幕覆蓋層；由 `toggleImagePreview` action 控制 `showImagePreview` Redux 欄位；顯示 `referenceDataUrl`，點擊背景或 ✕ 鈕關閉 |
| `AppLayout` | `src/features/layout/AppLayout.tsx` | 所有路由的共用 layout（`<Outlet />`）；掛載 `usePreventForwardNav`、`useBackgroundMusic`、全域按鈕 click 音效；啟動時呼叫 `initImageCache()`（非同步，將 IDB 圖片載入 `_mem`）；渲染 `AppHeader` |
| `PlayRoute` | `src/features/game/PlayRoute.tsx` | `/play` 路由元件；以 `useBlocker` 攔截離開確認、Guard 無遊戲狀態時重導回首頁；整合 `PuzzleBoard` 與 `CompletionOverlay` |

---

## 共用工具函式（`src/lib/`）

| 檔案 | 匯出 | 說明 |
|------|------|------|
| `difficulty.ts` | `DIFFICULTY_LABEL`, `CREST` | 難度顯示名稱（`{ easy: '簡單', ... }`）與徽章 icon 名稱（`{ easy: 'crest-easy', ... }`）；全專案唯一定義，不在各元件重複宣告 |
| `format.ts` | `formatTimer(ms)`, `formatDuration(ms)`, `formatDate(ts)` | 計時器顯示格式（`MM:SS`）、完成用時顯示（`X 分 Y 秒`）與日期格式化（`YYYY/MM/DD HH:mm`）；全專案唯一定義 |
| `imageCache.ts` | `initImageCache()`, `saveImage()`, `getImage()`, `pruneImageCache()` | 圖片快取層；以 IndexedDB（`puzzle-image-db`）儲存，啟動時載入至 `_mem` 供同步讀取；詳見 [RECORDS.md](RECORDS.md) |
| `imageUtils.ts` | `generateThumbnail(url, opts?)` | 200×200 置中縮圖生成，回傳 `Promise<string>`（JPEG data URL）；預設 `background='#F8F5F0'`、`quality=0.7`；目前無活躍呼叫端（thumbnail 已由圖片快取統一管理） |
| `soundEngine.ts` | 音效與音樂 API | 音效 SFX + 程序化鋼琴背景音樂引擎；靜音與三種音量分類以 `localStorage` 持久化；詳見 [AUDIO.md](AUDIO.md) |
| `constants.ts` | 遊戲常數與 `getEffectiveDPR()` | Canvas 尺寸、閾值、縮放常數；詳見 [CANVAS.md](CANVAS.md) |
| `records.ts` | 快捷設定 API | 詳見 [RECORDS.md](RECORDS.md) |
| `gameHistory.ts` | 歷史紀錄 API | 詳見 [RECORDS.md](RECORDS.md) |
| `gameDraft.ts` | 草稿 API | 詳見 [RECORDS.md](RECORDS.md) |
| `shareCode.ts` | `encodeShareCode`, `decodeShareCode`, `shareDataToRecord` | 詳見下方分享代碼系統 |
| `usePhase.ts` | `usePhase()` | 從 React Router `pathname` 推導目前 `GamePhase`（`/` → `home`、`/upload` → `upload`、`/config` → `config`、`/crop` → `crop`、`/play` → `playing`）；供 `AppHeader` 等需要依 phase 切換 UI 的元件使用 |
| `usePreventForwardNav.ts` | `usePreventForwardNav()` | 以 `useBlocker` 偵測瀏覽器前進導航（POP 且新 idx > 舊 idx），自動呼叫 `blocker.reset()` 阻止；掛載於 `AppLayout` |

---

## 分享代碼系統（`src/lib/shareCode.ts`）

將快捷設定序列化為可複製的文字代碼，讓使用者分享拼圖給他人。

### 代碼格式

```
{ v: 1, difficulty, cols, rows, img }
  ↓ JSON stringify
  ↓ lz-string compressToBase64
  → 代碼字串
```

`img` 為去除前綴的 JPEG base64。

### API

| 函式 | 說明 |
|------|------|
| `encodeShareCode(record)` | 從 `PuzzleRecord` 產生代碼 |
| `decodeShareCode(code)` | 解壓縮並驗證（版本號、cols/rows 範圍 2–20、img 長度），失敗回傳 `null` |
| `shareDataToRecord(data)` | 產生新 `PuzzleRecord`（重新生成 `id`、`createdAt`，`isCompleted=false`）；同時呼叫 `saveImage()` 將圖片直接存入 IndexedDB 快取 |

### UI 入口

`RecordsModal`（`mode='quick'`）的 Header 有「匯入代碼」按鈕，每筆紀錄卡片有「分享」按鈕；兩者皆由 `HomePage` 管理 Modal 狀態。
