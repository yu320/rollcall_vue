<template>
  <!-- 頁首容器 -->
  <header class="bg-white shadow-lg">
    <div class="container mx-auto px-4 py-5 flex flex-wrap justify-between items-center gap-4">
      <!-- Logo 和標題 -->
      <div class="flex items-center">
        <img src="/images/logo.jpg" alt="簽到系統Logo" class="h-12 w-12 rounded-full shadow-md mr-4">
        <div>
          <h1 class="text-3xl md:text-4xl font-extrabold text-indigo-800">點名系統</h1>
          <p class="text-gray-500 text-sm md:text-base mt-1">使用前要匯入名單&創建活動</p>
        </div>
      </div>

      <!-- 使用者資訊和操作按鈕，只有在登入後顯示 -->
      <div v-if="authStore.isLoggedIn" class="flex items-center gap-4 flex-wrap justify-center sm:justify-end w-full sm:w-auto">
        <span class="text-gray-700 font-medium px-3 py-1 bg-gray-100 rounded-full order-first sm:order-none">
          歡迎, {{ authStore.userNickname }} ({{ authStore.userRoleDisplay }})
        </span>
        <button 
          @click="showChangePasswordModal"
          class="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition duration-300 transform hover:scale-105 shadow-sm">
          修改我的密碼
        </button>
        <button 
          @click="handleLogout" 
          class="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition duration-300 transform hover:scale-105 shadow-sm">
          登出
        </button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { useAuthStore } from '@/store/auth';
import { useRouter } from 'vue-router';

// 'defineEmits' 用於定義此元件可以觸發哪些自定義事件
const emit = defineEmits(['show-change-password']);

// 獲取 Pinia 的 auth store 實例
const authStore = useAuthStore();
// 獲取 Vue Router 實例
const router = useRouter();

// 處理登出邏輯
const handleLogout = async () => {
  await authStore.logout();
  // 登出後跳轉到登入頁面
  router.push('/login');
};

// 觸發 'show-change-password' 事件，通知父元件顯示修改密碼彈窗
const showChangePasswordModal = () => {
  emit('show-change-password');
};
</script>
