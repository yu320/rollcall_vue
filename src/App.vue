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
import { useAuthStore } from '@/store/auth'; // 引入認證狀態管理 Pinia Store
import { useUiStore } from '@/store/ui';     // 引入 UI 狀態管理 Pinia Store
import AppHeader from '@/components/AppHeader.vue';         // 引入應用程式頁首組件
import AppNav from '@/components/AppNav.vue';               // 引入應用程式導覽列組件
import LoadingOverlay from '@/components/LoadingOverlay.vue'; // 引入載入遮罩組件
import MessageBox from '@/components/MessageBox.vue';         // 引入訊息提示框組件
import Modal from '@/components/Modal.vue';                 // 引入通用彈窗組件
import { INACTIVITY_LOGOUT_TIME, INACTIVITY_WARNING_TIME } from '@/utils/constants'; // 引入常數

// 獲取 Pinia Store 實例
const authStore = useAuthStore();
const uiStore = useUiStore();

// --- 個人資料修改彈窗的狀態變數 ---
const isProfileModalOpen = ref(false); // 控制個人資料修改彈窗的顯示與隱藏
const profileData = reactive({         // 用於表單綁定的個人資料（暱稱、新密碼、確認密碼）
  nickname: '',
  newPassword: '',
  confirmPassword: ''
});
const errors = reactive({              // 用於密碼驗證的錯誤訊息
  weak: '',
  mismatch: ''
});

// --- 閒置計時器和警告彈窗的狀態變數 ---
let warningTimer = null; // 修正：只保留一個主要計時器
let countdownInterval = null;
const isWarningModalOpen = ref(false);
const inactivityCountdown = ref(INACTIVITY_WARNING_TIME / 1000);
const isInteractionLocked = ref(false);

/**
 * 重置所有閒置計時器。
 * 只有在互動未被鎖定（即警告彈窗未開啟）時才執行重置。
 */
const resetTimers = () => {
    // 如果互動被鎖定 (警告彈窗已開啟)，則忽略任何活動，不重置計時器
    if (isInteractionLocked.value) {
        return; 
    }

    // 清除所有現有的計時器和倒數
    clearTimeout(warningTimer);
    clearInterval(countdownInterval); 
    isWarningModalOpen.value = false; // 確保警告彈窗關閉
    inactivityCountdown.value = INACTIVITY_WARNING_TIME / 1000; // 重置倒數計時

    // 設定單一的閒置警告計時器
    // 它會在 INACTIVITY_LOGOUT_TIME - INACTIVITY_WARNING_TIME 後觸發
    const timeUntilWarning = INACTIVITY_LOGOUT_TIME - INACTIVITY_WARNING_TIME;
    
    // 確保警告時間間隔為非負數
    if (timeUntilWarning >= 0) {
        warningTimer = setTimeout(() => {
            // 只有在使用者登入且警告彈窗未開啟時才顯示警告
            if (authStore.isLoggedIn && !isWarningModalOpen.value) {
                isWarningModalOpen.value = true;
                isInteractionLocked.value = true; // 鎖定互動，防止背景活動重置計時器
                
                // 開始警告彈窗內的倒數計時
                countdownInterval = setInterval(() => {
                    if (inactivityCountdown.value > 0) {
                        inactivityCountdown.value--;
                    } else {
                        // 當倒數結束時，直接呼叫登出函式
                        clearInterval(countdownInterval); 
                        authStore.logout();
                    }
                }, 1000);
            }
        }, timeUntilWarning); 
    } else {
        console.warn('[App.vue] INACTIVITY_WARNING_TIME 大於 INACTIVITY_LOGOUT_TIME。警告將不會顯示。');
        // 為了確保至少能登出，如果警告時間設定有問題，就直接使用總登出時間
        warningTimer = setTimeout(() => {
            if (authStore.isLoggedIn) {
                authStore.logout();
            }
        }, INACTIVITY_LOGOUT_TIME);
    }
};

/**
 * 設定活動事件監聽器，用於監測使用者活動並重置計時器。
 */
const setupActivityListeners = () => {
    window.addEventListener('mousemove', resetTimers);   // 滑鼠移動
    window.addEventListener('mousedown', resetTimers);   // 滑鼠點擊
    window.addEventListener('keypress', resetTimers);    // 鍵盤輸入
    window.addEventListener('scroll', resetTimers);      // 滾動頁面
    window.addEventListener('touchstart', resetTimers);  // 觸控螢幕觸摸
};

/**
 * 移除所有活動事件監聽器。
 */
const removeActivityListeners = () => {
    window.removeEventListener('mousemove', resetTimers);
    window.removeEventListener('mousedown', resetTimers);
    window.removeEventListener('keypress', resetTimers);
    window.removeEventListener('scroll', resetTimers);
    window.removeEventListener('touchstart', resetTimers);
};

/**
 * 處理警告彈窗中「繼續留在此頁」按鈕點擊事件。
 * 重置計時器並關閉警告彈窗。
 */
const handleStayLoggedIn = () => {
    isInteractionLocked.value = false; // 解鎖互動，允許背景活動重置計時器
    resetTimers(); // 重置計時器並關閉彈窗
};

/**
 * 處理警告彈窗中「立即登出」按鈕點擊事件。
 * 強制登出使用者。
 */
const handleLogoutNow = () => {
    clearTimeout(warningTimer);      // 清除自動登出計時器
    clearInterval(countdownInterval); // 清除倒數計時
    isWarningModalOpen.value = false; // 立即關閉警告彈窗
    isInteractionLocked.value = false; // 解鎖互動

    // 呼叫認證 Store 的登出方法，執行實際的登出和頁面跳轉
    authStore.logout()
        .catch(error => {
            console.error('[App.vue] authStore.logout() 發生錯誤:', error);
            uiStore.showMessage(`登出失敗: ${error.message}`, 'error');
        });
};

// 監聽認證狀態 (isLoggedIn) 的變化，以啟動或停止閒置計時器
watch(() => authStore.isLoggedIn, (newVal) => {
    if (newVal) { // 如果使用者登入
        setupActivityListeners(); // 設定活動監聽器
        resetTimers();            // 啟動計時器
    } else {      // 如果使用者登出
        removeActivityListeners(); // 移除活動監聽器
        clearTimeout(warningTimer);   // 清除所有計時器
        clearInterval(countdownInterval);
        isWarningModalOpen.value = false; // 確保警告彈窗關閉
        isInteractionLocked.value = false; // 確保互動解鎖
    }
}, { immediate: true }); // 在組件掛載時立即執行一次，以設定初始狀態

// --- 個人資料修改彈窗的邏輯 ---
/**
 * 開啟個人資料修改彈窗。
 */
const openProfileModal = () => {
    // 用當前使用者暱稱填充表單，並清空密碼欄位
    profileData.nickname = authStore.user?.nickname || '';
    profileData.newPassword = '';
    profileData.confirmPassword = '';
    Object.assign(errors, { weak: '', mismatch: '' }); // 清空所有錯誤訊息
    isProfileModalOpen.value = true; // 顯示彈窗
};

/**
 * 關閉個人資料修改彈窗。
 */
const closeProfileModal = () => {
    isProfileModalOpen.value = false; // 隱藏彈窗
};

/**
 * 處理個人資料更新的表單提交。
 */
const handleUpdateProfile = async () => {
    Object.assign(errors, { weak: '', mismatch: '' }); // 清空錯誤訊息
    let isValid = true;

    // 僅在新密碼有輸入時才進行密碼驗證
    if (profileData.newPassword) {
        if (profileData.newPassword.length < 6) {
            errors.weak = '新密碼長度至少需要6位';
            isValid = false;
        }
        if (profileData.newPassword !== profileData.confirmPassword) {
            errors.mismatch = '新密碼與確認密碼不符';
            isValid = false;
        }
    }

    if (!isValid) return; // 如果驗證失敗，則停止執行

    // 呼叫認證 Store 的方法來更新個人資料
    const success = await authStore.updateUserProfile(profileData.nickname, profileData.newPassword);
    if (success) {
        closeProfileModal(); // 更新成功後關閉彈窗
    }
};

// 在組件掛載時，監聽來自 AppHeader 的自定義事件，以開啟個人資料修改彈窗
onMounted(() => {
    window.addEventListener('open-profile-modal', openProfileModal);
});

// 在組件卸載時，移除事件監聽器，防止記憶體洩漏
onUnmounted(() => {
    window.removeEventListener('open-profile-modal', openProfileModal);
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
