# 靜態資源與部署

> 本文件說明 public/ 目錄資源的路徑規則、靜態圖示資源，以及 PWA 與內建拼圖圖片的設定。

---

## public 目錄資源的路徑規則

Vite 的 `base` 設定（`vite.config.ts`：production 為 `/jigsaw-puzzle-maker/`）只會自動轉換：

- `import` 語句
- CSS `url()`
- HTML 屬性（`src`、`href`）

**JavaScript 字串常數不會被轉換。** 凡是在 JS/TS 程式碼中以字串引用 `public/` 目錄資源，必須使用 `import.meta.env.BASE_URL` 前綴：

```typescript
// 錯誤（部署後 404）
const url = '/presets/puzzle-1.png';

// 正確
const url = `${import.meta.env.BASE_URL}presets/puzzle-1.png`;
```

`import.meta.env.BASE_URL` 已含尾部斜線（production: `/jigsaw-puzzle-maker/`，dev: `/`），路徑不需另加前綴 `/`。

---

## 靜態圖示資源

| 檔案 | 說明 |
|------|------|
| `public/favicon.svg` | 4 路徑品牌標誌（琥珀 `#F5B13F` × 奶油 `#F4ECDE`），viewBox 0 0 24 24 |
| `public/favicon.ico` | 48×48 ICO，由 `@vite-pwa/assets-generator` 從 favicon.svg 生成 |
| `public/apple-touch-icon-180x180.png` | iOS 主畫面圖示（PNG），由 assets-generator 生成；取代舊的 apple-touch-icon.svg |
| `public/pwa-64x64.png` | PWA 圖示 64px |
| `public/pwa-192x192.png` | PWA 圖示 192px（Chrome 安裝必要） |
| `public/pwa-512x512.png` | PWA 圖示 512px（Chrome 安裝必要） |
| `public/maskable-icon-512x512.png` | PWA maskable 圖示（Android 自適應圖示） |
| `public/icons.svg` | SVG sprite，78 個 `<symbol>`（`brand-mark*`、`ic-*`、`crest-*`）；JS 中須以 `${import.meta.env.BASE_URL}icons.svg` 引用 |

若需重新生成 PNG 圖示（修改 favicon.svg 後）：

```bash
npx pwa-assets-generator --preset minimal-2023 public/favicon.svg
```

---

## PWA 設定（`vite.config.ts`）

| 設定項 | 說明 |
|--------|------|
| `registerType: 'autoUpdate'` | SW 靜默更新，無需使用者介入 |
| `globPatterns`（預快取） | 所有 JS/CSS/HTML/SVG/woff2，app shell 完整離線可用 |
| Runtime cache（preset 圖片） | NetworkFirst 策略，cacheName `preset-images`，最多 8 筆、30 天；首次瀏覽後離線可用 |
| `devOptions.enabled: true` | 開發模式下也會注入 SW，可在 Chrome DevTools → Application 驗證 |

---

## 內建拼圖圖片

放於 `public/presets/`，以 `${import.meta.env.BASE_URL}presets/<檔名>` 引用：

| 檔案 | 主題 |
|------|------|
| `puzzle-1.png` | 虹彩貓頭鷹 |
| `puzzle-2.png` | 漫步星塵海 |
| `puzzle-3.png` | 祕境樹之屋 |
| `puzzle-4.png` | 賽博不夜城 |
| `puzzle-5.png` | 萌貓午茶時 |
| `puzzle-6.png` | 幻境古木林 |
| `puzzle-7.png` | 星際觀測站 |
| `puzzle-8.png` | 魔法藏書閣 |
