<template>
  <!-- 
    使用 <Transition> 元件來為 Modal 的出現和消失添加漸變動畫
    `v-if="show"` 控制 Modal 的可見性
  -->
  <Transition name="modal-fade">
    <div v-if="show" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1001]">
      <!-- Modal 卡片本身 -->
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden transform transition-all" ref="modalCard">
        <!-- Modal 標題 -->
        <div class="bg-indigo-600 text-white px-6 py-4 flex justify-between items-center">
          <h3 class="text-xl font-bold">
            <!-- 具名插槽 'header'，用於插入自定義標題 -->
            <slot name="header">預設標題</slot>
          </h3>
          <button @click="close" class="text-white hover:text-gray-200 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <!-- Modal 主體內容 -->
        <div class="p-6">
          <!-- 預設插槽，用於插入 Modal 的主要內容，例如表單 -->
          <slot></slot>
        </div>

        <!-- Modal 頁腳 (可選) -->
        <div v-if="$slots.footer" class="px-6 py-4 bg-gray-50">
           <!-- 具名插槽 'footer'，用於插入操作按鈕 -->
          <slot name="footer"></slot>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref } from 'vue';

// 'defineProps' 用於定義父元件可以傳遞給此元件的屬性
const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
});

// 'defineEmits' 用於定義此元件可以觸發的事件
const emit = defineEmits(['close']);

const modalCard = ref(null);

// 關閉 Modal 的函式
const close = () => {
  emit('close');
};
</script>

<style scoped>
/* Modal 的漸變動畫 */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

/* Modal 卡片的進入/離開動畫 */
.modal-fade-enter-active .transform {
  transition: transform 0.3s ease-out;
}
.modal-fade-leave-active .transform {
  transition: transform 0.2s ease-in;
}

.modal-fade-enter-from .transform {
  transform: scale(0.95);
}
.modal-fade-leave-to .transform {
  transform: scale(0.95);
}
</style>
