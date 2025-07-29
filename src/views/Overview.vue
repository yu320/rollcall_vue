<template>
  <div class="space-y-8">
    <!-- Summary Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <div v-for="(card, index) in summaryCards" :key="index" class="bg-white rounded-xl shadow p-5 border border-gray-200 hover:shadow-lg transition-shadow" v-html="card"></div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Recent Activity -->
      <div class="lg:col-span-2 bg-white rounded-xl shadow-lg border border-gray-200">
        <h3 class="text-xl font-bold text-gray-800 p-4 border-b">近期活動記錄</h3>
        <div v-if="isLoading" class="text-center py-10">
            <p class="text-gray-500">正在載入近期記錄...</p>
        </div>
        <div v-else-if="recentRecords.length > 0" class="divide-y divide-gray-100">
          <div v-for="record in recentRecords" :key="record.id" class="p-4 flex items-center justify-between hover:bg-gray-50">
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
             <span :class="['status-badge', getStatusClass(record.status)]">{{ record.status }}</span>
          </div>
        </div>
        <div v-else class="text-center py-10 text-gray-500">
            <p>最近 24 小時內沒有任何活動記錄。</p>
        </div>
      </div>

      <!-- Upcoming Events -->
      <div class="bg-white rounded-xl shadow-lg border border-gray-200">
        <h3 class="text-xl font-bold text-gray-800 p-4 border-b">即將開始的活動</h3>
        <div v-if="isLoading" class="text-center py-10">
            <p class="text-gray-500">正在載入活動...</p>
        </div>
        <div v-else-if="upcomingEvents.length > 0" class="divide-y divide-gray-100">
            <div v-for="event in upcomingEvents" :key="event.id" class="p-4 hover:bg-gray-50">
                <p class="font-semibold text-indigo-700">{{ event.name }}</p>
                <p class="text-sm text-gray-600">{{ formatDateTime(event.start_time, 'MM/dd HH:mm') }} 開始</p>
            </div>
        </div>
        <div v-else class="text-center py-10 text-gray-500">
            <p>目前沒有即將開始的活動。</p>
        </div>
      </div>
    </div>

    <!-- Charts Section -->
    <div v-if="!isLoading" class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div class="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <h3 class="text-xl font-bold text-gray-800 mb-4">總操作狀態分佈</h3>
            <div class="h-72"><canvas ref="overviewStatusChartCanvas"></canvas></div>
        </div>
        <div class="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <h3 class="text-xl font-bold text-gray-800 mb-4">近期活動趨勢</h3>
            <div class="h-72"><canvas ref="overviewActivityTrendChartCanvas"></canvas></div>
        </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, nextTick } from 'vue';
import { useUiStore } from '@/store/ui';
import { useDataStore } from '@/store/data'; // 使用 Pinia 的 dataStore
import * as api from '@/services/api';
import { createSummaryCard, formatDateTime } from '@/utils/index'; // 確保引入 createSummaryCard 和 formatDateTime
import { parseISO, isFuture } from 'date-fns';
import Chart from 'chart.js/auto'; // 引入 Chart.js
import 'chartjs-adapter-date-fns'; // 引入日期適配器

const uiStore = useUiStore();
const dataStore = useDataStore(); // 使用 Pinia 的 dataStore
const isLoading = ref(true);

const summaryCards = ref([]);
const recentRecords = ref([]);

// Chart.js 實例的引用
let overviewStatusChartInstance = null;
let overviewActivityTrendChartInstance = null;

// Canvas 元素的模板引用
const overviewStatusChartCanvas = ref(null);
const overviewActivityTrendChartCanvas = ref(null);

// 銷毀圖表實例的輔助函數
const destroyChart = (chartInstance) => {
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null; // 清空引用
  }
};


onMounted(async () => {
  isLoading.value = true;
  uiStore.setLoading(true); // 顯示全局載入遮罩

  try {
    // 平行獲取數據以提高效率
    const [_, __, records] = await Promise.all([
      dataStore.fetchAllPersonnel(), // 確保人員資料已載入
      dataStore.fetchEvents(),      // 確保活動資料已載入
      api.fetchRecentRecords(24) // 獲取最近 24 小時的記錄
    ]);
    
    recentRecords.value = records || [];
    generateSummary(); // 根據獲取到的數據生成摘要卡片

    // 在 DOM 更新後渲染圖表
    await nextTick(); // 使用 nextTick 等待 DOM 更新
    renderAllCharts();

  } catch (error) {
    uiStore.showMessage(`無法載入總覽資訊: ${error.message}`, 'error');
  } finally {
    isLoading.value = false;
    uiStore.setLoading(false); // 隱藏全局載入遮罩
  }
});

// 生成摘要卡片數據
const generateSummary = () => {
    const personnelCount = dataStore.personnel.length;
    const eventCount = dataStore.events.length;
    const checkInToday = recentRecords.value.filter(r => r.action_type === '簽到').length;
    const checkOutToday = recentRecords.value.filter(r => r.action_type === '簽退').length;

    // 使用 utils/index.js 中的 createSummaryCard 函數
    summaryCards.value = [
        createSummaryCard('總人員數', personnelCount, 'users'),
        createSummaryCard('總活動數', eventCount, 'calendar'),
        createSummaryCard('今日簽到人次', checkInToday, 'user-check'),
        createSummaryCard('今日簽退人次', checkOutToday, 'user-minus'),
    ];
};

// 計算屬性：獲取即將開始的活動
const upcomingEvents = computed(() => {
    return dataStore.events
        .filter(event => isFuture(parseISO(event.start_time))) // 過濾出未來活動
        .sort((a, b) => new Date(a.start_time) - new Date(b.start_time)) // 按時間排序
        .slice(0, 5); // 顯示前 5 個
});

// 根據記錄狀態返回對應的 CSS 類別
const getStatusClass = (status) => {
  if (status && status.includes('準時')) return 'bg-green-100 text-green-800';
  if (status && status.includes('遲到')) return 'bg-yellow-100 text-yellow-800';
  if (status && status.includes('失敗')) return 'bg-red-100 text-red-800';
  return 'bg-gray-100 text-gray-800';
};

// 根據操作類型返回對應的背景和文字顏色類別
const getActionTypeClass = (actionType) => {
    if(actionType === '簽到') {
        return { bg: 'bg-blue-100', text: 'text-blue-600' };
    }
    return { bg: 'bg-orange-100', text: 'text-orange-600' };
};

// 渲染所有圖表的總函數
const renderAllCharts = () => {
    renderOverviewStatusChart();
    renderOverviewActivityTrendChart();
};

// 渲染「總操作狀態分佈」圓餅圖
const renderOverviewStatusChart = () => {
    destroyChart(overviewStatusChartInstance); // 銷毀舊圖表

    // 確保 canvas 元素已經被渲染到 DOM 中
    if (!overviewStatusChartCanvas.value) {
        console.warn("無法找到 'overviewStatusChartCanvas' 元素，跳過圖表渲染。");
        return; 
    }

    const checkInSuccess = recentRecords.value.filter(r => r.action_type === '簽到' && r.success).length;
    const checkOutSuccess = recentRecords.value.filter(r => r.action_type === '簽退' && r.success).length;
    const failures = recentRecords.value.filter(r => !r.success).length;

    const ctx = overviewStatusChartCanvas.value.getContext('2d');
    overviewStatusChartInstance = new Chart(ctx, 
        type: 'doughnut',
        data: {
            labels: ['簽到成功', '簽退成功', '操作失敗'],
            datasets: [{
                data: [checkInSuccess, checkOutSuccess, failures],
                backgroundColor: ['#10B981', '#3B82F6', '#EF4444'], // 綠、藍、紅
                borderColor: '#FFFFFF',
                borderWidth: 2,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
        }
    );
};

// 渲染「近期活動趨勢」折線圖
const renderOverviewActivityTrendChart = () => {
    destroyChart(overviewActivityTrendChartInstance); // 銷毀舊圖表

    // 確保 canvas 元素已經被渲染到 DOM 中
    if (!overviewActivityTrendChartCanvas.value) {
        console.warn("無法找到 'overviewActivityTrendChartCanvas' 元素，跳過圖表渲染。");
        return; 
    }

    // 獲取最近的活動 (例如，最近10個活動)
    const sortedEvents = [...dataStore.events].sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
    const recentEvents = sortedEvents.slice(Math.max(sortedEvents.length - 10, 0)); 

    const labels = recentEvents.map(e => e.name); // 活動名稱作為 X 軸標籤
    const checkInData = recentEvents.map(event => {
        // 計算每個活動的簽到人次
        return recentRecords.value.filter(r => r.event_id === event.id && r.action_type === '簽到').length;
    });
    const checkOutData = recentEvents.map(event => {
        // 計算每個活動的簽退人次
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
                    borderColor: '#4F46E5', // Indigo-600
                    backgroundColor: 'rgba(79, 70, 229, 0.2)',
                    fill: true,
                    tension: 0.3 // 平滑曲線
                },
                {
                    label: '簽退人次',
                    data: checkOutData,
                    borderColor: '#F59E0B', // Amber-500
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
                y: { beginAtZero: true } // Y 軸從 0 開始
            },
            plugins: {
                legend: { display: true } // 顯示圖例
            }
        }
    });
};
</script>

