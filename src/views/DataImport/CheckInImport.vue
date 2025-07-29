<template>
  <div class="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-6 border border-indigo-200">
    <h2 class="text-3xl font-bold text-indigo-800 mb-2">匯入簽到記錄</h2>
    <p class="text-gray-600 mb-6">從外部系統匯入名單，系統將自動比對人員並建立記錄。如果人員不存在，將會自動建立基本資料。</p>
    
    <div class="space-y-6">
      <!-- Step 1: Select Event -->
      <div class="p-4 border border-gray-200 rounded-lg">
        <label for="eventSelector" class="block text-lg font-semibold text-gray-800 mb-2">
          <span class="bg-indigo-500 text-white rounded-full h-6 w-6 inline-flex items-center justify-center mr-2">1</span>
          選擇關聯活動 (選填)
        </label>
        <select id="eventSelector" v-model="selectedEventId" class="w-full pl-4 pr-10 py-3 border border-gray-300 rounded-lg bg-white">
          <option :value="null">-- 不關聯任何活動 --</option>
          <option v-for="event in events" :key="event.id" :value="event.id">{{ event.name }} ({{ formatDateTime(event.start_time) }})</option>
        </select>
      </div>
      
      <!-- Step 2: Select Type -->
      <div class="p-4 border border-gray-200 rounded-lg">
        <label class="block text-lg font-semibold text-gray-800 mb-2">
          <span class="bg-indigo-500 text-white rounded-full h-6 w-6 inline-flex items-center justify-center mr-2">2</span>
          選擇匯入類型
        </label>
        <div class="flex justify-center gap-4 mt-2">
          <label class="inline-flex items-center cursor-pointer">
            <input type="radio" v-model="actionType" value="簽到" class="form-radio h-5 w-5 text-indigo-600">
            <span class="ml-2 text-lg font-medium text-gray-800">簽到</span>
          </label>
          <label class="inline-flex items-center cursor-pointer">
            <input type="radio" v-model="actionType" value="簽退" class="form-radio h-5 w-5 text-indigo-600">
            <span class="ml-2 text-lg font-medium text-gray-800">簽退</span>
          </label>
        </div>
      </div>
      
      <!-- Step 3: Upload File -->
      <div class="p-4 border border-gray-200 rounded-lg">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3">
          <label for="importCheckinFile" class="block text-lg font-semibold text-gray-800">
            <span class="bg-indigo-500 text-white rounded-full h-6 w-6 inline-flex items-center justify-center mr-2">3</span>
            上傳 CSV 檔案
          </label>
          <a href="#" @click.prevent="downloadSample" class="text-indigo-600 hover:text-indigo-800 font-medium text-sm mt-2 sm:mt-0">下載範例檔</a>
        </div>
        <input type="file" id="importCheckinFile" @change="handleFileSelect" accept=".csv" class="w-full text-gray-700 border border-gray-300 rounded-lg p-2">
        <p v-if="selectedFile" class="text-gray-500 text-sm mt-2">已選擇檔案: {{ selectedFile.name }}</p>
      </div>

      <!-- Submit Button -->
      <div class="text-center">
        <button @click="processImport" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-lg text-lg">
          開始匯入
        </button>
      </div>
    </div>

    <!-- Import Result Section -->
    <div v-if="importResult" class="mt-8 border-t border-gray-200 pt-6">
      <h3 class="text-2xl font-bold text-gray-800 mb-4">匯入結果</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="bg-green-50 p-4 rounded-lg">
          <p class="text-sm text-green-700 font-medium">成功匯入記錄</p>
          <p class="text-3xl font-bold text-green-800">{{ importResult.successCount }}</p>
        </div>
        <div class="bg-blue-50 p-4 rounded-lg">
          <p class="text-sm text-blue-700 font-medium">自動建立人員</p>
          <p class="text-3xl font-bold text-blue-800">{{ importResult.autoCreatedCount }}</p>
        </div>
      </div>
      <div v-if="importResult.errors.length > 0" class="mt-4">
        <h4 class="text-lg font-semibold text-red-700 mb-2">失敗詳情</h4>
        <ul class="list-disc list-inside bg-red-50 p-4 rounded-lg text-red-800 text-sm space-y-1">
          <li v-for="(error, index) in importResult.errors" :key="index">{{ error }}</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useUiStore } from '@/store/ui';
import { api } from '@/services/api';
import { formatDateTime } from '@/utils'; // Assuming you have this utility

const uiStore = useUiStore();
const events = ref([]);
const selectedEventId = ref(null);
const actionType = ref('簽到');
const selectedFile = ref(null);
const importResult = ref(null);

onMounted(async () => {
  try {
    events.value = await api.fetchEvents();
  } catch (error) {
    uiStore.showMessage('無法載入活動列表', 'error');
  }
});

const handleFileSelect = (event) => {
  selectedFile.value = event.target.files[0];
  importResult.value = null; // Reset result when new file is selected
};

const processImport = async () => {
  if (!selectedFile.value) {
    uiStore.showMessage('請選擇一個 CSV 檔案。', 'info');
    return;
  }

  uiStore.setLoading(true);
  importResult.value = { successCount: 0, autoCreatedCount: 0, errors: [] };

  try {
    const csvText = await selectedFile.value.text();
    // In a real-world scenario, you might need a library like papaparse
    const lines = csvText.split('\n');
    const headers = lines[0].trim().split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    
    // Auto-detect columns
    const nameIndex = headers.indexOf('姓名');
    const idIndex = headers.indexOf('學號/卡號') > -1 ? headers.indexOf('學號/卡號') : headers.indexOf('教職員生編號');
    const timeIndex = headers.indexOf('刷卡時間') > -1 ? headers.indexOf('刷卡時間') : headers.indexOf('IC靠卡時間');

    if (nameIndex === -1 || idIndex === -1 || timeIndex === -1) {
      throw new Error("CSV 標頭格式不符。請確認欄位名稱。");
    }

    const dataLines = lines.slice(1).filter(line => line.trim());
    const importData = dataLines.map((line, index) => {
      const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
      return {
        name: parts[nameIndex],
        identifier: parts[idIndex],
        timestamp: parts[timeIndex],
        line: index + 2,
      };
    });

    const result = await api.importCheckinRecords({
      records: importData,
      eventId: selectedEventId.value,
      actionType: actionType.value
    });
    
    importResult.value = result;
    uiStore.showMessage('匯入處理完成。', 'success');

  } catch (error) {
    uiStore.showMessage(`匯入失敗: ${error.message}`, 'error');
  } finally {
    uiStore.setLoading(false);
  }
};

const downloadSample = () => {
  const csvContent = '姓名,學號/卡號,刷卡時間\n"張小明","A11312011","2025/07/26 09:00:00"\n"李華","1234567899","2025/07/26 09:05:30"';
  const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = '簽到匯入範例.csv';
  link.click();
  URL.revokeObjectURL(link.href);
};
</script>
