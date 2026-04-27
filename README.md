# <sub><img src="public/favicon.svg" width="36" alt="logo"></sub> 拼圖樂 - 線上拼圖遊戲

[![React](https://img.shields.io/badge/React-19.2.4-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0.2-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.0.48-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Redux Toolkit](https://img.shields.io/badge/Redux_Toolkit-2.11.2-764ABC?logo=redux&logoColor=white)](https://redux-toolkit.js.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.2.2-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Deploy](https://img.shields.io/badge/GitHub%20Pages-deployed-3FB950?logo=github&logoColor=white)](https://ypinpin.github.io/puzzle-maker/)
[![Last Commit](https://img.shields.io/github/last-commit/YPINPIN/puzzle-maker)](https://github.com/YPINPIN/puzzle-maker/commits/main)

💻 **[線上 Demo](https://ypinpin.github.io/puzzle-maker/)**

![拼圖樂 遊戲截圖](./screenshot.png)

---

## ✨ 專案介紹

**拼圖樂**是一款純前端的線上拼圖遊戲，使用 Canvas 2D API 實作高解析度渲染。

玩家可以上傳自己的圖片，或從內建圖片中選擇主題，自由選定難度後即可開始挑戰。遊戲提供暫停計時、中途存檔、續玩，以及將拼圖設定編碼成文字代碼分享給好友等功能。

---

## 🎮 遊戲特色

### 🖼️ 圖片來源

- 支援本地圖片**拖放**或點選上傳
- 內建 8 張精選主題圖片（虹彩貓頭鷹、漫步星塵海、祕境樹之屋、賽博不夜城、萌貓午茶時、幻境古木林、星際觀測站、魔法藏書閣）
- 自訂**裁切**區域，確保拼圖比例完美

### 🎚️ 難度與拼圖

- 四種難度：**簡單**（約25片）、**普通**（約50片）、**困難**（約100片）、**專家**（約150片）

  | 難度 | 約片數    | 建議裝置           |
  | ---- | --------- | ------------------ |
  | 簡單 | 約 25 片  | 手機 / 平板 / 桌機 |
  | 普通 | 約 50 片  | 平板 / 桌機        |
  | 困難 | 約 100 片 | 建議平板或桌機     |
  | 專家 | 約 150 片 | 建議桌機           |

- 每個難度提供 3 種格數形狀選擇：**正方形**（1:1）、**直式**（3:4 或 2:3）、**橫式**（4:3 或 3:2）
- 每片拼圖具有凹凸契合的 tab/blank 邊緣，形狀由演算法隨機生成
- 抓住拼圖片時顯示**白色邊框**；拖放時提供**吸附**預覽（綠光）與**錯位警示**（紅光）
- 相鄰片自動**合組**，整組一起拖曳

### ⏱️ 計時器

- 支援**暫停 / 繼續**計時
- 完成時精確記錄用時，並回寫快捷設定的最佳時間

### 💾 存檔系統

- **自動草稿**：遊戲進行中自動暫存進度；首頁草稿卡片顯示縮圖、難度、完成百分比與耗時，可直接點「繼續上局」恢復；切換至新遊戲前若有草稿會跳出警告，防止意外遺失進度
- **快捷設定**：最多 10 筆，紀錄圖片縮圖、難度與最佳時間，可快速重玩
- **歷史紀錄**：最多 10 個存檔槽，儲存所有拼圖片的位置狀態，支援中途離開後**續玩**

### 🔗 分享代碼

- 將快捷設定序列化並以 lz-string 壓縮為文字代碼
- 複製代碼傳給好友，對方匯入即可在相同設定下挑戰

### 📱 響應式設計

- Canvas 尺寸依視窗大小自適應（支援手機、平板、桌機）
- DPR 感知渲染（DPR ≤ 2 用 2x，DPR = 3 用 3x），確保畫面清晰不模糊
- 遊戲畫面支援**雙指 pinch 縮放**（100%–200%）與**拖曳平移**，方便手機操作
- 裁切頁面支援**雙指 pinch 調整裁切框大小**
- 底部控制列固定在 Canvas 下方，縮放按鈕不再浮動遮擋拼圖碎片
- 遊戲進度**自動暫存**至本機，手機返回手勢離開後可從首頁「繼續上局」恢復
- 支援 iOS **Safe Area**（`env(safe-area-inset-bottom)`），防止 Home Indicator 遮擋按鈕

### 🔊 音效與背景音樂

- 鋼琴風格**程序化背景音樂**（C 大調、150 BPM、~25.6 秒循環），無需外部音頻檔，完全由 Web Audio API 合成
- 操作音效：抓起、合組、吸附、完成、按鈕點擊各有獨立音效提示
- Header **音量按鈕**（所有頁面均顯示），點擊開啟音量設定 Modal：全域靜音 toggle + 三種音效分類（背景音樂、按鈕音效、拼圖片音效）獨立滑桿調整，設定自動保存至本機
- 遊戲暫停時背景音樂持續播放；切換至背景分頁時自動暫停，回到前台後自動恢復

### 📦 PWA 支援

- 可**安裝至主畫面**（Android / iOS / 桌面 Chrome），以 standalone 模式開啟
- Service Worker 預快取 app shell，**離線仍可遊玩**已保存的拼圖進度
- 曾瀏覽過的內建圖片會被 NetworkFirst 快取，離線時同樣可選用

---

## 🛠️ Tech Stack

| 技術                                                 | 說明           |
| ---------------------------------------------------- | -------------- |
| [React 19](https://react.dev/)                       | UI 框架        |
| [TypeScript](https://www.typescriptlang.org/)        | 靜態型別       |
| [Vite 8](https://vite.dev/)                          | 建置工具       |
| [Redux Toolkit](https://redux-toolkit.js.org/)       | 全域狀態管理   |
| [Tailwind CSS v4](https://tailwindcss.com/)          | 樣式框架       |
| [lz-string](https://github.com/pieroxy/lz-string)    | 分享代碼壓縮   |
| [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) | PWA / 離線支援 |
| Canvas 2D API                                        | 拼圖渲染與互動 |
| Web Audio API                                        | 程序化音效與背景音樂合成 |

---

## 🚀 開發與安裝

```bash
# 複製專案
git clone https://github.com/YPINPIN/puzzle-maker.git
cd puzzle-maker

# 安裝依賴（.npmrc 已設定 legacy-peer-deps=true，直接執行即可）
npm install

# 啟動開發伺服器
npm run dev

# 建置 production
npm run build
```

> **注意**：`vite-plugin-pwa` 的 peer dependency 尚未正式支援 Vite 8，專案根目錄的 `.npmrc` 已設定 `legacy-peer-deps=true` 自動處理此相容性問題，無需手動加 flag。

---

## 🎨 素材來源

| 項目                 | 說明                                                |
| -------------------- | --------------------------------------------------- |
| 內建拼圖圖片（8 張） | 由 [Google Gemini](https://gemini.google.com/) 生成 |
| App Logo / Icons     | 由 [Claude Design](https://claude.ai/) 設計生成 SVG |

---

## 📄 版權聲明

© 2026 [YPINPIN](https://github.com/YPINPIN). All rights reserved.

本專案僅供個人學習使用，非商業用途。
