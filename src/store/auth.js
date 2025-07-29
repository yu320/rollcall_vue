// src/store/auth.js

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
// [FIX] 使用 `import * as api` 來將所有導出的函式集合到 `api` 物件中
import * as api from '@/services/api';
import router from '@/router';

export const useAuthStore = defineStore('auth', () => {
  // --- State ---
  const user = ref(null);
  const userPermissions = ref(new Set());
  const loading = ref(true); // 用於追蹤初始 session 檢查狀態

  // --- Getters ---
  const isLoggedIn = computed(() => !!user.value);
  const userRoleName = computed(() => user.value?.roles?.name || '未知');

  /**
   * 檢查使用者是否擁有特定權限
   * @param {string} permissionName - 權限名稱 (e.g., 'personnel:create')
   * @returns {boolean}
   */
  const hasPermission = (permissionName) => {
    return userPermissions.value.has(permissionName);
  };

  // --- Actions ---

  /**
   * 登入
   * @param {string} email
   * @param {string} password
   */
  async function login(email, password) {
    // [FIX] 使用 api.login
    const { user: authUser } = await api.login(email, password);
    if (authUser) {
      await fetchUserProfile(authUser.id);
      router.push('/'); // 登入成功後導向首頁
    }
  }

  /**
   * 登出
   */
  async function logout() {
    // [FIX] 使用 api.logout
    await api.logout();
    user.value = null;
    userPermissions.value.clear();
    router.push('/login'); // 登出後導向登入頁
  }

  /**
   * 獲取並設定使用者資料及權限
   * @param {string} userId
   */
  async function fetchUserProfile(userId) {
    // [FIX] 使用 api.getUserProfile
    const profile = await api.getUserProfile(userId);
    user.value = profile;

    // 解析並設定權限
    const permissions = new Set();
    if (profile?.roles?.role_permissions) {
      profile.roles.role_permissions.forEach(rp => {
        permissions.add(rp.permissions.name);
      });
    }
    userPermissions.value = permissions;
  }

  /**
   * 檢查初始登入狀態
   */
  async function checkInitialAuth() {
    try {
      loading.value = true;
      // [FIX] 使用 api.getSession
      const session = await api.getSession();
      if (session) {
        await fetchUserProfile(session.user.id);
      }
    } catch (error) {
      console.error('檢查初始登入狀態失敗:', error);
      user.value = null;
      userPermissions.value.clear();
    } finally {
      loading.value = false;
    }
  }

  return {
    user,
    loading,
    isLoggedIn,
    userRoleName,
    hasPermission,
    login,
    logout,
    checkInitialAuth,
  };
}, {
  persist: true, // 使用 pinia-plugin-persistedstate 將狀態儲存在 localStorage
});
