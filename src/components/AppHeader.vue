<template>
  <header class="bg-white shadow-lg">
    <router-link to="/" class="flex items-center cursor-pointer">
        <img :src="logoUrl" alt="簽到系統Logo" class="h-12 w-12 rounded-full shadow-md mr-4">
        <div>
          <h1 class="text-3xl md:text-4xl font-extrabold text-indigo-800">點名系統</h1>
          <p class="text-gray-500 text-sm md:text-base mt-1">使用前要匯入名單&創建活動</p>
        </div>
    </router-link>

      <div v-if="isLoggedIn && user" class="flex items-center gap-4 flex-wrap justify-center sm:justify-end w-full sm:w-auto">
        <span class="text-gray-700 font-medium px-3 py-1 bg-gray-100 rounded-full order-first sm:order-none">
          歡迎, {{ user.nickname }} ({{ userRoleName }})
        </span>
        <button @click="openEditProfileModal" class="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition duration-300 transform hover:scale-105 shadow-sm flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          修改個人資料
        </button>
        <button @click="handleLogout" class="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition duration-300 transform hover:scale-105 shadow-sm flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
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

// [MODIFIED] Renamed from openChangePasswordModal to openEditProfileModal
const openEditProfileModal = () => {
    // Emit an event that the root component (App.vue) can listen to
    // [FIXED] Event name changed to match the listener in App.vue
    const event = new CustomEvent('open-profile-modal');
    window.dispatchEvent(event);
};
</script>
