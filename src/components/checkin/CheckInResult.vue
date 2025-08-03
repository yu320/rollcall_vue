<template>
  <div v-if="result" class="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 mt-8">
    <div :class="result.statusColorClass" class="px-6 py-4 text-center">
      <div class="check-in-animation inline-flex items-center justify-center w-16 h-16 rounded-full text-white mb-4" :class="result.statusBgColorClass">
        <div v-html="result.statusIcon"></div>
      </div>
      <h3 class="text-2xl font-bold" :class="result.statusTextColorClass">{{ result.statusText }}</h3>
    </div>
    <div class="p-6">
      <div class="mb-6" v-html="result.personInfoHtml"></div>
      <div class="text-center">
        <button @click="$emit('reset')" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-8 rounded-lg transition duration-300 transform hover:scale-105 shadow-md">
          繼續報到
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  result: Object,
});

defineEmits(['reset']);
</script>

<style scoped>
.check-in-animation {
  animation: bounce-in 0.8s cubic-bezier(0.68, -0.55, 0.27, 1.55) forwards;
}

@keyframes bounce-in {
  0% {
    opacity: 0;
    transform: scale(0.3);
  }
  50% {
    opacity: 1;
    transform: scale(1.1);
  }
  70% {
    transform: scale(0.9);
  }
  100% {
    transform: scale(1);
  }
}
</style>