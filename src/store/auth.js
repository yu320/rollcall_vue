// src/store/auth.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '@/services/api';
import router from '@/router';

export const useAuthStore = defineStore('auth', () => {
  // --- State ---
  const user = ref(null); // Supabase auth user object
  const profile = ref(null); // Your public.profiles data
  const permissions = ref(new Set()); // 使用 Set 提高權限檢查效能
  const error = ref(null); // 登入或驗證過程中的錯誤訊息
  const isLoading = ref(false); // 控制登入時的載入動畫

  // --- Getters ---
  const isLoggedIn = computed(() => !!user.value);
  const userRole = computed(() => profile.value?.roles?.name || null);
  const userNickname = computed(() => profile.value?.nickname || user.value?.email?.split('@')[0] || '使用者');
  
  // 權限檢查函式
  const hasPermission = (permissionName) => {
    // 管理員 (admin) 擁有所有權限
    if (userRole.value === 'admin') {
      return true;
    }
    return permissions.value.has(permissionName);
  };

  // --- Actions ---

  /**
   * 處理使用者登入
   * @param {object} credentials - { email, password }
   */
  const login = async (credentials) => {
    isLoading.value = true;
    error.value = null;
    try {
      const { user: authUser } = await api.login(credentials);
      await fetchUserProfile(authUser.id);
      router.push({ name: 'Overview' }); // 登入成功後導向總覽頁面
    } catch (e) {
      error.value = e.message;
      user.value = null;
      profile.value = null;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 處理使用者登出
   */
  const logout = async () => {
    await api.logout();
    user.value = null;
    profile.value = null;
    permissions.value.clear();
    router.push({ name: 'Login' });
  };

  /**
   * 獲取並設定使用者資料和權限
   * @param {string} userId - 使用者 ID
   */
  const fetchUserProfile = async (userId) => {
    if (!userId) return;
    try {
        const userProfile = await api.getUserProfile(userId);
        profile.value = userProfile;

        // 從 userProfile 中提取並設定權限
        const userPermissions = await api.getPermissionsForRole(userProfile.role_id);
        permissions.value = new Set(userPermissions.map(p => p.name));
    } catch (e) {
        console.error("無法獲取使用者資料:", e);
        // 如果獲取資料失敗，強制登出以策安全
        await logout();
    }
  };
  
  /**
   * 檢查當前 session，用於應用程式初始化
   */
  const checkSession = async () => {
      isLoading.value = true;
      try {
          const session = await api.getSession();
          if (session?.user) {
              user.value = session.user;
              await fetchUserProfile(session.user.id);
          } else {
              user.value = null;
              profile.value = null;
          }
      } catch (e) {
          console.error("Session check failed:", e);
          user.value = null;
          profile.value = null;
      } finally {
          isLoading.value = false;
      }
  };


  return {
    user,
    profile,
    isLoggedIn,
    userRole,
    userNickname,
    error,
    isLoading,
    login,
    logout,
    checkSession,
    hasPermission,
  };
});
