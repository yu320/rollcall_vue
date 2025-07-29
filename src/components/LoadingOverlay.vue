<template>
  <!-- 全局載入遮罩層 -->
  <Transition name="fade">
    <div v-if="uiStore.isLoading" class="fixed inset-0 bg-gray-900 bg-opacity-75 flex flex-col items-center justify-center z-[1002]">
      <div class="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-indigo-500"></div>
      <p class="text-white text-lg ml-4 mt-4">載入中...</p>
    </div>
  </Transition>
</template>

<script setup>
import { useUiStore } from '@/store/ui';

// 獲取 Pinia 的 ui store 實例
const uiStore = useUiStore();
</script>

<style scoped>
/* 漸變動畫 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
