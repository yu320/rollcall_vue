<template>
  <div class="bg-white rounded-xl shadow-lg p-6 md:p-8 mb-8 border border-indigo-200">
    <h2 class="text-3xl font-bold text-indigo-800 mb-6">活動報表分析</h2>
    
    <!-- Filters -->
    <div class="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
      <div class="flex items-center gap-2">
        <input type="date" v-model="filters.startDate">
        <span>至</span>
        <input type="date" v-model="filters.endDate">
      </div>
      <button @click="exportReport" class="bg-emerald-600 text-white px-4 py-2 rounded-md">匯出 Excel</button>
    </div>

    <!-- Tabs -->
    <div class="border-b border-gray-200 mb-6">
      <nav class="-mb-px flex space-x-6">
        <button v-for="tab in tabs" :key="tab.id" @click="activeTab = tab.id" 
                :class="['report-tab', { 'active': activeTab === tab.id }]">
          {{ tab.name }}
        </button>
      </nav>
    </div>

    <!-- Tab Content -->
    <div v-show="activeTab === 'activity-participation'">
      <!-- Activity Participation Report Content -->
    </div>
    <div v-show="activeTab === 'building-activity'">
      <!-- Building Activity Report Content -->
    </div>
    <div v-show="activeTab === 'personnel-activity'">
      <!-- Personnel Activity Report Content -->
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useUiStore } from '@/store/ui';
import { api } from '@/services/api';
// ... import Chart.js and other utilities ...

const uiStore = useUiStore();

const activeTab = ref('activity-participation');
const tabs = [
  { id: 'activity-participation', name: '活動參與統計' },
  { id: 'building-activity', name: '棟別活動分析' },
  { id: 'personnel-activity', name: '人員活動參與報表' },
];

const filters = ref({
  startDate: '', // set default
  endDate: '',   // set default
});

const reportData = ref(null);

const fetchData = async () => {
  uiStore.setLoading(true);
  try {
    reportData.value = await api.getReportData(filters.value);
    // process and render charts and tables
  } catch (error) {
    uiStore.showMessage(`載入報表失敗: ${error.message}`, 'error');
  } finally {
    uiStore.setLoading(false);
  }
};

onMounted(fetchData);
watch(filters, fetchData, { deep: true });

const exportReport = () => {
  // export logic
};
</script>
