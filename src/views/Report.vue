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
    <div v-if="isLoading" class="text-center py-16 text-gray-500 bg-white rounded-xl shadow-lg">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto mb-4"></div>
      <p>正在載入報表數據...</p>
    </div>
    <div v-else>
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
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6" id="personnelReportStats">
                    <div class="bg-gray-50 p-4 rounded-lg text-center"><p class="text-sm text-gray-500">簽到次數</p><p class="text-2xl font-bold text-gray-900">{{ personnelReportData.stats.checkInCount }}</p></div>
                    <div class="bg-gray-50 p-4 rounded-lg text-center"><p class="text-sm text-gray-500">簽退次數</p><p class="text-2xl font-bold text-gray-900">{{ personnelReportData.stats.checkOutCount }}</p></div>
                    <div class="bg-gray-50 p-4 rounded-lg text-center"><p class="text-sm text-gray-500">參與活動數</p><p class="text-2xl font-bold text-gray-900">{{ personnelReportData.stats.attendedEventsCount }}</p></div>
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
import { createSummaryCard } from '@/utils/index'; // 確保正確導入

// Store 初始化
const uiStore = useUiStore();
const dataStore = useDataStore();
const authStore = useAuthStore();

// 組件狀態
const isLoading = ref(true); // 控制頁面載入狀態
const activeTab = ref('participation'); // 當前活躍的報表頁籤
const startDate = ref(''); // 日期篩選器的開始日期
const endDate = ref(''); // 日期篩選器的結束日期
const activityFilter = ref('all'); // 活動篩選器 (all 或 eventId)
const buildingFilter = ref('all'); // 棟別篩選器 (all 或 buildingName)
const personnelSearchTerm = ref(''); // 人員搜尋詞
const personnelReportData = ref(null); // 特定人員的報表數據

// 原始和處理後的數據
const rawData = ref([]); // 從 API 獲取的所有原始記錄
const processedReportStats = ref(null); // 處理後的報表統計數據

// Chart.js 圖表實例引用
const chartInstances = {
    attendanceTrend: null,
    attendancePie: null,
    attendanceStatusPie: null,
    buildingAttendance: null,
};

// Canvas 元素引用
const attendanceTrendChartCanvas = ref(null);
const attendancePieChartCanvas = ref(null);
const attendanceStatusPieChartCanvas = ref(null);
const buildingAttendanceChartCanvas = ref(null);

// --- Computed Properties ---

// 過濾後的活動選項 (只有在日期範圍內有記錄的活動)
const eventOptions = computed(() => {
    if (!rawData.value) return [];
    const eventIds = [...new Set(rawData.value.map(r => r.event_id).filter(Boolean))];
    // 確保只返回 dataStore 中存在的活動，並按開始時間降序排序
    return dataStore.events.filter(e => eventIds.includes(e.id)).sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
});

// 過濾後的棟別選項 (只有在人員資料中存在的棟別)
const buildingOptions = computed(() => {
    return [...new Set(dataStore.personnel.map(p => p.building).filter(Boolean))].sort();
});

// 根據活動篩選器和棟別篩選器過濾後的活動統計數據 (用於表格)
const filteredActivityStats = computed(() => {
    if (!processedReportStats.value) return [];
    return processedReportStats.value.activityStats.filter(act => {
        const activityMatch = activityFilter.value === 'all' || act.id === activityFilter.value;
        return activityMatch;
    });
});

// 摘要卡片數據
const summaryCards = computed(() => processedReportStats.value?.summaryCards || []);
// 棟別準時率排名數據
const buildingOnTimeRank = computed(() => processedReportStats.value?.buildingOnTimeRank || []);


// --- Watchers ---

// 監聽日期範圍或篩選條件變化，重新生成報表
watch([startDate, endDate, activityFilter, buildingFilter], () => {
    updateReportView();
});

// 監聽活躍頁籤變化，如果切換到圖表相關頁籤，則重新渲染圖表
watch(activeTab, (newTab) => {
    if (newTab === 'participation' || newTab === 'building') {
        // 使用 nextTick 確保 DOM 元素存在後再渲染圖表
        nextTick(() => {
            renderAllCharts();
        });
    }
});


// --- Methods ---

// 格式化日期為 YYYY-MM-DD
const formatDate = (date) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// 組件掛載時初始化報表頁面
onMounted(() => {
    initializeReport();
});

// 初始化報表頁面
const initializeReport = async () => {
    uiStore.setLoading(true); // 顯示全局載入遮罩
    isLoading.value = true; // 設置頁面載入狀態
    try {
        // 設置預設日期為最近一個月
        const end = new Date();
        const start = new Date();
        start.setMonth(start.getMonth() - 1);
        startDate.value = formatDate(start);
        endDate.value = formatDate(end);

        // 並行載入所有人員和活動數據到 dataStore
        await Promise.all([dataStore.fetchAllPersonnel(), dataStore.fetchEvents()]);
        
        // 更新報表視圖 (會觸發數據獲取和圖表渲染)
        await updateReportView();
    } catch (error) {
        uiStore.showMessage(`初始化報表頁面失敗: ${error.message}`, 'error');
    } finally {
        isLoading.value = false; // 隱藏頁面載入狀態
        uiStore.setLoading(false); // 隱藏全局載入遮罩
    }
};

// 更新整個報表視圖 (核心邏輯)
const updateReportView = async () => {
    if (!startDate.value || !endDate.value) return; // 確保日期已選擇

    // 重新獲取數據前顯示載入狀態
    uiStore.setLoading(true); 
    isLoading.value = true;
    personnelReportData.value = null; // 清空人員報表數據

    try {
        const start = new Date(startDate.value);
        const end = new Date(endDate.value);
        end.setHours(23, 59, 59, 999); // 結束日期設為當天結束

        // 從 API 獲取所有符合日期範圍的記錄
        rawData.value = await api.fetchRecordsByDateRange(start, end);
        
        // 處理原始數據，生成各種統計結果 (這是一個複雜的本地計算)
        // [FIX] 傳遞 dataStore.personnel 和 dataStore.events 的實際值 (.value)
        processedReportStats.value = processReportData(
            rawData.value, 
            dataStore.personnel.value, 
            dataStore.events.value, 
            buildingFilter.value // 傳遞當前棟別篩選值
        );
        
        // 使用 nextTick 確保 DOM 更新完成後再渲染圖表
        await nextTick();
        renderAllCharts(); // 渲染所有圖表
    } catch (error) {
        uiStore.showMessage(`載入報表數據失敗: ${error.message}`, 'error');
        rawData.value = []; // 載入失敗清空數據
        processedReportStats.value = null;
    } finally {
        isLoading.value = false;
        uiStore.setLoading(false);
    }
};

// 處理原始記錄數據，生成各種報表統計
const processReportData = (records, allPersonnel, allEvents, currentBuildingFilter) => {
    const eventGroups = {}; // 按活動 ID 分組記錄
    records.forEach(r => {
        // 【修改點】僅在 personnel_id 存在時才納入統計
        if (!r.event_id || !r.personnel_id) return; 
        if (!eventGroups[r.event_id]) {
            const event = allEvents.find(e => e.id === r.event_id);
            eventGroups[r.event_id] = { 
                eventInfo: event || { id: r.event_id, name: '未知活動', start_time: new Date().toISOString() }, 
                records: [] 
            };
        }
        eventGroups[r.event_id].records.push(r);
    });

    // 計算每個活動的統計數據
    const activityStats = Object.values(eventGroups).map(group => {
        // 過濾出符合當前棟別篩選的人員
        const personnelForEvent = currentBuildingFilter === 'all' ? allPersonnel : allPersonnel.filter(p => p.building === currentBuildingFilter);
        const shouldAttendCount = personnelForEvent.length; // 應到人數

        // 【修改點】簽到記錄過濾：只篩選 action_type 為 '簽到' 且 personnel_id 存在的記錄
        const checkInRecords = group.records.filter(r => r.action_type === '簽到' && r.personnel_id);
        // 【修改點】簽退記錄過濾：只篩選 action_type 為 '簽退' 且 personnel_id 存在的記錄
        const checkOutRecords = group.records.filter(r => r.action_type === '簽退' && r.personnel_id);

        const attendedPersonnelIds = new Set(checkInRecords.map(r => r.personnel_id));
        const attendedCount = attendedPersonnelIds.size; // 簽到人數 (去重)

        const checkedOutPersonnelIds = new Set(checkOutRecords.map(r => r.personnel_id));
        const checkOutCount = checkedOutPersonnelIds.size; // 簽退人數 (去重)
        const notCheckedOutCount = attendedCount - checkOutCount; // 未簽退人數

        const absentCount = shouldAttendCount - attendedCount; // 未到人數

        // 【修改點】準時人數過濾：只篩選 status 為 '準時' 且 personnel_id 存在的簽到記錄
        const onTimePersonnelIds = new Set(checkInRecords.filter(r => r.status === '準時' && r.personnel_id).map(r => r.personnel_id));
        const onTimeCount = onTimePersonnelIds.size; // 準時人數 (去重)
        const lateCount = attendedCount - onTimeCount; // 遲到人數 (去重)
        
        const attendanceRate = shouldAttendCount > 0 ? (attendedCount / shouldAttendCount * 100) : 0;
        const onTimeRate = attendedCount > 0 ? (onTimeCount / attendedCount * 100) : 0;
        
        return {
            ...group.eventInfo,
            shouldAttendCount,
            attendedCount,
            checkOutCount,
            notCheckedOutCount,
            absentCount,
            onTimeCount,
            lateCount,
            attendanceRate: parseFloat(attendanceRate.toFixed(1)),
            onTimeRate: parseFloat(onTimeRate.toFixed(1)),
        };
    }).sort((a, b) => new Date(b.start_time) - new Date(a.start_time)); // 按活動時間降序

    // 計算總體統計數據
    const totalEvents = activityStats.length;
    const totalCheckins = activityStats.reduce((sum, act) => sum + act.attendedCount, 0);
    const totalCheckouts = activityStats.reduce((sum, act) => sum + act.checkOutCount, 0);
    const totalOnTime = activityStats.reduce((sum, act) => sum + act.onTimeCount, 0);
    const overallShouldAttend = activityStats.reduce((sum, act) => sum + act.shouldAttendCount, 0);
    const overallAttendanceRate = overallShouldAttend > 0 ? (totalCheckins / overallShouldAttend * 100) : 0;
    const overallOnTimeRate = totalCheckins > 0 ? (totalOnTime / totalCheckins * 100) : 0;

    // 棟別準時率排名
    const buildings = [...new Set(allPersonnel.map(p => p.building).filter(Boolean))];
    const buildingRank = buildings.map(b => {
        const personnelInBuilding = allPersonnel.filter(p => p.building === b);
        const personnelIdsInBuilding = new Set(personnelInBuilding.map(p => p.id));
        // 【修改點】篩選出 action_type 為 '簽到' 且 personnel_id 存在，且屬於該棟別的記錄
        const attendedRecords = records.filter(r => r.action_type === '簽到' && r.personnel_id && personnelIdsInBuilding.has(r.personnel_id));
        
        // 【修改點】準時人數過濾：只篩選 status 為 '準時' 且 personnel_id 存在的簽到記錄
        const onTimePersonnelIds = new Set(attendedRecords.filter(r => r.status === '準時' && r.personnel_id).map(r => r.personnel_id));
        const onTimeCount = onTimePersonnelIds.size;
        
        const totalAttendedInBuilding = new Set(attendedRecords.map(r => r.personnel_id)).size; // 該棟別實際簽到的人數
        const rate = totalAttendedInBuilding > 0 ? (onTimeCount / totalAttendedInBuilding) * 100 : 0;
        return { name: b, rate };
    }).sort((a, b) => b.rate - a.rate); // 按準時率降序

    return {
        summaryCards: [
            { title: '總活動數', html: createSummaryCard('總活動數', totalEvents.toLocaleString(), 'calendar') },
            { title: '總簽到人次', html: createSummaryCard('總簽到人次', totalCheckins.toLocaleString(), 'check-square') },
            { title: '總簽退人次', html: createSummaryCard('總簽退人次', totalCheckouts.toLocaleString(), 'user-minus') },
            { title: '總體參與率', html: createSummaryCard('總體參與率', `${overallAttendanceRate.toFixed(1)}%`, 'pie-chart') },
            { title: '準時率', html: createSummaryCard('準時率 (基於已簽到)', `${overallOnTimeRate.toFixed(1)}%`, 'clock') }
        ],
        activityStats: activityStats,
        buildingOnTimeRank: buildingRank,
    };
};

// 銷毀 Chart.js 實例的輔助函數
const destroyChart = (instanceRef) => {
    if (instanceRef) {
        instanceRef.destroy();
        instanceRef = null;
    }
};

// 渲染所有圖表 (確保在 DOM 準備好後調用)
const renderAllCharts = () => {
    if (!processedReportStats.value) return;
    
    // [FIX] 增加防禦性檢查，確保解構的變數即使在 processedReportStats.value 中不存在也能 fallback 到空陣列
    const activityStatsData = processedReportStats.value.activityStats || [];
    const buildingOnTimeRankData = processedReportStats.value.buildingOnTimeRank || [];

    renderAttendanceTrendChart(activityStatsData);
    renderAttendancePieChart(activityStatsData);
    renderAttendanceStatusPieChart(activityStatsData);
    renderBuildingAttendanceChart(buildingOnTimeRankData); 
};

// 渲染活動參與趨勢折線圖
const renderAttendanceTrendChart = (activityStats) => {
    destroyChart(chartInstances.attendanceTrend);
    if (!attendanceTrendChartCanvas.value) return;
    
    chartInstances.attendanceTrend = new Chart(attendanceTrendChartCanvas.value, { 
        type: 'line',
        data: {
            labels: activityStats.map(a => a.name).reverse(), // 圖表名稱反轉，讓最近的活動在右邊
            datasets: [
                { label: '應到人數', data: activityStats.map(a => a.shouldAttendCount).reverse(), borderColor: 'rgba(107, 114, 128, 1)', borderDash: [5, 5], fill: false, tension: 0.3 },
                { label: '簽到人次', data: activityStats.map(a => a.attendedCount).reverse(), borderColor: 'rgba(79, 70, 229, 1)', backgroundColor: 'rgba(79, 70, 229, 0.2)', fill: true, tension: 0.3 },
                { label: '簽退人次', data: activityStats.map(a => a.checkOutCount).reverse(), borderColor: 'rgba(245, 158, 11, 1)', backgroundColor: 'rgba(245, 158, 11, 0.2)', fill: true, tension: 0.3 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
    });
};

// 渲染簽到狀態(準時/遲到)分佈圓餅圖
const renderAttendancePieChart = (activityStats) => {
    destroyChart(chartInstances.attendancePie);
    if (!attendancePieChartCanvas.value) return;
    const totalOnTime = activityStats.reduce((sum, act) => sum + act.onTimeCount, 0);
    const totalLate = activityStats.reduce((sum, act) => sum + act.lateCount, 0);
    
    chartInstances.attendancePie = new Chart(attendancePieChartCanvas.value, {
        type: 'doughnut',
        data: {
            labels: ['準時', '遲到'],
            datasets: [{ data: [totalOnTime, totalLate], backgroundColor: ['#10B981', '#F59E0B'], borderColor: '#FFFFFF', borderWidth: 1 }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
};

// 渲染出席狀態(已簽退/未簽退/未到)分佈圓餅圖
const renderAttendanceStatusPieChart = (activityStats) => {
    destroyChart(chartInstances.attendanceStatusPie);
    if (!attendanceStatusPieChartCanvas.value) return;
    const totalCheckedOut = activityStats.reduce((sum, act) => sum + act.checkOutCount, 0);
    const totalNotCheckedOut = activityStats.reduce((sum, act) => sum + act.notCheckedOutCount, 0);
    const totalAbsent = activityStats.reduce((sum, act) => sum + act.absentCount, 0);
    
    chartInstances.attendanceStatusPie = new Chart(attendanceStatusPieChartCanvas.value, {
        type: 'doughnut',
        data: {
            labels: ['已簽退', '未簽退', '未到'],
            datasets: [{ data: [totalCheckedOut, totalNotCheckedOut, totalAbsent], backgroundColor: ['#3B82F6', '#FBBF24', '#6B7280'], borderColor: '#FFFFFF', borderWidth: 1 }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
};

// 渲染棟別活動參與率比較長條圖
const renderBuildingAttendanceChart = (buildingRank) => {
    destroyChart(chartInstances.buildingAttendance);
    if (!buildingAttendanceChartCanvas.value) return;
    
    chartInstances.buildingAttendance = new Chart(buildingAttendanceChartCanvas.value, {
        type: 'bar',
        data: {
            labels: buildingRank.map(s => s.name),
            datasets: [{ label: '準時率 (%)', data: buildingRank.map(s => s.rate), backgroundColor: 'rgba(79, 70, 229, 0.8)' }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            scales: { y: { beginAtZero: true, max: 100 } }, 
            indexAxis: 'y' // 橫向條形圖
        }
    });
};

// 生成並顯示單一個人的人員報表
const generatePersonnelReport = async () => {
    const term = personnelSearchTerm.value.trim().toLowerCase();
    if (!term) {
        uiStore.showMessage('請輸入人員學號、卡號或姓名', 'info');
        personnelReportData.value = null;
        return;
    }
    
    // 檢查是否為 sdsc 角色，如果是則不允許查看人員活動參與報表
    if (!authStore.hasPermission('reports:personnel')) {
        uiStore.showMessage('您沒有權限查看人員活動參與報表。', 'error');
        personnelReportData.value = null;
        return;
    }

    uiStore.setLoading(true); // 顯示載入遮罩
    try {
        const person = dataStore.personnel.find(p => 
            p.code.toLowerCase() === term || 
            p.name.toLowerCase() === term ||
            String(p.card_number) === term
        );
        
        if (!person) {
            personnelReportData.value = null;
            uiStore.showMessage('找不到該人員', 'error');
            return;
        }
        
        // 過濾出該人員在當前日期範圍內的所有記錄
        // 【修改點】人員報表記錄過濾：只篩選 personnel_id 存在的記錄
        const recordsForPerson = rawData.value.filter(r => r.personnel_id === person.id && r.personnel_id);
        
        // 【修改點】簽到次數過濾：只篩選 action_type 為 '簽到' 且 personnel_id 存在的記錄
        const checkInCount = recordsForPerson.filter(r => r.action_type === '簽到' && r.personnel_id).length;
        // 【修改點】簽退次數過濾：只篩選 action_type 為 '簽退' 且 personnel_id 存在的記錄
        const checkOutCount = recordsForPerson.filter(r => r.action_type === '簽退' && r.personnel_id).length;
        // 【修改點】準時次數過濾：只篩選 status 為 '準時' 且 personnel_id 存在的簽到記錄
        const onTimeCount = recordsForPerson.filter(r => r.status === '準時' && r.action_type === '簽到' && r.personnel_id).length;
        // 【修改點】遲到次數過濾：只篩選 status 為 '遲到' 且 personnel_id 存在的簽到記錄
        const lateCount = recordsForPerson.filter(r => r.status === '遲到' && r.action_type === '簽到' && r.personnel_id).length;
        
        // 【修改點】參與活動數過濾：只篩選 event_id 和 personnel_id 存在的記錄
        const participatedEvents = new Set(recordsForPerson.filter(r => r.event_id && r.personnel_id).map(r => r.event_id));
        const attendedEventsCount = participatedEvents.size;

        personnelReportData.value = {
            person: person,
            records: recordsForPerson.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)), // 最近的記錄在前
            stats: {
                checkInCount: checkInCount,
                checkOutCount: checkOutCount,
                onTimeCount: onTimeCount,
                lateCount: lateCount,
                attendedEventsCount: attendedEventsCount, // 參與活動的數量
            }
        };
    } catch (error) {
        uiStore.showMessage(`生成人員報表失敗: ${error.message}`, 'error');
        personnelReportData.value = null;
    } finally {
        uiStore.setLoading(false); // 隱藏載入遮罩
    }
};

// 根據簽到狀態返回對應的 Tailwind CSS 類別
const getStatusClass = (status) => {
    if (status && status.includes('準時')) return 'bg-green-100 text-green-800';
    if (status && status.includes('遲到')) return 'bg-yellow-100 text-yellow-800';
    if (status && status.includes('成功')) return 'bg-blue-100 text-blue-800';
    if (status && status.includes('失敗')) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
};

// 將目前篩選的報表數據匯出為 CSV/Excel
const exportReportData = () => {
    if (!processedReportStats.value || processedReportStats.value.activityStats.length === 0) {
        return uiStore.showMessage('沒有可匯出的數據', 'info');
    }
    
    let csvContent = '活動名稱,活動日期,應到,簽到,簽退,未簽退,未到,參與率(%),準時率(%)\n';
    processedReportStats.value.activityStats.forEach(act => {
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
    URL.revokeObjectURL(link.href);
    uiStore.showMessage('報表已匯出', 'success');
};
</script>

<style scoped>
/* 數據表格樣式 */
.data-grid {
    border-collapse: collapse;
    width: 100%;
}
.data-grid th, .data-grid td {
    padding: 12px 16px;
    text-align: left;
    border-bottom: 1px solid #e5e7eb;
}
.data-grid th {
    background-color: #f9fafb;
    font-weight: 600;
    font-size: 0.75rem;
    text-transform: uppercase;
    color: #6b7280; /* gray-500 */
}
.data-grid tbody tr:hover {
    background-color: #f9fafb;
}

/* RWD 表格樣式 (手機版卡片式) - 定義在 main.css 中，這裡不需要重複 */

/* 確保圖表容器高度，以便 Chart.js 可以渲染 */
.h-72 { height: 18rem; } /* 288px */
.h-96 { height: 24rem; } /* 384px */

/* [MODIFIED] 手機版日期範圍和按鈕佈局 - 已經在 main.css 中，這裡不需要重複 */
</style>
