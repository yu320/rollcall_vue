<template>
  <div>
    <div class="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
      <div class="relative w-full md:w-1/3">
        <input 
          :value="filters.searchTerm" 
          @input="$emit('update:filters', { ...filters, searchTerm: $event.target.value })" 
          type="text" 
          placeholder="搜尋姓名、學號、卡號..." 
          class="w-full border rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-indigo-400"
        >
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
      </div>
      <div class="flex items-center gap-2 w-full md:w-auto flex-wrap justify-end">
        <select 
          :value="filters.sortBy"
          @input="$emit('update:filters', { ...filters, sortBy: $event.target.value })"
          class="w-full sm:w-auto border rounded-lg px-4 py-2 bg-white focus:ring-2 focus:ring-indigo-400"
        >
          <option value="name_asc">依姓名排序 (A-Z)</option>
          <option value="name_desc">依姓名排序 (Z-A)</option>
          <option value="code_asc">依學號排序 (A-Z)</option>
          <option value="code_desc">依學號排序 (Z-A)</option>
        </select>
        <select 
          :value="pageSize"
          @input="$emit('update:pageSize', parseInt($event.target.value, 10))"
          class="w-full sm:w-auto border rounded-lg px-4 py-2 bg-white focus:ring-2 focus:ring-indigo-400"
        >
          <option value="12">每頁 12 筆</option>
          <option value="24">每頁 24 筆</option>
          <option value="48">每頁 48 筆</option>
        </select>
        <button v-if="authStore.hasPermission('personnel:create')" @click="$emit('add-new')" class="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-lg shadow-sm transition flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
          新增人員
        </button>
        </div>
    </div>
    
    <div v-if="selectedCount > 0" class="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg flex flex-wrap items-center gap-4">
        <span class="text-sm font-medium text-indigo-800">{{ selectedCount }} 位已選取</span>
        <div class="flex items-center gap-2 flex-wrap">
            <button @click="$emit('batch-delete')" class="bg-red-600 hover:bg-red-700 text-white font-medium py-1 px-3 rounded-lg text-sm shadow-sm transition flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clip-rule="evenodd" /></svg>
              刪除選取
            </button>
            <button @click="$emit('batch-add-tags')" class="bg-blue-600 hover:bg-blue-700 text-white font-medium py-1 px-3 rounded-lg text-sm transition shadow-sm flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M7 7h.01M7 3h5c.512 0 1.02.052 1.514.156M21 12v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h5m2 2l-2 2m4-4l-2 2" /></svg>
              批量增加標籤
            </button>
            <button @click="$emit('export-selected')" class="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-1 px-3 rounded-lg text-sm transition shadow-sm flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                匯出選取
            </button>
        </div>
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from '@/store/auth'; // 引入 auth store
const authStore = useAuthStore(); // 建立 auth store 實例

defineProps({
  filters: Object,
  pageSize: Number,
  selectedCount: Number,
});

defineEmits([
  'update:filters',
  'update:pageSize',
  'add-new',
  'batch-delete',
  'batch-add-tags',
  'export-selected'
]);
</script>
