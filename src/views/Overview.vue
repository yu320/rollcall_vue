<template>
  <div class="space-y-8">
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <div v-for="(card, index) in summaryCards" :key="index" class="bg-white rounded-xl shadow p-5 border border-gray-200 hover:shadow-lg transition-shadow" v-html="card"></div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div class="lg:col-span-2 bg-white rounded-xl shadow-lg border border-gray-200 flex flex-col">
        <div class="p-4 border-b flex flex-wrap justify-between items-center gap-3">
            <h3 class="text-xl font-bold text-gray-800">近期活動記錄</h3>
            <div v-if="recentRecords.length > 0" class="flex items-center gap-2">
                <label for="records-page-size" class="text-sm font-medium text-gray-600">每頁顯示:</label>
                <select id="records-page-size" v-model.number="recentRecordsPagination.pageSize" class="border border-gray-300 rounded-md text-sm py-1 px-2 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="20">20</option>
                </select>
            </div>
        </div>
        <div v-if="isLoading" class="text-center py-10 flex-grow flex items-center justify-center">
            <p class="text-gray-500">正在載入近期記錄...</p>
        </div>
        <div v-else-if="recentRecords.length > 0" class="divide-y divide-gray-100 flex-grow">
          <div v-for="record in paginatedRecentRecords" :key="record.id" class="p-4 flex items-center justify-between hover:bg-gray-50">
            <div class="flex items-center">
              <div :class="['w-10 h-10 rounded-full flex items-center justify-center mr-4', getActionTypeClass(record.action_type).bg]">
                <svg xmlns="http://www.w3.org/2000/svg" :class="['h-5 w-5', getActionTypeClass(record.action_type).text]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path v-if="record.action_type === '簽到'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16l-4-4m0 0l4-4m-4 4h14M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                </svg>
              </div>
              <div>
                <p class="font-semibold text-gray-800">
                  {{ record.name_at_checkin || '未知人員' }}
                  <span class="text-gray-500 font-normal">在</span>
                  {{ record.events?.name || '未指定活動' }}
                  <span :class="['font-bold', getActionTypeClass(record.action_type).text]">{{ record.action_type }}</span>
                </p>
                <p class="text-sm text-gray-500">{{ formatDateTime(record.created_at, 'yyyy-MM-dd HH:mm:ss') }}</p>
              </div>
            </div>
             <span class="status-badge" :data-status="record.status">{{ record.status }}</span>
          </div>
        </div>
        <div v-else class="text-center py-10 flex-grow flex items-center justify-center">
            <p class="text-gray-500">最近 24 小時內沒有任何活動記錄。</p>
        </div>
        <div v-if="!isLoading && recentRecords.length > 0 && recentRecordsPagination.totalPages > 1" class="p-4 border-t flex justify-center items-center space-x-4 text-sm">
            <button @click="recentRecordsPagination.currentPage--" :disabled="recentRecordsPagination.currentPage === 1" class="px-3 py-1 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition">
                上一頁
            </button>
            <span>
                第 {{ recentRecordsPagination.currentPage }} / {{ recentRecordsPagination.totalPages }} 頁
            </span>
            <button @click="recentRecordsPagination.currentPage++" :disabled="recentRecordsPagination.currentPage === recentRecordsPagination.totalPages" class="px-3 py-1 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition">
                下一頁
            </button>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-lg border border-gray-200 flex flex-col">
        <div class="p-4 border-b flex flex-wrap justify-between items-center gap-3">
            <h3 class="text-xl font-bold text-gray-800">即將開始的活動</h3>
            <div v-if="upcomingEvents.length > 0" class="flex items-center gap-2">
                <label for="events-page-size" class="text-sm font-medium text-gray-600">每頁顯示:</label>
                <select id="events-page-size" v-model.number="upcomingEventsPagination.pageSize" class="border border-gray-300 rounded-md text-sm py-1 px-2 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                    <option value="5">5</option>
                    <option value="10">10</option>
                </select>
            </div>
        </div>
        <div v-if="isLoading" class="text-center py-10 flex-grow flex items-center justify-center">
            <p class="text-gray-500">正在載入活動...</p>
        </div>
        <div v-else-if="upcomingEvents.length > 0" class="divide-y divide-gray-100 flex-grow">
            <div v-for="event in paginatedUpcomingEvents" :key="event.id" class="p-4 hover:bg-gray-50">
                <p class="font-semibold text-indigo-700">{{ event.name }}</p>
                <p class="text-sm text-gray-600">{{ formatDateTime(event.start_time, 'MM/dd HH:mm') }} 開始</p>
            </div>
        </div>
        <div v-else class="text-center py-10 flex-grow flex items-center justify-center">
            <p class="text-gray-500">目前沒有即將開始的活動。</p>
        </div>
        <div v-if="!isLoading && upcomingEvents.length > 0 && upcomingEventsPagination.totalPages > 1" class="p-4 border-t flex justify-center items-center space-x-4 text-sm">
            <button @click="upcomingEventsPagination.currentPage--" :disabled="upcomingEventsPagination.currentPage === 1" class="px-3 py-1 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition">
                上一頁
            </button>
            <span>
                第 {{ upcomingEventsPagination.currentPage }} / {{ upcomingEventsPagination.totalPages }} 頁
            </span>
            <button @click="upcomingEventsPagination.currentPage++" :disabled="upcomingEventsPagination.currentPage === upcomingEventsPagination.totalPages" class="px-3 py-1 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition">
                下一頁
            </button>
        </div>
      </div>
    </div>

    <div v-if="!isLoading" class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div class="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-xl font-bold text-gray-800">總操作狀態分佈</h3>
              <button @click="downloadChart(overviewStatusChartInstance, '總操作狀態分佈')" class="p-2 text-gray-500 hover:text-gray-800 rounded-full hover:bg-gray-100 transition" aria-label="下載圖表">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              </button>
            </div>
            <div class="h-72"><canvas ref="overviewStatusChartCanvas"></canvas></div>
        </div>
        <div class="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-xl font-bold text-gray-800">近期活動趨勢</h3>
              <button @click="downloadChart(overviewActivityTrendChartInstance, '近期活動趨勢')" class="p-2 text-gray-500 hover:text-gray-800 rounded-full hover:bg-gray-100 transition" aria-label="下載圖表">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              </button>
            </div>
            <div class="h-72"><canvas ref="overviewActivityTrendChartCanvas"></canvas></div>
        </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, nextTick, watch } from 'vue';
import { useUiStore } from '@/store/ui';
import { useDataStore } from '@/store/data';
import * as api from '@/services/api'; 
import { createSummaryCard, formatDateTime } from '@/utils/index';
import { parseISO, isFuture } from 'date-fns';
import Chart from 'chart.js/auto';
import 'chartjs-adapter-date-fns';

const uiStore = useUiStore();
const dataStore = useDataStore();
const isLoading = ref(true);

const summaryCards = ref([]);
const recentRecords = ref([]);

const recentRecordsPagination = ref({
    currentPage: 1,
    pageSize: 5,
    totalPages: 1,
});
const upcomingEventsPagination = ref({
    currentPage: 1,
    pageSize: 5,
    totalPages: 1,
});

let overviewStatusChartInstance = null;
let overviewActivityTrendChartInstance = null;

const overviewStatusChartCanvas = ref(null);
const overviewActivityTrendChartCanvas = ref(null);

watch(isLoading, (newIsLoading) => {
  if (newIsLoading === false) {
    nextTick(() => {
      renderAllCharts();
    });
  }
});

watch(recentRecords, (newRecords) => {
    recentRecordsPagination.value.currentPage = 1;
    recentRecordsPagination.value.totalPages = Math.ceil(newRecords.length / recentRecordsPagination.value.pageSize);
});
watch(() => recentRecordsPagination.value.pageSize, () => {
    recentRecordsPagination.value.currentPage = 1;
    recentRecordsPagination.value.totalPages = Math.ceil(recentRecords.value.length / recentRecordsPagination.value.pageSize);
});

const upcomingEvents = computed(() => {
    return dataStore.events
        .filter(event => isFuture(parseISO(event.start_time)))
        .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
});

watch(upcomingEvents, (newEvents) => {
    upcomingEventsPagination.value.currentPage = 1;
    upcomingEventsPagination.value.totalPages = Math.ceil(newEvents.length / upcomingEventsPagination.value.pageSize);
});
watch(() => upcomingEventsPagination.value.pageSize, () => {
    upcomingEventsPagination.value.currentPage = 1;
    upcomingEventsPagination.value.totalPages = Math.ceil(upcomingEvents.value.length / upcomingEventsPagination.value.pageSize);
});


const paginatedRecentRecords = computed(() => {
    const start = (recentRecordsPagination.value.currentPage - 1) * recentRecordsPagination.value.pageSize;
    const end = start + recentRecordsPagination.value.pageSize;
    return recentRecords.value.slice(start, end);
});

const paginatedUpcomingEvents = computed(() => {
    const start = (upcomingEventsPagination.value.currentPage - 1) * upcomingEventsPagination.value.pageSize;
    const end = start + upcomingEventsPagination.value.pageSize;
    return upcomingEvents.value.slice(start, end);
});


const destroyChart = (chartInstance) => {
  if (chartInstance) {
    chartInstance.destroy();
  }
  return null;
};

onMounted(async () => {
  isLoading.value = true;
  uiStore.setLoading(true);

  try {
    const [_, __, records] = await Promise.all([
      dataStore.fetchAllPersonnel(),
      dataStore.fetchEvents(),
      api.fetchRecentRecords(24 * 7)
    ]);
    
    recentRecords.value = records || [];
    generateSummary();

  } catch (error) {
    uiStore.showMessage(`無法載入總覽資訊: ${error.message}`, 'error');
  } finally {
    isLoading.value = false;
    uiStore.setLoading(false);
  }
});

const generateSummary = () => {
    const personnelCount = dataStore.personnel.length;
    const eventCount = dataStore.events.length;
    const checkInToday = recentRecords.value.filter(r => r.action_type === '簽到').length;
    const checkOutToday = recentRecords.value.filter(r => r.action_type === '簽退').length;

    summaryCards.value = [
        createSummaryCard('總人員數', personnelCount, 'users'),
        createSummaryCard('總活動數', eventCount, 'calendar'),
        createSummaryCard('近期簽到人次', checkInToday, 'user-check'),
        createSummaryCard('近期簽退人次', checkOutToday, 'user-minus'),
    ];
};

const getActionTypeClass = (actionType) => {
    if(actionType === '簽到') {
        return { bg: 'bg-blue-100', text: 'text-blue-600' };
    }
    return { bg: 'bg-orange-100', text: 'text-orange-600' };
};

const renderAllCharts = () => {
    renderOverviewStatusChart();
    renderOverviewActivityTrendChart();
};

const renderOverviewStatusChart = () => {
    overviewStatusChartInstance = destroyChart(overviewStatusChartInstance);

    if (!overviewStatusChartCanvas.value) return; 

    const checkInSuccess = recentRecords.value.filter(r => r.action_type === '簽到' && r.success).length;
    const checkOutSuccess = recentRecords.value.filter(r => r.action_type === '簽退' && r.success).length;
    const failures = recentRecords.value.filter(r => !r.success).length;

    const ctx = overviewStatusChartCanvas.value.getContext('2d');
    overviewStatusChartInstance = new Chart(ctx, {
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

const renderOverviewActivityTrendChart = () => {
    overviewActivityTrendChartInstance = destroyChart(overviewActivityTrendChartInstance);

    if (!overviewActivityTrendChartCanvas.value) return; 

    const sortedEvents = [...dataStore.events].sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
    const recentEvents = sortedEvents.slice(Math.max(sortedEvents.length - 10, 0)); 

    const labels = recentEvents.map(e => e.name);
    const checkInData = recentEvents.map(event => {
        return recentRecords.value.filter(r => r.event_id === event.id && r.action_type === '簽到').length;
    });
    const checkOutData = recentEvents.map(event => {
        return recentRecords.value.filter(r => r.event_id === event.id && r.action_type === '簽退').length;
    });

    const ctx = overviewActivityTrendChartCanvas.value.getContext('2d');
    overviewActivityTrendChartInstance = new Chart(ctx, {
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
            scales: {
                y: { beginAtZero: true }
            },
            plugins: {
                legend: { display: true }
            }
        }
    });
};

const downloadChart = (chartInstance, baseFilename) => {
  if (!chartInstance) {
    uiStore.showMessage('圖表尚未準備好，無法下載。', 'warning');
    return;
  }
  
  const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const filename = `總覽_${baseFilename}_${timestamp}.png`;

  const link = document.createElement('a');
  link.href = chartInstance.toBase64Image();
  link.download = filename;
  link.click();
};
</script>
