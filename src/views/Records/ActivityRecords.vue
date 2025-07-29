<template>
  <div class="bg-white rounded-xl shadow-lg p-6 border border-indigo-200">
    <h2 class="text-3xl font-bold text-indigo-800 mb-6">活動報到記錄</h2>
    
    <!-- Filters -->
    <div class="mb-6 flex flex-col sm:flex-row items-start sm:items-end gap-4">
      <div class="w-full sm:w-auto flex-grow">
        <label for="eventSelector" class="block text-gray-700 font-medium mb-2">選擇活動</label>
        <select v-model="selectedEventId" @change="loadRecords" class="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-400">
          <option :value="null">-- 請選擇一個活動 --</option>
          <option v-for="event in dataStore.events" :key="event.id" :value="event.id">
            {{ event.name }} ({{ formatDateTime(event.start_time, 'yyyy-MM-dd') }})
          </option>
        </select>
      </div>
      <div class="w-full sm:w-auto">
        <label for="activityRecordsPerPage" class="block text-gray-700 font-medium mb-2">每頁筆數</label>
        <select v-model="pagination.pageSize" class="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-400">
          <option value="10">10</option>
          <option value="25">25</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </select>
      </div>
    </div>

    <!-- Records Table Container -->
    <div v-if="isLoading" class="py-12 text-center text-gray-500">
      <p>正在載入記錄...</p>
    </div>
    <div v-else-if="selectedEventId && groupedRecords.length > 0">
      <div class="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3">
          <h3 class="text-2xl font-bold text-gray-800">{{ selectedEventName }} ({{ groupedRecords.length }} 人)</h3>
          <div class="flex gap-3 w-full sm:w-auto">
            <button v-if="selectedPersonnel.length > 0" @click="confirmBatchDelete" class="w-1/2 sm:w-auto bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition shadow-sm">
              批次刪除 ({{ selectedPersonnel.length }})
            </button>
            <button @click="exportToCSV" class="w-1/2 sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded-lg transition shadow-sm">
              匯出 CSV
            </button>
          </div>
      </div>
       <div class="overflow-x-auto table-responsive">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left w-12"><input type="checkbox" v-model="selectAll" class="h-4 w-4 text-indigo-600 rounded"></th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">學號</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">姓名</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">簽到時間</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">簽退時間</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">狀態</th>
                <th class="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-100">
              <!-- [MODIFIED] Added data-label attributes for responsive view -->
              <tr v-for="record in paginatedRecords" :key="record.personnelId" class="hover:bg-gray-50">
                <td data-label="選取" class="px-6 py-4"><input type="checkbox" v-model="selectedPersonnel" :value="record.personnelId" class="h-4 w-4 text-indigo-600 rounded"></td>
                <td data-label="學號" class="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{{ record.code }}</td>
                <td data-label="姓名" class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ record.name }}</td>
                <td data-label="簽到時間" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ record.checkInTime ? formatDateTime(record.checkInTime) : '—' }}</td>
                <td data-label="簽退時間" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ record.checkOutTime ? formatDateTime(record.checkOutTime) : '—' }}</td>
                <td data-label="狀態" class="px-6 py-4 whitespace-nowrap"><span class="status-badge" :class="record.statusClass">{{ record.statusText }}</span></td>
                <td data-label="操作" class="px-6 py-4 whitespace-nowrap text-right">
                  <button @click="confirmSingleDelete(record)" class="text-red-600 hover:text-red-800 text-sm font-medium">刪除</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- Pagination Controls -->
         <div class="flex justify-center items-center space-x-4 p-4 text-sm" v-if="pagination.totalPages > 1">
          <button @click="pagination.currentPage--" :disabled="pagination.currentPage === 1" class="px-3 py-1 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed">上一頁</button>
          <span>第 {{ pagination.currentPage }} / {{ pagination.totalPages }} 頁</span>
          <button @click="pagination.currentPage++" :disabled="pagination.currentPage === pagination.totalPages" class="px-3 py-1 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed">下一頁</button>
        </div>
    </div>
    <div v-else class="py-12 text-center text-gray-500">
      <p v-if="!selectedEventId">請選擇一個活動以檢視其報到記錄。</p>
      <p v-else>此活動目前沒有任何報到記錄。</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useUiStore } from '@/store/ui';
import { useDataStore } from '@/store/data';
import * as api from '@/services/api';
import { formatDateTime } from '@/utils';

const uiStore = useUiStore();
const dataStore = useDataStore();

const isLoading = ref(false);
const selectedEventId = ref(null);
const allRecordsForEvent = ref([]);
const groupedRecords = ref([]);
const selectedPersonnel = ref([]);
const pagination = ref({ currentPage: 1, pageSize: 10, totalPages: 1 });

onMounted(async () => {
  if (dataStore.events.length === 0) {
      await dataStore.fetchEvents();
  }
  if (dataStore.personnel.length === 0) {
      await dataStore.fetchAllPersonnel();
  }
});

const selectedEventName = computed(() => {
    const event = dataStore.events.find(e => e.id === selectedEventId.value);
    return event ? event.name : '';
});

const paginatedRecords = computed(() => {
  const start = (pagination.value.currentPage - 1) * pagination.value.pageSize;
  const end = start + pagination.value.pageSize;
  return groupedRecords.value.slice(start, end);
});

const selectAll = computed({
  get: () => groupedRecords.value.length > 0 && selectedPersonnel.value.length === groupedRecords.value.length,
  set: (value) => {
    selectedPersonnel.value = value ? groupedRecords.value.map(r => r.personnelId) : [];
  },
});

watch(allRecordsForEvent, (newRecords) => {
    const personnelMap = new Map(dataStore.personnel.map(p => [p.id, p]));
    const recordsByPerson = {};

    newRecords.forEach(rec => {
        if (!rec.personnel_id) return;

        if (!recordsByPerson[rec.personnel_id]) {
            const personInfo = personnelMap.get(rec.personnel_id);
            recordsByPerson[rec.personnel_id] = {
                personnelId: rec.personnel_id,
                name: personInfo?.name || rec.name_at_checkin,
                code: personInfo?.code || rec.input,
                allRecordIds: [],
            };
        }
        recordsByPerson[rec.personnel_id].allRecordIds.push(rec.id);
        if (rec.action_type === '簽到') {
            recordsByPerson[rec.personnel_id].checkInTime = rec.created_at;
            recordsByPerson[rec.personnel_id].checkInStatus = rec.status;
        } else if (rec.action_type === '簽退') {
            recordsByPerson[rec.personnel_id].checkOutTime = rec.created_at;
        }
    });

    groupedRecords.value = Object.values(recordsByPerson).map(p => {
        const hasCheckedIn = !!p.checkInTime;
        const hasCheckedOut = !!p.checkOutTime;
        let statusText = '';
        let statusClass = 'bg-gray-100 text-gray-800';

        if (!hasCheckedIn) {
            statusText = '未簽到';
            statusClass = 'bg-red-100 text-red-800';
        } else if (hasCheckedIn && !hasCheckedOut) {
            statusText = `已簽到 (${p.checkInStatus}) / 未簽退`;
            statusClass = 'bg-yellow-100 text-yellow-800';
        } else {
            statusText = '已完成';
            statusClass = 'bg-green-100 text-green-800';
        }
        
        p.statusText = statusText;
        p.statusClass = statusClass;
        return p;
    });

    pagination.value.currentPage = 1;
    pagination.value.totalPages = Math.ceil(groupedRecords.value.length / pagination.value.pageSize);
});

watch(() => pagination.value.pageSize, () => {
    pagination.value.currentPage = 1;
    pagination.value.totalPages = Math.ceil(groupedRecords.value.length / pagination.value.pageSize);
});

const loadRecords = async () => {
  if (!selectedEventId.value) {
    allRecordsForEvent.value = [];
    groupedRecords.value = [];
    return;
  }
  isLoading.value = true;
  uiStore.setLoading(true);
  try {
    allRecordsForEvent.value = await api.fetchRecordsByEventId(selectedEventId.value);
  } catch (error) {
    uiStore.showMessage(`讀取活動記錄失敗: ${error.message}`, 'error');
  } finally {
    isLoading.value = false;
    uiStore.setLoading(false);
  }
};

const confirmSingleDelete = (record) => {
    if (confirm(`確定要刪除 ${record.name} 的所有相關報到記錄嗎？此操作無法復原。`)) {
        deletePersonnelRecords([record.personnelId]);
    }
};

const confirmBatchDelete = () => {
    if (confirm(`確定要刪除選取的 ${selectedPersonnel.value.length} 位人員的所有相關報到記錄嗎？此操作無法復原。`)) {
        deletePersonnelRecords(selectedPersonnel.value);
    }
};

const deletePersonnelRecords = async (personnelIds) => {
    const recordIdsToDelete = allRecordsForEvent.value
        .filter(rec => personnelIds.includes(rec.personnel_id))
        .map(rec => rec.id);

    if (recordIdsToDelete.length === 0) return;

    uiStore.setLoading(true);
    try {
        await api.batchDeleteRecords(recordIdsToDelete);
        uiStore.showMessage('刪除成功', 'success');
        selectedPersonnel.value = [];
        loadRecords();
    } catch (error) {
        uiStore.showMessage(`刪除失敗: ${error.message}`, 'error');
    } finally {
        uiStore.setLoading(false);
    }
};

const exportToCSV = () => {
    if (groupedRecords.value.length === 0) {
        uiStore.showMessage('沒有可匯出的資料。', 'info');
        return;
    }
    let csvContent = '學號,姓名,簽到時間,簽退時間,狀態\n';
    groupedRecords.value.forEach(r => {
        const checkIn = r.checkInTime ? `"${formatDateTime(r.checkInTime)}"` : '""';
        const checkOut = r.checkOutTime ? `"${formatDateTime(r.checkOutTime)}"` : '""';
        csvContent += `"${r.code}","${r.name}",${checkIn},${checkOut},"${r.statusText}"\n`;
    });
    
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `活動記錄_${selectedEventName.value}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
};
</script>
