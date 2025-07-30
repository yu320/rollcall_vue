<template>
  <div class="bg-white rounded-xl shadow-lg p-6 mb-8 border border-indigo-200">
    <div class="flex flex-col md:flex-row justify-between items-start mb-6">
      <div>
        <h2 class="text-3xl font-bold text-indigo-800">活動管理</h2>
        <p class="text-gray-700 mt-2">管理所有簽到活動。</p>
        <p class="text-gray-700">如果未設定結束時間，則以開始時間後為遲到。</p>
        <p class="text-gray-700">設定結束時間，則以結束時間後為遲到。</p>
      </div>
      <button @click="openModal()" class="mt-4 md:mt-0 w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-lg">
        新增活動
      </button>
    </div>

    <!-- Event List -->
    <div v-if="isLoading" class="text-center py-12">
      <div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
      <p class="mt-4 text-gray-600">正在載入活動資料...</p>
    </div>
    <div v-else-if="dataStore.events.length > 0" class="space-y-4">
      <div v-for="event in sortedEvents" :key="event.id" class="bg-white rounded-lg shadow-md p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h4 class="text-lg font-bold text-indigo-700">{{ event.name }}</h4>
          <p class="text-sm text-gray-600">開始時間: {{ formatDateTime(event.start_time) }}</p>
          <p v-if="event.end_time" class="text-sm text-gray-600">結束時間: {{ formatDateTime(event.end_time) }}</p>
          <p class="text-xs text-gray-500 mt-2">由 {{ event.profiles?.nickname || '未知使用者' }} 創建</p>
        </div>
        <!-- Buttons changed to icons -->
        <div class="flex-shrink-0 flex gap-2">
          <button @click="openModal(event)" class="p-2 text-blue-600 hover:text-blue-800 rounded-full bg-blue-100 hover:bg-blue-200 transition" aria-label="編輯活動">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
          </button>
          <button @click="confirmDelete(event)" class="p-2 text-red-600 hover:text-red-800 rounded-full bg-red-100 hover:bg-red-200 transition" aria-label="刪除活動">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
          </button>
        </div>
      </div>
    </div>
    <div v-else class="py-12 text-center text-gray-500">
      <p>目前沒有活動。</p>
      <p class="mt-4">點擊右上角按鈕新增第一個活動</p>
    </div>

    <!-- Add/Edit Modal -->
    <Modal :show="isModalOpen" @close="closeModal">
      <template #header>{{ isEditing ? '編輯活動' : '新增活動' }}</template>
      <form @submit.prevent="saveEvent">
        <div class="mb-4">
          <label for="eventName" class="block text-sm font-medium text-gray-700">活動名稱</label>
          <input type="text" id="eventName" v-model="editableEvent.name" required class="w-full mt-1 border rounded-md p-2">
        </div>
        <div class="mb-4">
          <label for="eventStartTime">開始時間</label>
          <input type="datetime-local" v-model="editableEvent.start_time" required class="w-full mt-1 border rounded-md p-2">
        </div>
        <div class="mb-6">
          <label for="eventEndTime">結束時間 (選填)</label>
          <input type="datetime-local" v-model="editableEvent.end_time" class="w-full mt-1 border rounded-md p-2">
        </div>
        <div class="flex justify-end gap-3">
          <button type="button" @click="closeModal" class="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300">取消</button>
          <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">儲存</button>
        </div>
      </form>
    </Modal>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useUiStore } from '@/store/ui';
import { useDataStore } from '@/store/data'; // 引入 dataStore
import { useAuthStore } from '@/store/auth'; // 引入 authStore 獲取當前使用者 ID
import Modal from '@/components/Modal.vue';
import { formatDateTime } from '@/utils/index'; // 引入 formatDateTime

const uiStore = useUiStore();
const dataStore = useDataStore(); // 獲取 dataStore 實例
const authStore = useAuthStore(); // 獲取 authStore 實例

const isLoading = ref(true); // 載入狀態
const isModalOpen = ref(false);
const isEditing = ref(false);
const editableEvent = ref({});

// 將 ISO 字符串轉換為 datetime-local 輸入框所需的格式 (YYYY-MM-DDTHH:mm)
const toLocalISOString = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    // 考慮時區偏移量，以確保轉換後的日期時間是正確的當地時間
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
};

// 計算屬性：對活動列表進行排序 (新到舊)
const sortedEvents = computed(() => {
  return [...dataStore.events].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
});

// 組件載入時，獲取所有活動資料
onMounted(async () => {
  isLoading.value = true;
  uiStore.setLoading(true);
  try {
    await dataStore.fetchEvents(); // 從 Pinia Store 獲取活動資料
  } catch (error) {
    // 錯誤已在 dataStore 處理，這裡只需捕獲
  } finally {
    isLoading.value = false;
    uiStore.setLoading(false);
  }
});

// 打開新增/編輯活動模態視窗
const openModal = (event = null) => {
  isEditing.value = !!event;
  editableEvent.value = event 
    ? { ...event, start_time: toLocalISOString(event.start_time), end_time: toLocalISOString(event.end_time) }
    : { name: '', start_time: '', end_time: '' }; // 初始化空白活動資料
  isModalOpen.value = true;
};

// 關閉模態視窗 (編輯/新增表單)
const closeModal = () => isModalOpen.value = false;


// 儲存活動資料 (新增或編輯)
// 檔案：src/views/Events.vue

// ... 其他 <script setup> 內的程式碼 ...

// 儲存活動資料 (新增或編輯)
const saveEvent = async () => {
    const currentUser = authStore.user; // 獲取當前登入使用者
    if (!currentUser) {
        uiStore.showMessage('無法獲取使用者資訊，請重新登入。', 'error');
        return;
    }

    // 從表單中準備基礎資料
    const formData = {
        ...editableEvent.value,
        start_time: new Date(editableEvent.value.start_time).toISOString(),
        end_time: editableEvent.value.end_time ? new Date(editableEvent.value.end_time).toISOString() : null,
    };

    // 【*** 核心修正 ***】
    // 使用解構賦值，將多餘的 'profiles' 關聯資料移除，
    // 產生一個乾淨的、只包含資料庫欄位的 payload 物件。
    const { profiles, ...payload } = formData;

    uiStore.setLoading(true);
    try {
        let result = null;
        if (isEditing.value) {
            // 將乾淨的 payload 傳遞給更新函式
            result = await dataStore.updateEvent(payload);
            if (result) {
                uiStore.showMessage('活動已成功更新！', 'success');
                closeModal();
            }
        } else { // 這是新增操作
            // 在乾淨的 payload 基礎上，添加 created_by 欄位
            payload.created_by = currentUser.id;
            result = await dataStore.createEvent(payload);
            if (result) {
                closeModal();
                uiStore.showMessage(`活動 "${result.name}" 已成功建立！`, 'success');
            }
        }
    } catch(e) {
        // 錯誤已在 dataStore 處理，這裡無需重複顯示
    } finally {
        uiStore.setLoading(false);
    }
};

// ... 其他 <script setup> 內的程式碼 ...
// 確認刪除活動
const confirmDelete = (event) => {
    uiStore.showConfirmation(
        '確認刪除活動',
        `您確定要刪除活動 "${event.name}" 嗎？相關的報到記錄將不會被刪除，但會失去關聯。`,
        '確認刪除',
        'bg-red-600 hover:bg-red-700'
    ).then(() => {
        deleteEvent(event.id);
    }).catch(() => {
        // 用戶取消刪除，不做任何事
    });
};

// 執行刪除活動
const deleteEvent = async (id) => {
    uiStore.setLoading(true);
    try {
        const success = await dataStore.deleteEvent(id);
        // 如果成功，dataStore 已經會更新 events 列表和顯示訊息
    } catch(e) {
        // 錯誤已在 dataStore 處理
    } finally {
        uiStore.setLoading(false);
    }
};
</script>
