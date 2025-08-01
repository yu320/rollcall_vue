<template>
  <div class="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-6 border border-indigo-200">
    <h2 class="text-3xl font-bold text-indigo-800 mb-2">匯入簽到記錄</h2>
    <p class="text-gray-600 mb-6">從外部系統匯入名單，系統將自動比對人員並建立對應的簽到或簽退記錄。</p>
    
    <div class="space-y-6">
      <div class="p-4 border border-gray-200 rounded-lg">
        <label for="eventSelector" class="block text-lg font-semibold text-gray-800 mb-2 flex items-center">
          <span class="bg-indigo-600 text-white rounded-full h-6 w-6 inline-flex items-center justify-center mr-2 text-sm">1</span>
          選擇關聯活動 (選填)
        </label>
        <p class="text-sm text-gray-500 mb-3">將匯入的記錄歸類到特定活動中。</p>
        <select id="eventSelector" v-model="selectedEventId" class="w-full pl-4 pr-10 py-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-400">
          <option :value="null">-- 不關聯任何活動 (通用記錄) --</option>
          <option v-for="event in dataStore.events" :key="event.id" :value="event.id">{{ event.name }} ({{ formatDateTime(event.start_time, 'yyyy-MM-dd') }})</option>
        </select>
      </div>
      
      <div class="p-4 border border-gray-200 rounded-lg">
        <label class="block text-lg font-semibold text-gray-800 mb-2 flex items-center">
          <span class="bg-indigo-600 text-white rounded-full h-6 w-6 inline-flex items-center justify-center mr-2 text-sm">2</span>
          選擇匯入類型
        </label>
        <div class="flex justify-center gap-4 mt-2">
          <label class="inline-flex items-center cursor-pointer p-3 border-2 rounded-lg" :class="actionType === '簽到' ? 'border-indigo-500 bg-indigo-50' : 'border-transparent'">
            <input type="radio" v-model="actionType" value="簽到" class="form-radio h-5 w-5 text-indigo-600">
            <span class="ml-2 text-lg font-medium text-gray-800">簽到</span>
          </label>
          <label class="inline-flex items-center cursor-pointer p-3 border-2 rounded-lg" :class="actionType === '簽退' ? 'border-indigo-500 bg-indigo-50' : 'border-transparent'">
            <input type="radio" v-model="actionType" value="簽退" class="form-radio h-5 w-5 text-indigo-600">
            <span class="ml-2 text-lg font-medium text-gray-800">簽退</span>
          </label>
        </div>
      </div>
      
      <div class="p-4 border border-gray-200 rounded-lg">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3">
          <label for="importCheckinFile" class="block text-lg font-semibold text-gray-800 flex items-center">
            <span class="bg-indigo-600 text-white rounded-full h-6 w-6 inline-flex items-center justify-center mr-2 text-sm">3</span>
            上傳 CSV 檔案 
          </label>
          <a href="#" @click.prevent="downloadSample" class="text-indigo-600 hover:text-indigo-800 font-medium text-sm mt-2 sm:mt-0">下載範例檔</a>
        </div>
        <p class="text-gray-500 text-sm mb-3">系統會自動偵測欄位。支援格式：<br>1. <code class="text-xs bg-gray-100 p-1 rounded">姓名,學號/卡號,刷卡時間</code><br>2. <code class="text-xs bg-gray-100 p-1 rounded">姓名,教職員生編號,IC靠卡時間</code></p>
        <input type="file" id="importCheckinFile" @change="handleFileSelect" accept=".csv" class="w-full text-gray-700 border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-400">
        <p v-if="selectedFile" class="text-gray-500 text-sm mt-2">已選擇檔案: {{ selectedFile.name }}</p>
        
        <div class="mt-4">
          <label for="encodingSelector" class="block text-sm font-medium text-gray-700 mb-1">選擇檔案編碼 (若檔案內容顯示亂碼請切換)</label>
          <select id="encodingSelector" v-model="selectedEncoding" class="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-400">
            <option :value="null" disabled>-- 請選擇檔案編碼(下拉有備註) --</option>
            <option value="UTF-8">UTF-8 (推薦/範例檔)</option>
            <option value="Big5">Big5 (繁體中文/雲科單一活動系統匯出)</option>
            <option value="GBK">GBK (簡體中文)</option>
            <option value="ISO-8859-1">ISO-8859-1 (西方語言)</option>
          </select>
        </div>
      </div>

      <div class="p-4 border border-gray-200 rounded-lg">
        <label for="userDefinedTag" class="block text-lg font-semibold text-gray-800 mb-2 flex items-center">
          <span class="bg-indigo-600 text-white rounded-full h-6 w-6 inline-flex items-center justify-center mr-2 text-sm">4</span>
          新增自訂標籤 (選填)
        </label>
        <input type="text" id="userDefinedTag" v-model="userDefinedTag" placeholder="例如: 晨間活動, 特殊來賓..." class="w-full mt-1 border rounded-md p-2">
      </div>
    </div>

    <div class="text-center pt-2">
      <button @click="processImport" :disabled="!selectedFile || !selectedEncoding" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition shadow-lg hover:shadow-xl disabled:bg-gray-400 disabled:cursor-not-allowed">
        開始匯入
      </button>
    </div>

    <div v-if="importResult" class="mt-8 border-t border-gray-200 pt-6">
      <h3 class="text-2xl font-bold text-gray-800 mb-4">匯入結果</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div class="bg-green-50 p-4 rounded-lg text-center">
          <p class="text-sm text-green-700 font-medium">成功筆數</p>
          <p class="text-3xl font-bold text-green-800">{{ importResult.successCount }}</p>
        </div>
        <div class="bg-blue-50 p-4 rounded-lg text-center">
          <p class="text-sm text-blue-700 font-medium">自動建立人員</p>
          <p class="text-3xl font-bold text-blue-800">{{ importResult.autoCreatedCount }}</p>
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
import { ref, onMounted } from 'vue';
import Papa from 'papaparse'; // 引入 PapaParse
import { useUiStore } from '@/store/ui';
import { useDataStore } from '@/store/data';
import * as api from '@/services/api'; 
import { formatDateTime, parseFlexibleDateTime, isValidCardNumber, getDeviceId } from '@/utils'; // 引入 parseFlexibleDateTime
import { CHECKIN_IMPORT_HEADERS } from '@/utils/constants';

// 獲取 Pinia store 實例
const uiStore = useUiStore();
const dataStore = useDataStore();

// 響應式變數定義
const selectedEventId = ref(null);
const actionType = ref('簽到');
const selectedFile = ref(null);
const importResult = ref(null);
const selectedEncoding = ref(null);
const userDefinedTag = ref(''); // 新增一個用於自訂標籤的響應式變數

// 組件掛載後執行
onMounted(async () => {
  if (dataStore.events.length === 0) {
    await dataStore.fetchEvents();
  }
});

// 處理檔案選擇事件
const handleFileSelect = (event) => {
  selectedFile.value = event.target.files[0];
  importResult.value = null;
  selectedEncoding.value = null;
};

// 處理匯入流程的主函數，改用 PapaParse
const processImport = async () => {
  if (!selectedFile.value) {
    uiStore.showMessage('請選擇一個 CSV 檔案。', 'info');
    return;
  }
  if (!selectedEncoding.value) {
    uiStore.showMessage('請選擇檔案的編碼。', 'info');
    return;
  }

  uiStore.setLoading(true);
  importResult.value = null;

  try {
    const data = await new Promise((resolve, reject) => {
      Papa.parse(selectedFile.value, {
        header: true,
        skipEmptyLines: true,
        encoding: selectedEncoding.value,
        complete: (results) => {
          if (results.errors.length > 0) {
            const errorMessages = results.errors.map(e => `第 ${e.row + 2} 行: ${e.message}`).join('<br>');
            reject(new Error(`CSV 解析錯誤:<br>${errorMessages}`));
          } else {
            resolve(results.data);
          }
        },
        error: (err) => reject(new Error(`檔案解析失敗: ${err.message}`)),
      });
    });

    if (data.length === 0) {
      throw new Error("CSV 檔案為空或格式不符。");
    }

    // 輔助函數：從 row 物件中根據多個可能的標頭名稱獲取值
    const getValue = (row, possibleHeaders) => {
        for (const header of possibleHeaders) {
            if (row[header] !== undefined) {
                return row[header];
            }
        }
        return undefined;
    };

    // 檢查標頭是否存在
    const firstRow = data[0];
    const hasNameHeader = getValue(firstRow, CHECKIN_IMPORT_HEADERS.NAME) !== undefined;
    const hasIdHeader = getValue(firstRow, CHECKIN_IMPORT_HEADERS.IDENTIFIER) !== undefined;
    const hasTimeHeader = getValue(firstRow, CHECKIN_IMPORT_HEADERS.TIMESTAMP) !== undefined;

    if (!hasNameHeader || !hasIdHeader || !hasTimeHeader) {
        throw new Error("CSV 標頭格式不符。請確認檔案包含 '姓名'、'學號/卡號' (或 '教職員生編號') 以及 '刷卡時間' (或 'IC靠卡時間') 等必要欄位。");
    }
    
    // 確保人員資料已載入
    if (dataStore.personnel.length === 0) {
        await dataStore.fetchAllPersonnel();
    }
    
    const allPersonnel = dataStore.personnel; 
    const personnelMapByIdentifier = new Map();
    allPersonnel.forEach(p => {
        personnelMapByIdentifier.set(p.code.toLowerCase(), p);
        personnelMapByIdentifier.set(String(p.card_number), p);
    });

    const recordsToProcess = [];
    const validationErrors = [];

    data.forEach((row, index) => {
      const name = getValue(row, CHECKIN_IMPORT_HEADERS.NAME);
      const identifier = getValue(row, CHECKIN_IMPORT_HEADERS.IDENTIFIER);
      const timestampStr = getValue(row, CHECKIN_IMPORT_HEADERS.TIMESTAMP);

      if (!name || !identifier || !timestampStr) {
        validationErrors.push(`第 ${index + 2} 行資料不完整 (姓名、識別碼、時間為必填)。`);
        return;
      }

      // 在傳送給後端前，先在前端解析時間字串為標準 ISO 格式
      const parsedTime = parseFlexibleDateTime(timestampStr);
      if (isNaN(parsedTime.getTime())) {
        validationErrors.push(`第 ${index + 2} 行刷卡時間格式無效：'${timestampStr}'。`);
        return;
      }
      const isoTimestamp = parsedTime.toISOString(); // 轉換為 ISO 8601 格式

      const inputType = isValidCardNumber(identifier) ? '卡號' : '學號';
      let person = personnelMapByIdentifier.get(identifier.toLowerCase()) || personnelMapByIdentifier.get(identifier);

      let status;
      // 這裡的 status 判斷邏輯在前端僅用於預覽或部分驗證，最終狀態可能由後端決定
      if (actionType.value === '簽到') {
          status = '成功';
          const eventInfo = selectedEventId.value ? dataStore.events.find(e => e.id === selectedEventId.value) : null;
          if (eventInfo) {
              const eventTime = eventInfo.end_time ? new Date(eventInfo.end_time) : new Date(eventInfo.start_time);
              status = parsedTime > eventTime ? '遲到' : '準時'; // 使用解析過的時間比較
          }
      } else {
          status = '簽退成功';
      }

      recordsToProcess.push({
        name_at_checkin: person ? person.name : name,
        input: identifier,
        timestamp: isoTimestamp, // 傳遞 ISO 格式的時間字串
        input_type: inputType,
      });
    });

    if (validationErrors.length > 0) {
        throw new Error(validationErrors.join('<br>'));
    }

    if (recordsToProcess.length === 0) {
        uiStore.showMessage('在檔案中找不到任何有效的資料列。', 'info');
        return;
    }
    
    // 將 userDefinedTag 傳遞給 API
    const result = await api.importCheckinRecords({
      records: recordsToProcess,
      eventId: selectedEventId.value,
      actionType: actionType.value,
      userDefinedTags: userDefinedTag.value.split(';').map(t => t.trim()).filter(Boolean) // 將自訂標籤轉為陣列
    });
    
    if (result && result.length > 0) {
        importResult.value = {
            successCount: result[0].success_count || 0,
            autoCreatedCount: result[0].auto_created_count || 0,
            errors: result[0].errors || [],
        };
    } else {
        importResult.value = {
            successCount: 0,
            autoCreatedCount: 0,
            errors: ["RPC 函數返回結果為空或格式不符。"],
        };
    }

    uiStore.showMessage('匯入處理完成，請查看下方結果。', 'success');
    // 重新載入人員資料和日期統計，以反映匯入的變化
    await dataStore.fetchAllPersonnel();
    await api.fetchAllSavedDatesWithStats();

  } catch (error) {
    uiStore.showMessage(`匯入失敗: ${error.message}`, 'error');
    importResult.value = {
        successCount: 0, autoCreatedCount: 0,
        errors: [error.message.replace(/<br>/g, ' ')] 
    };
  } finally {
    uiStore.setLoading(false);
    selectedFile.value = null;
    const fileInput = document.getElementById('importCheckinFile');
    if(fileInput) fileInput.value = '';
    selectedEncoding.value = null;
    userDefinedTag.value = ''; // 清空自訂標籤輸入框
  }
};

// 下載範例檔案
const downloadSample = () => {
  const csvContent = '姓名,學號/卡號,刷卡時間\n"張小明","A11312011","2025-07-26 09:00:00"\n"李華","1234567899","2025-07-26 09:05:30"';
  const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = '簽到匯入範例.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};
</script>

<style scoped>
/*
  這個組件的特定樣式。
  主要的 Tailwind CSS 樣式定義在 `src/assets/styles/tailwind.css` 和 `src/assets/styles/main.css` 中。
*/
</style>
