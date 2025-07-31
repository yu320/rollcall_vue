<template>
  <div class="bg-white shadow-sm sticky top-0 z-40">
    <div class="container mx-auto px-4">
      <div class="flex flex-wrap border-b border-gray-200">
        
        <router-link v-if="canView('overview:view')" to="/overview" class="tab-button" active-class="tab-active">總覽</router-link>

        <router-link v-if="canView('checkin:use')" to="/checkin" class="tab-button" active-class="tab-active">報到系統</router-link>
        
        <div v-if="canView('reports:view')" class="relative" @mouseenter="openDropdown('dataAnalysis')" @mouseleave="startCloseTimer('dataAnalysis')">
          <button ref="dataAnalysisButtonRef" class="tab-button flex items-center" :class="{ 'tab-active': isRouteActive('/dashboard') || isRouteActive('/report') }">
            <span>資料分析</span>
            <svg class="w-4 h-4 ml-1 transition-transform" :class="{'rotate-180': dropdowns.dataAnalysis}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
          </button>
          <div 
            ref="dataAnalysisMenuRef" 
            v-if="dropdowns.dataAnalysis" 
            class="dropdown-menu-floating"
            @mouseenter="cancelCloseTimer('dataAnalysis')" 
            @mouseleave="startCloseTimer('dataAnalysis')"
          >
            <router-link to="/dashboard" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">儀錶板</router-link>
            <router-link to="/report" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">報表</router-link>
          </div>
        </div>

        <div v-if="canView('records:view')" class="relative" @mouseenter="openDropdown('records')" @mouseleave="startCloseTimer('records')">
            <button ref="recordsButtonRef" class="tab-button flex items-center" :class="{ 'tab-active': isRouteActive('/records') }">
                <span>檢視記錄</span>
                <svg class="w-4 h-4 ml-1 transition-transform" :class="{'rotate-180': dropdowns.records}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
            </button>
            <div 
              ref="recordsMenuRef" 
              v-if="dropdowns.records" 
              class="dropdown-menu-floating"
              @mouseenter="cancelCloseTimer('records')" 
              @mouseleave="startCloseTimer('records')"
            >
                <router-link to="/records/activity" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">活動記錄</router-link>
                <router-link to="/records/daily" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">每日記錄</router-link>
            </div>
        </div>

        <div v-if="canView('personnel:read') || canView('events:create') || canView('accounts:manage_users') || canView('accounts:manage')" class="relative" @mouseenter="openDropdown('management')" @mouseleave="startCloseTimer('management')">
            <button ref="managementButtonRef" class="tab-button flex items-center" :class="{ 'tab-active': isRouteActive('/events') || isRouteActive('/personnel') || isRouteActive('/import') || isRouteActive('/system') }">
                <span>資料管理</span>
                <svg class="w-4 h-4 ml-1 transition-transform" :class="{'rotate-180': dropdowns.management}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
            </button>
            <div 
              ref="managementMenuRef" 
              v-if="dropdowns.management" 
              class="dropdown-menu-floating"
              @mouseenter="cancelCloseTimer('management')" 
              @mouseleave="startCloseTimer('management')"
            >
                <router-link v-if="canView('events:create')" to="/events" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">活動管理</router-link>
                <router-link v-if="canView('personnel:read')" to="/personnel" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">人員管理</router-link>
                <router-link v-if="canView('personnel:create')" to="/import/personnel" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">人員資料匯入</router-link>
                <router-link v-if="canView('records:create')" to="/import/checkin" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">簽到記錄匯入</router-link>
                <router-link v-if="canView('accounts:manage_users')" to="/system/accounts" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">帳號管理</router-link> <router-link v-if="canView('accounts:manage')" to="/system/permissions" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">權限管理</router-link> </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, nextTick } from 'vue'; 
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/store/auth';

const route = useRoute();
const authStore = useAuthStore();

// 'reactive' 用於管理一組相關的狀態，這裡用來控制所有下拉選單的開關
const dropdowns = reactive({
  dataAnalysis: false,
  records: false,
  management: false,
});

// [NEW] 用於儲存延遲關閉計時器的 ID
const closeTimers = reactive({
  dataAnalysis: null,
  records: null,
  management: null,
});

// Vue 模板引用，用於直接訪問 DOM 元素 
const dataAnalysisMenuRef = ref(null);
const recordsMenuRef = ref(null);
const managementMenuRef = ref(null);
const dataAnalysisButtonRef = ref(null);
const recordsButtonRef = ref(null);
const managementButtonRef = ref(null);


// 檢查使用者是否擁有特定權限
const canView = (permission) => authStore.hasPermission(permission);

// 檢查當前路由是否匹配特定路徑前綴，用於高亮顯示父級下拉選單
const isRouteActive = (path) => route.path.startsWith(path);

// [MODIFIED] 打開指定的下拉選單，並清除可能存在的關閉計時器
const openDropdown = async (menu) => { 
  // 當滑鼠移入主按鈕時，取消任何待處理的關閉計時器
  cancelCloseTimer(menu);

  // 先關閉所有其他下拉選單
  for (const key in dropdowns) {
    if (key !== menu) {
      dropdowns[key] = false;
    }
  }
  dropdowns[menu] = true;

  // 等待 DOM 更新，確保 v-if 渲染了菜單元素
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

  if (menuElement && buttonElement) {
    // 強制設定 display: block，以確保在所有情況下都能顯示
    menuElement.style.display = 'block'; 

    if (window.innerWidth <= 768) { // 手機版
      const rect = buttonElement.getBoundingClientRect();
      menuElement.style.top = `${rect.bottom + window.scrollY + 4}px`; 
    } else { // 桌面版，清除可能的手機版 top 設定
      menuElement.style.top = ''; 
    }
  }
};

// [NEW] 開始一個計時器，在延遲後關閉選單
const startCloseTimer = (menu) => {
  // 清除舊的計時器，以防萬一
  clearTimeout(closeTimers[menu]);
  // 設定一個新的計時器，200毫秒後關閉選單
  closeTimers[menu] = setTimeout(() => {
    dropdowns[menu] = false;
  }, 300); // 200毫秒的延遲
};

// [NEW] 取消即將關閉選單的計時器
const cancelCloseTimer = (menu) => {
  // 如果存在一個待處理的關閉計時器，就清除它
  if (closeTimers[menu]) {
    clearTimeout(closeTimers[menu]);
    closeTimers[menu] = null;
  }
};

</script>

<style scoped>
/* 專屬於此元件的樣式 */
.dropdown-menu-floating {
  position: absolute;
  /* `v-if` 會直接控制元素的渲染與移除，所以不需要 display: none; */
  /* display: none; */ 
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

/* [NEW] 手機版下拉選單固定定位和滿寬度 */
@media (max-width: 768px) {
    .dropdown-menu-floating {
        position: fixed; /* 使用 fixed 定位確保不被父元素裁剪 */
        left: 1rem;      /* 距離左邊 1rem */
        right: 1rem;     /* 距離右邊 1rem，達到滿寬度效果 */
        width: auto;     /* 寬度自動調整 */
        max-width: calc(100vw - 2rem); /* 最大寬度為視口寬度減去左右 padding */
        top: auto;       /* 讓垂直定位由 JS 或其他 flex/grid 屬性控制 */
        margin-top: 0;   /* 移除上邊距 */
    }
}
</style>
