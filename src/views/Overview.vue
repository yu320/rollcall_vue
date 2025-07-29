<template>
  <div class="bg-white rounded-xl shadow-lg p-6 md:p-8 mb-8 border border-indigo-200">
    <h2 class="text-3xl font-bold text-indigo-800 mb-6">系統總覽</h2>
    <div v-if="!isLoading && stats">
      <!-- Summary Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <div v-html="stats.totalPersonnelCard"></div>
        <div v-html="stats.totalEventsCard"></div>
        <div v-html="stats.totalCheckInsCard"></div>
        <div v-html="stats.totalCheckOutsCard"></div>
        <div v-html="stats.averageAttendanceRateCard"></div>
      </div>
      <!-- Charts -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="bg-white rounded-xl shadow-md p-6 border border-gray-200">
          <h3 class="text-xl font-bold text-gray-800 mb-4">總操作狀態分佈</h3>
          <div class="h-72"><canvas ref="statusChartCanvas"></canvas></div>
        </div>
        <div class="bg-white rounded-xl shadow-md p-6 border border-gray-200">
          <h3 class="text-xl font-bold text-gray-800 mb-4">近期活動趨勢</h3>
          <div class="h-72"><canvas ref="activityTrendChartCanvas"></canvas></div>
        </div>
      </div>
    </div>
    <div v-else-if="!isLoading && !stats" class="text-center py-16 text-gray-500">
      <p>沒有足夠的數據來生成總覽。</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import { useUiStore } from '@/store/ui';
import { api } from '@/services/api';
import Chart from 'chart.js/auto';
import { createSummaryCard } from '@/utils'; // 假設您已將 createSummaryCard 移至 utils

const uiStore = useUiStore();
const isLoading = ref(true);
const stats = ref(null);
const statusChartCanvas = ref(null);
const activityTrendChartCanvas = ref(null);

let statusChartInstance = null;
let activityTrendChartInstance = null;

onMounted(async () => {
  uiStore.setLoading(true);
  isLoading.value = true;
  try {
    const overviewData = await api.getOverviewData(); // 假設 api.js 有此函式
    if (overviewData) {
      stats.value = {
        totalPersonnelCard: createSummaryCard('總人員數', overviewData.totalPersonnelCount, 'users'),
        totalEventsCard: createSummaryCard('活動數', overviewData.totalEventsCount, 'calendar'),
        totalCheckInsCard: createSummaryCard('總簽到人次', overviewData.totalCheckIns, 'check-square'),
        totalCheckOutsCard: createSummaryCard('總簽退人次', overviewData.totalCheckOuts, 'user-minus'),
        averageAttendanceRateCard: createSummaryCard('平均參與率', `${overviewData.averageAttendanceRate}%`, 'pie-chart'),
      };
      
      await nextTick(); // 等待 DOM 更新
      
      renderStatusChart(overviewData.charts.status);
      renderActivityTrendChart(overviewData.charts.trend);
    }
  } catch (error) {
    uiStore.showMessage(`載入總覽數據失敗: ${error.message}`, 'error');
  } finally {
    uiStore.setLoading(false);
    isLoading.value = false;
  }
});

const renderStatusChart = (chartData) => {
  if (statusChartInstance) statusChartInstance.destroy();
  if (statusChartCanvas.value) {
    const ctx = statusChartCanvas.value.getContext('2d');
    statusChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: chartData,
      options: { responsive: true, maintainAspectRatio: false }
    });
  }
};

const renderActivityTrendChart = (chartData) => {
  if (activityTrendChartInstance) activityTrendChartInstance.destroy();
  if (activityTrendChartCanvas.value) {
    const ctx = activityTrendChartCanvas.value.getContext('2d');
    activityTrendChartInstance = new Chart(ctx, {
      type: 'line',
      data: chartData,
      options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
    });
  }
};
</script>
