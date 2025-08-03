// vite.config.js
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa'; // [新增] 引入 PWA 插件

export default defineConfig({
  plugins: [
    vue(),
    // [新增] 加入 PWA 插件的設定
    VitePWA({
      registerType: 'autoUpdate', // 自動更新 Service Worker
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: '報到管理系統',
        short_name: '報到系統',
        description: '一個基於 Vue.js 的現代化報到管理系統',
        theme_color: '#4f46e5', // 主題顏色 (Indigo)
        background_color: '#ffffff', // 背景顏色
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          }
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});