<template>
  <div class="p-4">
    <h1 class="text-2xl font-bold mb-4">報表產生器</h1>

    <!-- Filters -->
    <div class="bg-white p-4 rounded-lg shadow-md mb-4">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div>
          <label class="block text-sm font-medium text-gray-700">報表類型</label>
          <select v-model="filterType" class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
            <option value="daily">每日簽到</option>
            <option value="activity">活動簽到</option>
          </select>
        </div>

        <div v-if="filterType === 'daily'">
          <label for="date" class="block text-sm font-medium text-gray-700">日期</label>
          <input type="date" id="date" v-model="selectedDate" class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
        </div>

        <div v-if="filterType === 'activity'">
          <label for="event" class="block text-sm font-medium text-gray-700">活動</label>
          <select id="event" v-model="selectedEventId" class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
            <option v-for="event in events" :key="event.id" :value="event.id">{{ event.name }}</option>
          </select>
        </div>

        <div>
          <button @click="exportToExcel" :disabled="reportData.length === 0 || loading" class="w-full bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed">匯出 Excel</button>
        </div>
      </div>
    </div>

    <!-- Report Table -->
    <div v-if="loading" class="text-center p-8">
      <p>正在載入報表...</p>
    </div>
    <div v-else class="bg-white p-4 rounded-lg shadow-md">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th v-for="header in tableHeaders" :key="header" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{{ header }}</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-if="reportData.length === 0">
            <td :colspan="tableHeaders.length" class="text-center py-4">沒有資料</td>
          </tr>
          <tr v-for="(row, index) in reportData" :key="index">
            <td v-for="header in tableHeaders" :key="header" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ row[header] }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useStore } from 'vuex';
import { supabase } from '@/services/supabase';
import { notify } from '@/services/api';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

const store = useStore();

const loading = ref(true);
const reportData = ref([]);
const filterType = ref('daily');
const selectedDate = ref(format(new Date(), 'yyyy-MM-dd'));
const events = ref([]);
const selectedEventId = ref(null);

// 從 Vuex store 獲取資料
const allPersonnel = computed(() => store.getters['data/allPersonnel']);
const allEvents = computed(() => store.getters['data/allEvents']);

const tableHeaders = computed(() => {
  if (reportData.value.length > 0) {
    return Object.keys(reportData.value[0]);
  }
  // 預設表頭
  return ['卡號', '姓名', '簽到時間', '狀態'];
});

// 獲取活動列表
const fetchEvents = async () => {
  if (allEvents.value && allEvents.value.length > 0) {
    events.value = allEvents.value;
  } else {
    await store.dispatch('data/fetchEvents');
    events.value = store.getters['data/allEvents'] || [];
  }
  
  if (events.value.length > 0 && !selectedEventId.value) {
    selectedEventId.value = events.value[0].id;
  }
};

// 產生報表的核心邏輯
const generateReport = async () => {
  loading.value = true;
  reportData.value = [];
  try {
    // 關鍵防禦：確保人員資料是一個陣列
    if (!Array.isArray(allPersonnel.value)) {
      throw new Error("人員資料尚未準備好，無法產生報表。");
    }

    let records = [];
    let error;

    if (filterType.value === 'daily') {
      const startDate = `${selectedDate.value} 00:00:00`;
      const endDate = `${selectedDate.value} 23:59:59`;
      const res = await supabase
        .from('daily_records')
        .select('*')
        .gte('check_in_time', startDate)
        .lte('check_in_time', endDate);
      records = res.data;
      error = res.error;
    } else { // activity
      if (!selectedEventId.value) {
        reportData.value = [];
        loading.value = false;
        return;
      }
      const res = await supabase
        .from('activity_records')
        .select('*')
        .eq('event_id', selectedEventId.value);
      records = res.data;
      error = res.error;
    }

    if (error) throw error;
    if (!records) records = [];

    // 現在這裡的 allPersonnel.value 是安全的
    const processedData = records.map(record => {
      const person = allPersonnel.value.find(p => p.id === record.personnel_id);
      return {
        '卡號': person ? person.card_number : 'N/A',
        '姓名': person ? person.name : '未知人員',
        '簽到時間': format(new Date(record.check_in_time), 'yyyy-MM-dd HH:mm:ss'),
        '狀態': '準時', // 這裡可以根據需要擴展邏輯
      };
    });
    reportData.value = processedData;

  } catch (error) {
    console.error('載入報表數據失敗:', error);
    reportData.value = [];
    notify({ title: '錯誤', message: `載入報表數據失敗: ${error.message}`, type: 'error' });
  } finally {
    loading.value = false;
  }
};

// 匯出 Excel
const exportToExcel = () => {
  if (reportData.value.length === 0) {
    notify({ title: '提示', message: '沒有可匯出的資料', type: 'info' });
    return;
  }
  const worksheet = XLSX.utils.json_to_sheet(reportData.value);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '報表');
  XLSX.writeFile(workbook, `報表_${filterType.value}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
};

// 組件掛載時的初始化邏輯
onMounted(async () => {
  loading.value = true;
  try {
    // 平行獲取所有必要的初始資料
    await Promise.all([
      store.dispatch('data/fetchPersonnel'),
      fetchEvents()
    ]);
    // 資料準備好後，產生第一次報表
    await generateReport();
  } catch(err) {
    console.error("初始化報表頁面失敗:", err);
    notify({ title: '錯誤', message: '初始化報表頁面失敗', type: 'error' });
  } finally {
    loading.value = false;
  }
});

// 監聽篩選條件的變化，並重新產生報表
watch([filterType, selectedDate, selectedEventId], generateReport, { deep: true });

</script>
