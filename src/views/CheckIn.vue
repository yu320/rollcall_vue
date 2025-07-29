<template>
  <div class="max-w-2xl mx-auto">
    <!-- [MODIFIED] Check-in Form or Result View -->
    <div class="bg-white rounded-xl shadow-lg p-8 border-2 border-dashed border-gray-300 relative overflow-hidden">
      <!-- Form View -->
      <div v-if="!checkinResult">
        <h2 class="text-3xl font-bold text-gray-800 text-center mb-8">刷卡報到</h2>
        <div class="mb-6 flex justify-center gap-4">
          <label class="inline-flex items-center cursor-pointer p-2 rounded-lg transition" :class="{'bg-indigo-100': mode === '簽到'}">
            <input type="radio" v-model="mode" value="簽到" class="form-radio h-5 w-5 text-indigo-600 focus:ring-indigo-500">
            <span class="ml-2 text-lg font-medium">簽到</span>
          </label>
          <label class="inline-flex items-center cursor-pointer p-2 rounded-lg transition" :class="{'bg-indigo-100': mode === '簽退'}">
            <input type="radio" v-model="mode" value="簽退" class="form-radio h-5 w-5 text-indigo-600 focus:ring-indigo-500">
            <span class="ml-2 text-lg font-medium">簽退</span>
          </label>
        </div>
        <div class="mb-6">
          <label for="eventSelector" class="block text-sm font-medium text-gray-700 mb-2">選擇活動</label>
          <select id="eventSelector" v-model="selectedEventId" class="w-full pl-4 pr-10 py-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
              <option :value="null">-- 不選擇活動 (一般模式) --</option>
              <option v-for="event in dataStore.events" :key="event.id" :value="event.id">{{ event.name }}</option>
          </select>
        </div>
        <div class="relative">
          <input type="text" v-model="checkinInput" @keyup.enter="handleCheckIn" ref="checkinInputRef" class="w-full pl-14 pr-4 py-4 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="輸入學號或感應卡號...">
          <div class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H4a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
          </div>
        </div>
        <button @click="handleCheckIn" class="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-4 rounded-lg text-lg transition shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">確認{{ mode }}</button>
      </div>

      <!-- Result View (Matches old version's style) -->
      <div v-else class="check-in-animation">
        <div class="text-center" :class="checkinResult.statusColorClass + '-100'">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" :class="checkinResult.statusColorClass + '-500 text-white'" v-html="checkinResult.statusIcon">
            </div>
            <h3 class="text-2xl font-bold" :class="checkinResult.statusColorClass + '-800'">{{ checkinResult.statusText }}</h3>
        </div>

        <div class="p-6">
            <div v-if="checkinResult.person" class="mb-6">
                <div class="text-center mb-4">
                    <div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-indigo-100 text-indigo-800 text-2xl font-bold mb-2">{{ checkinResult.person.name.charAt(0) }}</div>
                    <h3 class="text-xl font-bold">{{ checkinResult.person.name }}</h3>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="bg-gray-50 p-3 rounded-lg">
                        <p class="text-sm text-gray-500">學號</p>
                        <p class="font-medium" :class="dataStore.getInputColorClass(checkinResult.person.code)">{{ checkinResult.person.code }}</p>
                    </div>
                    <div class="bg-gray-50 p-3 rounded-lg">
                        <p class="text-sm text-gray-500">卡號</p>
                        <p class="font-medium">{{ checkinResult.person.card_number }}</p>
                    </div>
                    <div v-if="checkinResult.event" class="col-span-1 sm:col-span-2 bg-indigo-50 p-3 rounded-lg">
                        <p class="text-sm text-gray-500">活動</p>
                        <p class="font-medium text-indigo-800">{{ checkinResult.event.name }}</p>
                    </div>
                </div>
            </div>
             <div v-else class="bg-gray-50 p-4 rounded-lg text-center mb-6">
                <p class="text-sm text-gray-500">輸入的{{ checkinResult.inputType }}：<span class="font-medium">{{ checkinResult.input }}</span></p>
                <p class="text-gray-500 mt-2">請確認{{ checkinResult.inputType }}是否正確，或聯繫管理員</p>
            </div>
            <div class="text-center">
                <button @click="resetCheckIn" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-8 rounded-lg transition duration-300 transform hover:scale-105 shadow-md">
                    繼續報到
                </button>
            </div>
        </div>
      </div>
    </div>

    <!-- Today's Temporary Records -->
    <div class="mt-10">
      <div class="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h3 class="text-2xl font-bold text-gray-800">今日暫存記錄 ({{ tempRecords.length }} 筆)</h3>
        <div class="flex gap-3 w-full sm:w-auto">
          <button @click="clearTempRecords" :disabled="tempRecords.length === 0" class="w-1/2 sm:w-auto bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg disabled:bg-red-300 disabled:cursor-not-allowed transition">全部清除</button>
          <button @click="saveTempRecords" :disabled="tempRecords.length === 0" class="w-1/2 sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded-lg disabled:bg-emerald-300 disabled:cursor-not-allowed transition">儲存至資料庫</button>
        </div>
      </div>
      <div class="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
        <div class="overflow-x-auto table-responsive">
            <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">時間</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">姓名</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">類型</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">狀態</th>
                <th class="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-100">
              <tr v-if="tempRecords.length === 0">
                <td colspan="5" class="text-center py-8 text-gray-500">尚無暫存記錄</td>
              </tr>
              <tr v-for="record in tempRecords" :key="record.id" class="hover:bg-gray-50">
                <td data-label="時間" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ new Date(record.created_at).toLocaleTimeString() }}</td>
                <td data-label="姓名" class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ record.name_at_checkin }}</td>
                <td data-label="類型" class="px-6 py-4 whitespace-nowrap"><span class="type-badge" :data-type="record.action_type">{{ record.action_type }}</span></td>
                <td data-label="狀態" class="px-6 py-4 whitespace-nowrap"><span class="status-badge" :data-status="record.status">{{ record.status }}</span></td>
                <td data-label="操作" class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button @click="deleteTempRecord(record.id)" class="text-red-600 hover:text-red-800">刪除</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, computed } from 'vue';
import { useUiStore } from '@/store/ui';
import { useDataStore } from '@/store/data';
import * as api from '@/services/api';
import { getDeviceId } from '@/utils';

const uiStore = useUiStore();
const dataStore = useDataStore();

const mode = ref('簽到');
const selectedEventId = ref(null);
const checkinInput = ref('');
const checkinResult = ref(null);
const tempRecords = ref([]);
const checkinInputRef = ref(null);

onMounted(async () => {
  uiStore.setLoading(true);
  try {
    await dataStore.fetchEvents();
    const saved = sessionStorage.getItem('tempCheckInRecords');
    if (saved) {
      tempRecords.value = JSON.parse(saved);
    }
  } catch (error) {
    uiStore.showMessage(`頁面初始化失敗: ${error.message}`, 'error');
  } finally {
      uiStore.setLoading(false);
      nextTick(() => {
        checkinInputRef.value?.focus();
      });
  }
});

// [NEW] Helper to generate result object for the template
const generateCheckinResult = (recordData, person) => {
    const event = recordData.event_id ? dataStore.getEventById(recordData.event_id) : null;
    let statusColorClass, statusIcon, statusText;

    switch (recordData.status) {
        case '準時':
            statusColorClass = 'bg-green'; statusIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>`; statusText = '準時報到'; break;
        case '遲到':
            statusColorClass = 'bg-yellow'; statusIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`; statusText = '遲到'; break;
        case '報到失敗 - 查無此人':
            statusColorClass = 'bg-red'; statusIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>`; statusText = '報到失敗 (查無此人)'; break;
        case '簽退成功':
            statusColorClass = 'bg-blue'; statusIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`; statusText = '簽退成功'; break;
        case '簽退失敗 - 查無此人':
            statusColorClass = 'bg-red'; statusIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>`; statusText = '簽退失敗 (查無此人)'; break;
        case '異常(未簽到)':
            statusColorClass = 'bg-red'; statusIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>`; statusText = '簽退異常 (未簽到)'; break;
        case '重複簽退':
        case '重複簽到':
            statusColorClass = 'bg-yellow'; statusIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9.247a4.998 4.998 0 00-.776 2.343M11.603 16.03a6.002 6.002 0 00.99 1.139M15 14l-3-3m0 0l-3-3m3 3l3 3m0 0l3-3m0 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`; statusText = recordData.status; break;
        default:
            statusColorClass = 'bg-blue'; statusIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>`; statusText = '報到成功'; break;
    }

    return {
        person,
        event,
        input: recordData.input,
        inputType: recordData.input_type,
        statusColorClass: statusColorClass,
        statusIcon: statusIcon,
        statusText: statusText,
    };
};

const handleCheckIn = async () => {
  if (!checkinInput.value.trim()) return;
  
  try {
    const result = await api.processCheckIn({
      input: checkinInput.value.trim(),
      mode: mode.value,
      eventId: selectedEventId.value,
      deviceId: getDeviceId()
    });
    
    // [MODIFIED] Use helper to generate result object for template
    checkinResult.value = generateCheckinResult(result.recordData, result.personInfo);

    const fullRecord = {
        ...result.recordData,
        id: Date.now(),
        created_at: new Date().toISOString()
    };
    tempRecords.value.unshift(fullRecord);
    sessionStorage.setItem('tempCheckInRecords', JSON.stringify(tempRecords.value));
    checkinInput.value = '';

  } catch (error) {
    uiStore.showMessage(error.message, 'error');
    checkinInput.value = '';
  } finally {
      nextTick(() => {
        if(checkinResult.value === null) {
            checkinInputRef.value?.focus();
        }
      });
  }
};

const resetCheckIn = () => {
  checkinResult.value = null;
  nextTick(() => {
    checkinInputRef.value?.focus();
  });
};

const saveTempRecords = async () => {
  if(tempRecords.value.length === 0) {
      uiStore.showMessage('沒有可儲存的記錄。', 'info');
      return;
  }
  uiStore.setLoading(true);
  try {
    await api.saveRecords(tempRecords.value);
    uiStore.showMessage('記錄已成功儲存至資料庫！', 'success');
    tempRecords.value = [];
    sessionStorage.removeItem('tempCheckInRecords');
  } catch(e) {
    uiStore.showMessage(`儲存失敗: ${e.message}`, 'error');
  } finally {
    uiStore.setLoading(false);
  }
};

const deleteTempRecord = (id) => {
    tempRecords.value = tempRecords.value.filter(rec => rec.id !== id);
    sessionStorage.setItem('tempCheckInRecords', JSON.stringify(tempRecords.value));
}

const clearTempRecords = () => {
    if(confirm('確定要清除所有暫存記錄嗎？此操作無法復原。')) {
        tempRecords.value = [];
        sessionStorage.removeItem('tempCheckInRecords');
        uiStore.showMessage('暫存記錄已清除。', 'success');
    }
}
</script>
