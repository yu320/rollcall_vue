// src/store/auth.js

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import * as api from '@/services/api';
import router from '@/router';
import { useUiStore } from './ui';

export const useAuthStore = defineStore('auth', () => {
  // --- Stores ---
  const uiStore = useUiStore();

  // --- State ---
  const user = ref(null); // 存放使用者完整資料，包含角色和個人資訊
  const userPermissions = ref(new Set()); // 使用 Set 結構高效儲存和查詢權限
  const loading = ref(false); // 用於追蹤「操作中」的載入狀態，如登入、登出
  const isInitialized = ref(false); // [FIX] 新增狀態，用於追蹤初始 session 檢查是否已完成

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
   * 處理使用者登入
   * @param {string} email
   * @param {string} password
   */
  async function login(email, password) {
    uiStore.setLoading(true);
    try {
      const { user: authUser } = await api.login(email, password);
      if (authUser) {
        await fetchUserProfile(authUser.id);
        router.push('/'); // 登入成功後導向首頁
        uiStore.showMessage('登入成功！', 'success');
      }
    } catch (error) {
      uiStore.showMessage(`登入失敗: ${error.message}`, 'error');
    } finally {
      uiStore.setLoading(false);
    }
  }

  /**
   * 處理使用者登出
   */
  async function logout() {
    uiStore.setLoading(true);
    try {
      await api.logout();
      user.value = null;
      userPermissions.value.clear();
      router.push('/login'); // 登出後導向登入頁
      uiStore.showMessage('您已成功登出。');
    } catch (error) {
      uiStore.showMessage(`登出時發生錯誤: ${error.message}`, 'error');
    } finally {
      uiStore.setLoading(false);
    }
  }

  /**
   * 從資料庫獲取使用者完整的個人資料，包含角色和所有權限
   * @param {string} userId
   */
  async function fetchUserProfile(userId) {
    try {
        const profile = await api.getUserProfile(userId);
        user.value = profile;

        // 解析並設定權限
        const permissions = new Set();
        if (profile?.roles?.role_permissions) {
          profile.roles.role_permissions.forEach(rp => {
            if (rp.permissions?.name) {
                permissions.add(rp.permissions.name);
            }
          });
        }
        userPermissions.value = permissions;
    } catch (error) {
        console.error('無法獲取使用者資料:', error);
        // 如果獲取失敗，則強制登出，避免使用者處於不確定的登入狀態
        await logout();
    }
  }

  /**
   * 在應用程式啟動時，檢查使用者是否仍保有有效的 session
   */
  async function checkInitialAuth() {
    try {
      loading.value = true;
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
      isInitialized.value = true; // [FIX] 標記為已完成初始檢查
    }
  }
  
  /**
   * 處理修改密碼
   * @param {string} newPassword
   */
  async function changePassword(newPassword) {
    uiStore.setLoading(true);
    try {
        await api.updateUserPassword(newPassword);
        uiStore.showMessage('密碼已成功更新！', 'success');
        return true;
    } catch (error) {
        uiStore.showMessage(`密碼更新失敗: ${error.message}`, 'error');
        return false;
    } finally {
        uiStore.setLoading(false);
    }
  }


  return {
    user,
    loading,
    isInitialized, // [FIX] 導出狀態
    isLoggedIn,
    userRoleName,
    userPermissions,
    hasPermission,
    login,
    logout,
    checkInitialAuth,
    changePassword,
  };
});
