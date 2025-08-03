<template>
  <div v-if="authStore.isLoggedIn" class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 overflow-x-hidden flex flex-col">
    <AppHeader />
    <AppNav />
    
    <main id="mainContent" class="container mx-auto px-4 py-8 flex-grow">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <keep-alive>
            <component :is="Component" />
          </keep-alive>
        </transition>
      </router-view>
    </main>
    
    <footer class="bg-gray-800 py-5 mt-10 shadow-inner">
        <div class="container mx-auto px-4 text-center text-gray-400 text-sm">
            &copy; Copyright &copy; 2025 Hong. All rights Reserved
        </div>
    </footer>
  </div>

  <router-view v-else></router-view>

  <LoadingOverlay />
  <MessageBox />

  <Modal :show="isProfileModalOpen" @close="closeProfileModal">
    <template #header>修改個人資料</template>
    <form @submit.prevent="handleUpdateProfile" class="p-6">
        <div class="mb-4">
            <label for="nickname" class="block text-gray-700 font-medium mb-2">暱稱</label>
            <input type="text" id="nickname" v-model="profileData.nickname" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400">
        </div>
        <div class="mb-4">
            <label for="newPassword" class="block text-sm font-medium text-gray-700">新密碼 <span class="text-sm text-gray-500">(留空表示不修改)</span></label>
            <input type="password" id="newPassword" v-model="profileData.newPassword" minlength="6" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" placeholder="至少6位數">
            <p v-if="errors.weak" class="text-red-600 text-sm mt-1">{{ errors.weak }}</p>
        </div>
        <div class="mb-6">
            <label for="confirmNewPassword" class="block text-sm font-medium text-gray-700">確認新密碼</label>
            <input type="password" id="confirmNewPassword" v-model="profileData.confirmPassword" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400">
            <p v-if="errors.mismatch" class="text-red-600 text-sm mt-1">{{ errors.mismatch }}</p>
        </div>
        <div class="flex flex-col sm:flex-row-reverse gap-3">
            <button type="submit" class="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-lg transition duration-300 shadow-sm">儲存</button>
            <button type="button" @click="closeProfileModal" class="w-full sm:w-auto bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-6 rounded-lg transition duration-300 shadow-sm">取消</button>
        </div>
    </form>
  </Modal>

  <Modal :show="uiStore.confirmation.visible" @close="uiStore.handleCancel">
    <template #header>{{ uiStore.confirmation.title }}</template>
    <p class="text-gray-700 mb-6 text-lg">{{ uiStore.confirmation.body }}</p>
    <div class="flex flex-col sm:flex-row-reverse gap-3">
      <button 
        @click="uiStore.handleConfirm" 
        :class="[uiStore.confirmation.confirmColorClass, 'w-full sm:w-auto text-white font-medium py-2 px-6 rounded-lg transition duration-300 shadow-sm']">
        {{ uiStore.confirmation.confirmText }}
      </button>
      <button 
        @click="uiStore.handleCancel" 
        class="w-full sm:w-auto bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-6 rounded-lg transition duration-300 shadow-sm">
        取消
      </button>
    </div>
  </Modal>

  <Transition name="modal-fade">
    <div v-if="isWarningModalOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1001]">
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden transform transition-all duration-300" 
           :class="{ 'scale-95 opacity-0': !isWarningModalOpen, 'scale-100 opacity-100': isWarningModalOpen }">
        <div class="p-6 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="mx-auto h-16 w-16 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 class="text-2xl font-bold text-gray-900 mt-4 mb-2">您還在嗎？</h3>
            <p class="text-gray-700 mb-4">由於您已閒置一段時間，系統將在 <span class="font-bold">{{ inactivityCountdown }}</span> 秒後自動將您登出。</p>
            <div class="flex flex-col sm:flex-row-reverse gap-3">
                <button type="button" @click="handleStayLoggedIn" class="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-lg transition duration-300 shadow-sm">繼續留在此頁</button>
                <button type="button" @click="handleLogoutNow" class="w-full sm:w-auto bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-6 rounded-lg transition duration-300 shadow-sm">立即登出</button>
            </div>
        </div>
      </div>
    </div>
  </Transition>

</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, watch } from 'vue';
import { useAuthStore } from '@/store/auth';
import { useUiStore } from '@/store/ui';
import * as api from '@/services/api';
import { getOfflineRecords, clearOfflineRecords } from '@/utils/db';
import AppHeader from '@/components/AppHeader.vue';
import AppNav from '@/components/AppNav.vue';
import LoadingOverlay from '@/components/LoadingOverlay.vue';
import MessageBox from '@/components/MessageBox.vue';
import Modal from '@/components/Modal.vue';
import { INACTIVITY_LOGOUT_TIME, INACTIVITY_WARNING_TIME } from '@/utils/constants';

const authStore = useAuthStore();
const uiStore = useUiStore();

// --- 個人資料修改彈窗的狀態變數 ---
const isProfileModalOpen = ref(false);
const profileData = reactive({
  nickname: '',
  newPassword: '',
  confirmPassword: ''
});
const errors = reactive({
  weak: '',
  mismatch: ''
});

// --- 閒置計時器和警告彈窗的狀態變數 ---
let logoutTimer = null;
let warningTimer = null;
let countdownInterval = null;
const isWarningModalOpen = ref(false);
const inactivityCountdown = ref(INACTIVITY_WARNING_TIME / 1000);
const isInteractionLocked = ref(false);

/**
 * [新增] 同步離線資料的函式
 * 檢查本地資料庫是否有離線記錄，若有則嘗試上傳至伺服器
 */
const syncOfflineData = async () => {
  const offlineRecords = await getOfflineRecords();
  if (offlineRecords.length > 0) {
    // 避免重複觸發
    if (uiStore.isLoading) return; 

    uiStore.setLoading(true);
    uiStore.showMessage(`偵測到 ${offlineRecords.length} 筆離線記錄，正在同步...`, 'info');
    try {
      // 呼叫 API 批次儲存記錄
      await api.saveRecords(offlineRecords);
      // 成功後清空本地資料庫
      await clearOfflineRecords();
      uiStore.showMessage('離線記錄同步成功！', 'success');
    } catch (error) {
      uiStore.showMessage(`離線記錄同步失敗: ${error.message} (資料將保留在本地)`, 'error');
    } finally {
      uiStore.setLoading(false);
    }
  }
};

const resetTimers = () => {
    if (isInteractionLocked.value) return; 
    clearTimeout(logoutTimer);
    clearTimeout(warningTimer);
    clearInterval(countdownInterval); 
    isWarningModalOpen.value = false;
    inactivityCountdown.value = INACTIVITY_WARNING_TIME / 1000;

    logoutTimer = setTimeout(() => {
        if (authStore.isLoggedIn) {
            authStore.logout();
        }
    }, INACTIVITY_LOGOUT_TIME);

    const timeUntilWarning = INACTIVITY_LOGOUT_TIME - INACTIVITY_WARNING_TIME;
    
    if (timeUntilWarning >= 0) {
        warningTimer = setTimeout(() => {
            if (authStore.isLoggedIn && !isWarningModalOpen.value) {
                isWarningModalOpen.value = true;
                isInteractionLocked.value = true;
                countdownInterval = setInterval(() => {
                    if (inactivityCountdown.value > 0) {
                        inactivityCountdown.value--;
                    } else {
                        clearInterval(countdownInterval);
                    }
                }, 1000);
            }
        }, timeUntilWarning); 
    }
};

const setupActivityListeners = () => {
    window.addEventListener('mousemove', resetTimers);
    window.addEventListener('mousedown', resetTimers);
    window.addEventListener('keypress', resetTimers);
    window.addEventListener('scroll', resetTimers);
    window.addEventListener('touchstart', resetTimers);
};

const removeActivityListeners = () => {
    window.removeEventListener('mousemove', resetTimers);
    window.removeEventListener('mousedown', resetTimers);
    window.removeEventListener('keypress', resetTimers);
    window.removeEventListener('scroll', resetTimers);
    window.removeEventListener('touchstart', resetTimers);
};

const handleStayLoggedIn = () => {
    isInteractionLocked.value = false;
    resetTimers();
};

const handleLogoutNow = () => {
    clearTimeout(logoutTimer);
    clearInterval(countdownInterval);
    isWarningModalOpen.value = false;
    isInteractionLocked.value = false;
    authStore.logout();
};

watch(() => authStore.isLoggedIn, (newVal) => {
    if (newVal) {
        setupActivityListeners();
        resetTimers();
    } else {
        removeActivityListeners();
        clearTimeout(logoutTimer);
        clearTimeout(warningTimer);
        clearInterval(countdownInterval);
        isWarningModalOpen.value = false;
        isInteractionLocked.value = false;
    }
}, { immediate: true });

const openProfileModal = () => {
    profileData.nickname = authStore.user?.nickname || '';
    profileData.newPassword = '';
    profileData.confirmPassword = '';
    Object.assign(errors, { weak: '', mismatch: '' });
    isProfileModalOpen.value = true;
};

const closeProfileModal = () => {
    isProfileModalOpen.value = false;
};

const handleUpdateProfile = async () => {
    Object.assign(errors, { weak: '', mismatch: '' });
    let isValid = true;

    if (profileData.newPassword) {
        if (profileData.newPassword.length < 6) {
            errors.weak = '新密碼長度至少需要6位';
            isValid = false;
        }
        if (profileData.newPassword !== profileData.confirmPassword) {
            errors.mismatch = '新密碼與確認密碼不相符';
            isValid = false;
        }
    }

    if (!isValid) return;

    const success = await authStore.updateUserProfile(profileData.nickname, profileData.newPassword);
    if (success) {
        closeProfileModal();
    }
};

onMounted(() => {
    window.addEventListener('open-profile-modal', openProfileModal);
    
    // [新增] 監聽網路連線事件，當網路恢復時觸發同步
    window.addEventListener('online', syncOfflineData);

    // [新增] 應用程式啟動時，如果網路在線，也檢查一次是否有待同步資料
    if (navigator.onLine) {
      syncOfflineData();
    }
});

onUnmounted(() => {
    window.removeEventListener('open-profile-modal', openProfileModal);
    // [新增] 元件銷毀時移除網路事件監聽器
    window.removeEventListener('online', syncOfflineData);
});
</script>

<style>
/* Vue Transition 的 CSS 過渡效果 (用於彈窗的淡入淡出) */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

/* 彈窗卡片本身的變形過渡效果 */
.modal-fade-enter-active > div,
.modal-fade-leave-active > div {
  transition: transform 0.3s ease-out, opacity 0.3s ease-out;
}

.modal-fade-enter-from > div {
  transform: scale(0.95);
  opacity: 0;
}
.modal-fade-leave-to > div {
  transform: scale(0.95);
  opacity: 0;
}
</style>