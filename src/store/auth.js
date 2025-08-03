import { defineStore } from 'pinia';
import { supabase } from '@/services/supabase';
import router from '@/router';
import * as api from '@/services/api';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    permissions: [],
    isInitialized: false, // 用於追蹤身份驗證是否已完成初始化
  }),

  getters: {
    isLoggedIn: (state) => !!state.user,
    /**
     * 檢查使用者是否有權限查看某個頁面 (用於 AppNav.vue)
     * @param {object} state - Pinia state
     * @returns {function(string): boolean}
     */
    canView: (state) => (page) => {
      // [修改] 增加保護，確保在初始化完成後才進行權限檢查
      if (!state.isInitialized) {
        console.warn(`Permission check for '${page}' failed: Auth store is not initialized.`);
        return false;
      }
      return state.permissions.includes(page);
    },
    /**
     * 檢查使用者是否有某項特定權限 (用於元件內部)
     * @param {object} state - Pinia state
     * @returns {function(string): boolean}
     */
    hasPermission: (state) => (permission) => {
      if (!state.isInitialized) {
        console.warn(`Permission check for '${permission}' failed: Auth store is not initialized.`);
        return false;
      }
      return state.permissions.includes(permission);
    },
  },

  actions: {
    /**
     * 檢查初始的身份驗證狀態。
     * 這是應用程式啟動時最重要的函式之一。
     */
    async checkInitialAuth() {
      return new Promise((resolve) => {
        supabase.auth.onAuthStateChange(async (event, session) => {
          // [核心修改] 增加更完整的 session 處理邏輯
          try {
            if (event === 'SIGNED_OUT' || !session) {
              // 如果使用者登出或 session 無效 (例如 token 過期且無法刷新)
              this.user = null;
              this.permissions = [];
              // 如果目前不在登入頁，則導向到登入頁
              if (router.currentRoute.value.name !== 'Login') {
                router.push({ name: 'Login' });
              }
            } else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
              // 如果成功登入、初始化或刷新 token
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                const profile = await api.fetchUserProfile(user.id);
                if (profile) {
                  this.user = { ...user, ...profile };
                  this.permissions = profile.permissions || [];
                } else {
                  // 雖然有 Supabase user，但找不到對應的 profile，視為異常並登出
                  console.error("User exists in Supabase auth but profile is missing.");
                  await this.logout();
                }
              } else {
                // 理論上 session 存在時 user 應該也存在，但作為保護措施
                this.user = null;
                this.permissions = [];
              }
            }
          } catch (error) {
              console.error("Error during onAuthStateChange handling:", error);
              // 發生任何錯誤都強制登出，以確保安全
              this.user = null;
              this.permissions = [];
          } finally {
            // 無論結果如何，只要這個回調被觸發過，就代表初始化已完成
            if (!this.isInitialized) {
              this.isInitialized = true;
            }
            resolve();
          }
        });
      });
    },

    async login(email, password) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      
      const profile = await api.fetchUserProfile(data.user.id);
      if (profile) {
        this.user = { ...data.user, ...profile };
        this.permissions = profile.permissions || [];
        router.push({ name: 'Overview' });
        return true;
      } else {
        await this.logout();
        throw new Error('無法獲取使用者設定檔，請聯繫管理員。');
      }
    },

    async logout() {
      await supabase.auth.signOut();
      this.user = null;
      this.permissions = [];
      // 使用 replace 避免使用者可以透過瀏覽器的「上一頁」回到需要登入的頁面
      router.replace({ name: 'Login' });
    },

    async register(email, password, nickname, registrationCode) {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, nickname, registrationCode }),
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || '註冊失敗');
        }
        return result;
    },
    
    async updateUserProfile(nickname, newPassword) {
      try {
        const updates = {};
        if (nickname && nickname !== this.user.nickname) {
          updates.data = { nickname };
        }
        if (newPassword) {
          updates.password = newPassword;
        }

        const { error } = await supabase.auth.updateUser(updates);
        if (error) throw error;

        if (updates.data) {
          this.user.nickname = nickname;
        }
        return true;
      } catch (error) {
        console.error('更新個人資料失敗:', error);
        return false;
      }
    },
  },
});
