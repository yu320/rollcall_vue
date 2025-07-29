<template>
  <div class="max-w-2xl mx-auto">
    <!-- Check-in Form -->
    <div class="bg-white rounded-xl shadow-lg p-8 border-2 border-dashed border-gray-300 relative overflow-hidden">
      <!-- 報到成功/失敗的動畫疊加層 -->
      <transition name="check-in-animation">
        <div v-if="checkinResult" :class="checkinResult.status.includes('成功') || checkinResult.status.includes('準時') ? 'bg-green-400' : 'bg-yellow-400'"
             class="absolute inset-0 bg-opacity-90 flex flex-col justify-center items-center text-white z-10 p-4">
          <p class="text-2xl font-bold">{{ checkinResult.status }}</p>
          <p class="text-4xl font-extrabold my-2">{{ checkinResult.name }}</p>
          <p class="text-xl">您已完成{{ mode }}</p>
          <button @click="resetCheckIn" class="mt-6 bg-white text-indigo-600 font-bold py-2 px-8 rounded-full shadow-lg hover:bg-gray-100 transition">繼續報到</button>
        </div>
      </transition>

      <!-- 主要表單內容 -->
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
import { ref, onMounted, nextTick } from 'vue';
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
const checkinInputRef = ref(null); // 用於聚焦輸入框

onMounted(async () => {
  uiStore.setLoading(true);
  try {
    await dataStore.fetchEvents();
    // 從 sessionStorage 載入暫存記錄
    const saved = sessionStorage.getItem('tempCheckInRecords');
    if (saved) {
      tempRecords.value = JSON.parse(saved);
    }
  } catch (error) {
    uiStore.showMessage(`頁面初始化失敗: ${error.message}`, 'error');
  } finally {
      uiStore.setLoading(false);
      // 自動聚焦到輸入框
      nextTick(() => {
        checkinInputRef.value?.focus();
      });
  }
});

const handleCheckIn = async () => {
  if (!checkinInput.value.trim()) return;
  
  try {
    const result = await api.processCheckIn({
      input: checkinInput.value.trim(),
      mode: mode.value,
      eventId: selectedEventId.value,
      deviceId: getDeviceId() // 假設 getDeviceId 存在於 utils 中
    });
    
    // 顯示結果動畫
    checkinResult.value = result.personInfo;

    // 準備並新增記錄到暫存列表
    const fullRecord = {
        ...result.recordData,
        id: Date.now(), // 前端臨時ID
        created_at: new Date().toISOString() // 確保有時間戳
    };
    tempRecords.value.unshift(fullRecord);

    // 更新 sessionStorage
    sessionStorage.setItem('tempCheckInRecords', JSON.stringify(tempRecords.value));

    checkinInput.value = '';

  } catch (error) {
    uiStore.showMessage(error.message, 'error');
    // 讓使用者知道錯誤後，清空輸入框以便重新輸入
    checkinInput.value = '';
  } finally {
      // 無論成功或失敗，都重新聚焦
      nextTick(() => {
        checkinInputRef.value?.focus();
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
    await api.batchSaveRecords(tempRecords.value);
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

<style scoped>
/* 報到動畫 */
.check-in-animation-enter-active,
.check-in-animation-leave-active {
  transition: all 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55);
}

.check-in-animation-enter-from,
.check-in-animation-leave-to {
  opacity: 0;
  transform: scale(0.3);
}
</style>
