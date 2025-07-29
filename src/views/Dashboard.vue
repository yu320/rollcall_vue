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
            <option v-for="event in sortedEvents" :key="event.id" :value="event.id">{{ event.name }} ({{ formatDateTime(event.start_time, 'yyyy-MM-dd HH:mm') }})</option>
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
                 <!-- Added data-label attributes for responsive view -->
                <tr v-for="attendee in dashboardData.attendees" :key="attendee.personnel_id" class="hover:bg-gray-50">
                  <td data-label="姓名" class="px-6 py-4 font-medium text-gray-800">{{ attendee.name }}</td>
                  <td data-label="學號" class="px-6 py-4 text-gray-600">{{ attendee.code }}</td>
                  <td data-label="狀態" class="px-6 py-4"><span :class="getStatusClass(attendee.status)">{{ attendee.status }}</span></td>
                  <td data-label="簽到時間" class="px-6 py-4 text-sm text-gray-500">{{ formatDateTime(attendee.check_in_time, 'HH:mm:ss') || '—' }}</td>
                  <td data-label="簽退時間" class="px-6 py-4 text-sm text-gray-500">{{ formatDateTime(attendee.check_out_time, 'HH:mm:ss') || '—' }}</td>
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
import { ref, onMounted, nextTick, computed } from 'vue';
import { useUiStore } from '@/store/ui';
import { useDataStore } from '@/store/data';
import * as api from '@/services/api';
import Chart from 'chart.js/auto';
import 'chartjs-adapter-date-fns';
import { zhTW } from 'date-fns/locale'; // 引入繁體中文語系
import { createSummaryCard } from '@/utils/index';
import { format, parseISO } from 'date-fns';

const uiStore = useUiStore();
const dataStore = useDataStore();

const selectedEventId = ref(null);
const isLoading = ref(false); // 控制頁面載入狀態
const dashboardData = ref(null); // 存放儀表板所有數據

const statusChartCanvas = ref(null); // Canvas 引用
const timelineChartCanvas = ref(null); // Canvas 引用

// 儲存 Chart.js 實例，以便在數據更新時銷毀舊圖表
const chartInstances = {
  status: null,
  timeline: null,
};

// 銷毀 Chart 實例的輔助函數
const destroyChart = (chartInstance) => {
  if (chartInstance) {
    chartInstance.destroy();
  }
};

// 格式化日期時間字符串
const formatDateTime = (isoString, formatStr = 'HH:mm:ss') => {
    if (!isoString) return null;
    return format(parseISO(isoString), formatStr);
};

// 根據簽到狀態返回對應的 Tailwind CSS 類別
const getStatusClass = (status) => {
  if (status && status.includes('未簽到')) return 'status-badge bg-red-100 text-red-800';
  if (status && status.includes('準時')) return 'status-badge bg-green-100 text-green-800';
  if (status && status.includes('遲到')) return 'status-badge bg-yellow-100 text-yellow-800';
  return 'status-badge bg-gray-100 text-gray-800';
};

// 計算屬性：將活動按開始時間降序排序，用於選擇器
const sortedEvents = computed(() => {
    return [...dataStore.events].sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
});

// 組件掛載時，初始化數據和儀表板
onMounted(async () => {
  uiStore.setLoading(true); // 顯示全局載入遮罩
  try {
    // 確保活動和人員數據已載入
    await Promise.all([
      dataStore.fetchEvents(),
      dataStore.fetchAllPersonnel()
    ]);

    // 如果有活動，預設選中第一個活動並載入其儀表板數據
    if (dataStore.events.length > 0) {
      selectedEventId.value = dataStore.events[0].id;
      await updateDashboard();
    }
  } catch (error) {
    uiStore.showMessage(`初始化儀表板失敗: ${error.message}`, 'error');
    dashboardData.value = null; // 初始化失敗清空數據
  } finally {
    uiStore.setLoading(false); // 隱藏全局載入遮罩
  }
});

// 根據選擇的活動 ID 更新儀表板數據
const updateDashboard = async () => {
  if (!selectedEventId.value) {
    dashboardData.value = null; // 沒有選擇活動，清空數據
    return;
  }
  isLoading.value = true; // 設置頁面載入狀態
  uiStore.setLoading(true); // 顯示全局載入遮罩
  try {
    // 調用 Supabase RPC 獲取儀表板所需的所有數據
    const data = await api.getDashboardData(selectedEventId.value);
    
    // 將數據轉換為組件中使用的格式
    dashboardData.value = {
        summaryCards: [
            // createSummaryCard 函數來自 '@/utils/index.js'
            createSummaryCard('應到人數', data.summary.expectedCount, 'users'),
            createSummaryCard('實到人數', data.summary.attendedCount, 'user-check'),
            createSummaryCard('未到人數', data.summary.absentCount, 'user-minus'),
            createSummaryCard('參與率', `${data.summary.attendanceRate.toFixed(1)}%`, 'pie-chart'),
            createSummaryCard('準時率', `${data.summary.onTimeRate.toFixed(1)}%`, 'clock'),
        ],
        attendees: data.attendees,
        charts: data.charts // 原始圖表數據
    };
    
    // 使用 nextTick 確保 DOM 已更新，再渲染 Chart.js 圖表
    await nextTick();
    renderCharts();
  } catch (error) {
    uiStore.showMessage(`載入儀表板數據失敗: ${error.message}`, 'error');
    dashboardData.value = null; // 載入失敗清空數據
  } finally {
    isLoading.value = false; // 隱藏頁面載入狀態
    uiStore.setLoading(false); // 隱藏全局載入遮罩
  }
};

// 渲染所有圖表
const renderCharts = () => {
  // 銷毀舊的圖表實例
  destroyChart(chartInstances.status);
  destroyChart(chartInstances.timeline);

  if (!dashboardData.value || !dashboardData.value.charts) return;

  // 渲染簽到狀態分佈圖 (圓餅圖)
  if (statusChartCanvas.value) {
    const statusData = dashboardData.value.charts.status;
    chartInstances.status = new Chart(statusChartCanvas.value, {
      type: 'doughnut',
      data: {
        labels: ['準時', '遲到', '未到'],
        datasets: [{
          data: [statusData.onTime, statusData.late, statusData.absent],
          backgroundColor: ['#10B981', '#F59E0B', '#EF4444'], // 綠色, 黃色, 紅色
          borderColor: '#FFFFFF',
          borderWidth: 2,
        }]
      },
      options: { 
        responsive: true, 
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom' // 圖例置於底部
            }
        }
      }
    });
  }

  // 渲染簽到時間線圖 (折線圖)
  if (timelineChartCanvas.value) {
    // 將 ISO 時間字符串轉換為 Date 對象
    const timelineData = dashboardData.value.charts.timeline.map(d => ({
        x: parseISO(d.time), // 使用 date-fns 的 parseISO 函數
        y: d.count
    }));

    chartInstances.timeline = new Chart(timelineChartCanvas.value, {
      type: 'line',
      data: {
        datasets: [{
          label: '累積簽到人數', // 修正為「累積簽到人數」
          data: timelineData,
          borderColor: '#4F46E5', // Indigo-600
          backgroundColor: 'rgba(79, 70, 229, 0.2)', // 帶透明度的 Indigo-600
          fill: true, // 填充區域
          stepped: true, // 階梯式線條
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: 'time', // X 軸類型為時間
            time: { 
                unit: 'minute', // 單位為分鐘
                displayFormats: { 
                    minute: 'HH:mm' // 顯示格式為小時:分鐘
                } 
            },
            adapters: {
                date: {
                    locale: zhTW // 使用繁體中文語系
                }
            },
            title: {
                display: true,
                text: '時間'
            }
          },
          y: {
            beginAtZero: true, // Y 軸從 0 開始
            title: {
                display: true,
                text: '累積簽到人數'
            },
            ticks: { 
                stepSize: 1 // 步長為 1
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
</script>
