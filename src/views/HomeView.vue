<template>
  <div class="container mx-auto px-4 py-8">
    <div class="bg-gradient-to-br from-indigo-600 to-purple-700 text-white rounded-xl shadow-lg p-8 md:p-12 text-center mb-8">
      <h1 class="text-4xl md:text-5xl font-extrabold mb-4">歡迎使用報到管理系統</h1>
      <p class="text-xl md:text-2xl opacity-90">請選擇您要前往的功能頁面，開始您的工作。</p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <!-- 報到卡片 -->
      <router-link to="/checkin" class="feature-card group" v-if="canView('checkin:use')">
        <div class="icon-wrapper bg-indigo-100 text-indigo-600 group-hover:bg-indigo-200">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
          </svg>
        </div>
        <h2 class="card-title">報到系統</h2>
        <p class="card-description">直觀的介面，支援學號/卡號輸入進行簽到與簽退。</p>
      </router-link>

      <!-- 總覽卡片 -->
      <router-link to="/overview" class="feature-card group" v-if="canView('overview:view')">
        <div class="icon-wrapper bg-blue-100 text-blue-600 group-hover:bg-blue-200">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.297-.297.77-.297 1.067 0l4.096 4.096A2.25 2.25 0 0116 13.5v2.25m-5-10.242-4.5 4.5a2.25 2.25 0 00-3.182 3.182V21M12 12.75l12-4.5" />
          </svg>
        </div>
        <h2 class="card-title">系統總覽</h2>
        <p class="card-description">提供人員、活動、簽到總數等統計數據與圖表。</p>
      </router-link>

      <!-- 儀表板卡片 -->
      <router-link to="/dashboard" class="feature-card group" v-if="canView('reports:view')">
        <div class="icon-wrapper bg-green-100 text-green-600 group-hover:bg-green-200">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 9l10.5-9m0 0H9m3 3h5m-3 12a5.25 5.25 0 10-10.5 0 5.25 5.25 0 0010.5 0z" />
          </svg>
        </div>
        <h2 class="card-title">活動儀表板</h2>
        <p class="card-description">針對單一活動提供應到/實到人數、簽到時間線分析。</p>
      </router-link>

      <!-- 報表卡片 -->
      <router-link to="/report" class="feature-card group" v-if="canView('reports:view')">
        <div class="icon-wrapper bg-yellow-100 text-yellow-600 group-hover:bg-yellow-200">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V8.25A2.25 2.25 0 015.25 6h13.5A2.25 2.25 0 0121 8.25v10.5A2.25 2.25 0 0118.75 21H5.25A2.25 2.25 0 013 18.75z" />
          </svg>
        </div>
        <h2 class="card-title">活動報表分析</h2>
        <p class="card-description">提供基於日期範圍的活動參與、棟別、人員分析。</p>
      </router-link>

      <!-- 資料管理卡片 -->
      <router-link
        to="/personnel"
        class="feature-card group"
        v-if="canViewAny(['personnel:read', 'events:create', 'personnel:create', 'records:create'])"
      >
        <div class="icon-wrapper bg-purple-100 text-purple-600 group-hover:bg-purple-200">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 5.25H12m-8.25 0H3m8.25 0h8.25m-8.25 0H12M9 3v4.5m0 0V21m-3.75-9H12m-8.25 0H3m8.25 0h8.25m-8.25 0H12M9 15v4.5m0 0V21m3-15h.75m-1.5 0H21M12 6v1.5m0 0V21m3-15h.75m-1.5 0H21M15 12v4.5m0 0V21" />
          </svg>
        </div>
        <h2 class="card-title">資料管理</h2>
        <p class="card-description">管理人員、活動資料，並支援檔案匯入與記錄匯入。</p>
      </router-link>

      <!-- 系統管理卡片 -->
      <router-link
        to="/system/accounts"
        class="feature-card group"
        v-if="canViewAny(['accounts:manage_users', 'accounts:manage'])"
      >
        <div class="icon-wrapper bg-red-100 text-red-600 group-hover:bg-red-200">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8H7.5m-1.5 0H3m8.25 0H12M9 6v1.5m0 0V21m3-15h.75m-1.5 0H21M12 6v1.5m0 0V21m3-15h.75m-1.5 0H21M15 12v4.5m0 0V21" />
          </svg>
        </div>
        <h2 class="card-title">系統管理</h2>
        <p class="card-description">管理使用者帳號及角色權限分配。</p>
      </router-link>

    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from '@/store/auth';

const authStore = useAuthStore();

// 檢查使用者是否擁有特定權限
const canView = (permission) => authStore.hasPermission(permission);

// 檢查使用者是否擁有任一權限（用於顯示父類別卡片）
const canViewAny = (permissions) => permissions.some(permission => authStore.hasPermission(permission));
</script>

<style scoped>
.feature-card {
  @apply bg-white rounded-xl shadow-lg p-6 border border-gray-200 flex flex-col items-center text-center transition-all duration-300 hover:shadow-xl hover:-translate-y-1;
}

.icon-wrapper {
  @apply w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors duration-300;
}

.card-title {
  @apply text-xl font-bold text-gray-800 mb-2;
}

.card-description {
  @apply text-sm text-gray-600 mb-4;
}
</style>
