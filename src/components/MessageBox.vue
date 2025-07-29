<template>
  <!-- 訊息框容器，固定在右下角 -->
  <div class="fixed bottom-4 right-4 z-[1001] w-full max-w-xs space-y-3">
    <!-- 
      使用 <TransitionGroup> 來為列表中的每個項目添加進入和離開的動畫
    -->
    <TransitionGroup name="list" tag="div">
      <!-- 遍歷 store 中的所有訊息並顯示 -->
      <div 
        v-for="message in uiStore.messages" 
        :key="message.id"
        :class="messageBoxClass(message.type)"
        class="p-4 rounded-lg shadow-lg text-white flex justify-between items-center"
      >
        <span>{{ message.text }}</span>
        <button @click="uiStore.removeMessage(message.id)" class="ml-4 opacity-70 hover:opacity-100">&times;</button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { useUiStore } from '@/store/ui';

const uiStore = useUiStore();

// 根據訊息類型返回對應的 CSS class
const messageBoxClass = (type) => {
  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500',
  };
  return colors[type] || colors.info;
};
</script>

<style scoped>
/* 列表項目的進入/離開動畫 */
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>
