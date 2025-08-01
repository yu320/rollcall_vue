<template>
  <div class="space-y-8">
    <div class="bg-white rounded-xl shadow-lg p-6 md:p-8 border border-indigo-200">
      <div class="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 class="text-3xl font-bold text-indigo-800">活動儀錶板</h2>
        <div class="w-full md:w-1/2 lg:w-1/3">
          <label for="event-selector" class="sr-only">選擇活動</label>
          <select id="event-selector" v-model="selectedEventId" @change="updateDashboard" class="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500">
            <option :value="null" disabled>-- 請選擇一個活動來查看 --</option>
            <option v-for="event in sortedEvents" :key="event.id" :value="event.id">{{ event.name }} ({{ formatDateTime(event.start_time, 'yyyy-MM-dd HH:mm') }})</option>
          </select>
        </div>
      </div>
    </div>

    <div v-if="isLoading" class="text-center py-16 text-gray-500">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto mb-4"></div>
      <p>正在載入儀錶板數據...</p>
    </div>

    <div v-else-if="dashboardData" class="space-y-8">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <div v-for="(card, index) in dashboardData.summaryCards" :key="index" class="bg-white rounded-xl shadow p-5 border border-gray-200 hover:shadow-lg transition-shadow" v-html="card"></div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div class="lg:col-span-3 bg-white rounded-xl shadow-lg border border-gray-200 flex flex-col">
          <div class="p-4 border-b flex flex-wrap justify-between items-center gap-3">
            <h3 class="text-xl font-bold text-gray-800">出席人員詳情</h3>
            <div v-if="dashboardData.attendees.length > 0" class="flex items-center gap-2">
                <label for="attendees-page-size" class="text-sm font-medium text-gray-600">每頁顯示:</label>
                <select id="attendees-page-size" v-model.number="attendeesPagination.pageSize" class="border border-gray-300 rounded-md text-sm py-1 px-2 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                </select>
            </div>
          </div>
          <div class="overflow-x-auto table-responsive flex-grow">
            <table class="min-w-full divide-y divide-gray-100">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">姓名</th>
                  <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">學號</th>
                  <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">狀態</th>
                  <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">簽到時間</th>
                  <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">簽退時間</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-100">
                <tr v-for="attendee in paginatedAttendees" :key="attendee.personnel_id" class="hover:bg-gray-50">
                  <td data-label="姓名" class="px-6 py-4 font-medium text-gray-800">{{ attendee.name }}</td>
                  <td data-label="學號" class="px-6 py-4 text-gray-600">{{ attendee.code }}</td>
                  <td data-label="狀態" class="px-6 py-4"><span :class="getStatusClass(attendee.status)">{{ attendee.status }}</span></td>
                  <td data-label="簽到時間" class="px-6 py-4 text-sm text-gray-500">{{ formatDateTime(attendee.check_in_time, 'HH:mm:ss') || '—' }}</td>
                  <td data-label="簽退時間" class="px-6 py-4 text-sm text-gray-500">{{ formatDateTime(attendee.check_out_time, 'HH:mm:ss') || '—' }}</td>
                </tr>
              </tbody>
            </table>
             <div v-if="!dashboardData || dashboardData.attendees.length === 0" class="text-center py-10 text-gray-500">此活動尚無人員簽到</div>
          </div>
          <div v-if="dashboardData && dashboardData.attendees.length > 0 && attendeesPagination.totalPages > 1" class="p-4 border-t flex justify-center items-center space-x-4 text-sm">
              <button @click="attendeesPagination.currentPage--" :disabled="attendeesPagination.currentPage === 1" class="px-3 py-1 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition">
                  上一頁
              </button>
              <span>
                  第 {{ attendeesPagination.currentPage }} / {{ attendeesPagination.totalPages }} 頁
              </span>
              <button @click="attendeesPagination.currentPage++" :disabled="attendeesPagination.currentPage === attendeesPagination.totalPages" class="px-3 py-1 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition">
                  下一頁
              </button>
          </div>
        </div>

        <div class="lg:col-span-2 space-y-8">
          <div class="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-xl font-bold text-gray-800">簽到狀態分佈</h3>
              <button @click="downloadChart(chartInstances.status, '簽到狀態分佈')" class="p-2 text-gray-500 hover:text-gray-800 rounded-full hover:bg-gray-100 transition" aria-label="下載圖表">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              </button>
            </div>
            <div class="h-64"><canvas ref="statusChartCanvas"></canvas></div>
          </div>
          <div class="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-xl font-bold text-gray-800">簽到時間線</h3>
               <button @click="downloadChart(chartInstances.timeline, '簽到時間線')" class="p-2 text-gray-500 hover:text-gray-800 rounded-full hover:bg-gray-100 transition" aria-label="下載圖表">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              </button>
            </div>
            <div class="h-64"><canvas ref="timelineChartCanvas"></canvas></div>
          </div>
        </div>
      </div>
    </div>
    
    <div v-else class="text-center py-16 text-gray-500 bg-white rounded-xl shadow-lg">
      <p class="text-lg">請從上方下拉選單中選擇一個活動來查看其儀錶板。</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, computed, watch } from 'vue';
import { useUiStore } from '@/store/ui';
import { useDataStore } from '@/store/data';
import * as api from '@/services/api';
import Chart from 'chart.js/auto';
import 'chartjs-adapter-date-fns';
import { zhTW } from 'date-fns/locale';
import { createSummaryCard } from '@/utils/index';
import { format, parseISO } from 'date-fns';

const uiStore = useUiStore();
const dataStore = useDataStore();

const selectedEventId = ref(null);
const isLoading = ref(true);
const dashboardData = ref(null);

const attendeesPagination = ref({
  currentPage: 1,
  pageSize: 10,
  totalPages: 1,
});

const statusChartCanvas = ref(null);
const timelineChartCanvas = ref(null);

const chartInstances = {
  status: null,
  timeline: null,
};

watch(isLoading, (newIsLoading) => {
  if (newIsLoading === false && dashboardData.value) {
    nextTick(() => {
      renderCharts();
    });
  }
});

watch(() => attendeesPagination.value.pageSize, () => {
    if (dashboardData.value && dashboardData.value.attendees) {
        attendeesPagination.value.currentPage = 1;
        attendeesPagination.value.totalPages = Math.ceil(dashboardData.value.attendees.length / attendeesPagination.value.pageSize);
    }
});

const destroyChart = (chartInstance) => {
  if (chartInstance) {
    chartInstance.destroy();
  }
};

const formatDateTime = (isoString, formatStr = 'HH:mm:ss') => {
    if (!isoString) return null;
    return format(parseISO(isoString), formatStr);
};

const getStatusClass = (status) => {
  if (status && status.includes('未簽到')) return 'status-badge bg-red-100 text-red-800';
  if (status && status.includes('準時')) return 'status-badge bg-green-100 text-green-800';
  if (status && status.includes('遲到')) return 'status-badge bg-yellow-100 text-yellow-800';
  return 'status-badge bg-gray-100 text-gray-800';
};

const sortedEvents = computed(() => {
    return [...dataStore.events].sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
});

const paginatedAttendees = computed(() => {
  if (!dashboardData.value || !dashboardData.value.attendees) {
    return [];
  }
  const start = (attendeesPagination.value.currentPage - 1) * attendeesPagination.value.pageSize;
  const end = start + attendeesPagination.value.pageSize;
  return dashboardData.value.attendees.slice(start, end);
});

onMounted(async () => {
  isLoading.value = true;
  uiStore.setLoading(true);
  try {
    await Promise.all([
      dataStore.fetchEvents(),
      dataStore.fetchAllPersonnel()
    ]);

    if (sortedEvents.value.length > 0) {
      selectedEventId.value = sortedEvents.value[0].id;
      await updateDashboard();
    } else {
      isLoading.value = false;
      uiStore.setLoading(false);
    }
  } catch (error) {
    uiStore.showMessage(`初始化儀表板失敗: ${error.message}`, 'error');
    dashboardData.value = null;
    isLoading.value = false;
    uiStore.setLoading(false);
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
    
    const expectedCount = data.summary.expectedCount;
    
    dashboardData.value = {
        summaryCards: [
            createSummaryCard('應到人數', expectedCount, 'users'),
            createSummaryCard('實到人數', data.summary.attendedCount, 'user-check'),
            createSummaryCard('未到人數', data.summary.absentCount, 'user-minus'),
            createSummaryCard('參與率', `${data.summary.attendanceRate.toFixed(1)}%`, 'pie-chart'),
            createSummaryCard('準時率', `${data.summary.onTimeRate.toFixed(1)}%`, 'clock'),
        ],
        attendees: data.attendees,
        charts: {
            status: { onTime: data.summary.onTimeCount, late: data.summary.lateCount, absent: data.summary.absentCount },
            timeline: data.charts.timeline
        }
    };
    
    if (dashboardData.value && dashboardData.value.attendees) {
        attendeesPagination.value.currentPage = 1;
        attendeesPagination.value.totalPages = Math.ceil(dashboardData.value.attendees.length / attendeesPagination.value.pageSize);
    }

  } catch (error) {
    uiStore.showMessage(`載入儀表板數據失敗: ${error.message}`, 'error');
    dashboardData.value = null;
  } finally {
    isLoading.value = false;
    uiStore.setLoading(false);
  }
};

const renderCharts = () => {
  destroyChart(chartInstances.status);
  destroyChart(chartInstances.timeline);

  if (!dashboardData.value || !dashboardData.value.charts) return;

  if (statusChartCanvas.value) {
    const statusData = dashboardData.value.charts.status;
    chartInstances.status = new Chart(statusChartCanvas.value, {
      type: 'doughnut',
      data: {
        labels: ['準時', '遲到', '未到'],
        datasets: [{
          data: [statusData.onTime, statusData.late, statusData.absent],
          backgroundColor: ['#10B981', '#F59E0B', '#EF4444'],
          borderColor: '#FFFFFF',
          borderWidth: 2,
        }]
      },
      options: { 
        responsive: true, 
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom'
            }
        }
      }
    });
  }

  if (timelineChartCanvas.value) {
    const timelineData = dashboardData.value.charts.timeline.map(d => ({
        x: parseISO(d.time),
        y: d.checkin_count
    }));

    chartInstances.timeline = new Chart(timelineChartCanvas.value, {
      type: 'line',
      data: {
        datasets: [{
          label: '累積簽到人數',
          data: timelineData,
          borderColor: '#4F46E5',
          backgroundColor: 'rgba(79, 70, 229, 0.2)',
          fill: true,
          stepped: true,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: 'time',
            time: { 
                unit: 'minute',
                displayFormats: { 
                    minute: 'HH:mm'
                } 
            },
            adapters: {
                date: {
                    locale: zhTW
                }
            },
            title: {
                display: true,
                text: '時間'
            }
          },
          y: {
            beginAtZero: true,
            title: {
                display: true,
                text: '累積簽到人數'
            },
            ticks: { 
                stepSize: 1
            }
          }
        },
        plugins: {
            legend: {
                display: true,
                position: 'bottom'
            }
        }
      }
    });
  }
};

// 【*** 核心修正 2 ***】新增下載圖表的函式
const downloadChart = (chartInstance, baseFilename) => {
  if (!chartInstance) {
    uiStore.showMessage('圖表尚未準備好，無法下載。', 'warning');
    return;
  }
  
  const eventName = sortedEvents.value.find(e => e.id === selectedEventId.value)?.name || '未知活動';
  const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const filename = `${eventName}_${baseFilename}_${timestamp}.png`;

  const link = document.createElement('a');
  link.href = chartInstance.toBase64Image();
  link.download = filename;
  link.click();
};
</script>
