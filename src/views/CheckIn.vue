<template>
  <div class="max-w-2xl mx-auto">
    <div class="bg-white rounded-xl shadow-lg p-8 border-2 border-dashed border-gray-300">
      <div class="text-center mb-8">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto text-indigo-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
        <h2 class="text-3xl font-bold text-gray-800">刷卡報到</h2>
        <p class="text-gray-500 mt-2">請將學生證放置於刷卡機或是手動輸入學號進行報到</p>
      </div>

      <div class="mb-6 flex justify-center gap-4">
        <label class="inline-flex items-center cursor-pointer">
          <input type="radio" name="checkin-mode" value="簽到" v-model="actionType" class="form-radio h-5 w-5 text-indigo-600">
          <span class="ml-2 text-lg font-medium text-gray-800">簽到</span>
        </label>
        <label class="inline-flex items-center cursor-pointer">
          <input type="radio" name="checkin-mode" value="簽退" v-model="actionType" class="form-radio h-5 w-5 text-indigo-600">
          <span class="ml-2 text-lg font-medium text-gray-800">簽退</span>
        </label>
      </div>
      
      <div class="mb-6">
        <label for="eventSelector" class="block text-sm font-medium text-gray-700 mb-2">選擇活動 </label>
        <select id="eventSelector" v-model="selectedEventId" class="w-full pl-4 pr-10 py-3 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
          <option :value="null">-- 不選擇活動 (測試用) --</option>
          <option v-for="event in sortedEvents" :key="event.id" :value="event.id" :class="{'text-gray-500': isEventEnded(event.end_time)}">
            {{ formatDateTime(event.start_time, 'yyyy-MM-dd HH:mm') }} - {{ event.name }} <span v-if="isEventEnded(event.end_time)">(已結束)</span>
          </option>
        </select>
      </div>

      <div class="relative">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
        </svg>
        <input type="text" id="checkInInput" v-model="checkInInput" @keyup.enter="handleCheckIn" class="w-full pl-14 pr-4 py-4 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="輸入學號/卡號">
      </div>
      <button @click="handleCheckIn" class="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-4 rounded-lg text-lg transition duration-300 ease-in-out transform hover:scale-105">
          確認{{ actionType }}
      </button>
    </div>

    <div v-if="checkInResult.isVisible" class="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 mt-8">
        <!-- 將 checkInResult.statusClass 應用到此處，用於設定外層背景和文字顏色 -->
        <div :class="checkInResult.statusClass" class="px-6 py-4 text-center">
            <!-- 將 checkInResult.colorBase 用於設定內部動畫圓的背景顏色 -->
            <div class="check-in-animation inline-flex items-center justify-center w-16 h-16 rounded-full text-white mb-4"
                 :class="checkInResult.colorBase ? `bg-${checkInResult.colorBase}-500` : 'bg-gray-500'">
                <!-- 使用 <component :is="..."> 動態渲染 SVG 圖標 -->
                <component :is="checkInResult.statusIcon" class="h-10 w-10"></component>
            </div>
            <!-- h3 的文字顏色現在也動態綁定 -->
            <h3 class="text-2xl font-bold" :class="checkInResult.colorBase ? `text-${checkInResult.colorBase}-800` : 'text-gray-800'">{{ checkInResult.statusText }}</h3>
        </div>
        <div class="p-6">
            <div class="mb-6">
                <div class="text-center mb-4">
                    <div v-if="checkInResult.person" class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-indigo-100 text-indigo-800 text-2xl font-bold mb-2">{{ checkInResult.person.name.charAt(0) }}</div>
                    <h3 v-if="checkInResult.person" class="text-xl font-bold">{{ checkInResult.person.name }}</h3>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div v-if="checkInResult.person" class="bg-gray-50 p-3 rounded-lg">
                        <p class="text-sm text-gray-500">學號</p>
                        <p class="font-medium" :class="dataStore.getInputColorClass(checkInResult.person.code)">{{ checkInResult.person.code }}</p>
                    </div>
                    <div v-if="checkInResult.person" class="bg-gray-50 p-3 rounded-lg">
                        <p class="text-sm text-gray-500">卡號</p>
                        <p class="font-medium">{{ checkInResult.person.card_number }}</p>
                    </div>
                    <div v-if="checkInResult.event" class="col-span-1 sm:col-span-2 bg-indigo-50 p-3 rounded-lg">
                        <p class="text-sm text-gray-500">活動</p>
                        <p class="font-medium text-indigo-800">{{ checkInResult.event.name }}</p>
                    </div>
                    <div v-else class="col-span-1 sm:col-span-2 bg-gray-50 p-3 rounded-lg">
                        <p class="text-sm text-gray-500">輸入內容</p>
                        <p class="font-medium">{{ checkInResult.input }}</p>
                        <p class="text-sm text-gray-500 mt-1">請確認{{ checkInResult.inputType }}是否正確，或聯繫管理員。</p>
                    </div>
                </div>
            </div>
            <div class="text-center">
                <button @click="resetCheckIn" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-8 rounded-lg transition duration-300 transform hover:scale-105 shadow-md">
                    繼續報到
                </button>
            </div>
        </div>
    </div>
    
    <div class="mt-10">
      <div class="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h3 class="text-2xl font-bold text-gray-800">今日暫存記錄</h3>
        <div class="flex flex-wrap gap-3 justify-center w-full sm:w-auto">
          <button @click="deleteAllTodayRecords" class="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition duration-300 flex items-center justify-center shadow-sm hover:shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clip-rule="evenodd" /></svg>
            刪除全部
          </button>
          <button @click="saveTodayRecords" class="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded-lg transition duration-300 flex items-center justify-center shadow-sm hover:shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.4 1.4a1 1 0 0 0 1.4 0l.7-.7a1 1 0 0 0 0-1.4l-1.4-1.4a1 1 0 0 0-1.4 0z"></path><path d="M18 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V6z"></path><path d="M14 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2V2z"></path><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
            儲存記錄
          </button>
        </div>
      </div>
      <div class="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
        <div class="overflow-x-auto table-responsive">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th scope="col" class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">時間</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">姓名</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">學號/卡號</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">類型</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">狀態</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">活動</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">裝置ID</th>
                <th scope="col" class="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-100">
              <tr v-for="record in todayRecords" :key="record.id">
                <td data-label="時間" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatDateTime(record.created_at, 'HH:mm:ss') }}</td>
                <td data-label="姓名" class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ record.name_at_checkin || '—' }}</td>
                <td data-label="學號/卡號" class="px-6 py-4 whitespace-nowrap text-sm text-gray-800" :class="dataStore.getInputColorClass(record.input)">{{ record.input }}</td>
                <td data-label="類型" class="px-6 py-4 whitespace-nowrap"><span class="type-badge" :data-type="record.action_type">{{ record.action_type }}</span></td>
                <td data-label="狀態" class="px-6 py-4 whitespace-nowrap"><span class="status-badge" :data-status="record.status">{{ record.status }}</span></td>
                <td data-label="活動" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ record.event_id ? dataStore.getEventById(record.event_id)?.name || 'N/A' : '—' }}</td>
                <td data-label="裝置ID" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate" style="max-width: 150px;">{{ record.device_id || '—' }}</td>
                <td data-label="操作" class="px-6 py-4 whitespace-nowrap text-right">
                  <button @click="handleDeleteTempRecord(record.id)" class="text-red-600 hover:text-red-800 text-sm font-medium">刪除</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="todayRecords.length === 0" class="py-8 text-center text-gray-500 text-lg">尚無報到記錄</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useUiStore } from '@/store/ui';
import { useDataStore } from '@/store/data';
import * as api from '@/services/api';
import { formatDateTime } from '@/utils';
import { isPast, parseISO } from 'date-fns';

// SVG 圖標組件，用於動態渲染
// 每個圖標都是一個簡單的 Vue 元件，可以在模板中使用 <component :is="ComponentName"> 來渲染
const CheckCircleIcon = { template: `<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>` };
const XCircleIcon = { template: `<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>` };
const ClockIcon = { template: `<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>` };
const WarningIcon = { template: `<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>` };
const RepeatIcon = { template: `<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9.247a4.998 4.998 0 00-.776 2.343M11.603 16.03a6.002 6.002 0 00.99 1.139M15 14l-3-3m0 0l-3-3m3 3l3 3m0 0l3-3m0 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>` };

// Pinia Store 實例
const uiStore = useUiStore();
const dataStore = useDataStore();

// 元件響應式狀態
const checkInInput = ref(''); // 簽到輸入框內容
const selectedEventId = ref(null); // 當前選擇的活動 ID
const actionType = ref('簽到'); // 簽到/簽退模式，預設為簽到
const checkInResult = ref({
  isVisible: false, // 控制簽到結果區塊是否顯示
  statusClass: '',  // 用於簽到結果區塊的 Tailwind CSS 背景和文字顏色 class (例如: 'bg-green-100 text-green-800')
  colorBase: '',    // 用於內部動畫圓的基礎顏色名稱 (例如: 'green', 'yellow')
  statusIcon: null, // 動態渲染的 SVG 圖標元件
  statusText: '',   // 顯示在結果區塊的狀態文字
  person: null,     // 匹配到的人員資料
  event: null,      // 關聯的活動資料
  input: '',        // 用戶輸入的原始值
  inputType: ''     // 輸入類型 (學號/卡號)
});

// 使用 localStorage 儲存今日暫存記錄的鍵
const TODAY_RECORDS_KEY = 'todayCheckInRecords';
const todayRecords = ref([]); // 今日暫存的簽到記錄列表

// 計算屬性：將活動列表按開始時間降序排序，用於選擇器
const sortedEvents = computed(() => {
  return [...dataStore.events].sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
});

// 判斷活動是否已結束
const isEventEnded = (endTime) => {
    if (!endTime) return false;
    return isPast(parseISO(endTime));
};

// --- 生命週期鉤子 (Lifecycle Hooks) ---
onMounted(async () => {
  uiStore.setLoading(true); // 顯示全域載入指示器
  try {
    // 確保人員和活動資料已從 Supabase 載入，供後續邏輯使用
    await Promise.all([
      dataStore.fetchAllPersonnel(),
      dataStore.fetchEvents()
    ]);
    
    // 從 localStorage 載入之前暫存的記錄
    loadTodayRecordsFromLocalStorage();
    
    // 如果有活動，預設選擇列表中的第一個活動
    if (dataStore.events.length > 0) {
      selectedEventId.value = dataStore.events[0].id;
    }
  } catch (error) {
    uiStore.showMessage(`初始化報到頁面失敗: ${error.message}`, 'error');
  } finally {
    uiStore.setLoading(false); // 隱藏全域載入指示器
  }
});

// 監聽 `todayRecords` 列表的變化，並自動儲存到 `localStorage`
// `deep: true` 確保當陣列內的物件內容改變時也能觸發監聽
watch(todayRecords, (newRecords) => {
    localStorage.setItem(TODAY_RECORDS_KEY, JSON.stringify(newRecords));
}, { deep: true });

// --- 方法 (Methods) ---

// 從 `localStorage` 載入今日暫存記錄
const loadTodayRecordsFromLocalStorage = () => {
    try {
        const storedRecords = localStorage.getItem(TODAY_RECORDS_KEY);
        todayRecords.value = storedRecords ? JSON.parse(storedRecords) : [];
    } catch (e) {
        console.error("無法從 localStorage 解析暫存記錄:", e);
        todayRecords.value = [];
    }
};

// 處理簽到或簽退操作
const handleCheckIn = async () => {
  const input = checkInInput.value.trim();
  if (!input) {
    uiStore.showMessage('請輸入學號或卡號', 'info');
    return;
  }

  const allPersonnel = dataStore.personnel; // 從 Pinia Store 獲取所有人員資料
  const currentEvent = selectedEventId.value ? dataStore.events.find(e => e.id === selectedEventId.value) : null;
  const selectedMode = actionType.value; // 當前選擇的操作模式 (簽到/簽退)

  let person = null;
  let inputType = '';

  // 判斷輸入內容是學號還是卡號，並嘗試匹配人員
  if (/^\d+$/.test(input)) { // 如果是純數字，判斷為卡號
    inputType = '卡號';
    person = allPersonnel.find(p => String(p.card_number) === input);
  } else { // 否則判斷為學號
    inputType = '學號';
    person = allPersonnel.find(p => String(p.code).toLowerCase() === input.toLowerCase());
  }

  let recordStatus = ''; // 記錄的最終狀態文字
  let isSuccess = false; // 操作是否被認為成功

  // 檢查是否已存在重複的簽到/簽退記錄 (針對同一個人同一活動的成功記錄)
  const existingRecord = todayRecords.value.find(
    r => r.personnel_id === (person ? person.id : null) && // 檢查人員ID
        r.event_id === selectedEventId.value &&             // 檢查活動ID
        r.action_type === selectedMode &&                   // 檢查操作類型
        r.success                                           // 只考慮成功的記錄
  );

  if (!person) { // 如果找不到對應人員
    recordStatus = `${selectedMode}失敗 - 查無此人`;
    isSuccess = false;
  } else if (existingRecord) { // 如果找到重複的成功記錄
      recordStatus = `重複${selectedMode}`;
      isSuccess = false; // 重複操作不視為成功
  } else { // 找到人員且無重複記錄
    isSuccess = true;
    if (selectedMode === '簽到') {
        if (currentEvent) { // 如果有選擇活動，判斷準時/遲到
            const eventTime = currentEvent.end_time ? parseISO(currentEvent.end_time) : parseISO(currentEvent.start_time);
            recordStatus = (new Date() > eventTime) ? '遲到' : '準時';
        } else { // 未選擇活動，默認為成功
            recordStatus = '成功';
        }
    } else { // 簽退模式
        // 檢查是否有對應活動的「簽到」記錄
        const hasCheckedIn = todayRecords.value.some(
            r => r.personnel_id === person.id && 
                r.event_id === selectedEventId.value && 
                r.action_type === '簽到' && 
                r.success
        );

        if (!hasCheckedIn && selectedEventId.value) { // 如果有選定活動但沒有簽到記錄
            recordStatus = '異常(未簽到)';
            isSuccess = true; // 視為簽退操作本身成功，但帶有異常狀態
        } else {
            recordStatus = '簽退成功';
            isSuccess = true;
        }
    }
  }

  // 構建新的報到記錄物件
  const newRecord = {
    id: crypto.randomUUID(), // 生成唯一的記錄 ID
    created_at: new Date().toISOString(), // 記錄當前時間 (ISO 格式)
    input: input,
    input_type: inputType,
    success: isSuccess,
    name_at_checkin: person ? person.name : null, // 記錄當時人員姓名，即使人員被刪除也能保留
    personnel_id: person ? person.id : null,
    device_id: getDeviceId(), // 獲取設備唯一 ID
    event_id: selectedEventId.value || null, // 關聯的活動 ID
    status: recordStatus, // 最終的記錄狀態
    action_type: selectedMode, // 操作類型 (簽到/簽退)
  };

  todayRecords.value.unshift(newRecord); // 將新記錄添加到暫存列表的頂部

  // 顯示簽到結果區塊並清空輸入框
  displayCheckInResult(newRecord, person, currentEvent);
  checkInInput.value = ''; 
};

// 顯示簽到結果的詳細資訊和動畫
const displayCheckInResult = (record, person, event) => {
  let colorBase = ''; // 基礎顏色，用於動態綁定 Tailwind CSS class (例如 'green', 'yellow')
  let statusIconComponent = null; // 用於動態渲染的 SVG 圖標元件
  let messageBoxType = 'info'; // 用於 uiStore.showMessage 的訊息類型
  let statusTextDisplay = record.status; // 最終顯示給用戶的狀態文字

  // 根據記錄的狀態設定對應的顏色和圖標
  switch (record.status) {
    case '準時':
      colorBase = 'green';
      statusIconComponent = CheckCircleIcon;
      messageBoxType = 'success';
      break;
    case '遲到':
      colorBase = 'yellow';
      statusIconComponent = ClockIcon;
      messageBoxType = 'warning';
      break;
    case '成功': // 通用成功狀態，用於未綁定活動的簽到
      colorBase = 'blue';
      statusIconComponent = CheckCircleIcon;
      messageBoxType = 'success';
      break;
    case '簽退成功':
      colorBase = 'blue';
      statusIconComponent = CheckCircleIcon;
      messageBoxType = 'success';
      break;
    case '重複簽到':
    case '重複簽退':
      colorBase = 'yellow';
      statusIconComponent = RepeatIcon;
      messageBoxType = 'warning';
      break;
    case '異常(未簽到)': // 簽退時如果沒有簽到記錄
      colorBase = 'red'; 
      statusIconComponent = WarningIcon;
      messageBoxType = 'warning'; 
      break;
    case '報到失敗 - 查無此人':
    case '簽退失敗 - 查無此人':
      colorBase = 'red';
      statusIconComponent = XCircleIcon;
      messageBoxType = 'error';
      break;
    default: // 預設處理未知或一般失敗情況
      colorBase = 'gray';
      statusIconComponent = XCircleIcon;
      messageBoxType = 'error';
      break;
  }

  // 更新 `checkInResult` 響應式物件的所有屬性
  checkInResult.value = {
    isVisible: true,
    statusClass: `bg-${colorBase}-100 text-${colorBase}-800`, // 外層背景和文字顏色
    colorBase: colorBase, // 內部動畫圓的基礎顏色
    statusIcon: statusIconComponent,
    statusText: statusTextDisplay,
    person: person,
    event: event,
    input: record.input,
    inputType: record.input_type
  };
  
  // 透過 uiStore 顯示一個訊息提示框
  const msgText = `${statusTextDisplay}：${person ? person.name : record.input}`;
  uiStore.showMessage(msgText, messageBoxType);
};

// 重置簽到頁面的結果顯示區塊，準備下一次簽到
const resetCheckIn = () => {
  checkInResult.value.isVisible = false; // 隱藏結果區塊
  checkInInput.value = ''; // 清空輸入框
  // 當結果區塊隱藏後，Vue 會自動清理 DOM，動畫也會停止。
};

// 將今日暫存的報到記錄儲存到資料庫
const saveTodayRecords = async () => {
  if (todayRecords.value.length === 0) {
    uiStore.showMessage('目前沒有可儲存的報到記錄。', 'info');
    return;
  }
  
  uiStore.setLoading(true); // 顯示全域載入指示器
  try {
    await api.saveRecords(todayRecords.value); // 調用 API 服務儲存記錄
    uiStore.showMessage('今日報到記錄已成功儲存至資料庫。', 'success');
    todayRecords.value = []; // 儲存成功後清空暫存記錄
  } catch (error) { 
    uiStore.showMessage(`儲存今日記錄失敗: ${error.message}`, 'error');
  } finally {
    uiStore.setLoading(false); // 隱藏全域載入指示器
  }
};

// 刪除所有今日暫存的報到記錄
const deleteAllTodayRecords = async () => {
  if (todayRecords.value.length === 0) {
    uiStore.showMessage('目前沒有任何報到記錄可刪除。', 'info');
    return;
  }
  
  try {
    // 顯示確認對話框，詢問用戶是否確定清除
    const confirmed = await uiStore.showConfirmation('確認清除全部暫存記錄', '此操作不會刪除已儲存的資料。');
    if (confirmed) {
      todayRecords.value = []; // 如果用戶確認，則清空暫存記錄
      uiStore.showMessage('已清除所有暫存記錄。', 'success');
    }
  } catch (error) {
    // 如果用戶取消操作，這裡會捕獲到拒絕的 Promise，不執行任何操作
    console.log("清除操作已取消");
  }
};

// 從暫存列表中刪除單筆報到記錄
const handleDeleteTempRecord = (id) => {
  todayRecords.value = todayRecords.value.filter(record => record.id !== id); // 過濾掉要刪除的記錄
  uiStore.showMessage('記錄已從暫存列表移除。', 'info');
};

// 輔助函數：獲取設備ID (從舊專案的 utils.js 遷移)
function getDeviceId() {
  let deviceId = localStorage.getItem('uniqueDeviceId');
  if (!deviceId) {
    // 優先使用加密安全的 randomUUID，否則使用備用方案
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      deviceId = crypto.randomUUID();
    } else {
      // 後備方案：生成一個偽隨機 UUID
      deviceId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
    localStorage.setItem('uniqueDeviceId', deviceId); // 將設備 ID 儲存到 localStorage
  }
  return deviceId;
}

// 輔助函數：判斷是否為有效卡號 (判斷是否為純數字字串) (從舊專案的 utils.js 遷移)
function isValidCardNumber(cardNumber) {
    return /^\d+$/.test(cardNumber);
}

</script>

<style scoped>
/* 數據表格的樣式通常已在 `src/assets/styles/main.css` 中定義，以實現響應式效果。 */
/* 此處保留針對此組件的特定樣式調整。 */
</style>
