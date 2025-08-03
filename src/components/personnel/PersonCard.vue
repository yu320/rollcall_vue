<template>
  <div 
    class="person-card bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300 hover:shadow-xl flex flex-col justify-between"
    :class="{ 'ring-2 ring-indigo-500': isSelected }"
  >
    <div>
      <div class="bg-purple-100 px-5 py-3 border-b border-purple-200">
          <h3 class="text-lg font-bold text-purple-800 truncate">{{ person.name }}</h3>
      </div>
      <div class="p-4 space-y-3">
        <div class="bg-green-50 p-3 rounded-lg">
          <div class="flex items-center text-sm text-green-800 font-semibold">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
            <span class="ml-2">學號</span>
          </div>
          <p class="font-mono text-xl mt-1 ml-1 tracking-wider" :class="dataStore.getInputColorClass(person.code)">{{ person.code }}</p>
        </div>
        <div class="bg-blue-50 p-3 rounded-lg">
          <div class="flex items-center text-sm text-blue-800 font-semibold">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v12a1 1 0 01-1-1H4a1 1 0 01-1-1V4zm3 2a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 4a1 1 0 100 2h4a1 1 0 100-2H7z" clip-rule="evenodd" /></svg>
            <span class="ml-2">卡號</span>
          </div>
          <p class="text-gray-900 font-mono text-xl mt-1 ml-1 tracking-wider">{{ person.card_number }}</p>
        </div>
        <div class="bg-teal-50 p-3 rounded-lg">
          <div class="flex items-center text-sm text-teal-800 font-semibold">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1h-2V3a1 1 0 011-1zM5 5a1 1 0 011-1h8a1 1 0 011 1v1H5V5zm0 2h10v9a1 1 0 01-1 1H6a1 1 0 01-1-1V7zm2 2a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd" /></svg>
            <span class="ml-2">棟別</span>
          </div>
          <p class="text-gray-900 font-mono text-xl mt-1 ml-1 tracking-wider">{{ person.building || '-' }}</p>
        </div>
        <div class="pt-2">
          <p class="text-sm font-medium text-gray-500 mb-2">標籤:</p>
          <div v-if="person.tags && person.tags.length" class="flex flex-wrap gap-2">
            <span v-for="tag in person.tags" :key="tag" class="bg-yellow-200 text-yellow-800 text-xs font-medium px-2.5 py-1 rounded-full">{{ tag }}</span>
          </div>
          <span v-else class="text-gray-400">-</span>
        </div>
      </div>
    </div>
    <div class="px-4 pb-4 pt-2 flex justify-end items-center gap-4">
      <input 
        type="checkbox" 
        :checked="isSelected"
        @change="$emit('update:selected', $event.target.checked)"
        class="personnel-checkbox h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" 
        @click.stop
      >
      <button @click.stop="$emit('edit', person)" class="edit-btn text-indigo-600 hover:text-indigo-800 p-1 rounded-full transition-colors" :aria-label="'編輯人員 ' + person.name"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
      <button @click.stop="$emit('delete', person)" class="delete-btn text-red-600 hover:text-red-800 p-1 rounded-full transition-colors" :aria-label="'刪除人員 ' + person.name"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
    </div>
  </div>
</template>

<script setup>
import { useDataStore } from '@/store/data';
const dataStore = useDataStore();

defineProps({
  person: Object,
  isSelected: Boolean,
});

defineEmits(['update:selected', 'edit', 'delete']);
</script>

<style scoped>
.person-card {
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
}
</style>