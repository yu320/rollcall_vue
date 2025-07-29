<template>
  <!-- 只有在使用者登入後才顯示主佈局 -->
  <div v-if="authStore.isLoggedIn" class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
    <!-- 頂部標頭元件 -->
    <AppHeader />

    <!-- 主導覽列元件 -->
    <AppNav />

    <!-- 主要內容區域，Vue Router 會在這裡渲染對應的頁面元件 -->
    <main id="mainContent" class="container mx-auto px-4 py-8">
      <router-view v-slot="{ Component }">
        <!-- 使用 <transition> 和 <keep-alive> 優化頁面切換體驗 -->
        <transition name="fade" mode="out-in">
          <keep-alive>
            <component :is="Component" />
          </keep-alive>
        </transition>
      </router-view>
    </main>

    <!-- 頁腳 -->
    <footer class="bg-gray-800 py-5 mt-10 shadow-inner">
        <div class="container mx-auto px-4 text-center text-gray-400 text-sm">
            &copy; Copyright &copy; 2025 Hong. All rights Reserved
        </div>
    </footer>

  </div>

  <!-- 如果使用者未登入，則只渲染登入頁面 -->
  <router-view v-else></router-view>

  <!-- 全域 UI 元件 -->
  <LoadingOverlay />
  <MessageBox />

</template>

<script setup>
import { useAuthStore } from '@/store/auth';
import AppHeader from '@/components/AppHeader.vue';
import AppNav from '@/components/AppNav.vue';
import LoadingOverlay from '@/components/LoadingOverlay.vue';
import MessageBox from '@/components/MessageBox.vue';

// 獲取 auth store 的實例
const authStore = useAuthStore();
</script>

<style>
/* 頁面切換的淡入淡出動畫 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
