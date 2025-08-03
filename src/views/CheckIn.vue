<template>
  <div class="max-w-2xl mx-auto">
    <CheckInForm
      :events="sortedEvents"
      v-model:checkinMode="checkinMode"
      v-model:selectedEventId="selectedEventId"
      @submit="handleCheckIn"
    />

    <CheckInResult
      :result="checkInResult"
      @reset="resetCheckIn"
    />

    <TempRecordsTable
      :records="tempRecords"
      @delete-all="deleteAllTodayRecords"
      @save-all="saveTodayRecords"
      @delete-record="handleDeleteTempRecord"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, nextTick } from 'vue';
import { useDataStore } from '@/store/data';
import { useUiStore } from '@/store/ui';
import * as api from '@/services/api';
import { isValidCardNumber, getDeviceId } from '@/utils';
import { addOfflineRecord } from '@/utils/db'; // 引入離線資料庫工具
import { isPast, parseISO } from 'date-fns';

// 引入新的子元件
import CheckInForm from '@/components/checkin/CheckInForm.vue';
import CheckInResult from '@/components/checkin/CheckInResult.vue';
import TempRecordsTable from '@/components/checkin/TempRecordsTable.vue';

// --- Pinia Stores ---
const dataStore = useDataStore();
const uiStore = useUiStore();

// --- Component State ---
const selectedEventId = ref(null);
const checkinMode = ref('簽到');
const tempRecords = ref([]);
const checkInResult = ref(null);

const SS_TEMP_RECORDS_KEY = 'tempCheckInRecords';

// --- Computed Properties ---
const sortedEvents = computed(() => {
  return [...dataStore.events].sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
});

// --- Lifecycle Hooks ---
onMounted(async () => {
  uiStore.setLoading(true);
  try {
    await Promise.all([
      dataStore.fetchEvents(),
      dataStore.fetchAllPersonnel()
    ]);
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
const handleCheckIn = async (inputValue) => {
  const input = inputValue.trim();
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

  if (!person) {
    status = '報到失敗 - 查無此人';
  } else {
    if (selectedEvent && selectedEvent.participant_scope === 'SPECIFIC') {
        const participants = await dataStore.fetchEventParticipants(selectedEvent.id);
        const isParticipant = participants.some(p => p.id === person.id);
        if (!isParticipant) {
            status = '活動查無此人';
        }
    }
  }

  if (status === '') {
    const recordExists = (action) => tempRecords.value.some(r => r.personnel_id === person.id && r.event_id === selectedEventId.value && r.action_type === action && r.success);
    
    if (checkinMode.value === '簽到') {
      if (recordExists('簽到')) {
        status = '重複簽到';
      } else {
        success = true;
        if (selectedEvent) {
          const eventStartTime = new Date(selectedEvent.start_time);
          status = now > eventStartTime ? '遲到' : '準時';
        } else {
          status = '成功';
        }
      }
    } else { // 簽退模式
      if (recordExists('簽退')) {
        status = '重複簽退';
      } else {
        success = true;
        status = '簽退成功';
        if (selectedEventId.value && !recordExists('簽到')) {
          status = '異常(未簽到)';
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

  // [修改] 離線/線上儲存邏輯
  if (navigator.onLine) {
    tempRecords.value.unshift(recordData);
    sessionStorage.setItem(SS_TEMP_RECORDS_KEY, JSON.stringify(tempRecords.value));
  } else {
    try {
      await addOfflineRecord(recordData);
      uiStore.showMessage('目前為離線狀態，記錄已暫存，將在連線後自動同步。', 'warning');
      tempRecords.value.unshift({ ...recordData, offline: true }); 
    } catch (e) {
      uiStore.showMessage('離線儲存失敗！', 'error');
    }
  }

  await nextTick();
  displayCheckInResult(person, recordData);
};

function displayCheckInResult(person, recordData) {
  const selectedEvent = recordData.event_id ? dataStore.events.find(e => e.id === recordData.event_id) : null;
  let statusColorClass, statusBgColorClass, statusTextColorClass, statusIcon, statusText;

  switch (recordData.status) {
    case '成功':
    case '準時':
      statusColorClass = 'bg-green-100'; statusBgColorClass = 'bg-green-500'; statusTextColorClass = 'text-green-800';
      statusIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>`;
      statusText = (recordData.status === '準時') ? '準時報到' : '報到成功';
      break;
    case '遲到':
      statusColorClass = 'bg-yellow-100'; statusBgColorClass = 'bg-yellow-500'; statusTextColorClass = 'text-yellow-800';
      statusIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
      statusText = '遲到';
      break;
    case '報到失敗 - 查無此人':
    case '活動查無此人':
      statusColorClass = 'bg-red-100'; statusBgColorClass = 'bg-red-500'; statusTextColorClass = 'text-red-800';
      statusIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>`;
      statusText = recordData.status === '活動查無此人' ? '活動報到失敗' : '報到失敗';
      break;
    case '簽退成功':
      statusColorClass = 'bg-blue-100'; statusBgColorClass = 'bg-blue-500'; statusTextColorClass = 'text-blue-800';
      statusIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
      statusText = '簽退成功';
      break;
    case '異常(未簽到)':
      statusColorClass = 'bg-red-100'; statusBgColorClass = 'bg-red-500'; statusTextColorClass = 'text-red-800';
      statusIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
      statusText = '簽退異常 (未簽到)';
      break;
    default: // 重複簽到/簽退
      statusColorClass = 'bg-yellow-100'; statusBgColorClass = 'bg-yellow-500'; statusTextColorClass = 'text-yellow-800';
      statusIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9.247a4.998 4.998 0 00-.776 2.343M11.603 16.03a6.002 6.002 0 00.99 1.139M15 14l-3-3m0 0l-3-3m3 3l3 3m0 0l3-3m0 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
      statusText = recordData.status;
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
     personInfoHtml = `<div class="bg-gray-50 p-4 rounded-lg text-center"><p class="text-sm text-gray-500">輸入的${recordData.input_type}：<span class="font-medium">${recordData.input}</span></p><p class="text-gray-500 mt-2">請確認輸入是否正確，或聯繫管理員</p></div>`;
  }
  
  checkInResult.value = {
    statusColorClass, statusBgColorClass, statusTextColorClass, statusIcon, statusText, personInfoHtml
  };
};

const resetCheckIn = () => {
  checkInResult.value = null;
};

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

const deleteAllTodayRecords = () => {
  if (tempRecords.value.length === 0) return;
  uiStore.showConfirmation(
    '確認清除全部暫存記錄',
    '您確定要清除所有暫存記錄嗎？此操作不會刪除已儲存的資料。',
    '確認清除', 'bg-red-600 hover:bg-red-700'
  ).then(() => {
    tempRecords.value = [];
    sessionStorage.removeItem(SS_TEMP_RECORDS_KEY);
    uiStore.showMessage('已清除所有暫存記錄。', 'success');
  });
};

const handleDeleteTempRecord = (recordId) => {
  const record = tempRecords.value.find(r => r.id === recordId);
  if (!record) return;

  uiStore.showConfirmation(
    '確認刪除暫存記錄',
    `您確定要刪除 ${record.name_at_checkin || record.input} 的這筆暫存記錄嗎？`,
    '確認刪除', 'bg-red-600 hover:bg-red-700'
  ).then(() => {
    tempRecords.value = tempRecords.value.filter(r => r.id !== recordId);
    sessionStorage.setItem(SS_TEMP_RECORDS_KEY, JSON.stringify(tempRecords.value));
    uiStore.showMessage('暫存記錄已刪除', 'success');
  });
};
</script>