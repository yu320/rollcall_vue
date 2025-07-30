<script setup>
import { ref, computed, onMounted } from 'vue';
// Import the Pinia store instead of Vuex
import { useDataStore } from '@/store/data';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';

// Initialize the Pinia store
const dataStore = useDataStore();

// Access state directly from the store instance
const personnel = computed(() => dataStore.personnel);
const checkInRecords = computed(() => dataStore.checkInRecords);
const selectedMonth = ref(dayjs().format('YYYY-MM'));

const filteredRecords = computed(() => {
  if (!selectedMonth.value) return [];
  return checkInRecords.value.filter(record => {
    return dayjs(record.check_in_time).format('YYYY-MM') === selectedMonth.value;
  });
});

const reportData = computed(() => {
  const data = {};
  personnel.value.forEach(p => {
    data[p.id] = {
      name: p.name,
      days: {}
    };
    const daysInMonth = dayjs(selectedMonth.value).daysInMonth();
    for (let i = 1; i <= daysInMonth; i++) {
      data[p.id].days[i] = '—';
    }
  });

  filteredRecords.value.forEach(record => {
    const day = dayjs(record.check_in_time).date();
    if (data[record.personnel_id]) {
      data[record.personnel_id].days[day] = 'V';
    }
  });

  return Object.values(data);
});

const daysInMonth = computed(() => {
  if (!selectedMonth.value) return [];
  const days = dayjs(selectedMonth.value).daysInMonth();
  return Array.from({ length: days }, (_, i) => i + 1);
});

const exportToExcel = () => {
  const dataToExport = reportData.value.map(item => {
    const row = { '姓名': item.name };
    daysInMonth.value.forEach(day => {
      row[`${day}日`] = item.days[day];
    });
    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(dataToExport);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '月報表');
  XLSX.writeFile(workbook, `點名月報表_${selectedMonth.value}.xlsx`);
};

onMounted(async () => {
  // Call actions directly from the store instance
  await dataStore.fetchPersonnel();
  await dataStore.fetchCheckInRecords();
});
</script>

<template>
  <div class="p-4">
    <h1 class="text-2xl font-bold mb-4">產生報表</h1>
    <div class="mb-4">
      <label for="month" class="mr-2">選擇月份:</label>
      <input type="month" id="month" v-model="selectedMonth" class="p-2 border rounded">
    </div>
    <button @click="exportToExcel" class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 mb-4">
      匯出 Excel
    </button>
    <div class="overflow-x-auto">
      <table class="min-w-full bg-white border">
        <thead>
          <tr>
            <th class="py-2 px-4 border-b">姓名</th>
            <th v-for="day in daysInMonth" :key="day" class="py-2 px-4 border-b">{{ day }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in reportData" :key="item.name">
            <td class="py-2 px-4 border-b">{{ item.name }}</td>
            <td v-for="day in daysInMonth" :key="day" class="py-2 px-4 border-b text-center">
              {{ item.days[day] }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
