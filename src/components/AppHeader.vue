<script setup>
import { computed } from 'vue';
import { useAuthStore } from '@/store/auth';
import { useUiStore } from '@/store/ui';

// [FIX] 從 @/assets 資料夾中引入圖片資源
// 這樣 Vite 才能在建置時正確處理圖片路徑
import logoUrl from '@/assets/logo.jpg';

const authStore = useAuthStore();
const uiStore = useUiStore();

const isLoggedIn = computed(() => authStore.isLoggedIn);
const user = computed(() => authStore.user);
const userRoleName = computed(() => authStore.userRoleName);

const handleLogout = () => {
  authStore.logout();
  uiStore.showMessage('您已成功登出。', 'success');
};
</script>

<template>
  <header class="bg-white shadow-lg">
    <div class="container mx-auto px-4 py-5 flex flex-wrap justify-between items-center gap-4">
      <div class="flex items-center">
        <!-- [FIX] 使用 :src 來綁定匯入的圖片變數 -->
        <img :src="logoUrl" alt="簽到系統Logo" class="h-12 w-12 rounded-full shadow-md mr-4">
        <div>
          <h1 class="text-3xl md:text-4xl font-extrabold text-indigo-800">點名系統</h1>
          <p class="text-gray-500 text-sm md:text-base mt-1">使用前要匯入名單&創建活動</p>
        </div>
      </div>

      <div v_if="isLoggedIn" class="flex items-center gap-4 flex-wrap justify-center sm:justify-end w-full sm:w-auto">
        <span class="text-gray-700 font-medium px-3 py-1 bg-gray-100 rounded-full order-first sm:order-none">
          歡迎, {{ user.nickname }} ({{ userRoleName }})
        </span>
        <!-- 這裡可以放修改密碼按鈕，但暫時省略以簡化 -->
        <button @click="handleLogout" class="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition duration-300 transform hover:scale-105 shadow-sm">
          登出
        </button>
      </div>
    </div>
  </header>
</template>
