<template>
  <div class="space-y-8">
    <!-- 頁面標題和篩選器 -->
    <div class="bg-white rounded-xl shadow-lg p-6 md:p-8 border border-indigo-200">
      <div class="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 class="text-3xl font-bold text-indigo-800">活動報表分析</h2>
        <div class="flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-3 items-center w-full md:w-auto">
          <!-- 日期範圍篩選器 -->
          <div class="flex items-center gap-2 flex-wrap justify-center">
            <label for="reportStartDate" class="text-sm font-medium text-gray-700 whitespace-nowrap">日期範圍:</label>
            <input type="date" id="reportStartDate" v-model="startDate" class="text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-300">
            <span class="text-gray-500">至</span>
            <input type="date" id="reportEndDate" v-model="endDate" class="text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-300">
          </div>
          <!-- 匯出按鈕 -->
          <button @click="exportReportData" class="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md text-sm flex items-center justify-center transition shadow-sm hover:shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            匯出 Excel
          </button>
        </div>
      </div>

      <!-- 報表分頁 -->
      <div class="border-b border-gray-200">
        <nav class="-mb-px flex space-x-6" aria-label="Tabs">
          <button @click="activeTab = 'participation'" :class="['report-tab', { 'active': activeTab === 'participation' }]">活動參與統計</button>
          <button @click="activeTab = 'building'" :class="['report-tab', { 'active': activeTab === 'building' }]">棟別活動分析</button>
          <button v-if="authStore.hasPermission('reports:personnel')" @click="activeTab = 'personnel'" :class="['report-tab', { 'active': activeTab === 'personnel' }]">人員活動參與報表</button>
        </nav>
      </div>
    </div>

    <!-- 報表內容 -->
    <div v-if="!isLoading">
      <!-- 活動參與統計 -->
      <div v-show="activeTab === 'participation'" class="space-y-6">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          <div v-for="card in summaryCards" :key="card.title" class="bg-white rounded-xl shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow" v-html="card.html"></div>
        </div>
        <div class="bg-white rounded-xl shadow-md p-6 border border-gray-200">
          <h3 class="text-xl font-bold text-gray-800 mb-6">活動參與趨勢</h3>
          <div class="h-72"><canvas ref="attendanceTrendChartCanvas"></canvas></div>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <h3 class="text-xl font-bold text-gray-800 mb-6">簽到狀態分佈 (準時/遲到)</h3>
            <div class="h-72"><canvas ref="attendancePieChartCanvas"></canvas></div>
          </div>
          <div class="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <h3 class="text-xl font-bold text-gray-800 mb-6">出席狀態分佈</h3>
            <div class="h-72"><canvas ref="attendanceStatusPieChartCanvas"></canvas></div>
          </div>
        </div>
        <div class="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
          <div class="px-6 py-4 border-b border-gray-200">
            <div class="flex flex-col md:flex-row justify-between items-center gap-3">
              <h3 class="text-xl font-bold text-gray-800">活動報到詳細數據</h3>
              <div class="flex items-center space-x-2">
                <select v-model="activityFilter" class="border border-gray-300 rounded-md text-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="all">全部活動</option>
                  <option v-for="event in eventOptions" :key="event.id" :value="event.id">{{ event.name }} ({{ formatDate(new Date(event.start_time)) }})</option>
                </select>
                <select v-model="buildingFilter" class="border border-gray-300 rounded-md text-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="all">全部棟別</option>
                  <option v-for="building in buildingOptions" :key="building" :value="building">{{ building }}</option>
                </select>
              </div>
            </div>
          </div>
          <div class="overflow-x-auto">
            <table class="data-grid w-full">
              <thead>
                <tr>
                  <th>活動名稱</th><th>活動日期</th><th>應到</th><th>簽到</th><th>簽退</th><th>未簽退</th><th>未到</th><th>參與率</th><th>準時率</th>
                </tr>
              </thead>
              <tbody v-if="filteredActivityStats.length > 0">
                <tr v-for="act in filteredActivityStats" :key="act.id">
                  <td data-label="活動名稱">{{ act.name }}</td>
                  <td data-label="活動日期">{{ formatDate(new Date(act.start_time)) }}</td>
                  <td data-label="應到">{{ act.shouldAttendCount }}</td>
                  <td data-label="簽到">{{ act.attendedCount }}</td>
                  <td data-label="簽退">{{ act.checkOutCount }}</td>
                  <td data-label="未簽退">{{ act.notCheckedOutCount }}</td>
                  <td data-label="未到">{{ act.absentCount }}</td>
                  <td data-label="參與率">{{ act.attendanceRate.toFixed(1) }}%</td>
                  <td data-label="準時率">{{ act.onTimeRate.toFixed(1) }}%</td>
                </tr>
              </tbody>
              <tbody v-else>
                <tr><td colspan="9" class="text-center py-8 text-gray-500">沒有符合條件的資料</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <!-- 棟別活動分析 -->
      <div v-show="activeTab === 'building'" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <h3 class="text-xl font-bold text-gray-800 mb-6">棟別活動參與率比較</h3>
            <div class="h-96"><canvas ref="buildingAttendanceChartCanvas"></canvas></div>
        </div>
        <div class="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <h3 class="text-xl font-bold text-gray-800 mb-4">棟別準時率排名</h3>
            <div class="space-y-4">
                <div v-for="stat in buildingOnTimeRank" :key="stat.name">
                    <div class="flex justify-between mb-1">
                        <span class="text-sm font-medium text-gray-800">{{ stat.name }}</span>
                        <span class="text-sm font-semibold text-indigo-600">{{ stat.rate.toFixed(1) }}%</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2.5">
                        <div class="bg-indigo-600 h-2.5 rounded-full" :style="{ width: stat.rate + '%' }"></div>
                    </div>
                </div>
            </div>
        </div>
      </div>

      <!-- 人員活動參與報表 -->
      <div v-show="activeTab === 'personnel'" class="space-y-6">
        <div class="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <h3 class="text-xl font-bold text-gray-800 mb-4">人員搜尋</h3>
            <div class="flex flex-col md:flex-row gap-4 items-end">
                <div class="flex-grow">
                    <label for="reportPersonnelSearch" class="block text-sm font-medium text-gray-700 mb-1">人員學號/姓名/卡號</label>
                    <input type="text" v-model="personnelSearchTerm" @keyup.enter="generatePersonnelReport" placeholder="輸入學號/姓名/卡號..." class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500">
                </div>
                <div class="flex-shrink-0"><button @click="generatePersonnelReport" class="bg-indigo-600 text-white px-5 py-2 rounded-md hover:bg-indigo-700 text-sm w-full md:w-auto">搜尋</button></div>
            </div>
        </div>
        <div v-if="personnelReportData">
            <div class="bg-white rounded-xl shadow-md p-6 mb-6 border border-gray-200">
                <div class="flex items-center mb-6">
                    <div class="flex-shrink-0 h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xl">{{ personnelReportData.person.name.charAt(0) }}</div>
                    <div class="ml-4">
                        <h3 class="text-lg font-medium text-gray-900">{{ personnelReportData.person.name }} ({{ personnelReportData.person.code }})</h3>
                        <p class="text-sm text-gray-500">{{ personnelReportData.person.building || '無棟別' }} | {{ (personnelReportData.person.tags || []).join(', ') || '無標籤' }}</p>
                    </div>
                </div>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div class="bg-gray-50 p-4 rounded-lg text-center"><p class="text-sm text-gray-500">簽到次數</p><p class="text-2xl font-bold text-gray-900">{{ personnelReportData.stats.checkInCount }}</p></div>
                    <div class="bg-gray-50 p-4 rounded-lg text-center"><p class="text-sm text-gray-500">簽退次數</p><p class="text-2xl font-bold text-gray-900">{{ personnelReportData.stats.checkOutCount }}</p></div>
                    <div class="bg-gray-50 p-4 rounded-lg text-center"><p class="text-sm text-gray-500">參與率</p><p class="text-2xl font-bold text-gray-900">{{ personnelReportData.stats.attendanceRate.toFixed(1) }}%</p></div>
                    <div class="bg-gray-50 p-4 rounded-lg text-center"><p class="text-sm text-gray-500">準時/遲到</p><p class="text-2xl font-bold text-gray-900">{{ personnelReportData.stats.onTimeCount }} / {{ personnelReportData.stats.lateCount }}</p></div>
                </div>
            </div>
            <div class="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
                <div class="px-6 py-4 border-b border-gray-200"><h3 class="text-xl font-bold text-gray-800">活動報到記錄</h3></div>
                <div class="overflow-x-auto">
                    <table class="data-grid w-full">
                        <thead><tr><th>日期</th><th>活動名稱</th><th>操作類型</th><th>操作時間</th><th>狀態</th></tr></thead>
                        <tbody>
                            <tr v-for="record in personnelReportData.records" :key="record.id">
                                <td data-label="日期">{{ formatDate(new Date(record.created_at)) }}</td>
                                <td data-label="活動名稱">{{ dataStore.getEventById(record.event_id)?.name || 'N/A' }}</td>
                                <td data-label="操作類型">{{ record.action_type }}</td>
                                <td data-label="操作時間">{{ new Date(record.created_at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) }}</td>
                                <td data-label="狀態"><span :class="['status-badge', getStatusClass(record.status)]">{{ record.status }}</span></td>
                            </tr>
                        </tbody>
                    </table>
                     <div v-if="personnelReportData.records.length === 0" class="text-center py-8 text-gray-500">此人員在選定時間範圍内沒有報到記錄</div>
                </div>
            </div>
        </div>
        <div v-else class="text-center py-12 text-gray-500 bg-white rounded-xl shadow-lg">請搜尋人員以查看報表</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed, nextTick } from 'vue';
import { useUiStore } from '@/store/ui';
import { useDataStore } from '@/store/data';
import { useAuthStore } from '@/store/auth';
import * as api from '@/services/api';
import Chart from 'chart.js/auto';
// FIX: Removed incorrect import
import { createSummaryCard } from '@/utils/index';

// Store 初始化
const uiStore = useUiStore();
const dataStore = useDataStore();
const authStore = useAuthStore();

// 組件狀態
const isLoading = ref(true);
const activeTab = ref('participation');
const startDate = ref('');
const endDate = ref('');
const activityFilter = ref('all');
const buildingFilter = ref('all');
const personnelSearchTerm = ref('');
const personnelReportData = ref(null);

// 原始和處理後的數據
const rawData = ref([]);
const processedData = ref(null);

// 圖表實例和 Canvas 引用
const chartInstances = {};
const attendanceTrendChartCanvas = ref(null);
const attendancePieChartCanvas = ref(null);
const attendanceStatusPieChartCanvas = ref(null);
const buildingAttendanceChartCanvas = ref(null);


// --- Computed Properties ---

const eventOptions = computed(() => {
    if (!rawData.value) return [];
    const eventIds = [...new Set(rawData.value.map(r => r.event_id).filter(Boolean))];
    return dataStore.events.filter(e => eventIds.includes(e.id));
});

const buildingOptions = computed(() => {
    return [...new Set(dataStore.personnel.map(p => p.building).filter(Boolean))].sort();
});

const filteredRecords = computed(() => {
    if (!rawData.value) return [];
    return rawData.value.filter(record => {
        const personnel = dataStore.getPersonnelById(record.personnel_id);
        const buildingMatch = buildingFilter.value === 'all' || (personnel && personnel.building === buildingFilter.value);
        const activityMatch = activityFilter.value === 'all' || record.event_id === activityFilter.value;
        return buildingMatch && activityMatch;
    });
});

const filteredActivityStats = computed(() => processedData.value?.tables.activityStats || []);
const summaryCards = computed(() => processedData.value?.summaryCards || []);
const buildingOnTimeRank = computed(() => processedData.value?.buildingOnTimeRank || []);


// --- Watchers ---

watch([startDate, endDate, activityFilter, buildingFilter], () => {
    updateReportView();
});

// --- Methods ---

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};


onMounted(() => {
    initialize();
});

const initialize = async () => {
    uiStore.setLoading(true);
    isLoading.value = true;
    try {
        const end = new Date();
        const start = new Date();
        start.setMonth(start.getMonth() - 1);
        startDate.value = formatDate(start);
        endDate.value = formatDate(end);

        await Promise.all([dataStore.fetchAllPersonnel(), dataStore.fetchEvents()]);
        await updateReportView();
    } catch (error) {
        uiStore.showMessage(`初始化報表頁面失敗: ${error.message}`, 'error');
    } finally {
        uiStore.setLoading(false);
        isLoading.value = false;
    }
};

const updateReportView = async () => {
    if (!startDate.value || !endDate.value) return;

    // We don't need a separate loading overlay here as the main one is handled by isLoading
    // uiStore.setLoading(true); 
    try {
        const start = new Date(startDate.value);
        const end = new Date(endDate.value);
        end.setHours(23, 59, 59, 999);
        
        rawData.value = await api.fetchRecordsByDateRange(start, end);
        processedData.value = processReportData(filteredRecords.value, dataStore.personnel, dataStore.events, buildingFilter.value);
        nextTick(() => {
            renderAllCharts();
        });
    } catch (error) {
        uiStore.showMessage(`載入報表數據失敗: ${error.message}`, 'error');
    } finally {
        // uiStore.setLoading(false);
    }
};

const processReportData = (records, allPersonnel, allEvents, currentBuildingFilter) => {
    const eventGroups = {};
    records.forEach(r => {
        if (!r.event_id) return;
        if (!eventGroups[r.event_id]) {
            const event = allEvents.find(e => e.id === r.event_id);
            eventGroups[r.event_id] = { eventInfo: event || { id: r.event_id, name: '未知活動', start_time: new Date().toISOString() }, records: [] };
        }
        eventGroups[r.event_id].records.push(r);
    });

    const activityStats = Object.values(eventGroups).map(group => {
        const personnelForEvent = currentBuildingFilter === 'all' ? allPersonnel : allPersonnel.filter(p => p.building === currentBuildingFilter);
        const shouldAttendCount = personnelForEvent.length;
        const checkInRecords = group.records.filter(r => r.action_type === '簽到' && r.success);
        const attendedPersonnelIds = new Set(checkInRecords.map(r => r.personnel_id));
        const attendedCount = attendedPersonnelIds.size;
        const checkOutCount = new Set(group.records.filter(r => r.action_type === '簽退' && r.success).map(r => r.personnel_id)).size;
        const onTimeCount = new Set(checkInRecords.filter(r => r.status === '準時').map(r => r.personnel_id)).size;
        
        return {
            ...group.eventInfo,
            shouldAttendCount,
            attendedCount,
            checkOutCount,
            notCheckedOutCount: attendedCount - checkOutCount,
            absentCount: shouldAttendCount > 0 ? shouldAttendCount - attendedCount : 0,
            onTimeCount,
            lateCount: attendedCount - onTimeCount,
            attendanceRate: shouldAttendCount > 0 ? (attendedCount / shouldAttendCount * 100) : 0,
            onTimeRate: attendedCount > 0 ? (onTimeCount / attendedCount * 100) : 0,
        };
    }).sort((a, b) => new Date(b.start_time) - new Date(a.start_time));

    const totalCheckins = activityStats.reduce((sum, act) => sum + act.attendedCount, 0);
    const totalOnTime = activityStats.reduce((sum, act) => sum + act.onTimeCount, 0);
    const overallShouldAttend = activityStats.reduce((sum, act) => sum + act.shouldAttendCount, 0);

    const summary = {
        totalEvents: activityStats.length,
        totalCheckins: totalCheckins,
        totalCheckouts: activityStats.reduce((sum, act) => sum + act.checkOutCount, 0),
        overallAttendanceRate: overallShouldAttend > 0 ? (totalCheckins / overallShouldAttend * 100) : 0,
        overallOnTimeRate: totalCheckins > 0 ? (totalOnTime / totalCheckins * 100) : 0,
    };

    const buildings = [...new Set(allPersonnel.map(p => p.building).filter(Boolean))];
    const buildingRank = buildings.map(b => {
        const personnelInBuilding = allPersonnel.filter(p => p.building === b);
        const attendedRecords = records.filter(r => r.action_type === '簽到' && personnelInBuilding.some(p => p.id === r.personnel_id));
        const onTimeCount = new Set(attendedRecords.filter(r => r.status === '準時').map(r => r.personnel_id)).size;
        const totalAttendedInBuilding = new Set(attendedRecords.map(r => r.personnel_id)).size;
        const rate = totalAttendedInBuilding > 0 ? (onTimeCount / totalAttendedInBuilding) * 100 : 0;
        return { name: b, rate };
    }).sort((a, b) => b.rate - a.rate);

    return {
        summaryCards: [
            { title: '總活動數', html: createSummaryCard('總活動數', summary.totalEvents.toLocaleString(), 'calendar') },
            { title: '總簽到人次', html: createSummaryCard('總簽到人次', summary.totalCheckins.toLocaleString(), 'check-square') },
            { title: '總簽退人次', html: createSummaryCard('總簽退人次', summary.totalCheckouts.toLocaleString(), 'user-minus') },
            { title: '總體參與率', html: createSummaryCard('總體參與率', `${summary.overallAttendanceRate.toFixed(1)}%`, 'pie-chart') },
            { title: '準時率', html: createSummaryCard('準時率 (基於已簽到)', `${summary.overallOnTimeRate.toFixed(1)}%`, 'clock') }
        ],
        tables: { activityStats },
        charts: { activityStats, records, allPersonnel },
        buildingOnTimeRank: buildingRank
    };
};

const renderAllCharts = () => {
    if (!processedData.value) return;
    const { activityStats, records, allPersonnel } = processedData.value.charts;
    renderAttendanceTrendChart(activityStats);
    renderAttendancePieChart(activityStats);
    renderAttendanceStatusPieChart(activityStats);
    renderBuildingAttendanceChart(records, allPersonnel);
};

const destroyChart = (instanceRef) => {
    if (instanceRef) {
        instanceRef.destroy();
        instanceRef = null;
    }
};

const renderAttendanceTrendChart = (activityStats) => {
    destroyChart(chartInstances.trend);
    if (!attendanceTrendChartCanvas.value) return;
    chartInstances.trend = new Chart(attendanceTrendChartCanvas.value, { 
        type: 'line',
        data: {
            labels: activityStats.map(a => a.name).reverse(),
            datasets: [
                { label: '應到人數', data: activityStats.map(a => a.shouldAttendCount).reverse(), borderColor: 'rgba(107, 114, 128, 1)', borderDash: [5, 5], fill: false, tension: 0.3 },
                { label: '簽到人次', data: activityStats.map(a => a.attendedCount).reverse(), borderColor: 'rgba(79, 70, 229, 1)', backgroundColor: 'rgba(79, 70, 229, 0.2)', fill: true, tension: 0.3 },
                { label: '簽退人次', data: activityStats.map(a => a.checkOutCount).reverse(), borderColor: 'rgba(245, 158, 11, 1)', backgroundColor: 'rgba(245, 158, 11, 0.2)', fill: true, tension: 0.3 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
    });
};

const renderAttendancePieChart = (activityStats) => {
    destroyChart(chartInstances.pie);
    if (!attendancePieChartCanvas.value) return;
    const totalOnTime = activityStats.reduce((sum, act) => sum + act.onTimeCount, 0);
    const totalLate = activityStats.reduce((sum, act) => sum + act.lateCount, 0);
    chartInstances.pie = new Chart(attendancePieChartCanvas.value, {
        type: 'doughnut',
        data: {
            labels: ['準時', '遲到'],
            datasets: [{ data: [totalOnTime, totalLate], backgroundColor: ['#10B981', '#F59E0B'], borderColor: '#FFFFFF', borderWidth: 1 }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
};

const renderAttendanceStatusPieChart = (activityStats) => {
    destroyChart(chartInstances.statusPie);
    if (!attendanceStatusPieChartCanvas.value) return;
    const totalCheckedOut = activityStats.reduce((sum, act) => sum + act.checkOutCount, 0);
    const totalNotCheckedOut = activityStats.reduce((sum, act) => sum + act.notCheckedOutCount, 0);
    const totalAbsent = activityStats.reduce((sum, act) => sum + act.absentCount, 0);
    chartInstances.statusPie = new Chart(attendanceStatusPieChartCanvas.value, {
        type: 'doughnut',
        data: {
            labels: ['已簽退', '未簽退', '未到'],
            datasets: [{ data: [totalCheckedOut, totalNotCheckedOut, totalAbsent], backgroundColor: ['#3B82F6', '#FBBF24', '#6B7280'], borderColor: '#FFFFFF', borderWidth: 1 }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
};

const renderBuildingAttendanceChart = (records, personnel) => {
    destroyChart(chartInstances.building);
    if (!buildingAttendanceChartCanvas.value) return;
    const buildings = [...new Set(personnel.map(p => p.building).filter(Boolean))];
    const buildingStats = buildings.map(b => {
        const personnelInBuilding = personnel.filter(p => p.building === b);
        const attendedRecords = records.filter(r => r.action_type === '簽到' && personnelInBuilding.some(p => p.id === r.personnel_id));
        const onTimeCount = new Set(attendedRecords.filter(r => r.status === '準時').map(r => r.personnel_id)).size;
        const totalAttendedInBuilding = new Set(attendedRecords.map(r => r.personnel_id)).size;
        const rate = totalAttendedInBuilding > 0 ? (onTimeCount / totalAttendedInBuilding) * 100 : 0;
        return { name: b, rate };
    }).sort((a,b) => b.rate - a.rate);

    chartInstances.building = new Chart(buildingAttendanceChartCanvas.value, {
        type: 'bar',
        data: {
            labels: buildingStats.map(s => s.name),
            datasets: [{ label: '參與率 (%)', data: buildingStats.map(s => s.rate), backgroundColor: 'rgba(79, 70, 229, 0.8)' }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 100 } }, indexAxis: 'y' }
    });
};

const generatePersonnelReport = () => {
    const term = personnelSearchTerm.value.trim().toLowerCase();
    if (!term) return uiStore.showMessage('請輸入人員學號、卡號或姓名', 'info');
    
    const person = dataStore.personnel.find(p => p.code.toLowerCase() === term || p.name.toLowerCase() === term || String(p.card_number) === term);
    
    if (!person) {
        personnelReportData.value = null;
        return uiStore.showMessage('找不到該人員', 'error');
    }
    
    const recordsForPerson = rawData.value.filter(r => r.personnel_id === person.id);
    const attendedEvents = new Set(recordsForPerson.map(r => r.event_id));
    const totalEventsInScope = new Set(rawData.value.map(r => r.event_id));
    
    personnelReportData.value = {
        person: person,
        records: recordsForPerson.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)),
        stats: {
            checkInCount: recordsForPerson.filter(r => r.action_type === '簽到').length,
            checkOutCount: recordsForPerson.filter(r => r.action_type === '簽退').length,
            onTimeCount: recordsForPerson.filter(r => r.status === '準時').length,
            lateCount: recordsForPerson.filter(r => r.status === '遲到').length,
            attendanceRate: totalEventsInScope.size > 0 ? (attendedEvents.size / totalEventsInScope.size) * 100 : 0,
        }
    };
};

const getStatusClass = (status) => {
    switch (status) {
        case '準時': return 'bg-green-100 text-green-800';
        case '遲到': return 'bg-yellow-100 text-yellow-800';
        default: return 'bg-blue-100 text-blue-800';
    }
};

const exportReportData = () => {
    if (!filteredActivityStats.value || filteredActivityStats.value.length === 0) {
        return uiStore.showMessage('沒有可匯出的數據', 'info');
    }
    
    let csvContent = '活動名稱,活動日期,應到,簽到,簽退,未簽退,未到,參與率(%),準時率(%)\n';
    filteredActivityStats.value.forEach(act => {
        const row = [
            `"${act.name}"`,
            formatDate(new Date(act.start_time)),
            act.shouldAttendCount,
            act.attendedCount,
            act.checkOutCount,
            act.notCheckedOutCount,
            act.absentCount,
            act.attendanceRate.toFixed(1),
            act.onTimeRate.toFixed(1)
        ].join(',');
        csvContent += row + '\n';
    });
    
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `活動報表_${formatDate(new Date())}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    uiStore.showMessage('報表已匯出', 'success');
};

</script>

<style scoped>
.report-tab {
    cursor: pointer;
    transition: all 0.3s ease;
    border-bottom: 3px solid transparent;
    padding: 1rem 0.25rem;
    font-size: 0.875rem; /* text-sm */
    font-weight: 500; /* font-medium */
    white-space: nowrap;
}
.report-tab.active {
    border-color: #4f46e5; /* primary-color */
    color: #4f46e5;
    font-weight: 600;
}
</style>
