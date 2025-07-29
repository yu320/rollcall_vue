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

  <!-- [MODIFIED] Edit Profile Modal -->
  <!-- Renamed from Change Password Modal -->
  <Modal :show="isEditProfileModalOpen" @close="closeEditProfileModal">
    <template #header>修改個人資料</template>
    <form @submit.prevent="handleEditProfile" class="p-6">
        <div class="mb-4">
            <label for="profileNickname" class="block text-gray-700 font-medium mb-2">暱稱</label>
            <input type="text" id="profileNickname" v-model="profileData.nickname" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400">
            <p v-if="errors.nickname" class="text-red-600 text-sm mt-1">{{ errors.nickname }}</p>
        </div>
        <div class="mb-4">
            <label for="profileNewPassword" class="block text-gray-700 font-medium mb-2">新密碼 (留空表示不修改)</label>
            <input type="password" id="profileNewPassword" v-model="profileData.newPassword" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400">
            <p v-if="errors.weakPassword" class="text-red-600 text-sm mt-1">{{ errors.weakPassword }}</p>
        </div>
        <div class="mb-6">
            <label for="profileConfirmNewPassword" class="block text-gray-700 font-medium mb-2">確認新密碼</label>
            <input type="password" id="profileConfirmNewPassword" v-model="profileData.confirmPassword" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400">
            <p v-if="errors.passwordMismatch" class="text-red-600 text-sm mt-1">{{ errors.passwordMismatch }}</p>
        </div>
        <div class="flex flex-col sm:flex-row-reverse gap-3">
            <button type="submit" class="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-lg transition duration-300 shadow-sm">儲存</button>
            <button type="button" @click="closeEditProfileModal" class="w-full sm:w-auto bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-6 rounded-lg transition duration-300 shadow-sm">取消</button>
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

</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '@/store/auth';
import { useUiStore } from '@/store/ui';
import AppHeader from '@/components/AppHeader.vue';
import AppNav from '@/components/AppNav.vue';
import LoadingOverlay from '@/components/LoadingOverlay.vue';
import MessageBox from '@/components/MessageBox.vue';
import Modal from '@/components/Modal.vue';
import * as api from '@/services/api'; // [NEW] Import api for profile update

const authStore = useAuthStore();
const uiStore = useUiStore();

// State for the edit profile modal
// [MODIFIED] Renamed from isChangePasswordModalOpen
const isEditProfileModalOpen = ref(false);
// [MODIFIED] Renamed from passwords, now includes nickname
const profileData = reactive({
  nickname: '',
  newPassword: '',
  confirmPassword: ''
});
// [MODIFIED] Renamed and adjusted error messages
const errors = reactive({
  nickname: '',
  weakPassword: '',
  passwordMismatch: ''
});

// [MODIFIED] Renamed from openChangePasswordModal
const openEditProfileModal = () => {
    // Reset fields and errors
    profileData.nickname = authStore.user?.nickname || ''; // Load current nickname
    profileData.newPassword = '';
    profileData.confirmPassword = '';
    Object.assign(errors, { nickname: '', weakPassword: '', passwordMismatch: '' });
    isEditProfileModalOpen.value = true;
};

// [MODIFIED] Renamed from closeChangePasswordModal
const closeEditProfileModal = () => {
    isEditProfileModalOpen.value = false;
};

// [MODIFIED] Renamed from handleChangePassword, now handles nickname and password
const handleEditProfile = async () => {
    // Reset errors
    Object.assign(errors, { nickname: '', weakPassword: '', passwordMismatch: '' });
    let isValid = true;

    // Nickname validation (simple check for now)
    if (!profileData.nickname.trim()) {
        errors.nickname = '暱稱不能為空';
        isValid = false;
    }

    // Password validation (only if newPassword is provided)
    if (profileData.newPassword) {
        if (profileData.newPassword.length < 6) {
            errors.weakPassword = '密碼至少需要6位';
            isValid = false;
        }
        if (profileData.newPassword !== profileData.confirmPassword) {
            errors.passwordMismatch = '新密碼與確認密碼不符';
            isValid = false;
        }
    } else {
        // If newPassword is empty but confirmPassword is not, it's a mismatch
        if (profileData.confirmPassword) {
             errors.passwordMismatch = '請輸入新密碼，或將確認密碼留空';
             isValid = false;
        }
    }

    if (!isValid) return;

    uiStore.setLoading(true);
    try {
        const payload = {
            nickname: profileData.nickname,
        };
        if (profileData.newPassword) { // Only add password to payload if provided
            payload.password = profileData.newPassword;
        }
        
        // [NEW] Call the API to update profile
        const success = await api.updateUserProfile(authStore.user.id, payload);

        if (success) {
            // Re-fetch user profile to update the store with new nickname
            await authStore.fetchUserProfile(authStore.user.id); 
            uiStore.showMessage('個人資料已成功更新！', 'success');
            closeEditProfileModal();
        } else {
            // API call might return false or throw an error, error message would be handled by api.js
            // If api.js throws, it will be caught by the outer catch block
            // If it returns false, show a generic error message
            uiStore.showMessage('更新個人資料失敗，請稍後再試。', 'error');
        }
    } catch (e) {
        uiStore.showMessage(`更新個人資料失敗: ${e.message}`, 'error');
    } finally {
        uiStore.setLoading(false);
    }
};

// Listen for the custom event dispatched from AppHeader
onMounted(() => {
    // [MODIFIED] Event listener name changed
    window.addEventListener('open-edit-profile-modal', openEditProfileModal);
});

onUnmounted(() => {
    // [MODIFIED] Event listener name changed
    window.removeEventListener('open-edit-profile-modal', openEditProfileModal);
});
</script>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

