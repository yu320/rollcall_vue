<template>
  <div class="login-container flex items-center justify-center p-4">
    <!-- Animated background elements -->
    <div class="animated-bg">
      <div class="animated-bg-shape shape-1"></div>
      <div class="animated-bg-shape shape-2"></div>
      <div class="animated-bg-shape shape-3"></div>
    </div>
    
    <!-- Login Card -->
    <div v-if="!authStore.loading" class="login-card w-full max-w-md rounded-2xl p-8 md:p-10 transition-all duration-300 ease-out transform">
      <div class="text-center mb-8">
        <!-- [NEW] Top icon for the login page -->
        <div class="flex justify-center mb-4">
            <div class="bg-indigo-600 p-3 rounded-full shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                </svg>
            </div>
        </div>
        <h1 class="text-2xl font-bold text-gray-800">報到管理系統</h1>
        <p class="text-gray-600 mt-2">請登入以繼續使用系統</p>
        <div class="text-lg font-semibold text-indigo-600 mt-2 clock">{{ currentTime }}</div>
      </div>
      
      <form @submit.prevent="handleLogin" class="space-y-6">
        <div>
          <label for="username" class="block text-sm font-medium text-gray-700 mb-1">帳號</label>
          <div class="relative">
            <!-- [NEW] Username input icon -->
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </div>
            <input v-model="credentials.email" id="username" type="text" required class="form-input block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg" placeholder="請輸入您的帳號">
          </div>
        </div>
        
        <div>
          <label for="password" class="block text-sm font-medium text-gray-700 mb-1">密碼</label>
           <div class="relative">
            <!-- [NEW] Password input icon -->
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </div>
            <input v-model="credentials.password" id="password" type="password" required class="form-input block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg" placeholder="請輸入您的密碼">
            <!-- The eye icon (for show/hide password) from the old version is more complex to integrate directly in Vue without a separate component or state management,
                 so I'm keeping the current Vue functionality for simplicity unless specifically requested to replicate the eye icon behavior. -->
          </div>
        </div>
        
        <p v-if="authStore.error" class="text-red-600 text-sm mt-2 text-center">{{ authStore.error }}</p>
        
        <div>
          <button type="submit" class="login-btn w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white items-center">
            <!-- Login Icon (similar to a user/login symbol) -->
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            登入系統
          </button>
        </div>
      </form>
    </div>

    <!-- Car Loading Animation -->
    <div v-else class="car-loading-overlay">
        <div class="road">
            <div class="car">
                <div class="wheel front"></div>
                <div class="wheel back"></div>
            </div>
        </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '@/store/auth';

const authStore = useAuthStore();

const credentials = ref({
  email: '',
  password: ''
});

const handleLogin = async () => {
  await authStore.login(credentials.value.email, credentials.value.password);
};

const currentTime = ref('');
let clockInterval = null;

const updateClock = () => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  currentTime.value = `${hours}:${minutes}:${seconds}`;
};

onMounted(() => {
  updateClock();
  clockInterval = setInterval(updateClock, 1000);
});

onUnmounted(() => {
  clearInterval(clockInterval);
});
</script>

<style scoped>
/* Scoped styles are not needed as global styles from main.css will apply */
</style>
