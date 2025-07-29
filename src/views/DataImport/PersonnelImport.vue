<template>
  <div class="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-6 border border-indigo-200">
    <h2 class="text-3xl font-bold text-indigo-800 mb-6">匯入人員資料</h2>
    <p class="text-gray-700 mb-6 text-lg">您可以選擇匯入檔案或手動輸入資料。</p>
    
    <!-- CSV File Import Section -->
    <div class="mb-8 pb-6 border-b border-gray-200">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
        <label for="importFile" class="block text-gray-700 font-medium text-lg">選擇 CSV 檔案匯入</label>
        <a href="#" @click.prevent="downloadSample" class="text-indigo-600 hover:text-indigo-800 font-medium text-sm mt-2 sm:mt-0">下載範例檔</a>
      </div>
      <input type="file" id="importFile" @change="handleFileSelect" accept=".csv" class="w-full text-gray-700 border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-400">
      <p v-if="selectedFile" class="text-gray-500 text-sm mt-2">已選擇檔案: {{ selectedFile.name }}</p>
      <button @click="importFromFile" class="mt-5 w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-6 rounded-lg transition duration-300 flex items-center justify-center shadow-md hover:shadow-lg">
        匯入檔案
      </button>
    </div>

    <!-- Manual Input Section -->
    <div class="mb-4">
      <label class="block text-gray-700 font-medium mb-2 text-lg">手動輸入人員資料</label>
      <p class="text-gray-500 text-sm mb-4">每行一筆，格式為：<br><span class="font-medium">姓名,學號,卡號,棟別,"標籤1;標籤2" (棟別與標籤為選填)</span></p>
      <textarea v-model="manualInput" rows="10" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-4" placeholder="請輸入資料..."></textarea>
      <div class="flex justify-end">
        <button @click="importFromText" class="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-lg transition duration-300 shadow-md hover:shadow-lg">
          手動匯入資料
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useUiStore } from '@/store/ui';
import { api } from '@/services/api';

const uiStore = useUiStore();
const router = useRouter();

const manualInput = ref('');
const selectedFile = ref(null);

const handleFileSelect = (event) => {
  selectedFile.value = event.target.files[0];
};

const importFromFile = () => {
  if (!selectedFile.value) {
    uiStore.showMessage('請選擇一個 CSV 檔案。', 'info');
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => processImport(e.target.result, 'file');
  reader.onerror = () => uiStore.showMessage('讀取檔案失敗。', 'error');
  reader.readAsText(selectedFile.value, 'UTF-8');
};

const importFromText = () => {
  if (!manualInput.value.trim()) {
    uiStore.showMessage('請輸入要匯入的資料。', 'info');
    return;
  }
  const dataWithHeader = `姓名,學號,卡號,棟別,標籤\n${manualInput.value.trim()}`;
  processImport(dataWithHeader, 'manual');
};

const processImport = async (csvText, source) => {
  uiStore.setLoading(true);
  try {
    const lines = csvText.split('\n').slice(1);
    const personnelToProcess = [];
    const validationErrors = [];

    lines.forEach((line, index) => {
      line = line.trim();
      if (!line) return;

      const parts = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
      const [name, code, cardNumber, building, tagsStr] = parts.map(p => (p || '').trim().replace(/^"|"$/g, ''));
      
      // Basic validation
      if (!name || !code || !cardNumber) {
        validationErrors.push(`第 ${index + 2} 行資料不完整。`);
        return;
      }

      const tags = tagsStr ? tagsStr.split(';').map(t => t.trim()).filter(Boolean) : [];
      personnelToProcess.push({ name, code, card_number: cardNumber, building: building || null, tags });
    });

    if (validationErrors.length > 0) {
      throw new Error(validationErrors.join('<br>'));
    }

    if (personnelToProcess.length === 0) {
      uiStore.showMessage('沒有可匯入的新資料。', 'info');
      return;
    }

    await api.upsertPersonnel(personnelToProcess);

    uiStore.showMessage(`成功匯入或更新 ${personnelToProcess.length} 筆資料。`, 'success');
    
    // Clear input after success
    if (source === 'manual') manualInput.value = '';
    if (source === 'file') selectedFile.value = null;

    // Navigate to personnel list
    router.push('/personnel');

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
  link.click();
  URL.revokeObjectURL(link.href);
};
</script>
