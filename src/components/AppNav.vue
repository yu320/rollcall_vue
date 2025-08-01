<template>
  <div class="bg-white shadow-sm sticky top-0 z-40">
    <div class="container mx-auto px-4">
      <div class="flex flex-wrap border-b border-gray-200">
        
        <router-link v-if="canView('overview:view')" to="/overview" class="tab-button" active-class="tab-active">總覽</router-link>

        <router-link v-if="canView('checkin:use')" to="/checkin" class="tab-button" active-class="tab-active">報到系統</router-link>
        
        <div v-if="canView('reports:view')" class="relative" @mouseenter="handleMouseEnter('dataAnalysis')" @mouseleave="handleMouseLeave('dataAnalysis')">
          <button 
            ref="dataAnalysisButtonRef" 
            @click="handleClick('dataAnalysis')" 
            class="tab-button flex items-center" 
            :class="{ 'tab-active': isRouteActive('/dashboard') || isRouteActive('/report') }"
          >
            <span>資料分析</span>
            <svg class="w-4 h-4 ml-1 transition-transform" :class="{'rotate-180': dropdowns.dataAnalysis}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
          </button>
          <div 
            ref="dataAnalysisMenuRef" 
            v-if="dropdowns.dataAnalysis" 
            class="dropdown-menu-floating"
            @mouseenter="handleMouseEnter('dataAnalysis')" 
            @mouseleave="handleMouseLeave('dataAnalysis')"
          >
            <router-link to="/dashboard" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">儀錶板</router-link>
            <router-link to="/report" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">報表</router-link>
          </div>
        </div>

        <div v-if="canView('records:view')" class="relative" @mouseenter="handleMouseEnter('records')" @mouseleave="handleMouseLeave('records')">
            <button 
              ref="recordsButtonRef" 
              @click="handleClick('records')" 
              class="tab-button flex items-center" 
              :class="{ 'tab-active': isRouteActive('/records') }"
            >
                <span>檢視記錄</span>
                <svg class="w-4 h-4 ml-1 transition-transform" :class="{'rotate-180': dropdowns.records}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
            </button>
            <div 
              ref="recordsMenuRef" 
              v-if="dropdowns.records" 
              class="dropdown-menu-floating"
              @mouseenter="handleMouseEnter('records')" 
              @mouseleave="handleMouseLeave('records')"
            >
                <router-link to="/records/activity" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">活動記錄</router-link>
                <router-link to="/records/daily" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">每日記錄</router-link>
            </div>
        </div>

        <div v-if="canView('personnel:read') || canView('events:create') || canView('accounts:manage_users') || canView('accounts:manage') || canView('settings:manage')" class="relative" @mouseenter="handleMouseEnter('management')" @mouseleave="handleMouseLeave('management')">
            <button 
              ref="managementButtonRef" 
              @click="handleClick('management')" 
              class="tab-button flex items-center" 
              :class="{ 'tab-active': isRouteActive('/events') || isRouteActive('/personnel') || isRouteActive('/import') || isRouteActive('/system') }"
            >
                <span>資料管理</span>
                <svg class="w-4 h-4 ml-1 transition-transform" :class="{'rotate-180': dropdowns.management}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
            </button>
            <div 
              ref="managementMenuRef" 
              v-if="dropdowns.management" 
              class="dropdown-menu-floating"
              @mouseenter="handleMouseEnter('management')" 
              @mouseleave="handleMouseLeave('management')"
            >
                <router-link v-if="canView('events:create')" to="/events" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">活動管理</router-link>
                <router-link v-if="canView('personnel:read')" to="/personnel" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">人員管理</router-link>
                <router-link v-if="canView('personnel:create')" to="/import/personnel" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">人員資料匯入</router-link>
                <router-link v-if="canView('records:create')" to="/import/checkin" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">簽到記錄匯入</router-link>
                <router-link v-if="canView('accounts:manage_users')" to="/system/accounts" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">帳號管理</router-link>
                <router-link v-if="canView('settings:manage')" to="/system/settings" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">註冊設定</router-link>
                <router-link v-if="canView('accounts:manage')" to="/system/permissions" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">權限管理</router-link>
            </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, nextTick, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/store/auth';

const route = useRoute();
const authStore = useAuthStore();

const dropdowns = reactive({
  dataAnalysis: false,
  records: false,
  management: false,
});

const closeTimers = reactive({
  dataAnalysis: null,
  records: null,
  management: null,
});

const dataAnalysisMenuRef = ref(null);
const recordsMenuRef = ref(null);
const managementMenuRef = ref(null);
const dataAnalysisButtonRef = ref(null);
const recordsButtonRef = ref(null);
const managementButtonRef = ref(null);

const canView = (permission) => authStore.hasPermission(permission);
const isRouteActive = (path) => route.path.startsWith(path);

watch(() => route.path, () => {
  Object.keys(dropdowns).forEach(key => {
    dropdowns[key] = false;
  });
});

const handleClick = (menu) => {
  if (window.innerWidth <= 768) {
    const currentState = dropdowns[menu];
    Object.keys(dropdowns).forEach(key => dropdowns[key] = false);
    dropdowns[menu] = !currentState;
  }
};

const handleMouseEnter = (menu) => {
  if (window.innerWidth > 768) {
    if (closeTimers[menu]) {
      clearTimeout(closeTimers[menu]);
      closeTimers[menu] = null;
    }
    openDropdown(menu);
  }
};

const handleMouseLeave = (menu) => {
  if (window.innerWidth > 768) {
    closeTimers[menu] = setTimeout(() => {
      dropdowns[menu] = false;
    }, 200);
  }
};

const openDropdown = async (menu) => {
  for (const key in dropdowns) {
    if (key !== menu) {
      dropdowns[key] = false;
    }
  }
  dropdowns[menu] = true;

  await nextTick();

  let menuElement = null;
  let buttonElement = null;
  if (menu === 'dataAnalysis') {
    menuElement = dataAnalysisMenuRef.value;
    buttonElement = dataAnalysisButtonRef.value;
  } else if (menu === 'records') {
    menuElement = recordsMenuRef.value;
    buttonElement = recordsButtonRef.value;
  } else if (menu === 'management') {
    menuElement = managementMenuRef.value;
    buttonElement = managementButtonRef.value;
  }

  if (menuElement && buttonElement && window.innerWidth <= 768) {
    const rect = buttonElement.getBoundingClientRect();
    menuElement.style.top = `${rect.bottom + window.scrollY + 4}px`;
  }
};

</script>

<style scoped>
/* 專屬於此元件的樣式 */
.dropdown-menu-floating {
  position: absolute;
  z-index: 50;
  top: 100%;
  left: 0;
  margin-top: 0.5rem;
  min-width: 12rem;
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e7eb;
}

/* 手機版下拉選單固定定位和滿寬度 */
@media (max-width: 768px) {
    .dropdown-menu-floating {
        position: fixed;
        left: 1rem;
        right: 1rem;
        width: auto;
        max-width: calc(100vw - 2rem);
        top: auto;
        margin-top: 0;
    }
}
</style>