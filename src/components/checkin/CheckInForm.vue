<template>
  <div class="bg-white rounded-xl shadow-lg p-8 border-2 border-dashed border-gray-300">
    <div class="text-center mb-8">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto text-indigo-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
      <h2 class="text-3xl font-bold text-gray-800">刷卡報到</h2>
      <p class="text-gray-500 mt-2">請將學生證放置於刷卡機或是手動輸入學號進行報到</p>
    </div>

    <div class="mb-6 flex justify-center gap-4">
      <label 
        v-for="mode in ['簽到', '簽退']" :key="mode"
        class="inline-flex items-center cursor-pointer p-3 border-2 rounded-lg" 
        :class="checkinMode === mode ? 'border-indigo-500 bg-indigo-50' : 'border-transparent'"
      >
        <input 
          type="radio" 
          :checked="checkinMode === mode"
          @change="$emit('update:checkinMode', mode)" 
          class="form-radio h-5 w-5 text-indigo-600"
        >
        <span class="ml-2 text-lg font-medium text-gray-800">{{ mode }}</span>
      </label>
    </div>

    <div class="mb-6">
      <label for="eventSelector" class="block text-sm font-medium text-gray-700 mb-2">選擇活動</label>
      <select 
        id="eventSelector" 
        :value="selectedEventId"
        @change="$emit('update:selectedEventId', $event.target.value || null)"
        class="w-full pl-4 pr-10 py-3 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
      >
        <option :value="null">-- 不選擇活動 (測試用) --</option>
        <option v-for="event in events" :key="event.id" :value="event.id" :class="{'text-gray-500': isEventEnded(event.end_time)}">
          {{ event.name }} ({{ formatDateTime(event.start_time, 'yyyy-MM-dd') }})
          <span v-if="isEventEnded(event.end_time)">(已結束)</span>
        </option>
      </select>
    </div>

    <form @submit.prevent="submitCheckIn">
      <div class="relative">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <rect x="3" y="4" width="18" height="16" rx="2" ry="2" stroke-width="2" stroke="currentColor" />
          <circle cx="9" cy="10" r="2" stroke="currentColor" stroke-width="2" />
          <path d="M6 16c0-1.5 2-2.5 3-2.5s3 1 3 2.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          <line x1="14" y1="9" x2="18" y2="9" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          <line x1="14" y1="13" x2="18" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
        <input v-model="localInput" type="text" id="checkInInput" class="w-full pl-14 pr-4 py-4 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="輸入學號/卡號">
      </div>
      <button type="submit" class="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-4 rounded-lg text-lg transition duration-300 ease-in-out transform hover:scale-105">
        確認{{ checkinMode }}
      </button>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { format, parseISO, isPast } from 'date-fns';

const props = defineProps({
  events: Array,
  checkinMode: String,
  selectedEventId: String,
});

const emit = defineEmits(['update:checkinMode', 'update:selectedEventId', 'submit']);

const localInput = ref('');

const formatDateTime = (isoString, formatStr = 'yyyy-MM-dd') => {
    if (!isoString) return null;
    return format(parseISO(isoString), formatStr);
};

const isEventEnded = (endTimeIso) => {
  if (!endTimeIso) return false;
  return isPast(parseISO(endTimeIso));
};

const submitCheckIn = () => {
  if (localInput.value.trim()) {
    emit('submit', localInput.value.trim());
    localInput.value = '';
  }
};
</script>