<template>
  <div class="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-6 border border-indigo-200">
    <h2 class="text-3xl font-bold text-indigo-800 mb-2">匯入人員資料</h2>
    <p class="text-gray-600 mb-8">支援從 CSV 檔案批次匯入，或手動貼上資料。系統會根據學號或卡號自動新增或更新人員資料。</p>
    
    <div class="mb-8 pb-8 border-b border-gray-200">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
        <h3 class="text-xl font-semibold text-gray-800">1. 從檔案匯入</h3>
        <a href="#" @click.prevent="downloadSample" class="text-indigo-600 hover:text-indigo-800 font-medium text-sm mt-2 sm:mt-0">下載範例檔</a>
      </div>
      <input type="file" id="importFile" @change="handleFileSelect" accept=".csv" class="w-full text-gray-700 border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-400">
      <p v-if="selectedFile" class="text-gray-500 text-sm mt-2">已選擇檔案: {{ selectedFile.name }}</p>
      <button @click="importFromFile" :disabled="!selectedFile" class="mt-5 w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-6 rounded-lg transition duration-300 flex items-center justify-center shadow-md hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
        匯入檔案
      </button>
    </div>

    <div class="mb-4">
      <h3 class="text-xl font-semibold text-gray-800 mb-2">2. 手動輸入</h3>
      <p class="text-gray-500 text-sm mb-4">每行一筆，格式為：<br><code class="text-xs bg-gray-100 p-1 rounded">姓名,學號,卡號,棟別,"標籤1;標籤2"</code><br>(棟別與標籤為選填，多個標籤請用分號分隔)</p>
      <textarea v-model="manualInput" rows="10" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-4" placeholder="王大明,A001,11111111,A1,幹部;全職&#10;陳小美,B002,22222222,B2,職員"></textarea>
      <div class="flex justify-end">
        <button @click="importFromText" :disabled="!manualInput.trim()" class="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-lg transition duration-300 shadow-md hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
          手動匯入
        </button>
      </div>
    </div>

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
import { useRouter } from 'vue-router'; // 引入 useRouter 以便導入後跳轉
import { useUiStore } from '@/store/ui';
import { useDataStore } from '@/store/data'; // 引入 dataStore 以便更新人員資料
import * as api from '@/services/api'; // 引入 api

const uiStore = useUiStore();
const dataStore = useDataStore(); // 獲取 dataStore 實例
const router = useRouter(); // 獲取 router 實例

const manualInput = ref('');
const selectedFile = ref(null);
const importResult = ref(null);

const handleFileSelect = (event) => {
  selectedFile.value = event.target.files[0];
  importResult.value = null; // 重置結果顯示
};

const importFromFile = () => {
  if (!selectedFile.value) {
    uiStore.showMessage('請選擇一個 CSV 檔案。', 'info');
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => processImport(e.target.result, 'file'); // 傳遞來源類型
  reader.onerror = () => uiStore.showMessage('讀取檔案失敗。', 'error');
  reader.readAsText(selectedFile.value, 'UTF-8'); // 確保使用 UTF-8 讀取
};

const importFromText = () => {
  const text = manualInput.value.trim();
  if (!text) {
    uiStore.showMessage('請輸入要匯入的資料。', 'info');
    return;
  }
  // 手動輸入也需要模擬 CSV 標頭以便解析器正確工作
  const dataWithHeader = `姓名,學號,卡號,棟別,標籤\n${text}`;
  processImport(dataWithHeader, 'manual'); // 傳遞來源類型
};

const processImport = async (csvText, source) => {
  uiStore.setLoading(true);
  importResult.value = null; // 清空舊的結果

  try {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) { // 至少需要標頭和一條數據
      throw new Error("沒有有效的資料可供匯入，請檢查檔案內容或輸入格式。");
    }

    // 解析 CSV 標頭
    const headerLine = lines[0].replace(/^\uFEFF/, '').trim(); // 移除可能的 BOM
    const headers = headerLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));

    // 確定各欄位的索引
    const nameIndex = headers.indexOf('姓名');
    const codeIndex = headers.indexOf('學號');
    const cardNumberIndex = headers.indexOf('卡號');
    const buildingIndex = headers.indexOf('棟別');
    const tagsIndex = headers.indexOf('標籤');

    if (nameIndex === -1 || codeIndex === -1 || cardNumberIndex === -1) {
        throw new Error("CSV 標頭格式不符。請確認包含 '姓名', '學號', '卡號' 等必填欄位。");
    }

    const personnelToProcess = [];
    const validationErrors = [];

    // 從第二行開始解析數據
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // 使用正則表達式來處理包含逗號的引號包圍的字段
      const parts = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
      
      const name = (parts[nameIndex] || '').trim().replace(/^"|"$/g, '');
      const code = (parts[codeIndex] || '').trim().replace(/^"|"$/g, '');
      const cardNumber = (parts[cardNumberIndex] || '').trim().replace(/^"|"$/g, '');
      const building = (parts[buildingIndex] || '').trim().replace(/^"|"$/g, '');
      const tagsStr = (parts[tagsIndex] || '').trim().replace(/^"|"$/g, '');
      
      // 簡單驗證必填欄位
      if (!name || !code || !cardNumber) {
        validationErrors.push(`第 ${i + 1} 行資料不完整 (姓名、學號、卡號為必填)。`);
        continue;
      }
      // 基礎格式驗證
      if (!/^[A-Za-z0-9]+$/.test(code)) { // 學號通常是字母數字組合
          validationErrors.push(`第 ${i + 1} 行學號格式無效 (只允許字母數字)。`);
          continue;
      }
      if (!/^\d+$/.test(cardNumber)) { // 卡號必須是純數字
          validationErrors.push(`第 ${i + 1} 行卡號格式無效 (只允許數字)。`);
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

    // 調用 API 進行批量新增或更新
    const result = await api.upsertPersonnel(personnelToProcess);
    
    // 設置結果
    importResult.value = {
        totalProcessed: personnelToProcess.length,
        successCount: result.successCount, // 假設 API 返回成功新增的數量
        updateCount: result.updateCount,   // 假設 API 返回成功更新的數量
        errors: result.errors || [],       // 假設 API 返回錯誤列表
    };

    if (importResult.value.errors.length > 0) {
        uiStore.showMessage(`匯入完成，但有 ${importResult.value.errors.length} 筆失敗。`, 'warning');
    } else {
        uiStore.showMessage(`匯入處理完成！成功新增 ${importResult.value.successCount}, 更新 ${importResult.value.updateCount} 筆。`, 'success');
    }
    
    // 匯入成功後，清空輸入框或檔案選擇
    if (source === 'manual') manualInput.value = '';
    if (source === 'file') {
        selectedFile.value = null;
        const fileInput = document.getElementById('importFile');
        if(fileInput) fileInput.value = ''; // 清空檔案輸入框的顯示
    }
    
    // 重新載入人員資料，以便人員管理頁面更新
    await dataStore.fetchAllPersonnel();
    // 考慮跳轉到人員管理頁面，但這裡不強制跳轉，讓用戶自行決定
    // router.push('/personnel'); 

  } catch (error) {
    uiStore.showMessage(`匯入失敗: ${error.message}`, 'error');
    importResult.value = { // 顯示解析或 API 錯誤 
        totalProcessed: 0, successCount: 0, updateCount: 0,
        errors: [error.message.replace(/<br>/g, ' ')] // 將 <br> 轉換為空格
    };
  } finally {
    uiStore.setLoading(false);
  }
};

const downloadSample = () => {
  const csvContent = '姓名,學號,卡號,棟別,標籤\n"王大明","A001","11111111","A1","幹部;全職"\n"陳小美","B002","22222222","B2","職員"\n"林志強","C003","33333333","C2",\n"黃雅婷","D004","44444444","D1","實習生;設計部"';
  // 添加 BOM (Byte Order Mark) 確保 Excel 等軟體打開時中文不亂碼
  const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = '人員匯入範例.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};
</script>
