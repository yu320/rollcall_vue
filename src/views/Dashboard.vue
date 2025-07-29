<template>
  <div class="bg-white rounded-xl shadow-lg p-6 md:p-8 mb-8 border border-indigo-200">
    <div class="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
      <h2 class="text-3xl font-bold text-indigo-800">活動儀錶板</h2>
      <div class="w-full md:w-1/3">
        <select v-model="selectedEventId" @change="updateDashboard" class="w-full bg-white border border-gray-300 rounded-lg px-4 py-2">
          <option :value="null">-- 請選擇一個活動 --</option>
          <option v-for="event in events" :key="event.id" :value="event.id">{{ event.name }}</option>
        </select>
      </div>
    </div>

    <div v-if="!isLoading && dashboardData">
      <!-- Summary Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
         <div v-html="dashboardData.summary.expectedCard"></div>
         <div v-html="dashboardData.summary.actualCard"></div>
         <!-- ... other cards ... -->
      </div>
      <!-- Details & Charts -->
      <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div class="lg:col-span-3">
            <!-- Attendees Table -->
        </div>
        <div class="lg:col-span-2 space-y-6">
            <div class="h-56"><canvas ref="statusChartCanvas"></canvas></div>
            <div class="h-56"><canvas ref="timelineChartCanvas"></canvas></div>
        </div>
      </div>
    </div>
    <div v-else class="text-center py-16 text-gray-500">
      <p>請從上方下拉選單中選擇一個活動來查看其儀錶板。</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import { useUiStore } from '@/store/ui';
import { api } from '@/services/api';
import Chart from 'chart.js/auto';
import { createSummaryCard } from '@/utils';

const uiStore = useUiStore();
const events = ref([]);
const selectedEventId = ref(null);
const isLoading = ref(false);
const dashboardData = ref(null);
const statusChartCanvas = ref(null);
const timelineChartCanvas = ref(null);
// ... chart instances ...

onMounted(async () => {
  events.value = await api.fetchEvents();
  if (events.value.length > 0) {
    selectedEventId.value = events.value[0].id;
    updateDashboard();
  }
});

const updateDashboard = async () => {
  if (!selectedEventId.value) {
    dashboardData.value = null;
    return;
  }
  isLoading.value = true;
  uiStore.setLoading(true);
  try {
    const data = await api.getDashboardData(selectedEventId.value);
    // Process data and create summary cards
    dashboardData.value = {
        summary: {
            expectedCard: createSummaryCard('應到人數', data.summary.expectedCount, 'users'),
            // ...
        },
        attendees: data.attendees,
        charts: data.charts
    };
    await nextTick();
    renderCharts();
  } catch (error) {
    uiStore.showMessage(`載入儀錶板數據失敗: ${error.message}`, 'error');
  } finally {
    isLoading.value = false;
    uiStore.setLoading(false);
  }
};

const renderCharts = () => {
  // Logic to render status and timeline charts
};
</script>
