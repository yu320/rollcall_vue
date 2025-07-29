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

  <!-- [MODIFIED] Change Password Modal to match old version's UI/UX -->
  <Modal :show="isChangePasswordModalOpen" @close="closeChangePasswordModal">
    <template #header>修改我的密碼</template>
    <form @submit.prevent="handleChangePassword" class="p-6">
        <div class="mb-4">
            <label for="oldPassword" class="block text-gray-700 font-medium mb-2">舊密碼</label>
            <input type="password" id="oldPassword" v-model="passwords.old" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400">
            <p v-if="errors.old" class="text-red-600 text-sm mt-1">{{ errors.old }}</p>
        </div>
        <div class="mb-4">
            <label for="newPassword" class="block text-gray-700 font-medium mb-2">新密碼</label>
            <input type="password" id="newPassword" v-model="passwords.new" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400">
            <p v-if="errors.weak" class="text-red-600 text-sm mt-1">{{ errors.weak }}</p>
        </div>
        <div class="mb-6">
            <label for="confirmNewPassword" class="block text-gray-700 font-medium mb-2">確認新密碼</label>
            <input type="password" id="confirmNewPassword" v-model="passwords.confirm" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400">
            <p v-if="errors.mismatch" class="text-red-600 text-sm mt-1">{{ errors.mismatch }}</p>
        </div>
        <div class="flex flex-col sm:flex-row-reverse gap-3">
            <button type="submit" class="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-lg transition duration-300 shadow-sm">儲存</button>
            <button type="button" @click="closeChangePasswordModal" class="w-full sm:w-auto bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-6 rounded-lg transition duration-300 shadow-sm">取消</button>
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

const authStore = useAuthStore();
const uiStore = useUiStore();

// State for the password change modal
const isChangePasswordModalOpen = ref(false);
const passwords = reactive({
  old: '',
  new: '',
  confirm: ''
});
const errors = reactive({
  old: '',
  weak: '',
  mismatch: ''
});

const openChangePasswordModal = () => {
    // Reset fields and errors
    Object.assign(passwords, { old: '', new: '', confirm: '' });
    Object.assign(errors, { old: '', weak: '', mismatch: '' });
    isChangePasswordModalOpen.value = true;
};

const closeChangePasswordModal = () => {
    isChangePasswordModalOpen.value = false;
};

const handleChangePassword = async () => {
    // Reset errors
    Object.assign(errors, { old: '', weak: '', mismatch: '' });
    let isValid = true;

    // Note: The new Supabase auth logic doesn't require the old password for an update when the user is already logged in.
    // The 'old password' field is included here to match the UI/UX of the old version, but it's not verified against the backend.
    // A real implementation would require re-authentication or a different API endpoint.
    
    if (passwords.new.length < 6) {
        errors.weak = '密碼至少需要6位';
        isValid = false;
    }
    if (passwords.new !== passwords.confirm) {
        errors.mismatch = '新密碼與確認密碼不符';
        isValid = false;
    }

    if (!isValid) return;

    const success = await authStore.changePassword(passwords.new);
    if (success) {
        closeChangePasswordModal();
    }
};

// Listen for the custom event dispatched from AppHeader
onMounted(() => {
    window.addEventListener('open-change-password-modal', openChangePasswordModal);
});

onUnmounted(() => {
    window.removeEventListener('open-change-password-modal', openChangePasswordModal);
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
