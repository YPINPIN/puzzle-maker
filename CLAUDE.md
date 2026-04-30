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
- **Redux Toolkit**（`@reduxjs/toolkit` + `react-redux`）管理全局狀態，單一 `puzzleSlice`（`src/store/puzzleSlice.ts`）
- **Tailwind CSS v4**，透過 `@tailwindcss/vite` plugin 整合（無獨立設定檔）
- CSS 入口為 `src/index.css`，以 `@import "tailwindcss"` 引入 Tailwind
- **lz-string**：分享代碼壓縮用（`compressToBase64` / `decompressFromBase64`）
- **vite-plugin-pwa**（Vite 8 尚未正式支援，根目錄 `.npmrc` 已設定 `legacy-peer-deps=true`，`npm install` / `npm ci` 無需另加 flag）：Service Worker 生成（Workbox `generateSW` 模式）與 manifest 注入；`devOptions.enabled: true` 讓 dev server 也能測試 SW

## TypeScript 設定

採用 project references 分層設定：

- `tsconfig.json` — 根設定，僅包含 references
- `tsconfig.app.json` — 應用程式碼（`src/`）
- `tsconfig.node.json` — Vite 設定檔等 Node 環境程式碼

## 文件索引

詳細規格請參閱 `docs/` 目錄：

| 文件 | 涵蓋內容 |
|------|---------|
| [docs/STATE.md](docs/STATE.md) | Redux State 欄位說明、計時器機制 |
| [docs/GAME-FLOW.md](docs/GAME-FLOW.md) | Phase 狀態機、首頁入口邏輯、完成流程、續玩縮放 |
| [docs/CANVAS.md](docs/CANVAS.md) | Canvas 渲染、拼圖片機制（形狀、Group、常數）、觸控與縮放 |
| [docs/RECORDS.md](docs/RECORDS.md) | 快捷設定、歷史紀錄、遊戲草稿、ID 設計 |
| [docs/UI.md](docs/UI.md) | Header（暫停行為）、配色、Icon 元件、RWD、手機適配 |
| [docs/AUDIO.md](docs/AUDIO.md) | SFX、程序化背景音樂、音量控制 |
| [docs/COMPONENTS.md](docs/COMPONENTS.md) | 共用元件、工具函式（`src/lib/`）、分享代碼 |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | public 路徑規則、靜態圖示、PWA 設定、內建圖片 |
