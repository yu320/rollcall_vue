<template>
  <div class="container mx-auto p-4">
    <h2 class="text-2xl font-bold mb-4">簽到</h2>

    <!-- 控制項區域 -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 bg-white p-4 rounded-lg shadow">
      <!-- 活動選擇 -->
      <div>
        <label for="event-select" class="block text-sm font-medium text-gray-700 mb-1">選擇活動：</label>
        <select id="event-select" v-model="selectedEvent" @change="handleEventChange" class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
          <option v-if="events.length === 0" disabled value="">正在載入活動...</option>
          <option v-for="event in events" :key="event.id" :value="event.id">
            {{ event.name }}
          </option>
        </select>
      </div>

      <!-- 人員搜尋 -->
      <div>
        <label for="member-search" class="block text-sm font-medium text-gray-700 mb-1">搜尋人員 (姓名或編號)：</label>
        <div class="relative">
          <input type="text" id="member-search" v-model="searchQuery" @input="debounceSearch" placeholder="輸入後自動搜尋..." class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md" />
          <!-- 手動簽到按鈕 -->
          <button @click="handleManualCheckIn" class="absolute inset-y-0 right-0 px-3 flex items-center bg-blue-500 text-white text-sm rounded-r-md hover:bg-blue-600 focus:outline-none">
            手動簽到
          </button>
        </div>
        <!-- 搜尋結果 -->
        <ul v-if="searchResults.length > 0" class="absolute z-10 w-full bg-white border border-gray-300 mt-1 rounded-md shadow-lg max-h-60 overflow-auto">
          <li v-for="person in searchResults" :key="person.id" @click="performCheckIn(person)" class="cursor-pointer hover:bg-gray-100 p-2">
            {{ person.name }} ({{ person.personnel_id }})
          </li>
        </ul>
      </div>
    </div>

    <!-- 已簽到列表 -->
    <div class="bg-white p-4 rounded-lg shadow">
        <h3 class="text-xl font-semibold mb-3">已簽到人員 ({{ checkedInMembers.length }}人)</h3>
        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">姓名</th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">編號</th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">簽到時間</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    <tr v-if="isLoading">
                        <td colspan="3" class="text-center py-4">正在載入資料...</td>
                    </tr>
                    <tr v-else-if="checkedInMembers.length === 0">
                        <td colspan="3" class="text-center py-4">目前尚無人員簽到</td>
                    </tr>
                    <tr v-for="record in checkedInMembers" :key="record.id">
                        <td class="px-6 py-4 whitespace-nowrap">{{ record.personnel.name }}</td>
                        <td class="px-6 py-4 whitespace-nowrap">{{ record.personnel.personnel_id }}</td>
                        <td class="px-6 py-4 whitespace-nowrap">{{ new Date(record.created_at).toLocaleString() }}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import { supabase } from '@/services/supabase';
import { useDataStore } from '@/store/data';
import { useUiStore } from '@/store/ui';

// Pinia Stores
const dataStore = useDataStore();
const uiStore = useUiStore();

// Component State
const selectedEvent = ref(null);
const searchQuery = ref('');
const searchResults = ref([]);
const checkedInMembers = ref([]);
const isLoading = ref(false);
let debounceTimer = null;
let checkInSubscription = null;

// Computed properties
const events = computed(() => dataStore.events);

// --- Functions ---

/**
 * 根據選擇的活動ID，獲取已簽到的人員列表
 */
async function fetchCheckedInMembers() {
  if (!selectedEvent.value) return;
  isLoading.value = true;
  try {
    const { data, error } = await supabase
      .from('check_ins')
      .select(`
        id,
        created_at,
        personnel (
          id,
          name,
          personnel_id
        )
      `)
      .eq('event_id', selectedEvent.value)
      .order('created_at', { ascending: false });

    if (error) throw error;
    checkedInMembers.value = data;
  } catch (error) {
    uiStore.showMessage(`讀取簽到紀錄失敗: ${error.message}`, 'error');
    checkedInMembers.value = [];
  } finally {
    isLoading.value = false;
  }
}

/**
 * 設定 Supabase Realtime Subscription
 * 監聽特定活動的簽到紀錄變化
 */
function subscribeToChanges() {
  // 先移除舊的監聽
  if (checkInSubscription) {
    supabase.removeChannel(checkInSubscription);
    checkInSubscription = null;
  }

  if (!selectedEvent.value) return;

  checkInSubscription = supabase
    .channel(`check_ins_event_${selectedEvent.value}`)
    .on(
      'postgres_changes',
      { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'check_ins',
        filter: `event_id=eq.${selectedEvent.value}`
      },
      async (payload) => {
        // 收到新紀錄時，重新抓取該筆紀錄的完整資料 (包含人員姓名)
        const { data: newRecord, error } = await supabase
          .from('check_ins')
          .select(`
            id,
            created_at,
            personnel (
              id,
              name,
              personnel_id
            )
          `)
          .eq('id', payload.new.id)
          .single();
        
        if (error) {
            console.error('無法獲取新簽到紀錄的詳細資料:', error);
            return;
        }
        
        // 新增到列表頂部
        checkedInMembers.value.unshift(newRecord);
      }
    )
    .subscribe();
}

/**
 * 處理搜尋輸入，使用 debounce 避免頻繁觸發 API
 */
function debounceSearch() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    handleSearch();
  }, 300);
}

/**
 * 執行人員搜尋
 */
async function handleSearch() {
  if (searchQuery.value.trim().length < 1) {
    searchResults.value = [];
    return;
  }
  try {
    // 使用 data store 中的 action
    const results = await dataStore.searchPersonnel(searchQuery.value);
    searchResults.value = results;
  } catch (error) {
    uiStore.showMessage(`搜尋失敗: ${error.message}`, 'error');
  }
}

/**
 * 執行簽到
 * @param {object} person - 要簽到的人員物件
 */
async function performCheckIn(person) {
  if (!selectedEvent.value) {
    uiStore.showMessage('請先選擇一個活動', 'error');
    return;
  }

  // 檢查是否已簽到
  const isAlreadyCheckedIn = checkedInMembers.value.some(record => record.personnel.id === person.id);
  if (isAlreadyCheckedIn) {
    uiStore.showMessage(`${person.name} 已簽到`, 'warning');
    return;
  }
  
  uiStore.setLoading(true);
  try {
    // 使用 data store 中的 action
    await dataStore.addCheckIn({
      event_id: selectedEvent.value,
      personnel_id: person.id,
    });
    uiStore.showMessage(`${person.name} 簽到成功`, 'success');
    // 清空搜尋框
    searchQuery.value = '';
    searchResults.value = [];
  } catch (error) {
    uiStore.showMessage(`簽到失敗: ${error.message}`, 'error');
  } finally {
    uiStore.setLoading(false);
  }
}

/**
 * 處理手動簽到按鈕點擊
 */
async function handleManualCheckIn() {
    if (searchResults.value.length === 1) {
        // 如果搜尋結果只有一筆，直接為他簽到
        await performCheckIn(searchResults.value[0]);
    } else if (searchResults.value.length > 1) {
        // 如果有多筆結果，提示使用者選擇
        uiStore.showMessage('找到多筆符合的人員，請從列表中點擊一位進行簽到', 'info');
    } else {
        // 如果沒有結果，提示錯誤
        uiStore.showMessage('找不到符合的人員，請確認姓名或編號是否正確', 'error');
    }
}


/**
 * 當選擇的活動變更時觸發
 */
async function handleEventChange() {
    searchQuery.value = '';
    searchResults.value = [];
    await fetchCheckedInMembers();
    subscribeToChanges();
}

// --- Lifecycle Hooks ---

onMounted(async () => {
  uiStore.setLoading(true);
  await dataStore.fetchEvents();
  if (events.value.length > 0) {
    // 預設選擇第一個活動
    selectedEvent.value = events.value[0].id;
    await fetchCheckedInMembers();
    subscribeToChanges();
  } else {
    uiStore.showMessage('目前沒有可用的活動', 'info');
  }
  uiStore.setLoading(false);
});

onUnmounted(() => {
  // 元件銷毀時，清除計時器和監聽
  clearTimeout(debounceTimer);
  if (checkInSubscription) {
    supabase.removeChannel(checkInSubscription);
  }
});

// 監聽 selectedEvent 的變化
watch(selectedEvent, (newEventId, oldEventId) => {
    if (newEventId !== oldEventId) {
        handleEventChange();
    }
});

</script>

<style scoped>
/* 可以在這裡添加一些此元件專用的 CSS，不過我們主要使用 Tailwind CSS */
</style>
