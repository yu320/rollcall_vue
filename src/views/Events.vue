<template>
  <div class="bg-white rounded-xl shadow-lg p-6 mb-8 border border-indigo-200">
    <div class="flex flex-col md:flex-row justify-between items-start mb-6">
      <div>
        <h2 class="text-3xl font-bold text-indigo-800">活動管理</h2>
        <p class="text-gray-700 mt-2">管理所有簽到活動，並可指定特定參與人員。</p>
      </div>
      <button @click="openModal()" class="mt-4 md:mt-0 w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-lg">
        新增活動
      </button>
    </div>

    <div v-if="isLoading" class="text-center py-12">
      <div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
      <p class="mt-4 text-gray-600">正在載入活動資料...</p>
    </div>
    <div v-else-if="dataStore.events.length > 0" class="space-y-4">
      <div v-for="event in sortedEvents" :key="event.id" class="bg-white rounded-lg shadow-md p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h4 class="text-lg font-bold text-indigo-700">{{ event.name }}</h4>
          <div class="flex items-center gap-2 text-sm text-gray-600 mt-1">
            <span :class="['px-2 py-1 text-xs font-semibold rounded-full', event.participant_scope === 'SPECIFIC' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800']">
              {{ event.participant_scope === 'SPECIFIC' ? '指定人員' : '全體人員' }}
            </span>
            <span>|</span>
            <span>開始: {{ formatDateTime(event.start_time) }}</span>
            <span v-if="event.end_time">結束: {{ formatDateTime(event.end_time) }}</span>
          </div>
          <p class="text-xs text-gray-500 mt-2">由 {{ event.profiles?.nickname || '未知使用者' }} 創建</p>
        </div>
        <div class="flex-shrink-0 flex gap-2">
          <button @click="openModal(event)" class="p-2 rounded-full transition hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-600 hover:text-blue-800" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
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

    <Modal :show="isModalOpen" @close="closeModal">
      <template #header>{{ isEditing ? '編輯活動' : '新增活動' }}</template>
      <form @submit.prevent="saveEvent" class="flex flex-col h-full">
        <div class="space-y-4 overflow-y-auto pr-2" style="max-height: 65vh;">
          <div class="mb-4">
            <label for="eventName" class="block text-sm font-medium text-gray-700">活動名稱</label>
            <input type="text" id="eventName" v-model="editableEvent.name" required class="w-full mt-1 border rounded-md p-2">
          </div>
          <div class="mb-4">
            <label for="eventStartTime">開始時間</label>
            <input type="datetime-local" v-model="editableEvent.start_time" required class="w-full mt-1 border rounded-md p-2">
          </div>
          <div class="mb-4">
            <label for="eventEndTime">結束時間 (選填)</label>
            <input type="datetime-local" v-model="editableEvent.end_time" class="w-full mt-1 border rounded-md p-2">
          </div>
          
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">適用對象</label>
            <div class="flex gap-4">
              <label class="flex items-center">
                <input type="radio" v-model="editableEvent.participant_scope" value="ALL" class="form-radio h-4 w-4 text-indigo-600">
                <span class="ml-2 text-gray-700">全體人員</span>
              </label>
              <label class="flex items-center">
                <input type="radio" v-model="editableEvent.participant_scope" value="SPECIFIC" class="form-radio h-4 w-4 text-indigo-600">
                <span class="ml-2 text-gray-700">指定人員</span>
              </label>
            </div>
          </div>

          <div v-if="editableEvent.participant_scope === 'SPECIFIC'" class="border-t pt-4 mt-4">
            <h4 class="text-lg font-semibold text-gray-800 mb-2">選擇指定人員</h4>
            <input type="text" v-model="personnelSearchTerm" placeholder="搜尋姓名、學號、卡號、棟別、標籤..." class="w-full border rounded-md p-2 mb-3">
            
            <div class="flex justify-between items-center mb-2 px-2">
              <label class="flex items-center">
                <input type="checkbox" v-model="selectAllFiltered" class="h-4 w-4 rounded text-indigo-600">
                <span class="ml-2 text-sm text-gray-600">全選/取消全選 (僅限目前搜尋結果)</span>
              </label>
              <span class="text-sm text-gray-600">已選取 {{ selectedParticipantIds.length }} 位</span>
            </div>

            <div class="max-h-60 overflow-y-auto border rounded-md p-2 bg-gray-50 space-y-2">
              <div v-for="person in filteredPersonnel" :key="person.id">
                <label class="flex items-center p-2 rounded-md hover:bg-gray-100 cursor-pointer">
                  <input type="checkbox" :value="person.id" v-model="selectedParticipantIds" class="h-4 w-4 rounded text-indigo-600">
                  <div class="ml-3">
                    <p class="font-medium text-gray-800">{{ person.name }} ({{ person.code }})</p>
                    <p class="text-xs text-gray-500">{{ person.building || '無棟別' }} - {{ (person.tags || []).join(', ') || '無標籤' }}</p>
                  </div>
                </label>
              </div>
              <p v-if="filteredPersonnel.length === 0" class="text-center text-gray-500 py-4">找不到符合的人員。</p>
            </div>
          </div>
        </div>
        
        <div class="flex justify-end gap-3 mt-auto pt-4 border-t">
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
import { useDataStore } from '@/store/data';
import { useAuthStore } from '@/store/auth';
import Modal from '@/components/Modal.vue';
import { formatDateTime } from '@/utils/index';

const uiStore = useUiStore();
const dataStore = useDataStore();
const authStore = useAuthStore();

const isLoading = ref(true);
const isModalOpen = ref(false);
const isEditing = ref(false);
const editableEvent = ref({});
const selectedParticipantIds = ref([]);
const personnelSearchTerm = ref('');

const toLocalISOString = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
};

const sortedEvents = computed(() => {
  return [...dataStore.events].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
});

const filteredPersonnel = computed(() => {
  const term = personnelSearchTerm.value.toLowerCase();
  if (!term) return dataStore.personnel;
  return dataStore.personnel.filter(p => 
    p.name.toLowerCase().includes(term) ||
    p.code.toLowerCase().includes(term) ||
    p.card_number.toLowerCase().includes(term) ||
    (p.building && p.building.toLowerCase().includes(term)) ||
    (p.tags && p.tags.some(tag => tag.toLowerCase().includes(term)))
  );
});

// 【*** 核心修正 2 ***】全選功能的 computed property
const selectAllFiltered = computed({
  get() {
    const filteredIds = new Set(filteredPersonnel.value.map(p => p.id));
    if (filteredIds.size === 0) return false;
    // 檢查 filteredIds 中的每個 id 是否都在 selectedParticipantIds 中
    return [...filteredIds].every(id => selectedParticipantIds.value.includes(id));
  },
  set(value) {
    const filteredIds = filteredPersonnel.value.map(p => p.id);
    if (value) {
      // Add all filtered IDs to the selection, avoiding duplicates
      const newSelection = new Set([...selectedParticipantIds.value, ...filteredIds]);
      selectedParticipantIds.value = [...newSelection];
    } else {
      // Remove all filtered IDs from the selection
      const filteredIdsSet = new Set(filteredIds);
      selectedParticipantIds.value = selectedParticipantIds.value.filter(id => !filteredIdsSet.has(id));
    }
  }
});

onMounted(async () => {
  isLoading.value = true;
  uiStore.setLoading(true);
  try {
    await Promise.all([
      dataStore.fetchEvents(),
      dataStore.fetchAllPersonnel()
    ]);
  } catch (error) {
    // Error is handled in the store
  } finally {
    isLoading.value = false;
    uiStore.setLoading(false);
  }
});

const openModal = async (event = null) => {
  isEditing.value = !!event;
  personnelSearchTerm.value = '';
  selectedParticipantIds.value = [];

  if (event) {
    editableEvent.value = { 
      ...event, 
      start_time: toLocalISOString(event.start_time), 
      end_time: toLocalISOString(event.end_time) 
    };
    if (event.participant_scope === 'SPECIFIC') {
      const participants = await dataStore.fetchEventParticipants(event.id);
      selectedParticipantIds.value = participants.map(p => p.id);
    }
  } else {
    editableEvent.value = { 
      name: '', 
      start_time: '', 
      end_time: '',
      participant_scope: 'ALL'
    };
  }
  isModalOpen.value = true;
};

const closeModal = () => isModalOpen.value = false;

const saveEvent = async () => {
    const currentUser = authStore.user;
    if (!currentUser) {
        uiStore.showMessage('無法獲取使用者資訊，請重新登入。', 'error');
        return;
    }

    const payload = {
        ...editableEvent.value,
        start_time: new Date(editableEvent.value.start_time).toISOString(),
        end_time: editableEvent.value.end_time ? new Date(editableEvent.value.end_time).toISOString() : null,
    };
    
    if (!isEditing.value) {
        payload.created_by = currentUser.id;
    }
    
    delete payload.profiles;
    delete payload.event_participants;

    uiStore.setLoading(true);
    try {
        const participantIds = payload.participant_scope === 'SPECIFIC' ? selectedParticipantIds.value : [];
        const result = await dataStore.saveEvent(payload, participantIds);
        if (result) {
            uiStore.showMessage(`活動 "${result.name}" 已成功儲存！`, 'success');
            closeModal();
        }
    } catch(e) {
        // Error is handled in dataStore
    } finally {
        uiStore.setLoading(false);
    }
};

const confirmDelete = (event) => {
    uiStore.showConfirmation(
        '確認刪除活動',
        `您確定要刪除活動 "${event.name}" 嗎？相關的報到記錄將不會被刪除，但會失去關聯。`,
        '確認刪除',
        'bg-red-600 hover:bg-red-700'
    ).then(() => {
        deleteEvent(event.id);
    });
};

const deleteEvent = async (id) => {
    uiStore.setLoading(true);
    try {
        await dataStore.deleteEvent(id);
    } catch(e) {
        // Error is handled in dataStore
    } finally {
        uiStore.setLoading(false);
    }
};
</script>
