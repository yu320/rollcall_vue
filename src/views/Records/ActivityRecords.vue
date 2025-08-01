<template>
  <div class="bg-white rounded-xl shadow-lg p-6 border border-indigo-200">
    <h2 class="text-3xl font-bold text-indigo-800 mb-6">活動報到記錄</h2>
    
    <div class="mb-6 flex flex-col sm:flex-row items-start sm:items-end gap-4">
      <div class="w-full sm:w-auto flex-grow">
        <label for="eventSelector" class="block text-gray-700 font-medium mb-2">選擇活動</label>
        <select v-model="selectedEventId" @change="loadRecords" class="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-400">
          <option :value="null">-- 請選擇一個活動 --</option>
          <option v-for="event in sortedEvents" :key="event.id" :value="event.id" :class="{'text-gray-500': isEventEnded(event.end_time)}">
            {{ event.name }} ({{ formatDateTime(event.start_time, 'yyyy-MM-dd HH:mm') }}) <span v-if="isEventEnded(event.end_time)">(已結束)</span>
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

    <div v-if="isLoading" class="py-12 text-center text-gray-500">
      <p>正在載入記錄...</p>
    </div>
    <div v-else-if="selectedEventId && groupedRecords.length > 0">
      <div class="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3">
          <h3 class="text-2xl font-bold text-gray-800">{{ selectedEventName }} ({{ groupedRecords.length }} 人)</h3>
          <div class="flex gap-3 w-full sm:w-auto">
            <button v-if="selectedPersonnel.length > 0 && canModifyRecords" @click="confirmBatchDelete" class="w-1/2 sm:w-auto bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition shadow-sm flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clip-rule="evenodd" /></svg>
              批次刪除 ({{ selectedPersonnel.length }})
            </button>
            <button @click="exportToCSV" class="w-1/2 sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded-lg transition shadow-sm flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              匯出 CSV
            </button>
          </div>
      </div>
       <div class="overflow-x-auto table-responsive">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left w-12"><input type="checkbox" v-model="selectAll" :disabled="!canModifyRecords" class="h-4 w-4 text-indigo-600 rounded"></th>
                <th class="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">學號</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">姓名</th>
                <th class="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">簽到時間</th>
                <th class="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">簽退時間</th>
                <th class="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">狀態</th>
                <th class="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-100">
              <tr v-for="record in paginatedRecords" :key="record.personnelId" class="hover:bg-gray-50">
                <td data-label="選取" class="px-6 py-4"><input type="checkbox" v-model="selectedPersonnel" :value="record.personnelId" :disabled="!canModifyRecords"></td>
                <td data-label="學號" class="px-6 py-4 whitespace-nowrap text-sm text-gray-800 text-center">{{ record.code }}</td>
                <td data-label="姓名" class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ record.name }}</td>
                <td data-label="簽到時間" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{{ record.checkInTime ? formatDateTime(record.checkInTime, 'HH:mm:ss') : '—' }}</td>
                <td data-label="簽退時間" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{{ record.checkOutTime ? formatDateTime(record.checkOutTime, 'HH:mm:ss') : '—' }}</td>
                <td data-label="狀態" class="px-6 py-4 whitespace-nowrap flex justify-center"><span class="status-badge" :data-status="record.finalStatus">{{ record.statusText }}</span></td>
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
      <p v-if="!selectedEventId">請選擇一個活動以檢視其報到記錄。</p>
      <p v-else>此活動目前沒有任何報到記錄。</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useUiStore } from '@/store/ui';
import { useDataStore } from '@/store/data';
import { useAuthStore } from '@/store/auth'; // 引入 authStore 獲取權限
import * as api from '@/services/api';
import { format, parseISO, isPast } from 'date-fns'; // 引入 isPast 判斷活動是否結束
import { formatDateTime } from '@/utils'; // 從 utils 引入 formatDateTime

const uiStore = useUiStore();
const dataStore = useDataStore();
const authStore = useAuthStore(); // 獲取 authStore 實例

const isLoading = ref(false);
const selectedEventId = ref(null);
const allRecordsForEvent = ref([]); // 儲存從 API 獲取的所有原始記錄
const groupedRecords = ref([]); // 按人員分組後的記錄
const selectedPersonnel = ref([]); // 被選取的個人 ID 列表 (用於批次操作)
const pagination = ref({ currentPage: 1, pageSize: 10, totalPages: 1 });

// 計算屬性：檢查用戶是否有修改記錄的權限 (admin 或 sdc)
const canModifyRecords = computed(() => {
  return authStore.hasPermission('records:delete') || authStore.hasPermission('records:create');
});

// 組件掛載時，載入活動和人員資料
onMounted(async () => {
  uiStore.setLoading(true); // 顯示全局載入遮罩
  try {
    // 平行載入活動和人員資料
    await Promise.all([
      dataStore.fetchEvents(),
      dataStore.fetchAllPersonnel()
    ]);

    // 如果有活動，預設選擇第一個活動並載入其記錄
    if (dataStore.events.length > 0) {
      selectedEventId.value = dataStore.events[0].id;
      await loadRecords();
    }
  } catch (error) {
    uiStore.showMessage(`初始化活動記錄頁面失敗: ${error.message}`, 'error');
  } finally {
    uiStore.setLoading(false); // 隱藏全局載入遮罩
  }
});

// 計算屬性：將活動按開始時間降序排序，並添加結束狀態標記
const sortedEvents = computed(() => {
    return [...dataStore.events].sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
});

// 判斷活動是否已結束
const isEventEnded = (endTime) => {
    if (!endTime) return false;
    return isPast(parseISO(endTime));
};

// 計算屬性：獲取選定活動的名稱
const selectedEventName = computed(() => {
    const event = dataStore.events.find(e => e.id === selectedEventId.value);
    return event ? event.name : '';
});

// Computed 屬性：根據分頁信息過濾分組後的記錄
const paginatedRecords = computed(() => {
  const start = (pagination.value.currentPage - 1) * pagination.value.pageSize;
  const end = start + pagination.value.pageSize;
  return groupedRecords.value.slice(start, end);
});

// Computed 屬性：控制全選框的狀態
const selectAll = computed({
  get: () => {
    // 只有在有記錄且所有可修改的記錄都被選中時，全選框才為勾選狀態
    const selectableRecords = paginatedRecords.value.filter(() => canModifyRecords.value);
    return selectableRecords.length > 0 && selectedPersonnel.value.length === selectableRecords.length;
  },
  set: (value) => {
    // 根據 value (true/false) 來選取或取消選取所有當前頁的記錄
    if (value) {
      selectedPersonnel.value = paginatedRecords.value.filter(() => canModifyRecords.value).map(r => r.personnelId);
    } else {
      selectedPersonnel.value = [];
    }
  },
});

// 監聽 allRecordsForEvent 變化，處理並分組記錄
watch(allRecordsForEvent, (newRecords) => {
    // 使用 Map 輔助快速查找人員信息
    const personnelMap = new Map(dataStore.personnel.map(p => [p.id, p]));
    const recordsByPerson = {};

    newRecords.forEach(rec => {
        // 【修改點】僅在 personnel_id 存在時才納入統計
        if (!rec.personnel_id) return; 

        if (!recordsByPerson[rec.personnel_id]) {
            const personInfo = personnelMap.get(rec.personnel_id);
            recordsByPerson[rec.personnel_id] = {
                personnelId: rec.personnel_id,
                name: personInfo?.name || rec.name_at_checkin || '未知人員',
                code: personInfo?.code || rec.input || 'N/A',
                allRecordIds: [], // 儲存該人員所有相關記錄的 ID
                checkInTime: null,
                checkInStatus: null, // 簽到狀態 (準時/遲到)
                checkOutTime: null,
            };
        }
        recordsByPerson[rec.personnel_id].allRecordIds.push(rec.id); // 收集所有記錄 ID

        // 只取最早的簽到時間和最晚的簽退時間
        if (rec.action_type === '簽到') {
            if (!recordsByPerson[rec.personnel_id].checkInTime || new Date(rec.created_at) < new Date(recordsByPerson[rec.personnel_id].checkInTime)) {
                recordsByPerson[rec.personnel_id].checkInTime = rec.created_at;
                recordsByPerson[rec.personnel_id].checkInStatus = rec.status;
            }
        } else if (rec.action_type === '簽退') {
            if (!recordsByPerson[rec.personnel_id].checkOutTime || new Date(rec.created_at) > new Date(recordsByPerson[rec.personnel_id].checkOutTime)) {
                recordsByPerson[rec.personnel_id].checkOutTime = rec.created_at;
            }
        }
    });

    // 處理分組後的記錄的最終狀態顯示
    groupedRecords.value = Object.values(recordsByPerson).map(p => {
        const hasCheckedIn = !!p.checkInTime;
        const hasCheckedOut = !!p.checkOutTime;
        let statusText = '';
        let finalStatus = ''; // 用於 data-status 屬性

        if (!hasCheckedIn) {
            statusText = '未簽到';
            finalStatus = '失敗';
        } else if (hasCheckedIn && !hasCheckedOut) {
            statusText = `已簽到 (${p.checkInStatus || '未知'}) / 未簽退`;
            finalStatus = '遲到'; // 使用 '遲到' 的樣式 (黃色)
        } else if (hasCheckedIn && hasCheckedOut) {
            statusText = `已完成 (${p.checkInStatus || '未知'})`;
            finalStatus = '準時'; // 使用 '準時' 的樣式 (綠色)
        }
        
        p.statusText = statusText;
        p.finalStatus = finalStatus; // 儲存用於 data-status 的狀態
        return p;
    }).sort((a,b) => (new Date(a.checkInTime || 0) - new Date(b.checkInTime || 0))); // 按簽到時間排序

    pagination.value.currentPage = 1; // 記錄變化時重置回第一頁
    pagination.value.totalPages = Math.ceil(groupedRecords.value.length / pagination.value.pageSize);
}, { deep: true }); // 深度監聽，確保內部數據變化也能觸發

// 監聽 pageSize 變化，更新分頁總頁數並重置頁碼
watch(() => pagination.value.pageSize, () => {
    pagination.value.currentPage = 1;
    pagination.value.totalPages = Math.ceil(groupedRecords.value.length / pagination.value.pageSize);
});

// 載入指定活動的報到記錄
const loadRecords = async () => {
  if (!selectedEventId.value) {
    allRecordsForEvent.value = []; // 清空記錄
    groupedRecords.value = []; // 清空分組記錄
    return;
  }
  isLoading.value = true;
  uiStore.setLoading(true); // 顯示全局載入遮罩
  try {
    // 傳遞 eventId 給 API 函數
    allRecordsForEvent.value = await api.fetchRecordsByEventId(selectedEventId.value);
  } catch (error) {
    uiStore.showMessage(`讀取活動記錄失敗: ${error.message}`, 'error');
    allRecordsForEvent.value = []; // 載入失敗也清空
  } finally {
    isLoading.value = false;
    uiStore.setLoading(false); // 隱藏全局載入遮罩
  }
};

// 確認單筆刪除記錄 (此處的刪除是刪除該人員在此活動下的所有相關記錄)
const confirmSingleDelete = (record) => {
    uiStore.showConfirmation(
        '確認刪除記錄',
        `您確定要刪除 ${record.name} 在此活動下的所有相關簽到/簽退記錄嗎？此操作無法復原。`,
        '刪除',
        'bg-red-600 hover:bg-red-700'
    ).then(() => {
        deletePersonnelRecords([record.personnelId]);
    }).catch(() => {
        // 用戶取消刪除
    });
};

// 確認批次刪除記錄
const confirmBatchDelete = () => {
    if (selectedPersonnel.value.length === 0) {
        uiStore.showMessage('請至少選擇一筆記錄。', 'info');
        return;
    }
    uiStore.showConfirmation(
        '確認批次刪除記錄',
        `您確定要刪除選取的 ${selectedPersonnel.value.length} 位人員的所有相關報到記錄嗎？此操作無法復原。`,
        '刪除',
        'bg-red-600 hover:bg-red-700'
    ).then(() => {
        deletePersonnelRecords(selectedPersonnel.value);
    }).catch(() => {
        // 用戶取消刪除
    });
};

// 執行刪除指定人員在當前活動下的所有記錄
const deletePersonnelRecords = async (personnelIdsToDelete) => {
    // 從 allRecordsForEvent 找出所有屬於這些 personnelIds 的 record.id
    const recordIdsToDelete = allRecordsForEvent.value
        // 【修改點】確保只刪除 personnel_id 存在的記錄
        .filter(rec => personnelIdsToDelete.includes(rec.personnel_id) && rec.personnel_id)
        .map(rec => rec.id);

    if (recordIdsToDelete.length === 0) {
        uiStore.showMessage('沒有找到對應的記錄可刪除。', 'info');
        return;
    }

    uiStore.setLoading(true);
    try {
        await api.batchDeleteRecords(recordIdsToDelete);
        uiStore.showMessage('刪除成功', 'success');
        selectedPersonnel.value = []; // 清空選取狀態
        await loadRecords(); // 重新載入活動記錄以反映刪除
    } catch (error) {
        uiStore.showMessage(`刪除失敗: ${error.message}`, 'error');
    } finally {
        uiStore.setLoading(false);
    }
};

// 匯出當前活動的記錄為 CSV
const exportToCSV = () => {
  if (groupedRecords.value.length === 0) {
      uiStore.showMessage('沒有可匯出的資料。', 'info');
      return;
  }
  const currentEvent = dataStore.events.find(e => e.id === selectedEventId.value);
  const eventName = currentEvent ? currentEvent.name : '未知活動';

  let csvContent = '學號,姓名,簽到時間,簽退時間,狀態,活動\n';
  groupedRecords.value.forEach(r => {
    const checkIn = r.checkInTime ? `"${formatDateTime(r.checkInTime, 'yyyy-MM-dd HH:mm:ss')}"` : '""';
    const checkOut = r.checkOutTime ? `"${formatDateTime(r.checkOutTime, 'yyyy-MM-dd HH:mm:ss')}"` : '""';
    const row = [
        `"${r.code}"`,
        `"${r.name}"`,
        checkIn,
        checkOut,
        `"${r.statusText}"`, // 使用處理後顯示的狀態文字
        `"${eventName}"`
    ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','); // 確保所有字段都用雙引號包圍並轉義內部雙引號
    csvContent += row + '\n';
  });
  
  // 添加 BOM (Byte Order Mark) 確保 Excel 等軟體打開時中文不亂碼
  const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `活動記錄_${eventName}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};
</script>

<style scoped>
/*
  這個組件的特定樣式。
  主要的 Tailwind CSS 樣式定義在 `src/assets/styles/tailwind.css` 和 `src/assets/styles/main.css` 中。
*/
</style>
