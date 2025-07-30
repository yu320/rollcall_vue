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

      <div class="text-center pt-2">
        <button @click="processImport" :disabled="!selectedFile || !selectedEncoding" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition shadow-lg hover:shadow-xl disabled:bg-gray-400 disabled:cursor-not-allowed">
          開始匯入
        </button>
      </div>
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
import { useUiStore } from '@/store/ui';
import { useDataStore } from '@/store/data';
import * as api from '@/services/api'; 
import { formatDateTime, parseFlexibleDateTime, isValidCardNumber, getDeviceId } from '@/utils';
import { CHECKIN_IMPORT_HEADERS } from '@/utils/constants';

// 獲取 Pinia store 實例
const uiStore = useUiStore();
const dataStore = useDataStore();

// 響應式變數定義
const selectedEventId = ref(null); // 選定的活動 ID，預設為 null (不關聯任何活動)
const actionType = ref('簽到'); // 預設匯入類型為 '簽到'
const selectedFile = ref(null); // 已選擇的檔案
const importResult = ref(null); // 匯入結果，用於顯示成功、自動建立、失敗筆數等
const selectedEncoding = ref(null); // 【修改點】檔案編碼選擇，預設為 null，強制使用者選擇

// 組件掛載後執行
onMounted(async () => {
  // 確保活動列表已載入，供選擇活動使用
  if (dataStore.events.length === 0) {
    await dataStore.fetchEvents(); // 如果活動列表為空，則從後端獲取
  }
});

// 處理檔案選擇事件
const handleFileSelect = (event) => {
  selectedFile.value = event.target.files[0]; // 獲取使用者選擇的第一個檔案
  importResult.value = null; // 選擇新檔案時重置匯入結果，清除舊的顯示
  selectedEncoding.value = null; // 【新增】選擇新檔案時，重置編碼選擇，強制重新選擇
};

// 處理匯入流程的主函數
const processImport = async () => {
  if (!selectedFile.value) {
    uiStore.showMessage('請選擇一個 CSV 檔案。', 'info'); // 如果沒有選擇檔案，顯示提示訊息
    return;
  }
  if (!selectedEncoding.value) { // 【新增】檢查是否選擇了編碼
    uiStore.showMessage('請選擇檔案的編碼。', 'info');
    return;
  }

  uiStore.setLoading(true); // 設置 UI 為載入狀態
  importResult.value = null; // 清空舊的結果

  let csvText;
  try {
    const reader = new FileReader();
    // 使用使用者選擇的編碼來讀取檔案
    reader.readAsText(selectedFile.value, selectedEncoding.value);
    csvText = await new Promise((resolve, reject) => {
      reader.onload = (e) => resolve(e.target.result); // 檔案讀取成功
      reader.onerror = (e) => reject(new Error(`讀取檔案失敗: ${e.target.error}`)); // 檔案讀取失敗
    });
  } catch (error) {
    uiStore.showMessage(`檔案讀取失敗: ${error.message}`, 'error'); // 顯示讀取錯誤訊息
    uiStore.setLoading(false); // 關閉載入狀態
    return;
  }

  try {
    // 將 CSV 文本按行分割，並過濾掉空行
    const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) { // 至少需要標頭和一條數據
      throw new Error("CSV 檔案為空或只有標頭。");
    }

    // 解析 CSV 標頭，移除可能的 BOM 字符 (U+FEFF) 並清理空格和引號
    const headerLine = lines[0].replace(/^\uFEFF/, '').trim();
    const headers = headerLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    
    let nameIndex = -1, idIndex = -1, timeIndex = -1;

    // 使用 CHECKIN_IMPORT_HEADERS 常數來動態尋找欄位索引
    for (const [key, possibleNames] of Object.entries(CHECKIN_IMPORT_HEADERS)) {
        for (const name of possibleNames) {
            const index = headers.indexOf(name);
            if (index !== -1) {
                if (key === 'NAME') nameIndex = index;
                else if (key === 'IDENTIFIER') idIndex = index;
                else if (key === 'TIMESTAMP') timeIndex = index;
                break; 
            }
        }
    }

    // 檢查是否所有必要的欄位都已找到
    if (nameIndex === -1 || idIndex === -1 || timeIndex === -1) {
        throw new Error("CSV 標頭格式不符。請確認檔案包含 '姓名'、'學號/卡號' (或 '學號', '卡號', '教職員生編號') 以及 '刷卡時間' (或 'IC靠卡時間') 等必要欄位。");
    }

    const dataLines = lines.slice(1); // 獲取數據行 (跳過標頭行)
    const recordsToProcess = []; // 儲存待處理的記錄
    const validationErrors = []; // 儲存驗證錯誤訊息

    // 確保已載入所有人員資料，用於後續比對
    if (dataStore.personnel.length === 0) {
        await dataStore.fetchAllPersonnel();
    }
    
    const allPersonnel = dataStore.personnel; 
    const personnelMapByIdentifier = new Map(); // 建立一個 Map，用於快速查找人員
    allPersonnel.forEach(p => {
        personnelMapByIdentifier.set(p.code.toLowerCase(), p); // 以學號(小寫)為鍵
        personnelMapByIdentifier.set(String(p.card_number), p); // 以卡號為鍵
    });

    dataLines.forEach((line, index) => {
      line = line.trim();
      if (!line) return; // 跳過空行

      // 【核心修正】改用更簡單的 split 方法來處理，使其能應對額外欄位
      const parts = line.split(',');
      const cleanedParts = parts.map(p => (p || '').trim().replace(/^"|"$/g, '')); // 清理每個部分

      // 根據識別到的索引獲取數據
      const name = cleanedParts[nameIndex];
      const identifier = cleanedParts[idIndex];
      const timestampStr = cleanedParts[timeIndex];

      // 基礎數據檢查
      if (!name || !identifier || !timestampStr) {
        validationErrors.push(`第 ${index + 2} 行資料不完整 (姓名、學號/卡號、刷卡時間為必填)。`);
        return;
      }

      const checkinTime = parseFlexibleDateTime(timestampStr); // 使用彈性日期解析函數解析時間
      if (isNaN(checkinTime.getTime())) { // 檢查解析後的時間是否有效
        validationErrors.push(`第 ${index + 2} 行刷卡時間格式無效：'${timestampStr}'。`);
        return;
      }

      // 判斷識別碼類型是卡號還是學號
      const inputType = isValidCardNumber(identifier) ? '卡號' : '學號';
      // 根據識別碼查找對應人員
      let person = personnelMapByIdentifier.get(identifier.toLowerCase()) || personnelMapByIdentifier.get(identifier);
      if (!person && inputType === '卡號') { // 嘗試用原始大小寫的學號再次尋找，以防 CSV 中大小寫不一致
          person = personnelMapByIdentifier.get(identifier);
      }
      
      let status; // 根據類型和活動動態計算簽到狀態

      if (actionType.value === '簽到') {
          status = '成功';
          const eventInfo = selectedEventId.value ? dataStore.events.find(e => e.id === selectedEventId.value) : null;
          if (eventInfo) {
              // 如果有活動且有結束時間，則以結束時間判斷遲到
              const eventTime = eventInfo.end_time ? new Date(eventInfo.end_time) : new Date(eventInfo.start_time);
              status = checkinTime > eventTime ? '遲到' : '準時';
          }
      } else { // 簽退
          status = '簽退成功';
      }

      recordsToProcess.push({
        created_at: checkinTime.toISOString(), // 將時間轉換為 ISO 格式
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
        throw new Error(validationErrors.join('<br>')); // 如果有驗證錯誤，拋出錯誤
    }

    if (recordsToProcess.length === 0) {
        uiStore.showMessage('在檔案中找不到任何有效的資料列。', 'info');
        return;
    }
    
    // 格式化記錄以符合 API 要求，傳遞原始時間字串給 Supabase 函數處理
    const formattedRecordsForApi = recordsToProcess.map(r => ({
        name: r.name_at_checkin,
        identifier: r.input,
        timestamp: r.original_line_data.timestampStr, 
        input_type: r.input_type 
    }));

    // 調用 API 的 RPC 函數來處理匯入，包括自動建立人員
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
    uiStore.showMessage(`匯入失敗: ${error.message}`, 'error'); // 顯示匯入過程中的錯誤
    importResult.value = { // 顯示解析或 API 錯誤
        successCount: 0, autoCreatedCount: 0,
        errors: [error.message.replace(/<br>/g, ' ')] 
    };
  } finally {
    uiStore.setLoading(false); // 關閉載入狀態
    selectedFile.value = null; // 清空檔案選擇
    const fileInput = document.getElementById('importCheckinFile');
    if(fileInput) fileInput.value = ''; // 清空檔案輸入框的顯示
    selectedEncoding.value = null; // 【新增】匯入完成或失敗後，也重置編碼選擇
  }
};

// 下載範例檔案
const downloadSample = () => {
  // 始終在範例檔案中提供 UTF-8 BOM，因為這對 Excel 和其他帶有中文字元的工具最兼容
  const csvContent = '姓名,學號/卡號,刷卡時間\n"張小明","A11312011","2025-07-26 09:00:00"\n"李華","1234567899","2025-07-26 09:05:30"';
  const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = '簽到匯入範例.csv'; // 下載檔案名稱
  document.body.appendChild(link);
  link.click(); // 觸發下載
  document.body.removeChild(link); // 移除元素
  URL.revokeObjectURL(link.href); // 釋放 URL 物件
};
</script>

<style scoped>
/*
  這個組件的特定樣式。
  主要的 Tailwind CSS 樣式定義在 `src/assets/styles/tailwind.css` 和 `src/assets/styles/main.css` 中。
*/
</style>
