<template>
  <div class="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-6 border border-indigo-200">
    <h2 class="text-3xl font-bold text-indigo-800 mb-2">匯入簽到記錄</h2>
    <p class="text-gray-600 mb-6">從外部系統匯入名單，系統將自動比對人員並建立對應的簽到或簽退記錄。</p>
    
    <div class="space-y-6">
      <!-- Step 1: Select Event -->
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
      
      <!-- Step 2: Select Type -->
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
      
      <!-- Step 3: Upload File -->
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
      </div>

      <!-- Submit Button -->
      <div class="text-center pt-2">
        <button @click="processImport" :disabled="!selectedFile" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition shadow-lg hover:shadow-xl disabled:bg-gray-400 disabled:cursor-not-allowed">
          開始匯入
        </button>
      </div>
    </div>

    <!-- Import Result Section -->
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
import { useUiStore } from '@/store/ui';
import { useDataStore } from '@/store/data';
import * as api from '@/services/api'; // 引入 api
import { formatDateTime, parseFlexibleDateTime, isValidCardNumber, getDeviceId } from '@/utils'; // 引入所需的 utils 函數 

const uiStore = useUiStore();
const dataStore = useDataStore();

const selectedEventId = ref(null);
const actionType = ref('簽到'); // 預設匯入類型為 '簽到'
const selectedFile = ref(null);
const importResult = ref(null);

onMounted(async () => {
  // 確保活動列表已載入，供選擇活動使用
  if (dataStore.events.length === 0) {
    await dataStore.fetchEvents();
  }
});

// 處理檔案選擇
const handleFileSelect = (event) => {
  selectedFile.value = event.target.files[0];
  importResult.value = null; // 選擇新檔案時重置匯入結果
};

// 處理匯入流程
const processImport = async () => {
  if (!selectedFile.value) {
    uiStore.showMessage('請選擇一個 CSV 檔案。', 'info');
    return;
  }

  uiStore.setLoading(true);
  importResult.value = null; // 清空舊的結果

  let csvText;
  try {
    const reader = new FileReader();
    // 【修改點】明確指定使用 'Big5' 編碼來讀取檔案，解決中文亂碼問題
    reader.readAsText(selectedFile.value, 'Big5');
    csvText = await new Promise((resolve, reject) => {
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error(`讀取檔案失敗: ${e.target.error}`));
    });
  } catch (error) {
    uiStore.showMessage(`檔案讀取失敗: ${error.message}`, 'error');
    uiStore.setLoading(false);
    return;
  }

  try {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) { // 至少需要標頭和一條數據
      throw new Error("CSV 檔案為空或只有標頭。");
    }

    // 解析 CSV 標頭，移除可能的 BOM 字符
    const headerLine = lines[0].replace(/^\uFEFF/, '').trim();
    const headers = headerLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    
    let nameIndex, idIndex, timeIndex;

    // 嘗試識別兩種可能的標頭格式
    // 格式一: '姓名', '學號/卡號', '刷卡時間'
    if (headers.includes('姓名') && headers.includes('學號/卡號') && headers.includes('刷卡時間')) {
        nameIndex = headers.indexOf('姓名');
        idIndex = headers.indexOf('學號/卡號');
        timeIndex = headers.indexOf('刷卡時間');
    } 
    // 格式二: '姓名', '教職員生編號', 'IC靠卡時間'
    else if (headers.includes('姓名') && headers.includes('教職員生編號') && headers.includes('IC靠卡時間')) {
        nameIndex = headers.indexOf('姓名');
        idIndex = headers.indexOf('教職員生編號');
        timeIndex = headers.indexOf('IC靠卡時間');
    } else {
        throw new Error("CSV 標頭格式不符。請確認欄位包含 '姓名', '學號/卡號', '刷卡時間' 或 '姓名', '教職員生編號', 'IC靠卡時間'。");
    }

    const dataLines = lines.slice(1);
    const recordsToProcess = [];
    const validationErrors = [];

    // 確保已載入所有人員資料，用於後續比對
    if (dataStore.personnel.length === 0) {
        await dataStore.fetchAllPersonnel();
    }
    
    // 【*** 核心修正 ***】
    // 直接使用 dataStore.personnel，不要加上 .value
    const allPersonnel = dataStore.personnel; 
    const personnelMapByIdentifier = new Map();
    allPersonnel.forEach(p => {
        personnelMapByIdentifier.set(p.code.toLowerCase(), p);
        personnelMapByIdentifier.set(String(p.card_number), p);
    });

    dataLines.forEach((line, index) => {
      line = line.trim();
      if (!line) return;

      // 使用正則表達式來處理包含逗號的引號包圍的字段
      const parts = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
      const cleanedParts = parts.map(p => (p || '').trim().replace(/^"|"$/g, ''));
      
      const name = cleanedParts[nameIndex];
      const identifier = cleanedParts[idIndex];
      const timestampStr = cleanedParts[timeIndex];

      // 基礎數據檢查
      if (!name || !identifier || !timestampStr) {
        validationErrors.push(`第 ${index + 2} 行資料不完整 (姓名、學號/卡號、刷卡時間為必填)。`);
        return;
      }

      const checkinTime = parseFlexibleDateTime(timestampStr); // 使用彈性日期解析函數
      if (isNaN(checkinTime.getTime())) {
        validationErrors.push(`第 ${index + 2} 行刷卡時間格式無效：'${timestampStr}'。`);
        return;
      }

      const inputType = isValidCardNumber(identifier) ? '卡號' : '學號';
      let person = personnelMapByIdentifier.get(identifier.toLowerCase()) || personnelMapByIdentifier.get(identifier);
      if (!person && inputType === '卡號') { // 嘗試用原始大小寫的學號再次尋找，以防 CSV 中大小寫不一致
          person = personnelMapByIdentifier.get(identifier);
      }
      
      let status; // 根據類型和活動動態計算狀態

      if (actionType.value === '簽到') {
          status = '成功';
          const eventInfo = selectedEventId.value ? dataStore.events.find(e => e.id === selectedEventId.value) : null;
          if (eventInfo) {
              const eventTime = eventInfo.end_time ? new Date(eventInfo.end_time) : new Date(eventInfo.start_time);
              status = checkinTime > eventTime ? '遲到' : '準時';
          }
      } else { // 簽退
          status = '簽退成功';
      }

      recordsToProcess.push({
        created_at: checkinTime.toISOString(),
        input: identifier,
        input_type: inputType,
        success: !!person, // 標記是否找到對應人員
        name_at_checkin: person ? person.name : name, // 如果找到人員則用人員資料的姓名，否則用 CSV 裡的姓名
        personnel_id: person ? person.id : null,
        device_id: getDeviceId(), // 從 utils 獲取設備 ID
        event_id: selectedEventId.value,
        status: status,
        action_type: actionType.value,
        // 添加原始行數據以幫助錯誤追蹤，但不在最終插入數據中
        original_line_data: { name, identifier, timestampStr, line_number: index + 2 } 
      });
    });

    if (validationErrors.length > 0) {
        throw new Error(validationErrors.join('<br>'));
    }

    if (recordsToProcess.length === 0) {
        uiStore.showMessage('在檔案中找不到任何有效的資料列。', 'info');
        return;
    }
    
    // 調用 API 的 RPC 函數來處理匯入，包括自動建立人員
    const formattedRecordsForApi = recordsToProcess.map(r => ({
        name: r.name_at_checkin,
        identifier: r.input,
        timestamp: r.original_line_data.timestampStr, // 傳遞原始時間字串給 Supabase 函數 
        input_type: r.input_type // 確保傳遞 input_type
    }));

    const result = await api.importCheckinRecords({
      records: formattedRecordsForApi,
      eventId: selectedEventId.value,
      actionType: actionType.value
    });
    
    // 匯入成功後，設置結果並顯示訊息
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

    // 重新載入人員資料和活動日期統計，以更新相關頁面
    await dataStore.fetchAllPersonnel();
    await api.fetchAllSavedDatesWithStats(); // 更新每日記錄頁面的日期列表

  } catch (error) {
    uiStore.showMessage(`匯入失敗: ${error.message}`, 'error');
    importResult.value = { // 顯示解析或 API 錯誤
        successCount: 0, autoCreatedCount: 0,
        errors: [error.message.replace(/<br>/g, ' ')] 
    };
  } finally {
    uiStore.setLoading(false);
    selectedFile.value = null; // 清空檔案選擇
    const fileInput = document.getElementById('importCheckinFile');
    if(fileInput) fileInput.value = ''; // 清空檔案輸入框的顯示
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

