<template>
  <div class="mt-10">
    <div class="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
      <h3 class="text-2xl font-bold text-gray-800">今日暫存記錄 ({{ records.length }} 筆)</h3>
      <div class="flex flex-wrap gap-3 justify-center w-full sm:w-auto">
        <button @click="$emit('delete-all')" class="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition duration-300 flex items-center justify-center shadow-sm hover:shadow-md">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clip-rule="evenodd" /></svg>
          刪除全部
        </button>
        <button @click="$emit('save-all')" class="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded-lg transition duration-300 flex items-center justify-center shadow-sm hover:shadow-md">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.4 1.4a1 1 0 0 0 1.4 0l.7-.7a1 1 0 0 0 0-1.4l-1.4-1.4a1 1 0 0 0-1.4 0z"></path><path d="M18 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V6z"></path><path d="M14 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2V2z"></path><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
          儲存記錄
        </button>
      </div>
    </div>
    <div class="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
      <div class="overflow-x-auto table-responsive">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">時間</th>
              <th class="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">姓名</th>
              <th class="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">學號/卡號</th>
              <th class="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">類型</th>
              <th class="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">狀態</th>
              <th class="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">活動</th>
              <th class="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">裝置ID</th>
              <th class="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-100">
            <tr v-for="record in records" :key="record.id">
              <td data-label="時間" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatDateTime(record.created_at, 'yyyy-MM-dd HH:mm:ss') }}</td>
              <td data-label="姓名" class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ record.name_at_checkin || '—' }}</td>
              <td data-label="學號/卡號" class="px-6 py-4 whitespace-nowrap text-sm">
                <div class="flex flex-col items-center">
                  <span :class="dataStore.getInputColorClass(record.input)" class="font-semibold">{{ record.input }}</span>
                  <span class="text-xs text-gray-500">{{ record.input_type }}</span>
                </div>
              </td>
              <td data-label="類型" class="px-6 py-4 whitespace-nowrap text-sm"><span class="type-badge" :data-type="record.action_type">{{ record.action_type }}</span></td>
              <td data-label="狀態" class="px-6 py-4 whitespace-nowrap"><span class="status-badge" :data-status="record.status">{{ record.status }}</span></td>
              <td data-label="活動" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ getEventName(record.event_id) }}</td>
              <td data-label="裝置ID" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate" style="max-width: 150px;">{{ record.device_id || '—' }}</td>
              <td data-label="操作" class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button @click="$emit('delete-record', record.id)" class="text-gray-400 hover:text-red-600" aria-label="刪除此筆暫存記錄">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clip-rule="evenodd" /></svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="records.length === 0" class="py-8 text-center text-gray-500 text-lg">
        尚無暫存記錄
      </div>
    </div>
  </div>
</template>

<script setup>
import { useDataStore } from '@/store/data';
import { formatDateTime } from '@/utils';

const dataStore = useDataStore();

defineProps({
  records: Array,
});

defineEmits(['delete-all', 'save-all', 'delete-record']);

const getEventName = (eventId) => {
  if (!eventId) return '—';
  const event = dataStore.events.find(e => e.id === eventId);
  return event ? event.name : '未知活動';
};
</script>