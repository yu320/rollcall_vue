<template>
  <div v-if="authStore.isLoggedIn" class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
    <AppHeader />
    <AppNav />
    <main id="mainContent" class="container mx-auto px-4 py-8">
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

  <!-- Personal Profile / Change Password Modal -->
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

  <!-- Global Confirmation Modal -->
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

  <!-- Inactivity Warning Modal (Vue version of the HTML one) -->
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
import AppHeader from '@/components/AppHeader.vue';
import AppNav from '@/components/AppNav.vue';
import LoadingOverlay from '@/components/LoadingOverlay.vue';
import MessageBox from '@/components/MessageBox.vue';
import Modal from '@/components/Modal.vue';
import { INACTIVITY_LOGOUT_TIME, INACTIVITY_WARNING_TIME } from '@/utils/constants'; // Import constants

const authStore = useAuthStore();
const uiStore = useUiStore();

// State for the personal profile modal
const isProfileModalOpen = ref(false); // Renamed from isChangePasswordModalOpen
const profileData = reactive({ // Renamed from passwords
  nickname: '',
  newPassword: '',
  confirmPassword: ''
});
const errors = reactive({
  weak: '',
  mismatch: ''
});

// Inactivity timers and warning modal
let logoutTimer = null;
let warningTimer = null;
let countdownInterval = null; // For the countdown display
const isWarningModalOpen = ref(false); // Controls visibility of the warning modal
const inactivityCountdown = ref(INACTIVITY_WARNING_TIME / 1000); // Initial countdown value
const isInteractionLocked = ref(false); // NEW: Controls if background activity can reset timers


const resetTimers = () => {
    // Only reset if interaction is not locked (i.e., warning modal is NOT open)
    if (isInteractionLocked.value) {
        // console.log('[App.vue] Interaction locked, ignoring activity.'); // Debugging: Confirming it ignores
        return; 
    }

    // console.log('[App.vue] Resetting timers...'); // Keep for debugging
    clearTimeout(logoutTimer);
    clearTimeout(warningTimer);
    clearInterval(countdownInterval); // Clear countdown
    isWarningModalOpen.value = false; // Ensure warning modal is closed
    inactivityCountdown.value = INACTIVITY_WARNING_TIME / 1000; // Reset countdown

    // Set the logout timer
    logoutTimer = setTimeout(() => {
        if (authStore.isLoggedIn) {
            console.log('[App.vue] Logout timer triggered. Attempting logout...'); // Keep for debugging
            authStore.logout();
        }
    }, INACTIVITY_LOGOUT_TIME);

    // Set the warning timer (triggers before logout)
    const timeUntilWarning = INACTIVITY_LOGOUT_TIME - INACTIVITY_WARNING_TIME;
    // console.log(`[App.vue] Warning set to trigger in ${timeUntilWarning / 1000} seconds.`); // Keep for debugging

    // Ensure timeUntilWarning is non-negative
    if (timeUntilWarning >= 0) {
        warningTimer = setTimeout(() => {
            if (authStore.isLoggedIn && !isWarningModalOpen.value) { // Ensure warning is not already open
                console.log('[App.vue] Warning timer triggered. Showing warning modal...'); // Keep for debugging
                isWarningModalOpen.value = true; // Open the warning modal
                isInteractionLocked.value = true; // NEW: Lock interaction when warning is shown

                // Start countdown inside modal
                countdownInterval = setInterval(() => {
                    if (inactivityCountdown.value > 0) {
                        inactivityCountdown.value--;
                    } else {
                        clearInterval(countdownInterval);
                    }
                }, 1000);
            }
        }, timeUntilWarning); 
    } else {
        console.warn('[App.vue] INACTIVITY_WARNING_TIME is greater than INACTIVITY_LOGOUT_TIME. Warning will not be shown.');
    }
};

// Activity event listeners
const setupActivityListeners = () => {
    //console.log('[App.vue] Setting up activity listeners.'); // Keep for debugging
    window.addEventListener('mousemove', resetTimers);
    window.addEventListener('mousedown', resetTimers);
    window.addEventListener('keypress', resetTimers);
    window.addEventListener('scroll', resetTimers);
    window.addEventListener('touchstart', resetTimers); // For touch devices
};

const removeActivityListeners = () => {
    //console.log('[App.vue] Removing activity listeners.'); // Keep for debugging
    window.removeEventListener('mousemove', resetTimers);
    window.removeEventListener('mousedown', resetTimers);
    window.removeEventListener('keypress', resetTimers);
    window.removeEventListener('scroll', resetTimers);
    window.removeEventListener('touchstart', resetTimers);
};

// Handle "Stay Logged In" button click inside the warning modal
const handleStayLoggedIn = () => {
    //console.log('[App.vue] User chose to stay logged in. Resetting timers...'); // Keep for debugging
    isInteractionLocked.value = false; // NEW: Unlock interaction
    resetTimers(); // User clicks "保持登入", reset timers and close modal
};

// Handle "Logout Now" button click inside the warning modal
const handleLogoutNow = () => {
    //console.log('[App.vue] User chose to logout now. Initiating logout process...'); // Keep for debugging
    clearTimeout(logoutTimer); // Clear pending automatic logout
    clearInterval(countdownInterval); // Clear countdown
    isWarningModalOpen.value = false; // Close the warning modal immediately
    isInteractionLocked.value = false; // NEW: Unlock interaction

    // Call authStore.logout to perform actual logout and redirection
    // authStore.logout handles its own loading state, messages, and redirection.
    authStore.logout()
        .then(() => {
            //console.log('[App.vue] authStore.logout() resolved successfully. User should be redirected.');
        })
        .catch(error => {
            console.error('[App.vue] authStore.logout() rejected with error:', error);
            uiStore.showMessage(`登出失敗: ${error.message}`, 'error');
        });
};

// Listen for auth state changes to start/stop timers
watch(() => authStore.isLoggedIn, (newVal) => {
    if (newVal) {
        //console.log('[App.vue] User logged in. Starting timers.'); // Keep for debugging
        setupActivityListeners();
        resetTimers(); // Start timers on login
    } else {
        //console.log('[App.vue] User logged out. Stopping timers.'); // Keep for debugging
        removeActivityListeners();
        clearTimeout(logoutTimer);
        clearTimeout(warningTimer);
        clearInterval(countdownInterval); // Clear countdown
        isWarningModalOpen.value = false; // Ensure warning modal is closed
        isInteractionLocked.value = false; // NEW: Ensure interaction is unlocked on logout
    }
}, { immediate: true }); // Run immediately on mount to set initial state


// Personal Profile Modal Logic
const openProfileModal = () => { // Renamed from openChangePasswordModal
    // Populate profile data with current user's nickname
    profileData.nickname = authStore.user?.nickname || '';
    profileData.newPassword = '';
    profileData.confirmPassword = '';
    Object.assign(errors, { weak: '', mismatch: '' });
    isProfileModalOpen.value = true;
};

const closeProfileModal = () => { // Renamed from closeChangePasswordModal
    isProfileModalOpen.value = false;
};

const handleUpdateProfile = async () => { // Renamed from handleChangePassword
    Object.assign(errors, { weak: '', mismatch: '' });
    let isValid = true;

    if (profileData.newPassword) { // Only validate password if a new one is provided
        if (profileData.newPassword.length < 6) {
            errors.weak = '新密碼長度至少需要6位';
            isValid = false;
        }
        if (profileData.newPassword !== profileData.confirmPassword) {
            errors.mismatch = '新密碼與確認密碼不符';
            isValid = false;
        }
    }

    if (!isValid) return;

    // Call authStore to update profile
    const success = await authStore.updateUserProfile(profileData.nickname, profileData.newPassword);
    if (success) {
        closeProfileModal();
    }
};

// Listen for the custom event dispatched from AppHeader (for opening profile modal)
onMounted(() => {
    window.addEventListener('open-profile-modal', openProfileModal); // Renamed event
});

onUnmounted(() => {
    window.removeEventListener('open-profile-modal', openProfileModal); // Renamed event
});
</script>

<style>
/* CSS transition for Vue's <transition name="modal-fade"> */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

/* CSS for the modal card's transform transition (when used with <Transition name="modal-fade"> directly on the outer div) */
/* This ensures the scale/opacity transition works for the modal content as well */
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
