// src/store/auth.js

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import * as api from '@/services/api';
import router from '@/router';
import { useUiStore } from './ui';
import { DEFAULT_EMAIL_DOMAIN } from '@/utils/constants';
import { USER_ROLE_NAMES } from '@/utils/constants';

export const useAuthStore = defineStore('auth', () => {
  const uiStore = useUiStore();

  const user = ref(null);
  const userPermissions = ref(new Set());
  const loading = ref(false);
  const isInitialized = ref(false);
  const error = ref(null);

  const isLoggedIn = computed(() => !!user.value);
  const userRoleName = computed(() => {
    const roleKey = user.value?.roles?.name;
    return USER_ROLE_NAMES[roleKey] || roleKey || '未知';
  });

  const hasPermission = (permissionName) => {
    // 確保在權限集合載入前不會出錯
    if (!isInitialized.value) {
        console.warn(`Permission check for '${permissionName}' failed: Auth store is not initialized.`);
        return false;
    }
    // 確保 user 存在
    if (!user.value || !user.value.roles) {
        console.warn(`Permission check for '${permissionName}' failed: User or role is missing.`);
        return false;
    }

    // superadmin 擁有所有權限
    if (user.value.roles.name === 'superadmin') {
        return true;
    }
    
    // 檢查權限集合
    return userPermissions.value.has(permissionName);
  };

  async function login(email, password) {
    loading.value = true;
    error.value = null;
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
      error.value = e.message || '使用者名稱或密碼錯誤';
      uiStore.showMessage(`登入失敗: ${error.value}`, 'error');
    } finally {
      loading.value = false;
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
    } catch (e) {
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
        // 確保角色和權限數據存在，防止因空值而崩潰
        if (profile?.roles?.role_permissions && Array.isArray(profile.roles.role_permissions)) {
          profile.roles.role_permissions.forEach(rp => {
            if (rp.permissions?.name) {
                permissions.add(rp.permissions.name);
            }
          });
        }
        userPermissions.value = permissions;
        // console.log("User fetched and permissions set:", permissions);
    } catch (e) {
        console.error('無法獲取使用者資料:', e);
        // 如果獲取失敗，強制登出以防意外
        await logout();
    }
  }

  async function checkInitialAuth() {
    try {
      loading.value = true;
      const session = await api.getSession();
      if (session) {
        await fetchUserProfile(session.user.id);
      } else {
        user.value = null;
        userPermissions.value.clear();
      }
    } catch (e) {
      console.error('檢查初始登入狀態失敗:', e);
      user.value = null;
      userPermissions.value.clear();
    } finally {
      loading.value = false;
      isInitialized.value = true;
    }
  }
  
  async function updateUserProfile(nickname, newPassword) {
    uiStore.setLoading(true);
    try {
        const payload = { nickname: nickname };
        if (newPassword) {
            payload.password = newPassword;
        }
        await api.updateUserProfile(user.value.id, payload);
        
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
    login,
    logout,
    fetchUserProfile,
    checkInitialAuth,
    updateUserProfile,
  };
});
