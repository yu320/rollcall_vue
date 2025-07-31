<template>
  <div class="space-y-8">
    <div class="bg-white rounded-xl shadow-lg p-6 border border-indigo-200">
      <h2 class="text-3xl font-bold text-indigo-800 mb-6">每日報到記錄</h2>
      
      <div class="mb-6 flex flex-col sm:flex-row items-start sm:items-end gap-4">
        <div class="w-full sm:w-auto flex-grow">
          <label for="dailyRecordDate" class="block text-gray-700 font-medium mb-2">選擇日期</label>
          <input type="date" v-model="selectedDate" class="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-400">
        </div>
        <div class="w-full sm:w-auto">
          <label for="dailyRecordsPerPage" class="block text-gray-700 font-medium mb-2">每頁筆數</label>
          <select v-model="pagination.pageSize" class="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-400">
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>
        <div class="w-full sm:w-auto flex gap-3">
           <button v-if="selectedRecords.length > 0" @click="confirmBatchDelete" class="w-1/2 sm:w-auto bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition shadow-sm flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clip-rule="evenodd" /></svg>
              批次刪除 ({{ selectedRecords.length }})
            </button>
            <button @click="exportToCSV" class="w-1/2 sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded-lg transition shadow-sm flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              匯出 CSV
            </button>
        </div>
      </div>

      <div v-if="isLoading" class="py-12 text-center text-gray-500">
        <p>正在載入 {{ selectedDate }} 的記錄...</p>
      </div>
      <div v-else-if="records.length > 0">
        <h3 class="text-2xl font-bold text-gray-800 mb-4">{{ selectedDate }} 記錄 ({{ records.length }} 筆)</h3>
        <div class="overflow-x-auto table-responsive">
          <table class="min-w-[1024px] w-full table-fixed divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="w-16 px-6 py-3 text-left"><input type="checkbox" v-model="selectAll" class="h-4 w-4 text-indigo-600 rounded"></th>
                <th class="w-24 px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">時間</th>
                <th class="w-32 px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">姓名</th>
                <th class="w-32 px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">學號/卡號</th>
                <th class="w-28 px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">類型</th>
                <th class="w-32 px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">狀態</th>
                <th class="w-40 px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">關聯活動</th>
                <th class="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">裝置ID</th>
                <th class="w-20 px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-100">
              <tr v-for="record in paginatedRecords" :key="record.id" class="hover:bg-gray-50">
                <td data-label="選取" class="px-6 py-4"><input type="checkbox" v-model="selectedRecords" :value="record.id" :disabled="!canModifyRecords"></td>
                <td data-label="時間" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{{ formatDateTime(record.created_at, 'HH:mm:ss') }}</td>
                <td data-label="姓名" class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ record.name_at_checkin || '—' }}</td>
                <td data-label="學號/卡號" class="px-6 py-4 whitespace-nowrap text-sm text-gray-800 text-center">
                  <span :class="dataStore.getInputColorClass(record.input)" class="font-semibold">{{ record.input }}</span>
                </td>
                <td data-label="類型" class="px-6 py-4 whitespace-nowrap text-center">
                  <span class="type-badge" :data-type="record.action_type">{{ record.action_type }}</span>
                </td>
                <td data-label="狀態" class="px-6 py-4 whitespace-nowrap text-center">
                  <span class="status-badge" :data-status="record.status">{{ record.status }}</span>
                </td>
                <td data-label="活動" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{{ record.events?.name || '—' }}</td>
                <td data-label="裝置ID" class="px-6 py-4 text-sm text-gray-500 text-center">
                  <div class="break-all sm:truncate sm:max-w-[150px] sm:mx-auto">
                    {{ record.device_id || '—' }}
                  </div>
                </td>
                <td data-label="操作" class="px-6 py-4 whitespace-nowrap text-right">
                  <button v-if="canModifyRecords" @click="confirmSingleDelete(record)" class="text-red-600 hover:text-red-800 text-sm font-medium p-1 rounded-full hover:bg-red-100">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                  <span v-else class="text-gray-400">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="flex justify-center items-center space-x-4 p-4 text-sm" v-if="pagination.totalPages > 1">
           <button @click="pagination.currentPage--" :disabled="pagination.currentPage === 1" class="px-3 py-1 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed">上一頁</button>
          <span>第 {{ pagination.currentPage }} / {{ pagination.totalPages }} 頁</span>
          <button @click="pagination.currentPage++" :disabled="pagination.currentPage === pagination.totalPages" class="px-3 py-1 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed">下一頁</button>
        </div>
      </div>
      <div v-else class="py-12 text-center text-gray-500">
        <p>在 {{ selectedDate }} 這天沒有任何報到記錄。</p>
      </div>
    </div>

    <div class="bg-white rounded-xl shadow-lg p-6 border border-indigo-200">
      <h3 class="text-2xl font-bold text-gray-800 mb-4">快速選擇日期</h3>
      <div v-if="isDatesLoading" class="text-center py-8 text-gray-500">正在載入日期列表...</div>
      <div v-else-if="savedDates.length > 0" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        <button v-for="date in savedDates" :key="date.date" @click="selectSavedDate(date.date)" 
                :class="['date-card', selectedDate === date.date ? 'date-card-active' : 'date-card-inactive']">
          <span class="font-semibold text-lg">{{ date.date }}</span>
          <span class="text-sm block mt-1">{{ date.total }} 筆記錄</span>
          <span v-if="date.late > 0" class="text-xs block text-yellow-700">({{ date.late }} 遲到)</span>
          <span v-if="date.fail > 0" class="text-xs block text-red-700">({{ date.fail }} 失敗)</span>
        </button>
      </div>
      <div v-else class="py-8 text-center text-gray-500">
        <p>資料庫中尚無任何報到記錄。</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useUiStore } from '@/store/ui';
import { useAuthStore } from '@/store/auth';
import { useDataStore } from '@/store/data';
import * as api from '@/services/api';
import { format, parseISO } from 'date-fns';
import { formatDateTime } from '@/utils';

const uiStore = useUiStore();
const authStore = useAuthStore();
const dataStore = useDataStore();

const isLoading = ref(true);
const isDatesLoading = ref(true);

const today = new Date().toISOString().split('T')[0];
const selectedDate = ref(today);
const records = ref([]);
const savedDates = ref([]);
const selectedRecords = ref([]);
const pagination = ref({
  currentPage: 1,
  pageSize: 25,
  totalPages: 1,
});

const canModifyRecords = computed(() => {
  return authStore.hasPermission('records:delete') || authStore.hasPermission('records:create');
});

const formatDateOnly = (dateInput) => {
    try {
        return format(parseISO(dateInput), 'yyyy-MM-dd');
    } catch (e) {
        return '無效日期';
    }
};

const loadRecords = async () => {
  if (!selectedDate.value) return;
  isLoading.value = true;
  uiStore.setLoading(true);
  try {
    records.value = await api.fetchRecordsByDate(new Date(selectedDate.value));
  } catch (error) {
    records.value = [];
    uiStore.showMessage(`讀取記錄失敗: ${error.message}`, 'error');
  } finally {
    isLoading.value = false;
    uiStore.setLoading(false);
  }
};

const fetchSavedDates = async () => {
    isDatesLoading.value = true;
    try {
        const dateStats = await api.fetchAllSavedDatesWithStats();
        savedDates.value = dateStats.map(stat => ({
            date: formatDateOnly(stat.created_at),
            total: stat.total,
            late: stat.late,
            fail: stat.fail
        })).sort((a, b) => b.date.localeCompare(a.date));
    } catch (error) {
        uiStore.showMessage(`讀取已儲存日期失敗: ${error.message}`, 'error');
    } finally {
        isDatesLoading.value = false;
    }
};

onMounted(() => {
  loadRecords();
  fetchSavedDates();
});

watch(selectedDate, (newDate) => {
    if (newDate) {
      loadRecords();
      selectedRecords.value = [];
    }
});

watch(() => records.value, (newRecords) => {
  pagination.value.currentPage = 1;
  pagination.value.totalPages = Math.ceil(newRecords.length / pagination.value.pageSize);
});

watch(() => pagination.value.pageSize, () => {
    pagination.value.currentPage = 1;
    pagination.value.totalPages = Math.ceil(records.value.length / pagination.value.pageSize);
});

const paginatedRecords = computed(() => {
  const start = (pagination.value.currentPage - 1) * pagination.value.pageSize;
  const end = start + pagination.value.pageSize;
  return records.value.slice(start, end);
});

const selectAll = computed({
  get: () => {
    const selectableRecords = paginatedRecords.value.filter(() => canModifyRecords.value);
    return selectableRecords.length > 0 && selectedRecords.value.length === selectableRecords.length;
  },
  set: (value) => {
    if (value) {
      selectedRecords.value = paginatedRecords.value.filter(() => canModifyRecords.value).map(r => r.id);
    } else {
      selectedRecords.value = [];
    }
  },
});

const selectSavedDate = (date) => {
  selectedDate.value = date;
};

const confirmSingleDelete = (record) => {
  uiStore.showConfirmation(
    '確認刪除記錄',
    `您確定要刪除這筆在 ${formatDateTime(record.created_at)} 由 ${record.name_at_checkin || '未知人員'} 執行的記錄嗎？此操作無法復原。`,
    '刪除',
    'bg-red-600 hover:bg-red-700'
  ).then(() => {
    deleteRecords([record.id]);
  });
};

const confirmBatchDelete = () => {
  if (selectedRecords.value.length === 0) {
      uiStore.showMessage('請至少選擇一筆記錄。', 'info');
      return;
  }
  uiStore.showConfirmation(
    '確認批次刪除記錄',
    `您確定要刪除選取的 ${selectedRecords.value.length} 筆記錄嗎？此操作無法復原。`,
    '刪除',
    'bg-red-600 hover:bg-red-700'
  ).then(() => {
    deleteRecords(selectedRecords.value);
  });
};

const deleteRecords = async (ids) => {
  uiStore.setLoading(true);
  try {
    await api.batchDeleteRecords(ids);
    uiStore.showMessage('刪除成功', 'success');
    selectedRecords.value = [];
    await loadRecords();
    await fetchSavedDates();
  } catch (error) {
    uiStore.showMessage(`刪除失敗: ${error.message}`, 'error');
  } finally {
    uiStore.setLoading(false);
  }
};

const exportToCSV = () => {
  if (records.value.length === 0) {
      uiStore.showMessage('沒有可匯出的資料。', 'info');
      return;
  }
  let csvContent = '日期,時間,姓名,學號/卡號,類型,狀態,關聯活動,裝置ID\n';
  records.value.forEach(r => {
    const recordDate = formatDateOnly(r.created_at);
    const recordTime = formatDateTime(r.created_at, 'HH:mm:ss');
    const row = [
        recordDate,
        recordTime,
        `"${r.name_at_checkin || ''}"`,
        `"${r.input}"`,
        r.action_type,
        r.status,
        `"${r.events?.name || ''}"`,
        `"${r.device_id || ''}"`
    ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
    csvContent += row + '\n';
  });
  
  const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `每日記錄_${selectedDate.value}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};
</script>

<style scoped>
/* 快速選擇日期卡片樣式 */
.date-card {
  @apply p-4 rounded-lg cursor-pointer transition-all duration-200 border-2 text-center flex flex-col justify-between items-center;
  min-height: 120px;
}

.date-card-active {
  @apply bg-indigo-600 border-indigo-600 text-white shadow-md;
}

.date-card-inactive {
  @apply bg-gray-50 hover:bg-gray-100 border-transparent text-gray-800;
}

.date-card span {
  line-height: 1.4;
}

.date-card .text-lg {
  font-weight: 700;
}

.date-card .text-sm {
  color: rgba(255, 255, 255, 0.8); 
}

.date-card-inactive .text-sm {
  color: #6b7280;
}

.date-card-active .text-yellow-700 {
  color: #fcd34d;
}

.date-card-active .text-red-700 {
  color: #f87171;
}
</style>
