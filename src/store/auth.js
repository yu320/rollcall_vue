// src/store/auth.js

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import * as api from '@/services/api';
import router from '@/router';
import { useUiStore } from './ui';
import { DEFAULT_EMAIL_DOMAIN, USER_ROLE_NAMES } from '@/utils/constants';

export const useAuthStore = defineStore('auth', () => {
  const uiStore = useUiStore();

  const user = ref(null);
  const userPermissions = ref(new Set());
  const loading = ref(false); 
  const isInitialized = ref(false);
  const error = ref(null); 

  const isLoggedIn = computed(() => !!user.value);
  // 修正 userRoleName，使其從映射中獲取中文名稱
  const userRoleName = computed(() => {
    const roleKey = user.value?.roles?.name; // 獲取原始角色名稱，例如 'admin'
    return USER_ROLE_NAMES[roleKey] || roleKey || '未知'; // 從映射中查找，如果找不到則顯示原始值
  });

  const hasPermission = (permissionName) => {
    return userPermissions.value.has(permissionName);
  };

    // [新增 signUp 動作]
  async function signUp(credentials) {
    loading.value = true;
    error.value = null;
    try {
      await api.signUp(credentials);
      uiStore.showMessage('註冊成功！請檢查您的電子郵件以進行驗證，然後即可登入。', 'success');
      router.push('/login');
    } catch (e) {
      error.value = e.message;
      uiStore.showMessage(`註冊失敗: ${e.message}`, 'error');
    } finally {
      loading.value = false;
    }
  }

  /**
   * 處理使用者登入。
   * @param {string} email
   * @param {string} password
   */
  async function login(email, password) {
    loading.value = true;
    error.value = null; 
    //console.log('Auth Store: Login initiated, loading = true'); 
    try {
      let finalEmail = email;
      if (email && !email.includes('@')) {
        finalEmail = email + DEFAULT_EMAIL_DOMAIN;
      }

      const { user: authUser } = await api.login(finalEmail, password);
      if (authUser) {
        await fetchUserProfile(authUser.id);
        router.push('/');
        uiStore.showMessage('登入成功！', 'success');
      }
    } catch (e) {
      error.value = '使用者名稱或密碼錯誤'; 
      uiStore.showMessage(`登入失敗: ${e.message}`, 'error');
    } finally {
      loading.value = false;
      //console.log('Auth Store: Login finished, loading = false'); 
    }
  }

  async function logout() {
    uiStore.setLoading(true);
    try {
      await api.logout();
      user.value = null;
      userPermissions.value.clear();
      router.push('/login');
      uiStore.showMessage('您已成功登出。');
    } catch (e) { // 已修正: 將不正確的箭頭函數賦值替換為正確的 catch 區塊
      uiStore.showMessage(`登出時發生錯誤: ${e.message}`, 'error');
    } finally {
      uiStore.setLoading(false);
    }
  }

  async function fetchUserProfile(userId) {
    try {
        const profile = await api.getUserProfile(userId);
        user.value = profile;

        const permissions = new Set();
        if (profile?.roles?.role_permissions) {
          profile.roles.role_permissions.forEach(rp => {
            if (rp.permissions?.name) {
                permissions.add(rp.permissions.name);
            }
          });
        }
        userPermissions.value = permissions;
    } catch (e) {
        console.error('無法獲取使用者資料:', e);
        await logout();
    }
  }

  async function checkInitialAuth() {
    try {
      loading.value = true;
      //console.log('Auth Store: checkInitialAuth started, loading = true'); 
      const session = await api.getSession();
      if (session) {
        await fetchUserProfile(session.user.id);
      }
    } catch (e) {
      console.error('檢查初始登入狀態失敗:', e);
      user.value = null;
      userPermissions.value.clear();
    } finally {
      loading.value = false;
      isInitialized.value = true;
      //console.log('Auth Store: checkInitialAuth finished, loading = false, isInitialized = true'); 
    }
  }
  
  // [MODIFIED] Changed from changePassword to updateUserProfile
  async function updateUserProfile(nickname, newPassword) {
    uiStore.setLoading(true);
    try {
        // [FIXED] Pass payload as an object to the API function
        const payload = { nickname: nickname };
        if (newPassword) {
            payload.password = newPassword;
        }
        await api.updateUserProfile(user.value.id, payload);
        
        // If nickname changed, update the user object in store
        if (user.value) {
            user.value.nickname = nickname;
        }
        uiStore.showMessage('個人資料已成功更新！', 'success');
        return true;
    } catch (e) {
        uiStore.showMessage(`更新個人資料失敗: ${e.message}`, 'error');
        return false;
    } finally {
        uiStore.setLoading(false);
    }
  }

  return {
    user,
    loading,
    error, 
    isInitialized,
    isLoggedIn,
    userRoleName,
    userPermissions,
    hasPermission,
    signUp,
    login,
    logout,
    fetchUserProfile, // [FIXED] Expose fetchUserProfile
    checkInitialAuth,
    updateUserProfile, // [MODIFIED] Expose updateUserProfile
  };
});
