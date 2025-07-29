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
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useUiStore } from '@/store/ui';
import { useDataStore } from '@/store/data';
import * as api from '@/services/api';
import { createSummaryCard, formatDateTime } from '@/utils/index';
import { parseISO, isFuture } from 'date-fns';

const uiStore = useUiStore();
const dataStore = useDataStore();
const isLoading = ref(true);

const summaryCards = ref([]);
const recentRecords = ref([]);

onMounted(async () => {
  isLoading.value = true;
  uiStore.setLoading(true);

  try {
    // Parallel fetching
    const [_, __, records] = await Promise.all([
      dataStore.fetchAllPersonnel(),
      dataStore.fetchEvents(),
      api.fetchRecentRecords(24) // Fetch records from the last 24 hours
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
        createSummaryCard('今日簽到人次', checkInToday, 'user-check'),
        createSummaryCard('今日簽退人次', checkOutToday, 'user-minus'),
    ];
};

const upcomingEvents = computed(() => {
    return dataStore.events
        .filter(event => isFuture(parseISO(event.start_time)))
        .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
        .slice(0, 5); // Show top 5 upcoming
});

const getStatusClass = (status) => {
  if (status && status.includes('準時')) return 'bg-green-100 text-green-800';
  if (status && status.includes('遲到')) return 'bg-yellow-100 text-yellow-800';
  if (status && status.includes('失敗')) return 'bg-red-100 text-red-800';
  return 'bg-gray-100 text-gray-800';
};

const getActionTypeClass = (actionType) => {
    if(actionType === '簽到') {
        return { bg: 'bg-blue-100', text: 'text-blue-600' };
    }
    return { bg: 'bg-orange-100', text: 'text-orange-600' };
};

</script>
