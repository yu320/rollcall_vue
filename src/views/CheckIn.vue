<template>
  <div class="max-w-2xl mx-auto">
    <!-- Check-in Form -->
    <div class="bg-white rounded-xl shadow-lg p-8 border-2 border-dashed border-gray-300">
      <h2 class="text-3xl font-bold text-gray-800 text-center mb-8">刷卡報到</h2>
      <div class="mb-6 flex justify-center gap-4">
        <label class="inline-flex items-center"><input type="radio" v-model="mode" value="簽到" class="form-radio h-5 w-5 text-indigo-600"> <span class="ml-2">簽到</span></label>
        <label class="inline-flex items-center"><input type="radio" v-model="mode" value="簽退" class="form-radio h-5 w-5 text-indigo-600"> <span class="ml-2">簽退</span></label>
      </div>
      <div class="mb-6">
        <label for="eventSelector" class="block text-sm font-medium text-gray-700 mb-2">選擇活動</label>
        <select id="eventSelector" v-model="selectedEventId" class="w-full pl-4 pr-10 py-3 border border-gray-300 rounded-lg bg-white">
            <option :value="null">-- 不選擇活動 (測試用) --</option>
            <option v-for="event in dataStore.events" :key="event.id" :value="event.id">{{ event.name }}</option>
        </select>
      </div>
      <input type="text" v-model="checkinInput" @keyup.enter="handleCheckIn" class="w-full pl-14 pr-4 py-4 border border-gray-300 rounded-lg text-lg" placeholder="輸入學號/卡號">
      <button @click="handleCheckIn" class="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-4 rounded-lg text-lg">確認{{ mode }}</button>
    </div>

    <!-- Check-in Result Display (similar to a modal) -->
    <div v-if="checkinResult" class="mt-8 bg-white rounded-xl shadow-lg p-6">
      <!-- ... result display logic here ... -->
      <p>姓名: {{ checkinResult.name }}</p>
      <p>狀態: {{ checkinResult.status }}</p>
      <button @click="resetCheckIn" class="mt-4 bg-indigo-600 text-white py-2 px-4 rounded-lg w-full">繼續報到</button>
    </div>

    <!-- Today's Temporary Records -->
    <div class="mt-10">
      <div class="flex justify-between items-center mb-6">
        <h3 class="text-2xl font-bold text-gray-800">今日暫存記錄</h3>
        <div class="flex gap-3">
          <button @click="clearTempRecords" class="bg-red-600 text-white py-2 px-4 rounded-lg">刪除全部</button>
          <button @click="saveTempRecords" class="bg-emerald-600 text-white py-2 px-4 rounded-lg">儲存記錄</button>
        </div>
      </div>
      <div class="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 table-responsive">
        <table class="min-w-full">
          <thead>
             <!-- ... table headers ... -->
          </thead>
          <tbody>
            <tr v-for="record in tempRecords" :key="record.id">
              <!-- ... table cells ... -->
              <td>{{ record.name_at_checkin }}</td>
              <td>{{ record.status }}</td>
              <td><button @click="deleteTempRecord(record.id)">刪除</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useUiStore } from '@/store/ui';
import { useDataStore } from '@/store/data';
import { api } from '@/services/api';
import { getDeviceId } from '@/utils';

const uiStore = useUiStore();
const dataStore = useDataStore();

const mode = ref('簽到');
const selectedEventId = ref(null);
const checkinInput = ref('');
const checkinResult = ref(null);
const tempRecords = ref([]);

onMounted(async () => {
  await dataStore.fetchEvents();
  // Load temp records from session storage if any
  const saved = sessionStorage.getItem('tempCheckInRecords');
  if (saved) {
    tempRecords.value = JSON.parse(saved);
  }
});

const handleCheckIn = async () => {
  if (!checkinInput.value) return;
  
  try {
    const result = await api.processCheckIn({
      input: checkinInput.value,
      mode: mode.value,
      eventId: selectedEventId.value,
      deviceId: getDeviceId()
    });
    
    checkinResult.value = result.personInfo;
    tempRecords.value.unshift(result.recordData);
    sessionStorage.setItem('tempCheckInRecords', JSON.stringify(tempRecords.value));
    checkinInput.value = '';

  } catch (error) {
    uiStore.showMessage(error.message, 'error');
  }
};

const resetCheckIn = () => {
  checkinResult.value = null;
};

const saveTempRecords = async () => {
  uiStore.setLoading(true);
  try {
    await api.saveRecords(tempRecords.value);
    uiStore.showMessage('記錄儲存成功!', 'success');
    tempRecords.value = [];
    sessionStorage.removeItem('tempCheckInRecords');
  } catch(e) {
    uiStore.showMessage(e.message, 'error');
  } finally {
    uiStore.setLoading(false);
  }
};

// ... other methods like clearTempRecords, deleteTempRecord
</script>
