import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const base = mode === 'production' ? '/puzzle-maker/' : '/';
  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'apple-touch-icon-180x180.png', 'icons.svg'],
        manifest: {
          name: '拼圖樂',
          short_name: '拼圖樂',
          description: '上傳個人圖片或選用內建圖片，在線打造專屬拼圖！支援多種難度、暫停計時、存檔續玩。',
          theme_color: '#F4A52B',
          background_color: '#F8F5F0',
          display: 'standalone',
          start_url: base,
          scope: base,
          id: base,
          icons: [
            { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        devOptions: { enabled: true },
        workbox: {
          // 預快取 app shell（JS、CSS、HTML、SVG），排除 preset 大圖
          globPatterns: ['**/*.{js,css,html,svg,woff2}'],
          runtimeCaching: [
            {
              // preset 圖片：NetworkFirst（優先網路，離線時讀快取）
              urlPattern: ({ url }) => url.pathname.includes('/presets/'),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'preset-images',
                expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
          ],
        },
      }),
    ],
  };
});
