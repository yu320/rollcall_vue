<template>
  <header class="bg-white shadow-lg">
    <div class="container mx-auto px-4 py-5 flex flex-wrap justify-between items-center gap-4">
      <div class="flex items-center">
        <img :src="logoUrl" alt="簽到系統Logo" class="h-12 w-12 rounded-full shadow-md mr-4">
        <div>
          <h1 class="text-3xl md:text-4xl font-extrabold text-indigo-800">點名系統</h1>
          <p class="text-gray-500 text-sm md:text-base mt-1">使用前要匯入名單&創建活動</p>
        </div>
      </div>

      <div v-if="isLoggedIn && user" class="flex items-center gap-4 flex-wrap justify-center sm:justify-end w-full sm:w-auto">
        <span class="text-gray-700 font-medium px-3 py-1 bg-gray-100 rounded-full order-first sm:order-none">
          歡迎, {{ user.nickname }} ({{ userRoleName }})
        </span>
        <!-- [MODIFIED] Button style to match old version -->
        <button @click="openChangePasswordModal" class="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition duration-300 transform hover:scale-105 shadow-sm">
          修改我的密碼
        </button>
        <button @click="handleLogout" class="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition duration-300 transform hover:scale-105 shadow-sm">
          登出
        </button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue';
import { useAuthStore } from '@/store/auth';
import { useUiStore } from '@/store/ui';
import logoUrl from '@/assets/logo.jpg';
import { USER_ROLE_NAMES } from '@/utils/constants'; // 確保引入 USER_ROLE_NAMES

const authStore = useAuthStore();
const uiStore = useUiStore();

const isLoggedIn = computed(() => authStore.isLoggedIn);
const user = computed(() => authStore.user);

// 修正 userRoleName，使其從映射中獲取中文名稱
const userRoleName = computed(() => {
  const roleKey = authStore.user?.roles?.name; // 獲取原始角色名稱，例如 'admin'
  return USER_ROLE_NAMES[roleKey] || roleKey || '未知'; // 從映射中查找，如果找不到則顯示原始值
});

const handleLogout = () => {
  authStore.logout();
};

const openChangePasswordModal = () => {
    // Emit an event that the root component (App.vue) can listen to
    const event = new CustomEvent('open-change-password-modal');
    window.dispatchEvent(event);
};
</script>
