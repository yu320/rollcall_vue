<template>
  <div class="p-6 bg-gray-50 min-h-screen">
    <div class="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md">
      <h1 class="text-2xl font-bold mb-6 text-gray-800">匯入活動簽到記錄</h1>

      <div class="space-y-6">
        <div>
          <label for="event-select" class="block text-sm font-medium text-gray-700 mb-2">選擇活動</label>
          <select id="event-select" v-model="selectedEventId" class="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
            <option disabled value="">請選擇一個活動</option>
            <option v-for="event in events" :key="event.id" :value="event.id">
              {{ event.name }}
            </option>
          </select>
        </div>

        <div>
          <label for="file-upload" class="block text-sm font-medium text-gray-700 mb-2">上傳檔案</label>
          <p class="text-sm text-gray-500 mb-2">支援的檔案格式：.xlsx, .xls, .csv。檔案需包含 '卡號' 和 '簽到時間' 欄位。</p>
          <input id="file-upload" type="file" @change="handleFileUpload" accept=".xlsx, .xls, .csv" class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
        </div>

        <div>
          <button @click="importData" :disabled="!selectedEventId || !file || loading" class="w-full bg-blue-500 text-white p-3 rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center">
            <svg v-if="loading" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ loading ? '匯入中...' : '匯入' }}
          </button>
        </div>
      </div>

      <div v-if="message" :class="['mt-6 p-4 rounded-md', messageType === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800']">
        <p v-html="message.replace(/\n/g, '<br>')"></p>
      </div>

      <div class="mt-8">
        <h2 class="text-xl font-semibold mb-4 text-gray-700">格式範例</h2>
        <div class="overflow-x-auto">
          <table class="min-w-full bg-white border border-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">卡號</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">簽到時間</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">EMP001</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">2023-10-26 09:00:00</td>
              </tr>
              <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">EMP002</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">2023-10-26 09:01:30</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useStore } from 'vuex';
import * as XLSX from 'xlsx';
import { supabase } from '@/services/supabase';
import { notify } from '@/services/api';

const store = useStore();
const events = ref([]);
const selectedEventId = ref('');
const file = ref(null);
const loading = ref(false);
const message = ref('');
const messageType = ref('error'); // 'success' or 'error'

onMounted(async () => {
  // 從 Vuex store 或直接從 Supabase 獲取活動列表
  // 這裡假設有一個 action 'fetchEvents'
  await store.dispatch('data/fetchEvents');
  events.value = store.getters['data/allEvents'];
  if (!events.value || events.value.length === 0) {
    // 如果 store 中沒有，嘗試直接從 supabase 獲取
    const { data, error } = await supabase.from('events').select('*').order('start_time', { ascending: false });
    if (error) {
      console.error('獲取活動列表失敗:', error);
      notify({ title: '錯誤', message: '無法載入活動列表', type: 'error' });
    } else {
      events.value = data;
    }
  }
});

const handleFileUpload = (e) => {
  file.value = e.target.files[0];
  message.value = '';
};

const readFile = (fileToRead) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        // 使用 cellDates: true 來嘗試自動解析日期
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) {
          throw new Error('工作表為空或無法讀取。');
        }
        const json = XLSX.utils.sheet_to_json(worksheet);
        resolve(json);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(fileToRead);
  });
};

const importData = async () => {
  if (!file.value || !selectedEventId.value) {
    message.value = '請選擇一個活動和一個文件。';
    messageType.value = 'error';
    return;
  }

  loading.value = true;
  message.value = '';
  messageType.value = 'error';

  try {
    const jsonData = await readFile(file.value);
    if (!jsonData || jsonData.length === 0) {
      throw new Error("檔案中沒有資料或格式不正確。");
    }

    // 1. 從匯入的資料中提取所有 '卡號'
    const cardNumbers = jsonData.map(row => row['卡號']).filter(cn => cn);
    if (cardNumbers.length === 0) {
      throw new Error("檔案中找不到有效的 '卡號' 欄位或該欄位沒有資料。");
    }

    // 2. 根據 '卡號' 從資料庫中查詢對應的人員 ID
    const { data: personnelData, error: personnelError } = await supabase
      .from('personnel')
      .select('id, card_number')
      .in('card_number', cardNumbers);

    if (personnelError) {
      throw new Error(`查詢人員資料時發生錯誤：${personnelError.message}`);
    }

    // 3. 建立一個從 card_number 到 personnel.id 的映射
    const cardToIdMap = new Map(personnelData.map(p => [String(p.card_number), p.id]));

    // 4. 準備要插入的簽到記錄
    const recordsToInsert = [];
    const notFoundCards = new Set();
    const invalidTimeRows = [];

    jsonData.forEach((row, index) => {
      const cardNumber = row['卡號'];
      const checkInTime = row['簽到時間'];
      
      if (!cardNumber) return; // 忽略沒有卡號的行

      const personnelId = cardToIdMap.get(String(cardNumber));

      if (!personnelId) {
        notFoundCards.add(cardNumber);
        return;
      }

      // 驗證簽到時間
      if (!checkInTime || !(checkInTime instanceof Date) || isNaN(checkInTime)) {
        invalidTimeRows.push(index + 2); // +2 for header and 0-based index
        return;
      }

      recordsToInsert.push({
        event_id: selectedEventId.value,
        personnel_id: personnelId,
        check_in_time: checkInTime.toISOString(),
      });
    });

    // 5. 插入有效的記錄
    if (recordsToInsert.length > 0) {
      const { error: insertError } = await supabase.from('activity_records').insert(recordsToInsert);
      if (insertError) {
        throw new Error(`寫入簽到記錄時發生錯誤：${insertError.message}`);
      }
    }

    // 6. 產生最終的報告訊息
    let successMessage = `成功匯入 ${recordsToInsert.length} 筆記錄。`;
    let errorMessage = '';

    if (notFoundCards.size > 0) {
      errorMessage += `\n找不到以下卡號對應的人員：${[...notFoundCards].join(', ')}。`;
    }
    if (invalidTimeRows.length > 0) {
      errorMessage += `\n檔案中第 ${invalidTimeRows.join(', ')} 行的簽到時間格式不正確或為空。`;
    }

    if (errorMessage) {
      message.value = successMessage + '\n' + errorMessage;
      // 如果有任何記錄成功，就顯示為成功訊息（帶有警告）
      messageType.value = recordsToInsert.length > 0 ? 'success' : 'error';
    } else {
      message.value = successMessage;
      messageType.value = 'success';
    }

    if (recordsToInsert.length > 0) {
        notify({ title: '匯入完成', message: message.value.split('\n')[0], type: 'success' });
    }


  } catch (error) {
    console.error('匯入錯誤:', error);
    message.value = `匯入失敗：${error.message}`;
    messageType.value = 'error';
    notify({ title: '錯誤', message: `匯入簽到記錄失敗：${error.message}`, type: 'error' });
  } finally {
    loading.value = false;
    // 重設檔案輸入，以便可以重新上傳同一個檔案
    const fileInput = document.getElementById('file-upload');
    if(fileInput) fileInput.value = '';
    file.value = null;
  }
};
</script>
