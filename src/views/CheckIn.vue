  <template>
    <div class="max-w-2xl mx-auto">
      <div class="bg-white rounded-xl shadow-lg p-8 border-2 border-dashed border-gray-300">
        <div class="text-center mb-8">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto text-indigo-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          <h2 class="text-3xl font-bold text-gray-800">刷卡報到</h2>
          <p class="text-gray-500 mt-2">請將學生證放置於刷卡機或是手動輸入學號進行報到</p>
        </div>

        <div class="mb-6 flex justify-center gap-4">
          <label class="inline-flex items-center cursor-pointer">
            <input type="radio" name="checkin-mode" value="簽到" v-model="actionType" class="form-radio h-5 w-5 text-indigo-600">
            <span class="ml-2 text-lg font-medium text-gray-800">簽到</span>
          </label>
          <label class="inline-flex items-center cursor-pointer">
            <input type="radio" name="checkin-mode" value="簽退" v-model="actionType" class="form-radio h-5 w-5 text-indigo-600">
            <span class="ml-2 text-lg font-medium text-gray-800">簽退</span>
          </label>
        </div>
        
        <div class="mb-6">
          <label for="eventSelector" class="block text-sm font-medium text-gray-700 mb-2">選擇活動 </label>
          <select id="eventSelector" v-model="selectedEventId" class="w-full pl-4 pr-10 py-3 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
            <option :value="null">-- 不選擇活動 (測試用) --</option>
            <option v-for="event in sortedEvents" :key="event.id" :value="event.id" :class="{'text-gray-500': isEventEnded(event.end_time)}">
              {{ event.name }} ({{ formatDateTime(event.start_time) }}) <span v-if="isEventEnded(event.end_time)">(已結束)</span>
            </option>
          </select>
        </div>

        <div class="relative">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
          </svg>
          <input type="text" id="checkInInput" v-model="checkInInput" @keyup.enter="handleCheckIn" class="w-full pl-14 pr-4 py-4 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="輸入學號/卡號">
        </div>
        <button @click="handleCheckIn" class="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-4 rounded-lg text-lg transition duration-300 ease-in-out transform hover:scale-105">
            確認{{ actionType }}
        </button>
      </div>

      <div v-if="checkInResult.isVisible" class="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 mt-8">
          <div :class="checkInResult.statusClass" class="px-6 py-4 text-center">
              <div class="check-in-animation inline-flex items-center justify-center w-16 h-16 rounded-full text-white mb-4">
                  <component :is="checkInResult.statusIcon" class="h-10 w-10"></component>
              </div>
              <h3 class="text-2xl font-bold text-gray-800">{{ checkInResult.statusText }}</h3>
          </div>
          <div class="p-6">
              <div class="mb-6">
                  <div class="text-center mb-4">
                      <div v-if="checkInResult.person" class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-indigo-100 text-indigo-800 text-2xl font-bold mb-2">{{ checkInResult.person.name.charAt(0) }}</div>
                      <h3 v-if="checkInResult.person" class="text-xl font-bold">{{ checkInResult.person.name }}</h3>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div v-if="checkInResult.person" class="bg-gray-50 p-3 rounded-lg">
                          <p class="text-sm text-gray-500">學號</p>
                          <p class="font-medium" :class="dataStore.getInputColorClass(checkInResult.person.code)">{{ checkInResult.person.code }}</p>
                      </div>
                      <div v-if="checkInResult.person" class="bg-gray-50 p-3 rounded-lg">
                          <p class="text-sm text-gray-500">卡號</p>
                          <p class="font-medium">{{ checkInResult.person.card_number }}</p>
                      </div>
                      <div v-if="checkInResult.event" class="col-span-1 sm:col-span-2 bg-indigo-50 p-3 rounded-lg">
                          <p class="text-sm text-gray-500">活動</p>
                          <p class="font-medium text-indigo-800">{{ checkInResult.event.name }}</p>
                      </div>
                      <div v-else class="col-span-1 sm:col-span-2 bg-gray-50 p-3 rounded-lg">
                          <p class="text-sm text-gray-500">輸入內容</p>
                          <p class="font-medium">{{ checkInResult.input }}</p>
                          <p class="text-sm text-gray-500 mt-1">請確認{{ checkInResult.inputType }}是否正確，或聯繫管理員。</p>
                      </div>
                  </div>
              </div>
              <div class="text-center">
                  <button @click="resetCheckIn" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-8 rounded-lg transition duration-300 transform hover:scale-105 shadow-md">
                      繼續報到
                  </button>
              </div>
          </div>
      </div>
      
      <div class="mt-10">
        <div class="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h3 class="text-2xl font-bold text-gray-800">今日暫存記錄</h3>
          <div class="flex flex-wrap gap-3 justify-center w-full sm:w-auto">
            <button @click="deleteAllTodayRecords" class="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition duration-300 flex items-center justify-center shadow-sm hover:shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clip-rule="evenodd" /></svg>
              刪除全部
            </button>
            <button @click="saveTodayRecords" class="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded-lg transition duration-300 flex items-center justify-center shadow-sm hover:shadow-md">
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
                  <th scope="col" class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">時間</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">姓名</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">學號/卡號</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">類型</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">狀態</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">活動</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">裝置ID</th>
                  <th scope="col" class="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-100">
                <tr v-for="record in todayRecords" :key="record.id">
                  <td data-label="時間" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatDateTime(record.created_at, 'HH:mm:ss') }}</td>
                  <td data-label="姓名" class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ record.name_at_checkin || '—' }}</td>
                  <td data-label="學號/卡號" class="px-6 py-4 whitespace-nowrap text-sm text-gray-800" :class="dataStore.getInputColorClass(record.input)">{{ record.input }}</td>
                  <td data-label="類型" class="px-6 py-4 whitespace-nowrap"><span class="type-badge" :data-type="record.action_type">{{ record.action_type }}</span></td>
                  <td data-label="狀態" class="px-6 py-4 whitespace-nowrap"><span class="status-badge" :data-status="record.status">{{ record.status }}</span></td>
                  <td data-label="活動" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ record.event_id ? dataStore.getEventById(record.event_id)?.name || 'N/A' : '—' }}</td>
                  <td data-label="裝置ID" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate" style="max-width: 150px;">{{ record.device_id || '—' }}</td>
                  <td data-label="操作" class="px-6 py-4 whitespace-nowrap text-right">
                    <button @click="handleDeleteTempRecord(record.id)" class="text-red-600 hover:text-red-800 text-sm font-medium">刪除</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-if="todayRecords.length === 0" class="py-8 text-center text-gray-500 text-lg">尚無報到記錄</div>
        </div>
      </div>
    </div>
  </template>

  <script setup>
  import { ref, onMounted, computed, watch } from 'vue';
  import { useUiStore } from '@/store/ui';
  import { useDataStore } from '@/store/data';
  import * as api from '@/services/api';
  import { formatDateTime } from '@/utils'; // 從 utils 引入格式化日期函數
  import { isPast, parseISO } from 'date-fns';

  // SVG 圖標組件，用於動態渲染
  // 這裡將常用的 SVG 路徑定義為組件，以便在 <component :is="..."> 中使用
  const CheckCircleIcon = { template: `<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>` };
  const XCircleIcon = { template: `<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>` };
  const ClockIcon = { template: `<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>` };
  const WarningIcon = { template: `<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>` };
  const RepeatIcon = { template: `<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9.247a4.998 4.998 0 00-.776 2.343M11.603 16.03a6.002 6.002 0 00.99 1.139M15 14l-3-3m0 0l-3-3m3 3l3 3m0 0l3-3m0 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>` };

  // Pinia Stores
  const uiStore = useUiStore();
  const dataStore = useDataStore();

  // Component State
  const checkInInput = ref('');
  const selectedEventId = ref(null);
  const actionType = ref('簽到'); // 預設為簽到
  const checkInResult = ref({
    isVisible: false,
    statusClass: '',
    statusIcon: null,
    statusText: '',
    person: null,
    event: null,
    input: '',
    inputType: ''
  });

  // 使用 localStorage 或 sessionStorage 儲存今日暫存記錄
  const TODAY_RECORDS_KEY = 'todayCheckInRecords';
  const todayRecords = ref([]);

  // Computed properties
  const sortedEvents = computed(() => {
    return [...dataStore.events].sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
  });

  // 判斷活動是否已結束
  const isEventEnded = (endTime) => {
      if (!endTime) return false;
      return isPast(parseISO(endTime));
  };

  // --- Lifecycle Hooks ---
  onMounted(async () => {
    uiStore.setLoading(true);
    try {
      // 確保人員和活動資料已載入，供報到邏輯使用
      await Promise.all([
        dataStore.fetchAllPersonnel(),
        dataStore.fetchEvents()
      ]);
      
      // 載入 localStorage 中的暫存記錄
      loadTodayRecordsFromLocalStorage();
      
      // 預設選擇第一個活動 (如果有的話)
      if (dataStore.events.length > 0) {
        selectedEventId.value = dataStore.events[0].id;
      }
    } catch (error) {
      uiStore.showMessage(`初始化報到頁面失敗: ${error.message}`, 'error');
    } finally {
      uiStore.setLoading(false);
    }
  });

  // 監聽 todayRecords 變化時自動儲存到 localStorage
  watch(todayRecords, (newRecords) => {
      localStorage.setItem(TODAY_RECORDS_KEY, JSON.stringify(newRecords));
  }, { deep: true });

  // --- Methods ---

  const loadTodayRecordsFromLocalStorage = () => {
      try {
          const storedRecords = localStorage.getItem(TODAY_RECORDS_KEY);
          todayRecords.value = storedRecords ? JSON.parse(storedRecords) : [];
      } catch (e) {
          console.error("無法從 localStorage 解析暫存記錄:", e);
          todayRecords.value = [];
      }
  };

  const handleCheckIn = async () => {
    const input = checkInInput.value.trim();
    if (!input) {
      uiStore.showMessage('請輸入學號或卡號', 'info');
      return;
    }

    const allPersonnel = dataStore.personnel;
    const currentEvent = selectedEventId.value ? dataStore.events.find(e => e.id === selectedEventId.value) : null;

    let person = null;
    let inputType = '';

    // 判斷輸入類型並查找人員
    if (/^\d+$/.test(input)) { // 判斷是否為純數字 (卡號)
      inputType = '卡號';
      person = allPersonnel.find(p => String(p.card_number) === input);
    } else { // 否則視為學號
      inputType = '學號';
      person = allPersonnel.find(p => String(p.code).toLowerCase() === input.toLowerCase());
    }

    let recordStatus = '';
    let isSuccess = false;

    // 檢查是否已存在重複的簽到/簽退記錄
    const existingRecord = todayRecords.value.find(
      r => r.personnel_id === (person ? person.id : null) &&
          r.event_id === selectedEventId.value &&
          r.action_type === actionType.value &&
          r.success // 只檢查成功的記錄
    );

    if (!person) {
      recordStatus = `${actionType.value}失敗 - 查無此人`;
      isSuccess = false;
    } else if (existingRecord) {
        recordStatus = `重複${actionType.value}`;
        isSuccess = false; // 重複操作不視為成功
    } else {
      isSuccess = true;
      if (actionType.value === '簽到') {
          if (currentEvent) {
              const eventTime = currentEvent.end_time ? parseISO(currentEvent.end_time) : parseISO(currentEvent.start_time);
              recordStatus = (new Date() > eventTime) ? '遲到' : '準時';
          } else {
              recordStatus = '成功'; // 未選擇活動
          }
      } else { // 簽退
          // 檢查是否有對應活動的「簽到」記錄
          const hasCheckedIn = todayRecords.value.some(
              r => r.personnel_id === person.id && 
                  r.event_id === selectedEventId.value && 
                  r.action_type === '簽到' && 
                  r.success
          );

          if (!hasCheckedIn && selectedEventId.value) { // 如果有選定活動但沒有簽到記錄
              recordStatus = '異常(未簽到)';
              isSuccess = true; // 視為簽退操作成功，但帶有異常狀態
          } else {
              recordStatus = '簽退成功';
          }
      }
    }

    const newRecord = {
      id: crypto.randomUUID(), // 生成唯一 ID
      created_at: new Date().toISOString(),
      input: input,
      input_type: inputType,
      success: isSuccess,
      name_at_checkin: person ? person.name : null,
      personnel_id: person ? person.id : null,
      device_id: getDeviceId(), // 假設 getDeviceId 函數存在於 utils
      event_id: selectedEventId.value || null,
      status: recordStatus,
      action_type: actionType.value,
    };

    todayRecords.value.unshift(newRecord); // 新增到列表頂部

    displayCheckInResult(newRecord, person, currentEvent);
    checkInInput.value = ''; // 清空輸入框
  };

  const displayCheckInResult = (record, person, event) => {
    let statusColorClass = '';
    let statusIconComponent = null;
    let messageBoxType = 'info';

    switch (record.status) {
      case '準時':
        statusColorClass = 'bg-green-100 text-green-800'; // 綠色背景，綠色文字
        statusIconComponent = CheckCircleIcon;
        messageBoxType = 'success';
        break;
      case '遲到':
        statusColorClass = 'bg-yellow-100 text-yellow-800'; // 黃色背景，黃色文字
        statusIconComponent = ClockIcon;
        messageBoxType = 'warning';
        break;
      case '成功': // 通用成功狀態，用於未綁定活動的簽到
        statusColorClass = 'bg-blue-100 text-blue-800';
        statusIconComponent = CheckCircleIcon;
        messageBoxType = 'success';
        break;
      case '簽退成功':
        statusColorClass = 'bg-blue-100 text-blue-800';
        statusIconComponent = CheckCircleIcon;
        messageBoxType = 'success';
        break;
      case '重複簽到':
      case '重複簽退':
        statusColorClass = 'bg-yellow-100 text-yellow-800';
        statusIconComponent = RepeatIcon;
        messageBoxType = 'warning';
        break;
      case '異常(未簽到)':
        statusColorClass = 'bg-red-100 text-red-800';
        statusIconComponent = WarningIcon;
        messageBoxType = 'warning'; // 雖然是異常，但操作成功
        break;
      default: // 失敗情況
        statusColorClass = 'bg-red-100 text-red-800';
        statusIconComponent = XCircleIcon;
        messageBoxType = 'error';
        break;
    }

    checkInResult.value = {
      isVisible: true,
      statusClass: statusColorClass.replace('text-', 'bg-').replace('-100', '-500') + ' ' + statusColorClass.replace('bg-', 'text-').replace('-100', '-800'), // 設置背景和文字顏色
      statusIcon: statusIconComponent,
      statusText: record.status,
      person: person,
      event: event,
      input: record.input,
      inputType: record.input_type
    };
    
    // 顯示訊息框
    const msgText = `${record.status}：${person ? person.name : record.input}`;
    uiStore.showMessage(msgText, messageBoxType);
  };


  const resetCheckIn = () => {
    checkInResult.value.isVisible = false;
    checkInInput.value = '';
    // 可以重新聚焦到輸入框，但 Vue 通常會自動處理
  };

  const saveTodayRecords = async () => {
    if (todayRecords.value.length === 0) {
      uiStore.showMessage('目前沒有可儲存的報到記錄。', 'info');
      return;
    }
    
    uiStore.setLoading(true);
    try {
      await api.saveRecords(todayRecords.value); // 調用 API 服務儲存
      uiStore.showMessage('今日報到記錄已成功儲存至資料庫。', 'success');
      todayRecords.value = []; // 清空暫存記錄
    } catch (error) {
      uiStore.showMessage(`儲存今日記錄失敗: ${error.message}`, 'error');
    } finally {
      uiStore.setLoading(false);
    }
  };

  const deleteAllTodayRecords = async () => {
    if (todayRecords.value.length === 0) {
      uiStore.showMessage('目前沒有任何報到記錄可刪除。', 'info');
      return;
    }
    
    try {
      const confirmed = await uiStore.showConfirmation('確認清除全部暫存記錄', '此操作不會刪除已儲存的資料。');
      if (confirmed) {
        todayRecords.value = []; // 清空暫存記錄
        uiStore.showMessage('已清除所有暫存記錄。', 'success');
      }
    } catch (error) {
      // 使用者取消，不執行任何操作
      console.log("清除操作已取消");
    }
  };

  const handleDeleteTempRecord = (id) => {
    todayRecords.value = todayRecords.value.filter(record => record.id !== id);
    uiStore.showMessage('記錄已從暫存列表移除。', 'info');
  };

  // 輔助函數：獲取設備ID (從舊專案的 utils.js 遷移)
  function getDeviceId() {
    let deviceId = localStorage.getItem('uniqueDeviceId');
    if (!deviceId) {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        deviceId = crypto.randomUUID();
      } else {
        deviceId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      }
      localStorage.setItem('uniqueDeviceId', deviceId);
    }
    return deviceId;
  }

  // 輔助函數：判斷是否為有效卡號 (從舊專案的 utils.js 遷移)
  function isValidCardNumber(cardNumber) {
      return /^\d+$/.test(cardNumber);
  }

  </script>

  <style scoped>
  /* 數據表格樣式 */
  /* 這裡的樣式應該已經在 main.css 中，確保響應式表格正常工作 */
  </style>
