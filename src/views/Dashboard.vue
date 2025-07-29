<template>
  <div class="space-y-8">
    <!-- Header and Event Selector -->
    <div class="bg-white rounded-xl shadow-lg p-6 md:p-8 border border-indigo-200">
      <div class="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 class="text-3xl font-bold text-indigo-800">活動儀錶板</h2>
        <div class="w-full md:w-1/2 lg:w-1/3">
          <label for="event-selector" class="sr-only">選擇活動</label>
          <select id="event-selector" v-model="selectedEventId" @change="updateDashboard" class="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500">
            <option :value="null" disabled>-- 請選擇一個活動來查看 --</option>
            <option v-for="event in dataStore.events" :key="event.id" :value="event.id">{{ event.name }} ({{ formatDateTime(event.start_time, 'yyyy-MM-dd') }})</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="text-center py-16 text-gray-500">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto mb-4"></div>
      <p>正在載入儀錶板數據...</p>
    </div>

    <!-- Data Display -->
    <div v-else-if="dashboardData" class="space-y-8">
      <!-- Summary Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <div v-for="(card, index) in dashboardData.summaryCards" :key="index" class="bg-white rounded-xl shadow p-5 border border-gray-200 hover:shadow-lg transition-shadow" v-html="card"></div>
      </div>

      <!-- Details & Charts -->
      <div class="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <!-- Attendees Table -->
        <div class="lg:col-span-3 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div class="p-4 border-b">
            <h3 class="text-xl font-bold text-gray-800">出席人員詳情</h3>
          </div>
          <div class="overflow-x-auto table-responsive">
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
                <tr v-for="attendee in dashboardData.attendees" :key="attendee.personnel_id" class="hover:bg-gray-50">
                  <td data-label="姓名" class="px-6 py-4 font-medium text-gray-800">{{ attendee.name }}</td>
                  <td data-label="學號" class="px-6 py-4 text-gray-600">{{ attendee.code }}</td>
                  <td data-label="狀態" class="px-6 py-4"><span :class="getStatusClass(attendee.status)">{{ attendee.status }}</span></td>
                  <td data-label="簽到時間" class="px-6 py-4 text-sm text-gray-500">{{ formatDateTime(attendee.check_in_time) || '—' }}</td>
                  <td data-label="簽退時間" class="px-6 py-4 text-sm text-gray-500">{{ formatDateTime(attendee.check_out_time) || '—' }}</td>
                </tr>
              </tbody>
            </table>
             <div v-if="dashboardData.attendees.length === 0" class="text-center py-10 text-gray-500">此活動尚無人員簽到</div>
          </div>
        </div>

        <!-- Charts -->
        <div class="lg:col-span-2 space-y-8">
          <div class="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <h3 class="text-xl font-bold text-gray-800 mb-4">簽到狀態分佈</h3>
            <div class="h-64"><canvas ref="statusChartCanvas"></canvas></div>
          </div>
          <div class="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <h3 class="text-xl font-bold text-gray-800 mb-4">簽到時間線</h3>
            <div class="h-64"><canvas ref="timelineChartCanvas"></canvas></div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Initial State -->
    <div v-else class="text-center py-16 text-gray-500 bg-white rounded-xl shadow-lg">
      <p class="text-lg">請從上方下拉選單中選擇一個活動來查看其儀錶板。</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
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
const isLoading = ref(false);
const dashboardData = ref(null);
const statusChartCanvas = ref(null);
const timelineChartCanvas = ref(null);

const chartInstances = {
  status: null,
  timeline: null,
};

const destroyChart = (chartInstance) => {
  if (chartInstance) {
    chartInstance.destroy();
  }
};

const formatDateTime = (isoString, formatStr = 'HH:mm:ss') => {
    if (!isoString) return null;
    return format(parseISO(isoString), formatStr);
}

const getStatusClass = (status) => {
  if (status.includes('未簽到')) return 'status-badge bg-red-100 text-red-800';
  if (status.includes('準時')) return 'status-badge bg-green-100 text-green-800';
  if (status.includes('遲到')) return 'status-badge bg-yellow-100 text-yellow-800';
  return 'status-badge bg-gray-100 text-gray-800';
};

onMounted(async () => {
  if (dataStore.events.length === 0) {
      await dataStore.fetchEvents();
  }
  if (dataStore.events.length > 0) {
    selectedEventId.value = dataStore.events[0].id;
    await updateDashboard();
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
    
    // Process data for display
    dashboardData.value = {
        summaryCards: [
            createSummaryCard('應到人數', data.summary.expectedCount, 'users'),
            createSummaryCard('實到人數', data.summary.attendedCount, 'user-check'),
            createSummaryCard('未到人數', data.summary.absentCount, 'user-minus'),
            createSummaryCard('參與率', `${data.summary.attendanceRate.toFixed(1)}%`, 'pie-chart'),
            createSummaryCard('準時率', `${data.summary.onTimeRate.toFixed(1)}%`, 'clock'),
        ],
        attendees: data.attendees,
        charts: data.charts
    };
    
    await nextTick();
    renderCharts();
  } catch (error) {
    uiStore.showMessage(`載入儀錶板數據失敗: ${error.message}`, 'error');
    dashboardData.value = null; // Clear data on error
  } finally {
    isLoading.value = false;
    uiStore.setLoading(false);
  }
};

const renderCharts = () => {
  destroyChart(chartInstances.status);
  destroyChart(chartInstances.timeline);

  if (!dashboardData.value || !dashboardData.value.charts) return;

  // Render Status Doughnut Chart
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
      options: { responsive: true, maintainAspectRatio: false }
    });
  }

  // Render Timeline Line Chart
  if (timelineChartCanvas.value) {
    const timelineData = dashboardData.value.charts.timeline.map(d => ({
        x: parseISO(d.time),
        y: d.count
    }));

    chartInstances.timeline = new Chart(timelineChartCanvas.value, {
      type: 'line',
      data: {
        datasets: [{
          label: '簽到人次',
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
            time: { unit: 'minute', displayFormats: { minute: 'HH:mm' } },
            adapters: { date: { locale: zhTW } },
            title: { display: true, text: '時間' }
          },
          y: {
            beginAtZero: true,
            title: { display: true, text: '累積簽到人數' },
            ticks: { stepSize: 1 }
          }
        }
      }
    });
  }
};
</script>
