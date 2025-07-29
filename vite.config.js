import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    // 這裡是為了讓前端開發伺服器能正確地代理到後端的 serverless functions
    // 這樣在開發時，前端呼叫 /api/... 就會被轉發到 Vercel 的開發環境
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // 假設 Vercel CLI 在 3000 port 運行
        changeOrigin: true,
      },
    },
  },
})
