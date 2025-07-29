<template>
  <div class="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-6 border border-indigo-200">
    <h2 class="text-3xl font-bold text-indigo-800 mb-2">匯入人員資料</h2>
    <p class="text-gray-600 mb-8">支援從 CSV 檔案批次匯入，或手動貼上資料。系統會根據學號或卡號自動新增或更新人員資料。</p>
    
    <!-- CSV File Import Section -->
    <div class="mb-8 pb-8 border-b border-gray-200">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
        <h3 class="text-xl font-semibold text-gray-800">1. 從檔案匯入</h3>
        <a href="#" @click.prevent="downloadSample" class="text-indigo-600 hover:text-indigo-800 font-medium text-sm mt-2 sm:mt-0">下載範例檔</a>
      </div>
      <input type="file" id="importFile" @change="handleFileSelect" accept=".csv" class="w-full text-gray-700 border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-400">
      <p v-if="selectedFile" class="text-gray-500 text-sm mt-2">已選擇檔案: {{ selectedFile.name }}</p>
      <button @click="importFromFile" :disabled="!selectedFile" class="mt-5 w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-6 rounded-lg transition duration-300 flex items-center justify-center shadow-md hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed">
        匯入檔案
      </button>
    </div>

    <!-- Manual Input Section -->
    <div class="mb-4">
      <h3 class="text-xl font-semibold text-gray-800 mb-2">2. 手動輸入</h3>
      <p class="text-gray-500 text-sm mb-4">每行一筆，格式為：<br><code class="text-xs bg-gray-100 p-1 rounded">姓名,學號,卡號,棟別,"標籤1;標籤2"</code><br>(棟別與標籤為選填，多個標籤請用分號分隔)</p>
      <textarea v-model="manualInput" rows="10" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-4" placeholder="王大明,A001,11111111,A1,幹部;全職&#10;陳小美,B002,22222222,B2,職員"></textarea>
      <div class="flex justify-end">
        <button @click="importFromText" :disabled="!manualInput.trim()" class="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-lg transition duration-300 shadow-md hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed">
          手動匯入
        </button>
      </div>
    </div>

     <!-- Import Result Section -->
    <div v-if="importResult" class="mt-8 border-t border-gray-200 pt-6">
      <h3 class="text-2xl font-bold text-gray-800 mb-4">匯入結果</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-blue-50 p-4 rounded-lg text-center">
          <p class="text-sm text-blue-700 font-medium">處理總數</p>
          <p class="text-3xl font-bold text-blue-800">{{ importResult.totalProcessed }}</p>
        </div>
        <div class="bg-green-50 p-4 rounded-lg text-center">
          <p class="text-sm text-green-700 font-medium">成功新增</p>
          <p class="text-3xl font-bold text-green-800">{{ importResult.successCount }}</p>
        </div>
         <div class="bg-yellow-50 p-4 rounded-lg text-center">
          <p class="text-sm text-yellow-700 font-medium">成功更新</p>
          <p class="text-3xl font-bold text-yellow-800">{{ importResult.updateCount }}</p>
        </div>
        <div class="bg-red-50 p-4 rounded-lg text-center">
          <p class="text-sm text-red-700 font-medium">失敗筆數</p>
          <p class="text-3xl font-bold text-red-800">{{ importResult.errors.length }}</p>
        </div>
      </div>
      <div v-if="importResult.errors.length > 0" class="mt-4">
        <h4 class="text-lg font-semibold text-red-700 mb-2">失敗詳情</h4>
        <ul class="list-disc list-inside bg-red-50 p-4 rounded-lg text-red-800 text-sm space-y-1 max-h-48 overflow-y-auto">
          <li v-for="(error, index) in importResult.errors" :key="index">{{ error }}</li>
        </ul>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useUiStore } from '@/store/ui';
import * as api from '@/services/api';

const uiStore = useUiStore();
const router = useRouter();

const manualInput = ref('');
const selectedFile = ref(null);
const importResult = ref(null);

const handleFileSelect = (event) => {
  selectedFile.value = event.target.files[0];
  importResult.value = null;
};

const importFromFile = () => {
  if (!selectedFile.value) {
    uiStore.showMessage('請選擇一個 CSV 檔案。', 'info');
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => processImport(e.target.result);
  reader.onerror = () => uiStore.showMessage('讀取檔案失敗。', 'error');
  reader.readAsText(selectedFile.value, 'UTF-8');
};

const importFromText = () => {
  const text = manualInput.value.trim();
  if (!text) {
    uiStore.showMessage('請輸入要匯入的資料。', 'info');
    return;
  }
  // Add a header row for consistent parsing
  const dataWithHeader = `姓名,學號,卡號,棟別,標籤\n${text}`;
  processImport(dataWithHeader);
};

const processImport = async (csvText) => {
  uiStore.setLoading(true);
  importResult.value = null;

  try {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) { // Must have header + at least one data row
      throw new Error("沒有有效的資料可供匯入。");
    }

    const personnelToProcess = [];
    const validationErrors = [];

    // Start from 1 to skip header
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
      const [name, code, cardNumber, building, tagsStr] = parts.map(p => (p || '').trim().replace(/^"|"$/g, ''));
      
      if (!name || !code || !cardNumber) {
        validationErrors.push(`第 ${i + 1} 行資料不完整 (姓名、學號、卡號為必填)。`);
        continue;
      }

      const tags = tagsStr ? tagsStr.split(';').map(t => t.trim()).filter(Boolean) : [];
      personnelToProcess.push({ name, code, card_number: cardNumber, building: building || null, tags });
    }

    if (validationErrors.length > 0) {
      throw new Error(validationErrors.join('<br>'));
    }

    if (personnelToProcess.length === 0) {
      uiStore.showMessage('分析後沒有可匯入的新資料。', 'info');
      return;
    }

    const result = await api.upsertPersonnel(personnelToProcess);
    importResult.value = result;

    uiStore.showMessage(`匯入處理完成！成功新增 ${result.successCount}, 更新 ${result.updateCount} 筆。`, 'success');
    
    // Clear input after success
    manualInput.value = '';
    selectedFile.value = null;
    // Reset file input visually
    const fileInput = document.getElementById('importFile');
    if(fileInput) fileInput.value = '';


  } catch (error) {
    uiStore.showMessage(`匯入失敗: ${error.message}`, 'error');
  } finally {
    uiStore.setLoading(false);
  }
};

const downloadSample = () => {
  const csvContent = '姓名,學號,卡號,棟別,標籤\n"王大明","A001","11111111","A1","管理員;全職"\n"陳小美","B002","22222222","B2","職員"';
  const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = '人員匯入範例.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
</script>
