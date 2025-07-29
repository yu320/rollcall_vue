// vite.config.js

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path'; // [NEW] 引入 Node.js 的 path 模組

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],

  // [NEW] 新增 resolve.alias 設定
  // 這個設定會告訴 Vite (以及底層的 Rollup)
  // 如何解析路徑別名 '@'。
  resolve: {
    alias: {
      // 將 '@' 別名指向專案的 'src' 資料夾
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
