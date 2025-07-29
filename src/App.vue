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

  <!-- [NEW] Change Password Modal -->
  <Modal :show="isChangePasswordModalOpen" @close="closeChangePasswordModal">
    <template #header>修改我的密碼</template>
    <form @submit.prevent="handleChangePassword">
        <div class="space-y-4">
            <div>
                <label for="newPassword" class="block text-sm font-medium text-gray-700">新密碼</label>
                <input type="password" v-model="newPassword" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
                 <p v-if="passwordError" class="text-red-600 text-sm mt-1">{{ passwordError }}</p>
            </div>
            <div>
                <label for="confirmNewPassword" class="block text-sm font-medium text-gray-700">確認新密碼</label>
                <input type="password" v-model="confirmNewPassword" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
            </div>
        </div>
        <div class="mt-6 flex justify-end gap-3">
            <button type="button" @click="closeChangePasswordModal" class="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300">取消</button>
            <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">儲存</button>
        </div>
    </form>
  </Modal>

</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '@/store/auth';
import AppHeader from '@/components/AppHeader.vue';
import AppNav from '@/components/AppNav.vue';
import LoadingOverlay from '@/components/LoadingOverlay.vue';
import MessageBox from '@/components/MessageBox.vue';
import Modal from '@/components/Modal.vue'; // Import Modal component

const authStore = useAuthStore();

// [NEW] State and logic for the password change modal
const isChangePasswordModalOpen = ref(false);
const newPassword = ref('');
const confirmNewPassword = ref('');
const passwordError = ref('');

const openChangePasswordModal = () => {
    newPassword.value = '';
    confirmNewPassword.value = '';
    passwordError.value = '';
    isChangePasswordModalOpen.value = true;
};

const closeChangePasswordModal = () => {
    isChangePasswordModalOpen.value = false;
};

const handleChangePassword = async () => {
    passwordError.value = '';
    if (newPassword.value.length < 6) {
        passwordError.value = '密碼至少需要6位';
        return;
    }
    if (newPassword.value !== confirmNewPassword.value) {
        passwordError.value = '新密碼與確認密碼不符';
        return;
    }
    const success = await authStore.changePassword(newPassword.value);
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
