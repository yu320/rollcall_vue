<template>
  <div class="space-y-8">
    <!-- Daily Records Section -->
    <div class="bg-white rounded-xl shadow-lg p-6 border border-indigo-200">
      <h2 class="text-3xl font-bold text-indigo-800 mb-6">每日報到記錄</h2>
      
      <!-- Filters and Actions -->
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
           <button v-if="selectedRecords.length > 0" @click="confirmBatchDelete" class="w-1/2 sm:w-auto bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition shadow-sm">
              批次刪除 ({{ selectedRecords.length }})
            </button>
            <button @click="exportToCSV" class="w-1/2 sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded-lg transition shadow-sm">
              匯出 CSV
            </button>
        </div>
      </div>

      <!-- Records Table Container -->
      <div v-if="isLoading" class="py-12 text-center text-gray-500">
        <p>正在載入 {{ selectedDate }} 的記錄...</p>
      </div>
      <div v-else-if="records.length > 0">
        <h3 class="text-2xl font-bold text-gray-800 mb-4">{{ selectedDate }} 記錄 ({{ records.length }} 筆)</h3>
        <div class="overflow-x-auto table-responsive">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left w-12"><input type="checkbox" v-model="selectAll" class="h-4 w-4 text-indigo-600 rounded"></th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">時間</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">姓名</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">學號/卡號</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">類型</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">狀態</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">關聯活動</th>
                <th class="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-100">
              <tr v-for="record in paginatedRecords" :key="record.id" class="hover:bg-gray-50">
                <td data-label="選取" class="px-6 py-4"><input type="checkbox" v-model="selectedRecords" :value="record.id"></td>
                <td data-label="時間" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ new Date(record.created_at).toLocaleTimeString('zh-TW') }}</td>
                <td data-label="姓名" class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ record.name_at_checkin || '—' }}</td>
                <td data-label="學號/卡號" class="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{{ record.input }}</td>
                <td data-label="類型" class="px-6 py-4 whitespace-nowrap"><span class="type-badge" :data-type="record.action_type">{{ record.action_type }}</span></td>
                <td data-label="狀態" class="px-6 py-4 whitespace-nowrap"><span class="status-badge" :data-status="record.status">{{ record.status }}</span></td>
                <td data-label="活動" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ record.events?.name || '—' }}</td>
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
        <p>在 {{ selectedDate }} 這天沒有任何報到記錄。</p>
      </div>
    </div>

    <!-- Saved Dates Section -->
    <div class="bg-white rounded-xl shadow-lg p-6 border border-indigo-200">
      <h3 class="text-2xl font-bold text-gray-800 mb-4">快速選擇日期</h3>
      <div v-if="isDatesLoading" class="text-center py-8 text-gray-500">正在載入日期列表...</div>
      <div v-else-if="savedDates.length > 0" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <button v-for="date in savedDates" :key="date.date" @click="selectSavedDate(date.date)" 
                :class="['text-left p-3 rounded-lg transition', selectedDate === date.date ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 hover:bg-gray-200']">
          <span class="font-semibold">{{ date.date }}</span>
          <span class="text-xs block">{{ date.total }} 筆記錄</span>
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
import * as api from '@/services/api';
import { format, parseISO } from 'date-fns';

const uiStore = useUiStore();

const isLoading = ref(true);
const isDatesLoading = ref(true);

const today = new Date().toISOString().split('T')[0];
const selectedDate = ref(today);
const records = ref([]);
const savedDates = ref([]);
const selectedRecords = ref([]);
const pagination = ref({
  currentPage: 1,
  pageSize: 25, // Default to a more common value
  totalPages: 1,
});

// Use a single utility for formatting
const formatDate = (dateInput) => format(parseISO(dateInput), 'yyyy-MM-dd');

const loadRecords = async () => {
  if (!selectedDate.value) return;
  isLoading.value = true;
  uiStore.setLoading(true);
  try {
    records.value = await api.fetchRecordsByDate(selectedDate.value);
  } catch (error) {
    records.value = []; // Clear records on error
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
        const statsMap = dateStats.reduce((acc, record) => {
            const dateStr = formatDate(record.created_at);
            if (!acc[dateStr]) {
                acc[dateStr] = { date: dateStr, total: 0 };
            }
            acc[dateStr].total++;
            return acc;
        }, {});
        savedDates.value = Object.values(statsMap).sort((a, b) => b.date.localeCompare(a.date));
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

const selectSavedDate = (date) => {
  selectedDate.value = date;
};

// --- Watchers for automatic updates ---
watch(selectedDate, (newDate) => {
    if (newDate) loadRecords();
});

watch(() => records.value, (newRecords) => {
  pagination.value.currentPage = 1;
  pagination.value.totalPages = Math.ceil(newRecords.length / pagination.value.pageSize);
});

watch(() => pagination.value.pageSize, () => {
    pagination.value.currentPage = 1;
    pagination.value.totalPages = Math.ceil(records.value.length / pagination.value.pageSize);
});


// --- Computed Properties ---
const paginatedRecords = computed(() => {
  const start = (pagination.value.currentPage - 1) * pagination.value.pageSize;
  const end = start + pagination.value.pageSize;
  return records.value.slice(start, end);
});

const selectAll = computed({
  get: () => records.value.length > 0 && selectedRecords.value.length === records.value.length,
  set: (value) => {
    selectedRecords.value = value ? records.value.map(r => r.id) : [];
  },
});


// --- Actions ---
const confirmSingleDelete = (record) => {
  if (confirm(`確定要刪除這筆在 ${new Date(record.created_at).toLocaleString('zh-TW')} 由 ${record.name_at_checkin} 執行的記錄嗎？`)) {
    deleteRecords([record.id]);
  }
};

const confirmBatchDelete = () => {
  if (confirm(`確定要刪除選取的 ${selectedRecords.value.length} 筆記錄嗎？此操作無法復原。`)) {
    deleteRecords(selectedRecords.value);
  }
};

const deleteRecords = async (ids) => {
  uiStore.setLoading(true);
  try {
    await api.batchDeleteRecords(ids);
    uiStore.showMessage('刪除成功', 'success');
    selectedRecords.value = [];
    await loadRecords(); // Reload current date's records
    await fetchSavedDates(); // Refresh the date list in case a date becomes empty
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
  let csvContent = '日期,時間,姓名,學號/卡號,類型,狀態,關聯活動\n';
  records.value.forEach(r => {
    const recordDate = formatDate(r.created_at);
    const recordTime = new Date(r.created_at).toLocaleTimeString('zh-TW', { hour12: false });
    const row = [
        recordDate,
        recordTime,
        `"${r.name_at_checkin || ''}"`,
        `"${r.input}"`,
        r.action_type,
        r.status,
        `"${r.events?.name || ''}"`
    ].join(',');
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
