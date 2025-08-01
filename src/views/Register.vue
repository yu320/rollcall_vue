<template>
  <div class="login-container flex items-center justify-center p-4">
    <div class="animated-bg">
      <div class="animated-bg-shape shape-1"></div>
      <div class="animated-bg-shape shape-2"></div>
      <div class="animated-bg-shape shape-3"></div>
    </div>
    
    <Transition name="login-card-fade" mode="out-in">
      <div v-if="!authStore.loading"
        class="login-card w-full max-w-md rounded-2xl flex flex-col max-h-[95vh]"
      >
        <div class="overflow-y-auto p-8 md:p-10">
          <div class="text-center mb-8">
            <div class="flex justify-center mb-4">
              <div class="bg-indigo-600 p-3 rounded-full shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
              </div>
            </div>
            <h1 class="text-2xl font-bold text-gray-800">建立新帳號</h1>
            <p class="text-gray-600 mt-2">歡迎加入！填寫資料以完成註冊。</p>
          </div>
          
          <form @submit.prevent="handleRegister" class="space-y-4">
            <div>
              <label for="email" class="block text-sm font-medium text-gray-700 mb-1">帳號 (Email)</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" /></svg>
                </div>
                <input v-model="credentials.email" id="email" type="text" required class="form-input block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg" placeholder="請輸入 Email 或帳號">
              </div>
            </div>
            <div>
              <label for="nickname" class="block text-sm font-medium text-gray-700 mb-1">暱稱</label>
               <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                     <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  </div>
                  <input v-model="credentials.nickname" id="nickname" type="text" required class="form-input block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg" placeholder="您希望別人如何稱呼您">
               </div>
            </div>
            <div>
              <label for="password" class="block text-sm font-medium text-gray-700 mb-1">密碼</label>
              <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                     <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  </div>
                  <input v-model="credentials.password" id="password" type="password" required class="form-input block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg" placeholder="請設定至少6位數的密碼">
              </div>
              <div class="mt-2">
                <div class="flex space-x-1">
                    <div class="h-1 w-1/4 rounded transition-all duration-300" :class="passwordStrength >= 1 ? passwordStrengthClass : 'bg-gray-200'"></div>
                    <div class="h-1 w-1/4 rounded transition-all duration-300" :class="passwordStrength >= 2 ? passwordStrengthClass : 'bg-gray-200'"></div>
                    <div class="h-1 w-1/4 rounded transition-all duration-300" :class="passwordStrength >= 3 ? passwordStrengthClass : 'bg-gray-200'"></div>
                    <div class="h-1 w-1/4 rounded transition-all duration-300" :class="passwordStrength >= 4 ? passwordStrengthClass : 'bg-gray-200'"></div>
                </div>
                <p :class="passwordStrengthTextClass">{{ passwordStrengthText }}</p>
              </div>
               <p v-if="errors.password" class="text-red-600 text-xs mt-1">{{ errors.password }}</p>
            </div>
            <div>
              <label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-1">確認密碼</label>
               <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                     <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  </div>
                  <input v-model="credentials.confirmPassword" id="confirmPassword" type="password" required class="form-input block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg" placeholder="請再次輸入您的密碼">
               </div>
               <p v-if="errors.confirmPassword" class="text-red-600 text-xs mt-1">{{ errors.confirmPassword }}</p>
            </div>
            
            <div>
              <label for="registration_code" class="block text-sm font-medium text-gray-700 mb-1">
                註冊碼 
                <span v-if="isCodeRequired === true" class="text-red-500">*</span>
                <span v-else class="text-gray-500">(選填)</span>
              </label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H5v-2H3v-2H1v-4a6 6 0 016-6h4a6 6 0 016 6z" /></svg>
                </div>
                <input 
                  v-model="credentials.registration_code" 
                  id="registration_code" 
                  type="text" 
                  class="form-input block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg" 
                  :placeholder="isCodeRequired ? '請向管理員索取' : '若有註冊碼請在此輸入'"
                >
              </div>
            </div>
            
            <div class="flex items-start pt-2">
              <input type="checkbox" id="terms" v-model="agreedToTerms" class="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded">
              <label for="terms" class="ml-3 text-sm text-gray-700">
                  我同意 <a href="#" class="text-indigo-600 hover:text-indigo-500 underline" @click.prevent="showTermsModal('服務條款')">服務條款</a> 和 
                  <a href="#" class="text-indigo-600 hover:text-indigo-500 underline" @click.prevent="showTermsModal('隱私政策')">隱私政策</a>
              </label>
            </div>
            <p v-if="errors.terms" class="text-red-600 text-xs">{{ errors.terms }}</p>
            
            <p v-if="authStore.error" class="text-red-600 text-sm pt-1 text-center">{{ authStore.error }}</p>
            
            <div class="pt-2">
              <button type="submit" :disabled="authStore.loading" class="login-btn w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white items-center disabled:opacity-50 disabled:cursor-not-allowed">
                <span v-if="!authStore.loading">確認註冊</span>
                <span v-else>處理中...</span>
              </button>
            </div>
          </form>
  
          <div class="mt-6 text-center">
            <p class="text-sm text-gray-600">
              已經有帳號了？
              <router-link to="/login" class="font-medium text-indigo-600 hover:text-indigo-500">
                返回登入
              </router-link>
            </p>
          </div>
        </div>
      </div>

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
import { reactive, watch, computed, ref, onMounted } from 'vue';
import { useAuthStore } from '@/store/auth';
import { useUiStore } from '@/store/ui';
import { DEFAULT_EMAIL_DOMAIN } from '@/utils/constants';
import * as api from '@/services/api';

const authStore = useAuthStore();
const uiStore = useUiStore();

const isCodeRequired = ref(null);

const credentials = reactive({
  email: '',
  nickname: '',
  password: '',
  confirmPassword: '',
  registration_code: ''
});

const errors = reactive({
  password: '',
  confirmPassword: '',
  terms: ''
});

const agreedToTerms = ref(false);
const passwordStrength = ref(0);

onMounted(async () => {
    authStore.error = null;
    try {
        const settings = await api.fetchSettings();
        isCodeRequired.value = settings.registration_code_required === true; 
    } catch (error) {
        console.error("無法讀取系統設定:", error);
        // 如果 API 呼叫失敗，將其設為非必填
        isCodeRequired.value = false;
    }
})

const passwordStrengthText = computed(() => {
    const texts = ['密碼強度', '很弱', '弱', '中等', '強'];
    return texts[passwordStrength.value];
});

const passwordStrengthClass = computed(() => {
    const classes = ['', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-400'];
    return classes[passwordStrength.value];
});

const passwordStrengthTextClass = computed(() => {
    const classes = ['text-gray-500', 'text-red-500', 'text-orange-500', 'text-yellow-500', 'text-green-500'];
    return `text-xs mt-1 font-medium ${classes[passwordStrength.value]}`;
});

const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-zA-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
};

watch(() => credentials.password, (newPassword) => {
    passwordStrength.value = calculatePasswordStrength(newPassword);
    if (newPassword && newPassword.length < 6) {
        errors.password = '密碼長度至少需要 6 位。';
    } else {
        errors.password = '';
    }
    if (credentials.confirmPassword && newPassword !== credentials.confirmPassword) {
        errors.confirmPassword = '兩次輸入的密碼不相符。';
    } else {
        errors.confirmPassword = '';
    }
});

watch(() => credentials.confirmPassword, (newConfirmPassword) => {
    if (newConfirmPassword && newConfirmPassword !== credentials.password) {
        errors.confirmPassword = '兩次輸入的密碼不相符。';
    } else {
        errors.confirmPassword = '';
    }
});

const validateForm = () => {
    errors.password = '';
    errors.confirmPassword = '';
    errors.terms = '';
    let isValid = true;

    if (credentials.password.length < 6) {
        errors.password = '密碼長度至少需要 6 位。';
        isValid = false;
    }

    if (credentials.password !== credentials.confirmPassword) {
        errors.confirmPassword = '兩次輸入的密碼不相符。';
        isValid = false;
    }
    
    if (!agreedToTerms.value) {
        errors.terms = '請同意服務條款和隱私政策。';
        isValid = false;
    }
    
    return isValid;
};

const handleRegister = async () => {
    if (!validateForm()) return;
    
    await authStore.register({
        email: credentials.email,
        password: credentials.password,
        nickname: credentials.nickname,
        registration_code: credentials.registration_code
    });
};

const showTermsModal = (policyType) => {
    const title = policyType;
    let bodyText = '';
    
    if (policyType === '服務條款') {
        bodyText = '感謝您使用本系統。請遵守相關規定，勿進行非法操作或濫用系統資源。所有操作皆會被記錄以供稽核。';
    } else if (policyType === '隱私政策') {
        bodyText = '我們致力於保護您的隱私。您在本系統中輸入的個人資料僅用於活動報到與管理，不會洩漏給第三方。';
    }
    
    uiStore.showConfirmation(
      title,
      bodyText,
      '我已閱讀並同意',
      'bg-indigo-600 hover:bg-indigo-700'
    ).then(() => {
        agreedToTerms.value = true;
    }).catch(() => {
        // User cancelled, do nothing
    });
};
</script>

<style scoped>
/* Styles are shared with Login.vue and defined in src/assets/styles/main.css */
.login-card {
    backdrop-filter: blur(10px);
    background-color: rgba(255, 255, 255, 0.9);
}
</style>