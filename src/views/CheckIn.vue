<template>
  <div class="max-w-2xl mx-auto">
    <!-- 主要簽到卡片 -->
    <div class="bg-white rounded-xl shadow-lg p-8 border-2 border-dashed border-gray-300">
      <div class="text-center mb-8">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto text-indigo-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
        <h2 class="text-3xl font-bold text-gray-800">刷卡報到</h2>
        <p class="text-gray-500 mt-2">請將學生證放置於刷卡機或是手動輸入學號進行報到</p>
      </div>

      <!-- 簽到/簽退模式選擇 -->
      <div class="mb-6 flex justify-center gap-4">
        <label class="inline-flex items-center cursor-pointer p-3 border-2 rounded-lg" :class="checkinMode === '簽到' ? 'border-indigo-500 bg-indigo-50' : 'border-transparent'">
          <input type="radio" v-model="checkinMode" value="簽到" class="form-radio h-5 w-5 text-indigo-600">
          <span class="ml-2 text-lg font-medium text-gray-800">簽到</span>
        </label>
        <label class="inline-flex items-center cursor-pointer p-3 border-2 rounded-lg" :class="checkinMode === '簽退' ? 'border-indigo-500 bg-indigo-50' : 'border-transparent'">
          <input type="radio" v-model="checkinMode" value="簽退" class="form-radio h-5 w-5 text-indigo-600">
          <span class="ml-2 text-lg font-medium text-gray-800">簽退</span>
        </label>
      </div>

      <!-- 活動選擇 -->
      <div class="mb-6">
        <label for="eventSelector" class="block text-sm font-medium text-gray-700 mb-2">選擇活動</label>
        <select id="eventSelector" v-model="selectedEventId" class="w-full pl-4 pr-10 py-3 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
          <option :value="null">-- 不選擇活動 (測試用) --</option>
          <option v-for="event in sortedEvents" :key="event.id" :value="event.id" :class="{'text-gray-500': isEventEnded(event.end_time)}">
            {{ event.name }} ({{ formatDateTime(event.start_time, 'yyyy-MM-dd') }})
            <span v-if="isEventEnded(event.end_time)">(已結束)</span>
          </option>
        </select>
      </div>

      <!-- 輸入框與按鈕 -->
      <form @submit.prevent="handleCheckIn">
        <div class="relative">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
          </svg>
          <input v-model="checkinInput" type="text" id="checkInInput" class="w-full pl-14 pr-4 py-4 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="輸入學號/卡號">
        </div>
        <button type="submit" class="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-4 rounded-lg text-lg transition duration-300 ease-in-out transform hover:scale-105">
          {{ checkinButtonText }}
        </button>
      </form>
    </div>

    <!-- 報到結果顯示 -->
    <div v-if="checkInResult" class="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 mt-8">
      <div :class="checkInResult.statusColorClass" class="px-6 py-4 text-center">
        <div class="check-in-animation inline-flex items-center justify-center w-16 h-16 rounded-full text-white mb-4" :class="checkInResult.statusBgColorClass">
          <div v-html="checkInResult.statusIcon"></div>
        </div>
        <h3 class="text-2xl font-bold" :class="checkInResult.statusTextColorClass">{{ checkInResult.statusText }}</h3>
      </div>
      <div class="p-6">
        <div class="mb-6" v-html="checkInResult.personInfoHtml"></div>
        <div class="text-center">
          <button @click="resetCheckIn" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-8 rounded-lg transition duration-300 transform hover:scale-105 shadow-md">
            繼續報到
          </button>
        </div>
      </div>
    </div>

    <!-- 今日暫存記錄 -->
    <div class="mt-10">
      <div class="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h3 class="text-2xl font-bold text-gray-800">今日暫存記錄 ({{ tempRecords.length }} 筆)</h3>
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
                <th class="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">時間</th>
                <th class="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">姓名</th>
                <th class="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">學號/卡號</th>
                <th class="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">類型</th>
                <th class="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">狀態</th>
                <th class="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">活動</th>
                <th class="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">裝置ID</th>
                <th class="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-100">
              <tr v-for="record in tempRecords" :key="record.id">
                <td data-label="時間" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatDateTime(record.created_at, 'yyyy-MM-dd HH:mm:ss') }}</td>
                <td data-label="姓名" class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ record.name_at_checkin || '—' }}</td>
                <td data-label="學號/卡號" class="px-6 py-4 whitespace-nowrap text-sm">
                  <div class="flex flex-col items-center">
                    <span :class="dataStore.getInputColorClass(record.input)" class="font-semibold">{{ record.input }}</span>
                    <span class="text-xs text-gray-500">{{ record.input_type }}</span>
                  </div>
                </td>
                <td data-label="類型" class="px-6 py-4 whitespace-nowrap text-sm"><span class="type-badge" :data-type="record.action_type">{{ record.action_type }}</span></td>
                <td data-label="狀態" class="px-6 py-4 whitespace-nowrap"><span class="status-badge" :data-status="record.status">{{ record.status }}</span></td>
                <td data-label="活動" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ getEventName(record.event_id) }}</td>
                <td data-label="裝置ID" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate" style="max-width: 150px;">{{ record.device_id || '—' }}</td>
                <td data-label="操作" class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button @click="handleDeleteTempRecord(record.id)" class="text-gray-400 hover:text-red-600" aria-label="刪除此筆暫存記錄">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clip-rule="evenodd" /></svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="tempRecords.length === 0" class="py-8 text-center text-gray-500 text-lg">
          尚無暫存記錄
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useDataStore } from '@/store/data';
import { useUiStore } from '@/store/ui';
import * as api from '@/services/api';
import { formatDateTime, isValidCardNumber, getDeviceId } from '@/utils';
import { isPast, parseISO } from 'date-fns';

// --- Pinia Stores ---
const dataStore = useDataStore();
const uiStore = useUiStore();

// --- Component State ---
const checkinInput = ref('');
const selectedEventId = ref(null);
const checkinMode = ref('簽到'); // '簽到' or '簽退'
const tempRecords = ref([]); // 暫存記錄
const checkInResult = ref(null); // 報到結果物件

const SS_TEMP_RECORDS_KEY = 'tempCheckInRecords'; // Session Storage Key

// --- Computed Properties ---
const checkinButtonText = computed(() => `確認${checkinMode.value}`);

const sortedEvents = computed(() => {
  return [...dataStore.events].sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
});

// --- Lifecycle Hooks ---
onMounted(async () => {
  uiStore.setLoading(true);
  try {
    // 並行獲取活動和人員資料
    await Promise.all([
      dataStore.fetchEvents(),
      dataStore.fetchAllPersonnel()
    ]);
    // 從 sessionStorage 載入暫存記錄
    const savedRecords = sessionStorage.getItem(SS_TEMP_RECORDS_KEY);
    if (savedRecords) {
      tempRecords.value = JSON.parse(savedRecords);
    }
  } catch (error) {
    uiStore.showMessage(`頁面初始化失敗: ${error.message}`, 'error');
  } finally {
    uiStore.setLoading(false);
  }
});

// --- Methods ---

/**
 * 根據活動 ID 獲取活動名稱
 * @param {string} eventId - 活動的 ID
 */
const getEventName = (eventId) => {
  if (!eventId) return '—';
  const event = dataStore.events.find(e => e.id === eventId);
  return event ? event.name : '未知活動';
};

/**
 * 判斷活動是否已結束
 * @param {string} endTimeIso - 活動結束時間的 ISO 字串
 */
const isEventEnded = (endTimeIso) => {
  if (!endTimeIso) return false;
  return isPast(parseISO(endTimeIso));
};

/**
 * 處理報到/簽退操作
 */
const handleCheckIn = () => {
  const input = checkinInput.value.trim();
  if (!input) return;

  const allPersonnel = dataStore.personnel;
  const selectedEvent = selectedEventId.value ? dataStore.events.find(e => e.id === selectedEventId.value) : null;

  let person;
  let inputType = isValidCardNumber(input) ? '卡號' : '學號';
  
  if (inputType === '卡號') {
    person = allPersonnel.find(p => String(p.card_number) === input);
  } else {
    person = allPersonnel.find(p => String(p.code).toLowerCase() === input.toLowerCase());
  }
  
  const now = new Date();
  let status = '';
  let success = false;

  if (checkinMode.value === '簽到') {
    if (!person) {
      status = '報到失敗 - 查無此人';
    } else {
      const alreadyCheckedIn = tempRecords.value.some(r => r.personnel_id === person.id && r.event_id === selectedEventId.value && r.action_type === '簽到' && r.success);
      if (alreadyCheckedIn) {
        status = '重複簽到';
      } else {
        success = true;
        if (selectedEvent) {
          const eventTime = selectedEvent.end_time ? new Date(selectedEvent.end_time) : new Date(selectedEvent.start_time);
          status = now > eventTime ? '遲到' : '準時';
        } else {
          status = '成功';
        }
      }
    }
  } else { // 簽退模式
    if (!person) {
      status = '簽退失敗 - 查無此人';
    } else {
      const alreadyCheckedOut = tempRecords.value.some(r => r.personnel_id === person.id && r.event_id === selectedEventId.value && r.action_type === '簽退' && r.success);
      if (alreadyCheckedOut) {
        status = '重複簽退';
      } else {
        const hasCheckedIn = tempRecords.value.some(r => r.personnel_id === person.id && r.event_id === selectedEventId.value && r.action_type === '簽到' && r.success);
        if (!hasCheckedIn && selectedEventId.value) {
          status = '異常(未簽到)';
          success = true;
        } else {
          status = '簽退成功';
          success = true;
        }
      }
    }
  }

  const recordData = {
    id: crypto.randomUUID(),
    created_at: now.toISOString(),
    input,
    input_type: inputType,
    success,
    name_at_checkin: person ? person.name : null,
    personnel_id: person ? person.id : null,
    device_id: getDeviceId(),
    event_id: selectedEventId.value || null,
    status,
    action_type: checkinMode.value,
  };

  // 新增到暫存列表頂部並更新 sessionStorage
  tempRecords.value.unshift(recordData);
  sessionStorage.setItem(SS_TEMP_RECORDS_KEY, JSON.stringify(tempRecords.value));
  
  displayCheckInResult(person, recordData);
  checkinInput.value = '';
};

/**
 * 顯示報到結果
 * @param {object|null} person - 找到的人員物件
 * @param {object} recordData - 完整的報到記錄物件
 */
function displayCheckInResult(person, recordData) {
  const selectedEvent = recordData.event_id ? dataStore.events.find(e => e.id === recordData.event_id) : null;
  let statusColorClass, statusBgColorClass, statusTextColorClass, statusIcon, statusText;

  // 根據狀態設定顯示樣式
  switch (recordData.status) {
    case '準時':
      statusColorClass = 'bg-green-100'; statusBgColorClass = 'bg-green-500'; statusTextColorClass = 'text-green-800';
      statusIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>`;
      statusText = '準時報到';
      break;
    case '遲到':
      statusColorClass = 'bg-yellow-100'; statusBgColorClass = 'bg-yellow-500'; statusTextColorClass = 'text-yellow-800';
      statusIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
      statusText = '遲到';
      break;
    case '報到失敗 - 查無此人':
    case '簽退失敗 - 查無此人':
      statusColorClass = 'bg-red-100'; statusBgColorClass = 'bg-red-500'; statusTextColorClass = 'text-red-800';
      statusIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>`;
      statusText = recordData.status;
      break;
    case '簽退成功':
      statusColorClass = 'bg-blue-100'; statusBgColorClass = 'bg-blue-500'; statusTextColorClass = 'text-blue-800';
      statusIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
      statusText = '簽退成功';
      break;
    case '異常(未簽到)':
      statusColorClass = 'bg-red-100'; statusBgColorClass = 'bg-red-500'; statusTextColorClass = 'text-red-800';
      statusIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>`;
      statusText = '簽退異常 (未簽到)';
      break;
    case '重複簽到':
    case '重複簽退':
      statusColorClass = 'bg-yellow-100'; statusBgColorClass = 'bg-yellow-500'; statusTextColorClass = 'text-yellow-800';
      statusIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9.247a4.998 4.998 0 00-.776 2.343M11.603 16.03a6.002 6.002 0 00.99 1.139M15 14l-3-3m0 0l-3-3m3 3l3 3m0 0l3-3m0 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
      statusText = recordData.status;
      break;
    default: // 一般成功
      statusColorClass = 'bg-blue-100'; statusBgColorClass = 'bg-blue-500'; statusTextColorClass = 'text-blue-800';
      statusIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>`;
      statusText = '報到成功';
      break;
  }

  let personInfoHtml = '';
  if (person) {
    const eventInfoHtml = selectedEvent ? `<div class="col-span-1 sm:col-span-2 bg-indigo-50 p-3 rounded-lg"><p class="text-sm text-gray-500">活動</p><p class="font-medium text-indigo-800">${selectedEvent.name}</p></div>` : '';
    personInfoHtml = `
      <div class="text-center mb-4">
        <div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-indigo-100 text-indigo-800 text-2xl font-bold mb-2">${person.name.charAt(0)}</div>
        <h3 class="text-xl font-bold">${person.name}</h3>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="bg-gray-50 p-3 rounded-lg"><p class="text-sm text-gray-500">學號</p><p class="font-medium ${dataStore.getInputColorClass(person.code)}">${person.code}</p></div>
        <div class="bg-gray-50 p-3 rounded-lg"><p class="text-sm text-gray-500">卡號</p><p class="font-medium">${person.card_number}</p></div>
        ${eventInfoHtml}
      </div>`;
  } else {
    personInfoHtml = `<div class="bg-gray-50 p-4 rounded-lg text-center"><p class="text-sm text-gray-500">輸入的${recordData.input_type}：<span class="font-medium">${recordData.input}</span></p><p class="text-gray-500 mt-2">請確認${recordData.input_type}是否正確，或聯繫管理員</p></div>`;
  }
  
  checkInResult.value = {
    statusColorClass, statusBgColorClass, statusTextColorClass, statusIcon, statusText, personInfoHtml
  };
};

/**
 * 重置報到介面
 */
const resetCheckIn = () => {
  checkInResult.value = null;
  checkinInput.value = '';
};

/**
 * 儲存今日所有暫存記錄到資料庫
 */
const saveTodayRecords = async () => {
  if (tempRecords.value.length === 0) {
    uiStore.showMessage('目前沒有可儲存的報到記錄。', 'info');
    return;
  }
  uiStore.setLoading(true);
  try {
    await api.saveRecords(tempRecords.value);
    uiStore.showMessage('今日報到記錄已成功儲存至資料庫。', 'success');
    tempRecords.value = [];
    sessionStorage.removeItem(SS_TEMP_RECORDS_KEY);
  } catch (error) {
    uiStore.showMessage(`儲存今日記錄失敗: ${error.message}`, 'error');
  } finally {
    uiStore.setLoading(false);
  }
};

/**
 * 刪除所有今日暫存記錄
 */
const deleteAllTodayRecords = () => {
  if (tempRecords.value.length === 0) {
    uiStore.showMessage('目前沒有任何報到記錄可刪除。', 'info');
    return;
  }
  // [FIXED] 使用 uiStore 的確認彈窗
  uiStore.showConfirmation(
    '確認清除全部暫存記錄',
    '您確定要清除所有暫存記錄嗎？此操作不會刪除已儲存的資料。',
    '確認清除',
    'bg-red-600 hover:bg-red-700'
  ).then(() => {
    tempRecords.value = [];
    sessionStorage.removeItem(SS_TEMP_RECORDS_KEY);
    uiStore.showMessage('已清除所有暫存記錄。', 'success');
  }).catch(() => {
    // 使用者取消，不執行任何操作
  });
};

/**
 * 從暫存列表中刪除一筆記錄
 * @param {string} recordId - 要刪除的記錄 ID
 */
const handleDeleteTempRecord = (recordId) => {
  const record = tempRecords.value.find(r => r.id === recordId);
  if (!record) return;

  // [FIXED] 使用 uiStore 的確認彈窗
  uiStore.showConfirmation(
    '確認刪除暫存記錄',
    `您確定要刪除 ${record.name_at_checkin || record.input} 的這筆暫存記錄嗎？`,
    '確認刪除',
    'bg-red-600 hover:bg-red-700'
  ).then(() => {
    tempRecords.value = tempRecords.value.filter(r => r.id !== recordId);
    sessionStorage.setItem(SS_TEMP_RECORDS_KEY, JSON.stringify(tempRecords.value));
    uiStore.showMessage('暫存記錄已刪除', 'success');
  }).catch(() => {
    // 使用者取消，不執行任何操作
  });
};
</script>

<style scoped>
/* 可以在這裡添加一些此元件專用的 CSS，不過我們主要使用 Tailwind CSS */
</style>
