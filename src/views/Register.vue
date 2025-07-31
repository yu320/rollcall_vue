<template>
  <div class="login-container flex justify-center p-4 py-12">
    <div class="animated-bg">
      <div class="animated-bg-shape shape-1"></div>
      <div class="animated-bg-shape shape-2"></div>
      <div class="animated-bg-shape shape-3"></div>
    </div>
    
    <Transition name="login-card-fade" mode="out-in">
      <div v-if="!authStore.loading"
        class="login-card w-full max-w-md rounded-2xl p-8 md:p-10"
      >
        <div class="text-center mb-8">
          <div class="flex justify-center mb-4">
            <div class="bg-indigo-600 p-3 rounded-full shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
            </div>
          </div>
          <h1 class="text-2xl font-bold text-gray-800">建立新帳號</h1>
          <p class="text-gray-600 mt-2">歡迎加入！請填寫以下資訊</p>
        </div>
        
        <form class="space-y-4" @submit.prevent="handleRegister">
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 mb-1">帳號</label>
            <input v-model="credentials.email" id="email" type="text" required class="form-input block w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="請輸入帳號 (若無 @ 將自動加入預設網域)">
          </div>
          
          <div>
            <label for="nickname" class="block text-sm font-medium text-gray-700 mb-1">暱稱</label>
            <input v-model="credentials.nickname" id="nickname" type="text" required class="form-input block w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="您希望別人如何稱呼您">
          </div>

          <div>
            <label for="password" class="block text-sm font-medium text-gray-700 mb-1">密碼</label>
            <input v-model="credentials.password" id="password" type="password" required class="form-input block w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="至少 6 位數">
            <div class="mt-2">
                <div class="flex space-x-1">
                    <div id="strength1" class="h-1 w-1/4 rounded transition-all duration-200" :class="passwordStrength >= 1 ? passwordStrengthClass : 'bg-gray-200'"></div>
                    <div id="strength2" class="h-1 w-1/4 rounded transition-all duration-200" :class="passwordStrength >= 2 ? passwordStrengthClass : 'bg-gray-200'"></div>
                    <div id="strength3" class="h-1 w-1/4 rounded transition-all duration-200" :class="passwordStrength >= 3 ? passwordStrengthClass : 'bg-gray-200'"></div>
                    <div id="strength4" class="h-1 w-1/4 rounded transition-all duration-200" :class="passwordStrength >= 4 ? passwordStrengthClass : 'bg-gray-200'"></div>
                </div>
                <p id="strengthText" class="text-xs mt-1" :class="passwordStrengthTextClass">{{ passwordStrengthText }}</p>
            </div>
            <p v-if="errors.password" class="text-red-600 text-xs mt-1">{{ errors.password }}</p>
          </div>

          <div>
            <label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-1">確認密碼</label>
            <input v-model="credentials.confirmPassword" id="confirmPassword" type="password" required class="form-input block w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="請再次輸入您的密碼">
            <p v-if="errors.confirmPassword" class="text-red-600 text-xs mt-1">{{ errors.confirmPassword }}</p>
          </div>

          <div>
            <label for="registrationCode" class="block text-sm font-medium text-gray-700 mb-1">註冊碼</label>
            <input v-model="credentials.registrationCode" id="registrationCode" type="text" class="form-input block w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="請向管理員索取 (如果需要)">
          </div>
          
          <div class="flex items-start">
              <input type="checkbox" id="terms" v-model="agreedToTerms" required class="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded">
              <label for="terms" class="ml-3 text-sm text-gray-700">
                  我同意 <a href="#" class="text-indigo-600 hover:text-indigo-500 underline" @click.prevent="showTermsModal('服務條款')">服務條款</a> 和 
                  <a href="#" class="text-indigo-600 hover:text-indigo-500 underline" @click.prevent="showTermsModal('隱私政策')">隱私政策</a>
              </label>
          </div>
          <p v-if="errors.terms" class="text-red-600 text-xs mt-1">{{ errors.terms }}</p>
          
          <p v-if="authStore.error" class="text-red-600 text-sm pt-2 text-center">{{ authStore.error }}</p>
          
          <div class="pt-4">
            <button type="submit" class="login-btn w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white items-center">
              註冊
            </button>
          </div>

          <div class="mt-6 text-center">
            <p class="text-sm text-gray-600">
              已經有帳號了？
              <router-link to="/login" class="font-medium text-indigo-600 hover:text-indigo-500">
                返回登入
              </router-link>
            </p>
          </div>
        </form>
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
import { reactive, watch, computed, ref } from 'vue';
import { useAuthStore } from '@/store/auth';
import { useUiStore } from '@/store/ui';
import { DEFAULT_EMAIL_DOMAIN } from '@/utils/constants';

const authStore = useAuthStore();
const uiStore = useUiStore();

const credentials = reactive({
  email: '',
  nickname: '',
  password: '',
  confirmPassword: '',
  registrationCode: ''
});

const errors = reactive({
  password: '',
  confirmPassword: '',
  terms: ''
});

const agreedToTerms = ref(false);
const passwordStrength = ref(0);

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
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
};

watch(() => credentials.password, (newPassword) => {
    passwordStrength.value = calculatePasswordStrength(newPassword);
    if (newPassword.length > 0 && newPassword.length < 6) {
        errors.password = '密碼長度至少需要 6 位。';
    } else {
        errors.password = '';
    }
    if (credentials.confirmPassword.length > 0 && newPassword !== credentials.confirmPassword) {
        errors.confirmPassword = '兩次輸入的密碼不相符。';
    } else {
        errors.confirmPassword = '';
    }
});

watch(() => credentials.confirmPassword, (newConfirmPassword) => {
    if (newConfirmPassword.length > 0 && newConfirmPassword !== credentials.password) {
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
    if (!validateForm()) {
        return;
    }
    
    let finalEmail = credentials.email;
    if (finalEmail && !finalEmail.includes('@')) {
      finalEmail = finalEmail + DEFAULT_EMAIL_DOMAIN;
    }

    await authStore.signUp({
        email: finalEmail,
        password: credentials.password,
        nickname: credentials.nickname,
        registrationCode: credentials.registrationCode
    });
};

const showTermsModal = (policyType) => {
    const title = policyType;
    let bodyText = '';
    
    if (policyType === '服務條款') {
        bodyText = '此為服務條款的詳細內容，請仔細閱讀。內容將在此處顯示。';
    } else if (policyType === '隱私政策') {
        bodyText = '此為隱私政策的詳細內容，請仔細閱讀。內容將在此處顯示。';
    }
    
    uiStore.showConfirmation(
      title,
      bodyText,
      '我已閱讀',
      'bg-indigo-600 hover:bg-indigo-700'
    ).then(() => {}).catch(() => {});
};
</script>

<style scoped>
/* Styles are inherited from main.css for consistency with Login.vue */
</style>