<template>
  <div class="space-y-8">
    <!-- Daily Records Section -->
    <div class="bg-white rounded-xl shadow-lg p-6 border border-indigo-200">
      <h2 class="text-3xl font-bold text-indigo-800 mb-6">每日報到記錄</h2>
      
      <!-- Filters and Actions -->
      <div class="mb-6 flex flex-col sm:flex-row items-start sm:items-end gap-3">
        <div class="w-full sm:w-auto">
          <label for="dailyRecordDate" class="block text-gray-700 font-medium mb-2">選擇日期</label>
          <input type="date" v-model="selectedDate" class="w-full px-4 py-2 border border-gray-300 rounded-lg">
        </div>
        <div class="w-full sm:w-auto">
          <label for="dailyRecordsPerPage" class="block text-gray-700 font-medium mb-2">每頁筆數</label>
          <select v-model="pagination.pageSize" class="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white">
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>
        <button @click="loadRecords" class="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-lg shadow-sm">
          載入記錄
        </button>
      </div>

      <!-- Records Table Container -->
      <div v-if="records.length > 0">
        <div class="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3">
          <h3 class="text-2xl font-bold text-gray-800">{{ selectedDate }} 記錄 ({{ records.length }} 筆)</h3>
          <div class="flex gap-3">
            <button v-if="selectedRecords.length > 0" @click="confirmBatchDelete" class="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg">
              批次刪除 ({{ selectedRecords.length }})
            </button>
            <button @click="exportToCSV" class="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded-lg">
              匯出 CSV
            </button>
          </div>
        </div>
        <div class="overflow-x-auto table-responsive">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left"><input type="checkbox" v-model="selectAll"></th>
                <th>時間</th>
                <th>姓名</th>
                <th>學號/卡號</th>
                <th>類型</th>
                <th>狀態</th>
                <th>活動</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-100">
              <tr v-for="record in paginatedRecords" :key="record.id">
                <td data-label="選取" class="px-6 py-4"><input type="checkbox" v-model="selectedRecords" :value="record.id"></td>
                <td data-label="時間">{{ formatDateTime(record.created_at) }}</td>
                <td data-label="姓名">{{ record.name_at_checkin || '-' }}</td>
                <td data-label="學號/卡號">{{ record.input }}</td>
                <td data-label="類型"><span class="type-badge" :data-type="record.action_type">{{ record.action_type }}</span></td>
                <td data-label="狀態"><span class="status-badge" :data-status="record.status">{{ record.status }}</span></td>
                <td data-label="活動">{{ record.events?.name || '-' }}</td>
                <td data-label="操作">
                  <button @click="confirmSingleDelete(record)" class="text-red-600 hover:text-red-800">刪除</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- Pagination Controls -->
        <div class="flex justify-center items-center space-x-2 p-4" v-if="pagination.totalPages > 1">
          <button @click="pagination.currentPage--" :disabled="pagination.currentPage === 1">上一頁</button>
          <span>第 {{ pagination.currentPage }} / {{ pagination.totalPages }} 頁</span>
          <button @click="pagination.currentPage++" :disabled="pagination.currentPage === pagination.totalPages">下一頁</button>
        </div>
      </div>
      <div v-else class="py-12 text-center text-gray-500">
        <p>請選擇日期以查看報到記錄。</p>
      </div>
    </div>

    <!-- Saved Dates Section -->
    <div class="bg-white rounded-xl shadow-lg p-6 border border-indigo-200">
      <h3 class="text-2xl font-bold text-gray-800 mb-4">已儲存的記錄日期</h3>
      <div v-if="savedDates.length > 0" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <button v-for="date in savedDates" :key="date.date" @click="selectSavedDate(date.date)" class="bg-gray-200 hover:bg-gray-300 text-left p-2 rounded-lg">
          <span class="font-semibold text-indigo-700">{{ date.date }}</span>
          <span class="text-xs block text-gray-600">共 {{ date.total }} 筆</span>
        </button>
      </div>
      <div v-else class="py-8 text-center text-gray-500">
        <p>尚無已儲存的報到記錄。</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useUiStore } from '@/store/ui';
import { api } from '@/services/api';
import { format, parseISO } from 'date-fns';

const uiStore = useUiStore();

const today = new Date().toISOString().split('T')[0];
const selectedDate = ref(today);
const records = ref([]);
const savedDates = ref([]);
const selectedRecords = ref([]);
const pagination = ref({
  currentPage: 1,
  pageSize: 10,
  totalPages: 1,
});

const formatDateTime = (isoString) => format(parseISO(isoString), 'yyyy-MM-dd HH:mm:ss');
const formatDate = (isoString) => format(parseISO(isoString), 'yyyy-MM-dd');

const loadRecords = async () => {
  if (!selectedDate.value) return;
  uiStore.setLoading(true);
  try {
    records.value = await api.fetchRecordsByDate(selectedDate.value);
  } catch (error) {
    uiStore.showMessage(`讀取記錄失敗: ${error.message}`, 'error');
  } finally {
    uiStore.setLoading(false);
  }
};

const fetchSavedDates = async () => {
    try {
        const dateStats = await api.fetchAllSavedDatesWithStats();
        // Process to get unique dates with counts
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
    }
};

onMounted(() => {
  loadRecords();
  fetchSavedDates();
});

const selectSavedDate = (date) => {
  selectedDate.value = date;
  loadRecords();
};

// --- Pagination Logic ---
watch(() => records.value, (newRecords) => {
  pagination.value.currentPage = 1;
  pagination.value.totalPages = Math.ceil(newRecords.length / pagination.value.pageSize);
});

const paginatedRecords = computed(() => {
  const start = (pagination.value.currentPage - 1) * pagination.value.pageSize;
  const end = start + pagination.value.pageSize;
  return records.value.slice(start, end);
});

// --- Selection Logic ---
const selectAll = computed({
  get: () => records.value.length > 0 && selectedRecords.value.length === records.value.length,
  set: (value) => {
    selectedRecords.value = value ? records.value.map(r => r.id) : [];
  },
});

// --- Actions ---
const confirmSingleDelete = (record) => {
  if (confirm(`確定要刪除這筆記錄嗎？`)) {
    deleteRecords([record.id]);
  }
};

const confirmBatchDelete = () => {
  if (confirm(`確定要刪除選取的 ${selectedRecords.value.length} 筆記錄嗎？`)) {
    deleteRecords(selectedRecords.value);
  }
};

const deleteRecords = async (ids) => {
  uiStore.setLoading(true);
  try {
    await api.batchDeleteRecords(ids);
    uiStore.showMessage('刪除成功', 'success');
    selectedRecords.value = [];
    loadRecords(); // Reload
  } catch (error) {
    uiStore.showMessage(`刪除失敗: ${error.message}`, 'error');
  } finally {
    uiStore.setLoading(false);
  }
};

const exportToCSV = () => {
  if (records.value.length === 0) return;
  let csvContent = '時間,姓名,學號/卡號,類型,狀態,活動名稱\n';
  records.value.forEach(r => {
    csvContent += `"${formatDateTime(r.created_at)}","${r.name_at_checkin || '-'}","${r.input}","${r.action_type}","${r.status}","${r.events?.name || '-'}"\n`;
  });
  const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `每日記錄_${selectedDate.value}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
};

</script>
