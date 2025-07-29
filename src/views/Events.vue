<template>
  <div class="bg-white rounded-xl shadow-lg p-6 mb-8 border border-indigo-200">
    <div class="flex flex-col md:flex-row justify-between items-start mb-6">
      <div>
        <h2 class="text-3xl font-bold text-indigo-800">活動管理</h2>
        <p class="text-gray-700 mt-2">管理所有簽到活動。</p>
      </div>
      <button @click="openModal()" class="mt-4 md:mt-0 w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-lg">
        新增活動
      </button>
    </div>

    <!-- Event List -->
    <div class="space-y-4">
      <div v-for="event in dataStore.events" :key="event.id" class="bg-white rounded-lg shadow-md p-4 flex justify-between items-center">
        <div>
          <h4 class="text-lg font-bold text-indigo-700">{{ event.name }}</h4>
          <p class="text-sm text-gray-600">開始時間: {{ formatDateTime(event.start_time) }}</p>
          <p v-if="event.end_time" class="text-sm text-gray-600">結束時間: {{ formatDateTime(event.end_time) }}</p>
        </div>
        <div class="flex gap-2">
          <button @click="openModal(event)" class="p-2 text-blue-600 hover:text-blue-800">編輯</button>
          <button @click="confirmDelete(event)" class="p-2 text-red-600 hover:text-red-800">刪除</button>
        </div>
      </div>
    </div>
    <div v-if="dataStore.events.length === 0" class="py-12 text-center text-gray-500">
      <p>目前沒有活動。</p>
    </div>

    <!-- Add/Edit Modal -->
    <Modal :show="isModalOpen" @close="closeModal">
      <template #header>{{ isEditing ? '編輯活動' : '新增活動' }}</template>
      <form @submit.prevent="saveEvent">
        <div class="mb-4">
          <label for="eventName">活動名稱</label>
          <input type="text" v-model="editableEvent.name" required class="w-full mt-1 border rounded-md p-2">
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
          <button type="button" @click="closeModal">取消</button>
          <button type="submit">儲存</button>
        </div>
      </form>
    </Modal>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useUiStore } from '@/store/ui';
import { useDataStore } from '@/store/data';
import Modal from '@/components/Modal.vue';
import { format, parseISO } from 'date-fns';

const uiStore = useUiStore();
const dataStore = useDataStore();

const isModalOpen = ref(false);
const isEditing = ref(false);
const editableEvent = ref({});

const formatDateTime = (isoString) => isoString ? format(parseISO(isoString), 'yyyy-MM-dd HH:mm') : '';
const toLocalISOString = (date) => {
    if (!date) return '';
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
};

onMounted(() => {
  dataStore.fetchEvents();
});

const openModal = (event = null) => {
  isEditing.value = !!event;
  editableEvent.value = event 
    ? { ...event, start_time: toLocalISOString(event.start_time), end_time: toLocalISOString(event.end_time) }
    : { name: '', start_time: '', end_time: '' };
  isModalOpen.value = true;
};

const closeModal = () => isModalOpen.value = false;

const saveEvent = async () => {
    const eventData = {
        ...editableEvent.value,
        start_time: new Date(editableEvent.value.start_time).toISOString(),
        end_time: editableEvent.value.end_time ? new Date(editableEvent.value.end_time).toISOString() : null
    };

    uiStore.setLoading(true);
    try {
        if (isEditing.value) {
            await dataStore.updateEvent(eventData);
        } else {
            await dataStore.createEvent(eventData);
        }
        uiStore.showMessage('活動儲存成功', 'success');
        closeModal();
    } catch(e) {
        uiStore.showMessage(e.message, 'error');
    } finally {
        uiStore.setLoading(false);
    }
};

const confirmDelete = (event) => {
    if(confirm(`確定要刪除活動 "${event.name}" 嗎？`)) {
        deleteEvent(event.id);
    }
};

const deleteEvent = async (id) => {
    uiStore.setLoading(true);
    try {
        await dataStore.deleteEvent(id);
        uiStore.showMessage('活動刪除成功', 'success');
    } catch(e) {
        uiStore.showMessage(e.message, 'error');
    } finally {
        uiStore.setLoading(false);
    }
}
</script>
