<template>
  <header class="bg-white shadow-sm">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-16">
        <div class="flex items-center">
          <img class="h-8 w-auto" src="@/assets/logo.jpg" alt="Logo">
          <h1 class="ml-3 text-xl font-semibold text-gray-800">簽到系統</h1>
        </div>
        <div v-if="authStore.isLoggedIn" class="flex items-center space-x-4">
          <span class="text-sm font-medium text-gray-600">歡迎, {{ userDisplayName }}</span>
          <button @click="openProfileModal" class="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md text-sm font-medium transition-colors">
            修改個人資料
          </button>
          <button @click="handleLogout" class="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-md text-sm font-medium transition-colors">
            登出
          </button>
        </div>
      </div>
    </div>
  </header>

  <!-- Profile Edit Modal -->
  <Modal :show="isProfileModalOpen" @close="closeProfileModal">
    <template #title>修改個人資料</template>
    <template #body>
      <form @submit.prevent="handleSaveChanges" class="space-y-4">
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700">電子郵件 (帳號)</label>
          <input type="email" id="email" :value="authStore.user ? authStore.user.email : ''" class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 cursor-not-allowed" disabled>
        </div>
        <div>
          <label for="nickname" class="block text-sm font-medium text-gray-700">暱稱</label>
          <input type="text" id="nickname" v-model="editableProfile.nickname" placeholder="請輸入您的暱稱" class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500">
        </div>
        <hr/>
        <div>
          <label for="new_password" class="block text-sm font-medium text-gray-700">新密碼 (留空則不修改)</label>
          <input type="password" id="new_password" v-model="newPassword" placeholder="請輸入新密碼" class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500">
        </div>
        <div>
          <label for="confirm_password" class="block text-sm font-medium text-gray-700">確認新密碼</label>
          <input type="password" id="confirm_password" v-model="confirmPassword" placeholder="請再次輸入新密碼" class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500">
        </div>
        <p v-if="passwordError" class="text-sm text-red-600">{{ passwordError }}</p>
      </form>
    </template>
    <template #footer>
      <button @click="closeProfileModal" type="button" class="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">
        取消
      </button>
      <button @click="handleSaveChanges" type="submit" class="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
        儲存變更
      </button>
    </template>
  </Modal>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useAuthStore } from '@/store/auth';
import Modal from '@/components/Modal.vue';

const authStore = useAuthStore();

const userDisplayName = computed(() => {
    return authStore.user?.nickname || authStore.user?.email || '使用者';
});

// Modal State
const isProfileModalOpen = ref(false);
const editableProfile = ref({ nickname: '' });
const newPassword = ref('');
const confirmPassword = ref('');
const passwordError = ref('');

const handleLogout = () => {
  authStore.logout();
};

const openProfileModal = () => {
  newPassword.value = '';
  confirmPassword.value = '';
  passwordError.value = '';
  // 從 store 中取得當前的暱稱
  editableProfile.value.nickname = authStore.user?.nickname || '';
  isProfileModalOpen.value = true;
};

const closeProfileModal = () => {
  isProfileModalOpen.value = false;
};

const handleSaveChanges = async () => {
  passwordError.value = '';
  
  // 檢查密碼是否需要更新
  if (newPassword.value) {
    if (newPassword.value.length < 6) {
      passwordError.value = '密碼長度不能少於 6 個字元。';
      return;
    }
    if (newPassword.value !== confirmPassword.value) {
      passwordError.value = '兩次輸入的密碼不一致。';
      return;
    }
  }

  // 呼叫 store 中的 action
  const success = await authStore.updateUserProfile(
    editableProfile.value.nickname,
    newPassword.value // 如果為空字串，api 層應處理不更新密碼
  );

  if (success) {
    closeProfileModal();
  }
};
</script>
