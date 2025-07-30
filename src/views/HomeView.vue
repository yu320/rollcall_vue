<template>
  <div class="container mx-auto px-4 py-8">
    <div class="bg-gradient-to-br from-custom-rich-black/90 to-custom-midnight-green/90 text-custom-beige rounded-xl shadow-lg p-8 md:p-12 text-center mb-8">
      <h1 class="text-4xl md:text-5xl font-extrabold mb-4">歡迎使用報到管理系統</h1>
      <p class="text-xl md:text-2xl opacity-90">請選擇您要前往的功能頁面，開始您的工作。</p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
      <!-- 報到卡片 -->
      <router-link to="/checkin" class="feature-card group" v-if="canView('checkin:use')">
        <div class="icon-wrapper">
          <!-- 新 icon: 證件卡 + 打勾 -->
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-10 h-10">
            <rect x="3" y="5" width="18" height="14" rx="2" ry="2" stroke-linejoin="round"/>
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 10h8M8 14h4M9 18l3 3 6-6"/>
          </svg>
        </div>
        <h2 class="card-title">報到系統</h2>
        <p class="card-description">直觀的介面，支援學號/卡號輸入進行簽到與簽退。</p>
      </router-link>

      <!-- 總覽卡片 -->
      <router-link to="/overview" class="feature-card group" v-if="canView('overview:view')">
        <div class="icon-wrapper">
          <!-- 新 icon: 圖表統計 -->
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-10 h-10">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 17h4v-6H3v6zM9 17h4v-10H9v10zM15 17h4v-4h-4v4z"/>
          </svg>
        </div>
        <h2 class="card-title">系統總覽</h2>
        <p class="card-description">提供人員、活動、簽到總數等統計數據與圖表。</p>
      </router-link>

      <!-- 儀表板卡片 -->
      <router-link to="/dashboard" class="feature-card group" v-if="canView('reports:view')">
        <div class="icon-wrapper">
          <!-- 新 icon: 儀表盤 -->
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-10 h-10">
            <circle cx="12" cy="12" r="9" stroke-linejoin="round"/>
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6l4 2"/>
          </svg>
        </div>
        <h2 class="card-title">活動儀表板</h2>
        <p class="card-description">針對單一活動提供應到/實到人數、簽到時間線分析。</p>
      </router-link>

      <!-- 報表卡片 -->
      <router-link to="/report" class="feature-card group" v-if="canView('reports:view')">
        <div class="icon-wrapper">
          <!-- 新 icon: 文件報表 -->
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-10 h-10">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6M9 16h6M9 8h6M7 20h10a2 2 0 002-2V6a2 2 0 00-2-2H7a2 2 0 00-2 2v12a2 2 0 002 2z"/>
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
        <div class="icon-wrapper">
          <!-- 新 icon: 使用者管理 -->
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-10 h-10">
            <circle cx="12" cy="7" r="4" stroke-linejoin="round"/>
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 21v-2a4 4 0 018 0v2"/>
            <path stroke-linecap="round" stroke-linejoin="round" d="M18 21v-2a4 4 0 00-3-3.87"/>
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
        <div class="icon-wrapper">
          <!-- 新 icon: 齒輪設定 -->
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-10 h-10">
            <circle cx="12" cy="12" r="3" stroke-linejoin="round"/>
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.4 15a1.7 1.7 0 00.33 2.03l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.7 1.7 0 00-2.03-.33 1.7 1.7 0 00-1 1.52V21a2 2 0 01-4 0v-.09a1.7 1.7 0 00-1-1.52 1.7 1.7 0 00-2.03.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.7 1.7 0 00.33-2.03 1.7 1.7 0 00-1.52-1H3a2 2 0 010-4h.09a1.7 1.7 0 001.52-1 1.7 1.7 0 00-.33-2.03l-.06-.06a2 2 0 012.83-2.83l.06.06a1.7 1.7 0 002.03.33h.01a1.7 1.7 0 001-1.52V3a2 2 0 014 0v.09a1.7 1.7 0 001 1.52z"/>
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

const canView = (permission) => authStore.hasPermission(permission);
const canViewAny = (permissions) => permissions.some(permission => authStore.hasPermission(permission));
</script>

<style scoped>
.bg-custom-rich-black { background-color: #01161e; }
.bg-custom-midnight-green { background-color: #124559; }
.bg-custom-air-force-blue { background-color: #598392; }
.bg-custom-ash-gray { background-color: #aec3b0; }
.text-custom-beige { color: #eff6e0; }
.text-custom-midnight-green { color: #124559; }

.feature-card {
  @apply relative overflow-hidden bg-white rounded-xl shadow-lg p-6 border border-gray-200 flex flex-col items-center text-center transition-transform duration-300 hover:shadow-2xl hover:-translate-y-1 hover:scale-105;
}

.feature-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #598392 0%, #aec3b0 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
  border-radius: 1rem;
  z-index: 0;
}

.feature-card:hover::before {
  opacity: 0.1;
}

.feature-card > * {
  position: relative;
  z-index: 10;
}

.icon-wrapper {
  @apply w-20 h-20 rounded-full flex items-center justify-center mb-4 transition-colors duration-300 bg-custom-ash-gray text-custom-midnight-green group-hover:bg-custom-air-force-blue group-hover:text-white;
}

.card-title {
  @apply text-2xl font-extrabold text-gray-900 mb-2;
}

.card-description {
  @apply text-base text-gray-700;
}
</style>
