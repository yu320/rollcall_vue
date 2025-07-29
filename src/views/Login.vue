<template>
  <div class="login-container flex items-center justify-center p-4">
    <!-- Animated background elements -->
    <div class="animated-bg">
      <div class="animated-bg-shape shape-1"></div>
      <div class="animated-bg-shape shape-2"></div>
      <div class="animated-bg-shape shape-3"></div>
    </div>
    
    <!-- 
      使用 Transition 組件包裹兩個需要條件渲染的元素：
      1. 登入卡片 (v-if)
      2. 載入動畫 (v-else)
      這樣 Vue 就能正確管理它們之間的切換動畫。
      `mode="out-in"` 確保舊元素完全消失後新元素才開始進入，避免重疊。
    -->
    <Transition name="login-card-fade" mode="out-in">
      <div v-if="!authStore.loading"
        class="login-card w-full max-w-md rounded-2xl p-8 md:p-10"
      >
        <div class="text-center mb-8">
          <!-- Top icon for the login page, replicating the SVG from the old HTML -->
          <div class="flex justify-center mb-4">
            <div class="bg-indigo-600 p-3 rounded-full shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                </svg>
            </div>
          </div>
          <h1 class="text-2xl font-bold text-gray-800">報到管理系統</h1>
          <p class="text-gray-600 mt-2">請登入以繼續使用系統</p>
          <!-- Real-time clock display -->
          <div class="text-lg font-semibold text-indigo-600 mt-2 clock">{{ currentTime }}</div>
        </div>
        
        <form @submit.prevent="handleLogin" class="space-y-6">
          <div>
            <label for="username" class="block text-sm font-medium text-gray-700 mb-1">帳號</label>
            <div class="relative">
              <!-- Username input icon, replicating the SVG from the old HTML -->
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              </div>
              <input v-model="credentials.email" id="username" type="text" required class="form-input block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg" placeholder="請輸入您的帳號">
            </div>
          </div>
          
          <div>
            <label for="password" class="block text-sm font-medium text-gray-700 mb-1">密碼</label>
            <div class="relative">
              <!-- Password input icon, replicating the SVG from the old HTML -->
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </div>
              <input v-model="credentials.password" id="password" type="password" required class="form-input block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg" placeholder="請輸入您的密碼">
            </div>
          </div>
          
          <!-- Error message display -->
          <p v-if="authStore.error" class="text-red-600 text-sm mt-2 text-center">{{ authStore.error }}</p>
          
          <div>
            <button type="submit" class="login-btn w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white items-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              登入系統
            </button>
          </div>
        </form>
      </div>

      <!-- Car Loading Animation, shown when authStore.loading is true -->
      <div v-else class="car-loading-overlay">
          <div class="road">
              <div class="car">
                  <div class="wheel front"></div>
                  <div class="wheel back"></div>
              </div>
          </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useAuthStore } from '@/store/auth';

const authStore = useAuthStore();

// Reactive state for login credentials
const credentials = ref({
  email: '',
  password: ''
});

// Add console log to check loading state
watch(() => authStore.loading, (newVal) => {
  //console.log('authStore.loading changed:', newVal);
});

// Method to handle login form submission
const handleLogin = async () => {
  //console.log('Attempting login...');
  await authStore.login(credentials.value.email, credentials.value.password);
  ////console.log('Login attempt finished. authStore.loading:', authStore.loading.value);
};

// Reactive state for current time display
const currentTime = ref('');
let clockInterval = null; // To store the interval ID for the clock

// Function to update the clock every second
const updateClock = () => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  currentTime.value = `${hours}:${minutes}:${seconds}`;
};

// Lifecycle hook: When component is mounted to the DOM
onMounted(() => {
  //console.log('Login.vue mounted.');
  updateClock(); // Initial update
  clockInterval = setInterval(updateClock, 1000); // Update every second
  //console.log('Initial authStore.loading on mount:', authStore.loading.value);
});

// Lifecycle hook: When component is unmounted from the DOM
onUnmounted(() => {
  //console.log('Login.vue unmounted.');
  clearInterval(clockInterval); // Clear the interval to prevent memory leaks
});
</script>

<style scoped>
/*
  這個組件的特定樣式 (login-container, animated-bg, car-loading-overlay)
  主要由 src/assets/styles/main.css 處理，該文件整合了舊專案的樣式。
*/

/* 定義登入卡片的進入和離開動畫 */
.login-card-fade-enter-active,
.login-card-fade-leave-active {
  transition: opacity 0.3s ease-out, transform 0.3s ease-out;
}

.login-card-fade-enter-from {
  opacity: 0;
  transform: scale(0.95);
}

.login-card-fade-enter-to {
  opacity: 1;
  transform: scale(1);
}

.login-card-fade-leave-from {
  opacity: 1;
  transform: scale(1);
}

.login-card-fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
