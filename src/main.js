// src/main.js

// --- 核心套件引入 ---
import { createApp } from 'vue';
import { createPinia } from 'pinia';

// --- 根元件與路由引入 ---
import App from './App.vue';
import router from './router';

// --- 全域樣式引入 ---
// 這是您專案的 CSS 入口，Vite 會處理它們。
import './assets/styles/tailwind.css';
import './assets/styles/main.css';

// --- 初始化應用程式 ---

// 1. 建立 Vue 應用程式實例
const app = createApp(App);

// 2. 建立並使用 Pinia 實例，用於全域狀態管理
const pinia = createPinia();
app.use(pinia);

// 3. 使用 Vue Router 實例，用於頁面導航
app.use(router);

// 4. 將應用程式掛載到 index.html 中的 #app 元素上
app.mount('#app');
