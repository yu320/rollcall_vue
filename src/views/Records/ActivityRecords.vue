<template>
  <div class="bg-white rounded-xl shadow-lg p-6 border border-indigo-200">
    <h2 class="text-3xl font-bold text-indigo-800 mb-6">活動報到記錄</h2>
    
    <!-- Filters -->
    <div class="mb-6 flex flex-col sm:flex-row items-start sm:items-end gap-3">
      <div class="w-full sm:w-auto flex-grow">
        <label for="eventSelector" class="block text-gray-700 font-medium mb-2">選擇活動</label>
        <select v-model="selectedEventId" @change="loadRecords" class="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white">
          <option :value="null">-- 請選擇一個活動 --</option>
          <option v-for="event in events" :key="event.id" :value="event.id">
            {{ event.name }} ({{ formatDateTime(event.start_time) }})
          </option>
        </select>
      </div>
    </div>

    <!-- Records Table Container -->
    <div v-if="selectedEventId && groupedRecords.length > 0">
      <div class="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3">
          <h3 class="text-2xl font-bold text-gray-800">{{ selectedEventName }} ({{ groupedRecords.length }} 人)</h3>
          <div class="flex gap-3">
            <button v-if="selectedPersonnel.length > 0" @click="confirmBatchDelete" class="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg">
              批次刪除 ({{ selectedPersonnel.length }})
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
                <th>學號</th>
                <th>姓名</th>
                <th>簽到時間</th>
                <th>簽退時間</th>
                <th>狀態</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-100">
              <tr v-for="record in paginatedRecords" :key="record.personnelId">
                <td data-label="選取" class="px-6 py-4"><input type="checkbox" v-model="selectedPersonnel" :value="record.personnelId"></td>
                <td data-label="學號">{{ record.code }}</td>
                <td data-label="姓名">{{ record.name }}</td>
                <td data-label="簽到時間">{{ record.checkInTime ? formatDateTime(record.checkInTime) : '-' }}</td>
                <td data-label="簽退時間">{{ record.checkOutTime ? formatDateTime(record.checkOutTime) : '-' }}</td>
                <td data-label="狀態"><span class="status-badge" :class="record.statusClass">{{ record.status }}</span></td>
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
      <p v-if="!selectedEventId">請選擇活動以查看報到記錄。</p>
      <p v-else>所選活動無報到記錄。</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useUiStore } from '@/store/ui';
import { api } from '@/services/api';
import { format, parseISO } from 'date-fns';

const uiStore = useUiStore();

const events = ref([]);
const selectedEventId = ref(null);
const allRecordsForEvent = ref([]);
const groupedRecords = ref([]);
const selectedPersonnel = ref([]);
const pagination = ref({ currentPage: 1, pageSize: 10, totalPages: 1 });

const formatDateTime = (isoString) => isoString ? format(parseISO(isoString), 'yyyy-MM-dd HH:mm:ss') : '';

onMounted(async () => {
  uiStore.setLoading(true);
  try {
    events.value = await api.fetchEvents();
  } catch (error) {
    uiStore.showMessage('無法載入活動列表', 'error');
  } finally {
    uiStore.setLoading(false);
  }
});

const selectedEventName = computed(() => {
    const event = events.value.find(e => e.id === selectedEventId.value);
    return event ? event.name : '';
});

const loadRecords = async () => {
  if (!selectedEventId.value) {
    allRecordsForEvent.value = [];
    return;
  }
  uiStore.setLoading(true);
  try {
    allRecordsForEvent.value = await api.fetchRecordsByEventId(selectedEventId.value);
  } catch (error) {
    uiStore.showMessage(`讀取活動記錄失敗: ${error.message}`, 'error');
  } finally {
    uiStore.setLoading(false);
  }
};

watch(allRecordsForEvent, (newRecords) => {
    const personnelData = {};
    const personnelMap = new Map();
    // Assuming personnel list is fetched elsewhere and available, or fetch it here.
    // For now, we rely on name_at_checkin
    
    newRecords.forEach(rec => {
        if (!personnelData[rec.personnel_id]) {
            personnelData[rec.personnel_id] = {
                personnelId: rec.personnel_id,
                name: rec.name_at_checkin,
                code: rec.input, // This might not be the code, but best effort
                allRecordIds: [],
            };
        }
        personnelData[rec.personnel_id].allRecordIds.push(rec.id);
        if (rec.action_type === '簽到') {
            personnelData[rec.personnel_id].checkInTime = rec.created_at;
            personnelData[rec.personnel_id].checkInStatus = rec.status;
        } else if (rec.action_type === '簽退') {
            personnelData[rec.personnel_id].checkOutTime = rec.created_at;
        }
    });

    groupedRecords.value = Object.values(personnelData).map(p => {
        const status1 = p.checkInTime ? p.checkInStatus : '未簽到';
        const status2 = p.checkOutTime ? '已簽退' : '未簽退';
        p.status = `${status1} / ${status2}`;

        let statusClass = 'bg-gray-100 text-gray-800';
        if (status1 === '未簽到') statusClass = 'bg-red-100 text-red-800';
        else if (status2 === '未簽退') statusClass = 'bg-yellow-100 text-yellow-800';
        else if (status1 === '準時') statusClass = 'bg-green-100 text-green-800';
        p.statusClass = statusClass;
        return p;
    });

    pagination.value.currentPage = 1;
    pagination.value.totalPages = Math.ceil(groupedRecords.value.length / pagination.value.pageSize);
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

const confirmSingleDelete = (record) => {
    if (confirm(`確定要刪除 ${record.name} 的所有相關記錄嗎？`)) {
        deletePersonnelRecords([record.personnelId]);
    }
};

const confirmBatchDelete = () => {
    if (confirm(`確定要刪除選取的 ${selectedPersonnel.value.length} 位人員的所有相關記錄嗎？`)) {
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
        loadRecords(); // Reload
    } catch (error) {
        uiStore.showMessage(`刪除失敗: ${error.message}`, 'error');
    } finally {
        uiStore.setLoading(false);
    }
};

const exportToCSV = () => {
    if (groupedRecords.value.length === 0) return;
    let csvContent = '學號,姓名,簽到時間,簽退時間,狀態\n';
    groupedRecords.value.forEach(r => {
        csvContent += `"${r.code}","${r.name}","${formatDateTime(r.checkInTime)}","${formatDateTime(r.checkOutTime)}","${r.status}"\n`;
    });
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `活動記錄_${selectedEventName.value}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
};

</script>
