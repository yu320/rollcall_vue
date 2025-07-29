<template>
  <div class="login-container">
    <!-- Login Card -->
    <div class="login-card">
      <!-- App Icon -->
      <div class="app-icon">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
        </svg>
      </div>

      <!-- Header -->
      <div class="text-center mb-6">
        <h1 class="text-2xl font-bold text-gray-800">報到管理系統</h1>
        <p class="text-gray-500 mt-1 text-sm">請登入以繼續使用系統</p>
        <div class="text-lg font-semibold text-indigo-600 mt-3">{{ currentTime }}</div>
      </div>

      <!-- Login Form -->
      <form @submit.prevent="handleLogin" class="space-y-5">
        <!-- Username Input -->
        <div>
          <label for="username" class="block text-sm font-medium text-gray-700 mb-1">帳號</label>
          <div class="relative">
            <span class="input-icon">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </span>
            <input v-model="credentials.email" id="username" type="text" required class="form-input" placeholder="請輸入您的帳號">
          </div>
        </div>

        <!-- Password Input -->
        <div>
          <label for="password" class="block text-sm font-medium text-gray-700 mb-1">密碼</label>
          <div class="relative">
             <span class="input-icon">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </span>
            <input v-model="credentials.password" id="password" :type="passwordFieldType" required class="form-input" placeholder="請輸入您的密碼">
            <button type="button" @click="togglePasswordVisibility" class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
              <svg v-if="passwordFieldType === 'password'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
            </button>
          </div>
        </div>

        <p v-if="authStore.error" class="text-red-600 text-sm pt-1 text-center">{{ authStore.error }}</p>

        <!-- Submit Button -->
        <div class="pt-2">
          <button type="submit" :disabled="authStore.isLoading" class="login-btn w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white disabled:bg-indigo-400">
             <span v-if="!authStore.isLoading">登入系統</span>
             <span v-else class="flex items-center">
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                登入中...
             </span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '@/store/auth';

// --- Store and Router ---
const authStore = useAuthStore();

// --- State ---
const credentials = reactive({
  email: '',
  password: ''
});
const passwordFieldType = ref('password');
const currentTime = ref('');
let clockInterval = null;

// --- Logic ---
const handleLogin = async () => {
  if (authStore.isLoading) return;
  // [修復] 將 credentials 物件拆分為 email 和 password 兩個獨立參數傳入
  await authStore.login(credentials.value.email, credentials.value.password);
};

const togglePasswordVisibility = () => {
  passwordFieldType.value = passwordFieldType.value === 'password' ? 'text' : 'password';
};

const updateClock = () => {
  currentTime.value = new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

// --- Lifecycle Hooks ---
onMounted(() => {
  updateClock();
  clockInterval = setInterval(updateClock, 1000);
});

onUnmounted(() => {
  clearInterval(clockInterval);
});
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.login-card {
  background-color: white;
  border-radius: 1.5rem; /* 24px */
  box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
  padding: 2.5rem; /* 40px */
  width: 100%;
  max-width: 26rem; /* 416px */
  animation: fade-in 0.6s ease-out forwards;
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.app-icon {
  margin: 0 auto 1.5rem;
  height: 4rem; /* 64px */
  width: 4rem; /* 64px */
  border-radius: 50%;
  background-color: #ede9fe;
  display: flex;
  align-items: center;
  justify-content: center;
}

.input-icon {
  position: absolute;
  left: 0.75rem; /* 12px */
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af; /* gray-400 */
  pointer-events: none;
}

.form-input {
  display: block;
  width: 100%;
  padding: 0.75rem 0.75rem 0.75rem 2.5rem; /* 12px 12px 12px 40px */
  border-radius: 0.5rem; /* 8px */
  border: 1px solid #d1d5db; /* gray-300 */
  transition: box-shadow 0.2s, border-color 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #8b5cf6; /* indigo-500 */
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.2);
}

.login-btn {
  background-color: #6d28d9; /* violet-700 */
  transition: background-color 0.3s;
}

.login-btn:hover {
  background-color: #5b21b6; /* violet-800 */
}
</style>
