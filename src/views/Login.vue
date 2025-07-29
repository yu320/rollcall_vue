<template>
  <div class="login-container flex items-center justify-center p-4">
    <!-- Animated background elements -->
    <div class="animated-bg">
      <div class="animated-bg-shape shape-1"></div>
      <div class="animated-bg-shape shape-2"></div>
      <div class="animated-bg-shape shape-3"></div>
    </div>
    
    <!-- [MODIFIED] Login Card with structure from old project -->
    <div v-if="!authStore.loading" class="login-card w-full max-w-md rounded-2xl p-8 md:p-10">
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-gray-800">報到管理系統</h1>
        <p class="text-gray-600 mt-2">請登入以繼續使用系統</p>
        <div class="text-lg font-semibold text-indigo-600 mt-2 clock">{{ currentTime }}</div>
      </div>
      
      <form @submit.prevent="handleLogin" class="space-y-6">
        <div>
          <label for="username" class="block text-sm font-medium text-gray-700 mb-1">帳號</label>
          <input v-model="credentials.email" id="username" type="text" required class="form-input block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg" placeholder="請輸入您的帳號">
        </div>
        
        <div>
          <label for="password" class="block text-sm font-medium text-gray-700 mb-1">密碼</label>
           <input v-model="credentials.password" id="password" type="password" required class="form-input block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg" placeholder="請輸入您的密碼">
        </div>
        
        <div>
          <button type="submit" class="login-btn w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white">
            登入系統
          </button>
        </div>
      </form>
    </div>

    <!-- [NEW] Car Loading Animation from old project -->
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
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();

const credentials = ref({
  email: '',
  password: ''
});

const handleLogin = async () => {
  // The logic inside authStore.login remains the same
  await authStore.login(credentials.value.email, credentials.value.password);
};

// Clock functionality from old project
const currentTime = ref('');
let clockInterval = null;

const updateClock = () => {
  const now = new Date();
  currentTime.value = now.toLocaleTimeString('zh-TW');
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
