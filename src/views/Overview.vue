<template>
  <div class="space-y-8">
    <!-- 頁面標題 -->
    <div class="bg-white rounded-xl shadow-lg p-6 md:p-8 border border-indigo-200">
      <h2 class="text-3xl font-bold text-indigo-800">系統總覽</h2>
    </div>

    <!-- 總覽內容 -->
    <div id="overviewContent" v-if="!isLoading && !isEmpty">
      <!-- 統計卡片 -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <div v-for="card in summaryCards" :key="card.title" class="bg-white rounded-xl shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow" v-html="card.html"></div>
      </div>
      <!-- 圖表 -->
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

    <!-- 空狀態提示 -->
    <div id="overviewEmpty" v-if="!isLoading && isEmpty" class="text-center py-16 text-gray-500 bg-white rounded-xl shadow-lg">
      <svg xmlns="http://www.w3.org/2000/svg" class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
      <h3 class="mt-2 text-sm font-medium text-gray-900">沒有足夠的數據</h3>
      <p class="mt-1 text-sm text-gray-500">請確保系統中有足夠的人員和活動記錄來生成總覽數據。</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import { useUiStore } from '@/store/ui';
import { useDataStore } from '@/store/data';
import * as api from '@/services/api'; // 關鍵修正
import Chart from 'chart.js/auto';
import { createSummaryCard } from '@/utils/index';

const uiStore = useUiStore();
const dataStore = useDataStore();

const isLoading = ref(true);
const isEmpty = ref(false);
const summaryCards = ref([]);
const statusChartCanvas = ref(null);
const activityTrendChartCanvas = ref(null);

let statusChartInstance = null;
let activityTrendChartInstance = null;

onMounted(async () => {
  uiStore.setLoading(true);
  try {
    await dataStore.fetchAllPersonnel();
    await dataStore.fetchEvents();

    const allPersonnel = dataStore.personnel;
    const allEvents = dataStore.events;

    if (allPersonnel.length === 0 || allEvents.length === 0) {
      isEmpty.value = true;
      return;
    }

    const today = new Date();
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(today.getDate() - 14);
    const recentRecords = await api.fetchRecordsByDateRange(fourteenDaysAgo, today);

    // 渲染卡片和圖表
    renderOverview(recentRecords, allPersonnel, allEvents);

  } catch (error) {
    uiStore.showMessage(`載入總覽數據失敗: ${error.message}`, 'error');
    isEmpty.value = true;
  } finally {
    isLoading.value = false;
    uiStore.setLoading(false);
  }
});

const renderOverview = (recentRecords, allPersonnel, allEvents) => {
    // 統計卡片邏輯 (與舊專案 modules/overview.js 相同)
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(today.getDate() - 14);

    const currentPeriodRecords = recentRecords.filter(r => new Date(r.created_at) >= sevenDaysAgo);
    const previousPeriodRecords = recentRecords.filter(r => new Date(r.created_at) < sevenDaysAgo);
    const currentPeriodEvents = allEvents.filter(e => new Date(e.start_time) >= sevenDaysAgo && new Date(e.start_time) <= today);
    const previousPeriodEvents = allEvents.filter(e => new Date(e.start_time) >= fourteenDaysAgo && new Date(e.start_time) < sevenDaysAgo);
    
    const calculateStats = (records, events, periodRecords) => {
        const totalCheckIns = periodRecords.filter(r => r.action_type === '簽到').length;
        const totalCheckOuts = periodRecords.filter(r => r.action_type === '簽退').length;
        let totalAttendanceRateSum = 0;
        let validEventCountForAttendance = 0;
        for (const event of events) {
            const recordsForEvent = records.filter(r => r.event_id === event.id && r.action_type === '簽到');
            const attendedCount = new Set(recordsForEvent.map(r => r.personnel_id)).size;
            const expectedCount = allPersonnel.length;
            if (expectedCount > 0) {
                totalAttendanceRateSum += (attendedCount / expectedCount);
                validEventCountForAttendance++;
            }
        }
        const averageAttendanceRate = validEventCountForAttendance > 0 ? (totalAttendanceRateSum / validEventCountForAttendance * 100) : 0;
        return { totalEventsCount: events.length, totalCheckIns, totalCheckOuts, averageAttendanceRate };
    };

    const currentStats = calculateStats(currentPeriodRecords, currentPeriodEvents, currentPeriodRecords);
    const previousStats = calculateStats(previousPeriodRecords, previousPeriodEvents, previousPeriodRecords);

    const calculateChange = (current, previous) => {
        const absoluteChange = current - previous;
        let percentageChange = 0;
        if (previous !== 0) {
            percentageChange = (absoluteChange / previous) * 100;
        } else if (current > 0) {
            percentageChange = 100;
        }
        return { absolute: absoluteChange, percentage: percentageChange };
    };
    
    const attendanceRateChange = {
        absolute: currentStats.averageAttendanceRate - previousStats.averageAttendanceRate,
        percentage: currentStats.averageAttendanceRate - previousStats.averageAttendanceRate
    };

    const stats = {
        totalPersonnelCount: allPersonnel.length,
        totalEventsCount: currentStats.totalEventsCount,
        totalCheckIns: currentStats.totalCheckIns,
        totalCheckOuts: currentStats.totalCheckOuts,
        averageAttendanceRate: currentStats.averageAttendanceRate.toFixed(1),
        eventsChange: calculateChange(currentStats.totalEventsCount, previousStats.totalEventsCount),
        checkInsChange: calculateChange(currentStats.totalCheckIns, previousStats.totalCheckIns),
        checkOutsChange: calculateChange(currentStats.totalCheckOuts, previousStats.totalCheckOuts),
        attendanceRateChange: attendanceRateChange
    };

    summaryCards.value = [
        { title: '總人員數', html: createSummaryCard('總人員數', stats.totalPersonnelCount.toLocaleString(), 'users') },
        { title: '活動數 (近7日)', html: createSummaryCard('活動數 (近7日)', stats.totalEventsCount.toLocaleString(), 'calendar', stats.eventsChange) },
        { title: '簽到人次 (近7日)', html: createSummaryCard('簽到人次 (近7日)', stats.totalCheckIns.toLocaleString(), 'check-square', stats.checkInsChange) },
        { title: '簽退人次 (近7日)', html: createSummaryCard('簽退人次 (近7日)', stats.totalCheckOuts.toLocaleString(), 'user-minus', stats.checkOutsChange) },
        { title: '平均參與率 (近7日)', html: createSummaryCard('平均參與率 (近7日)', `${stats.averageAttendanceRate}%`, 'pie-chart', stats.attendanceRateChange) }
    ];

    nextTick(() => {
        renderStatusChart(recentRecords);
        renderActivityTrendChart(recentRecords, allEvents);
    });
};

const renderStatusChart = (records) => {
  if (statusChartInstance) statusChartInstance.destroy();
  if (!statusChartCanvas.value) return;
  
  const checkInSuccess = records.filter(r => r.action_type === '簽到' && r.success).length;
  const checkOutSuccess = records.filter(r => r.action_type === '簽退' && r.success).length;
  const failures = records.filter(r => !r.success).length;

  statusChartInstance = new Chart(statusChartCanvas.value, {
    type: 'doughnut',
    data: {
      labels: ['簽到成功', '簽退成功', '操作失敗'],
      datasets: [{
        data: [checkInSuccess, checkOutSuccess, failures],
        backgroundColor: ['#10B981', '#3B82F6', '#EF4444'],
        borderColor: '#FFFFFF',
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } }
    }
  });
};

const renderActivityTrendChart = (records, events) => {
  if (activityTrendChartInstance) activityTrendChartInstance.destroy();
  if (!activityTrendChartCanvas.value) return;

  const sortedEvents = [...events].sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
  const recentEvents = sortedEvents.slice(Math.max(sortedEvents.length - 10, 0)); 
  const labels = recentEvents.map(e => e.name);
  const checkInData = recentEvents.map(event => records.filter(r => r.event_id === event.id && r.action_type === '簽到').length);
  const checkOutData = recentEvents.map(event => records.filter(r => r.event_id === event.id && r.action_type === '簽退').length);

  activityTrendChartInstance = new Chart(activityTrendChartCanvas.value, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: '簽到人次',
          data: checkInData,
          borderColor: '#4F46E5',
          backgroundColor: 'rgba(79, 70, 229, 0.2)',
          fill: true,
          tension: 0.3
        },
        {
          label: '簽退人次',
          data: checkOutData,
          borderColor: '#F59E0B',
          backgroundColor: 'rgba(245, 158, 11, 0.2)',
          fill: true,
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true } },
      plugins: { legend: { display: true } }
    }
  });
};
</script>
