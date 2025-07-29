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
};

// 新增：簡易的修改密碼功能
const openChangePasswordModal = () => {
    const newPassword = prompt("請輸入您的新密碼 (至少需要 6 個字元):");
    if (newPassword && newPassword.length >= 6) {
        authStore.changePassword(newPassword);
    } else if (newPassword) {
        uiStore.showMessage('密碼長度不足，更新失敗。', 'error');
    }
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

      <!-- [FIX] 修正 v-if 語法錯誤，並增加 user 存在檢查 -->
      <div v-if="isLoggedIn && user" class="flex items-center gap-4 flex-wrap justify-center sm:justify-end w-full sm:w-auto">
        <span class="text-gray-700 font-medium px-3 py-1 bg-gray-100 rounded-full order-first sm:order-none">
          歡迎, {{ user.nickname }} ({{ userRoleName }})
        </span>
        <!-- [NEW] 新增修改密碼按鈕 -->
        <button @click="openChangePasswordModal" class="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition duration-300 transform hover:scale-105 shadow-sm">
          修改密碼
        </button>
        <button @click="handleLogout" class="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition duration-300 transform hover:scale-105 shadow-sm">
          登出
        </button>
      </div>
    </div>
  </header>
</template>
