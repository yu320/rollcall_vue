<template>
  <div class="space-y-8">
    <div class="p-6 bg-white rounded-xl shadow-lg border border-indigo-200">
      <h2 class="text-3xl font-bold mb-4 text-indigo-800">註冊設定</h2>
      <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div>
          <h3 class="font-semibold text-gray-800">強制啟用註冊碼</h3>
          <p class="text-sm text-gray-500">開啟後，所有從前台註冊的使用者都必須提供有效的註冊碼。</p>
        </div>
        <label class="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" v-model="settings.registration_code_required" @change="saveSettings" class="sr-only peer">
          <div class="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-indigo-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
        </label>
      </div>
    </div>

    <div class="p-6 bg-white rounded-xl shadow-lg border border-indigo-200">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h2 class="text-3xl font-bold text-indigo-800">註冊碼管理</h2>
          <p class="text-gray-600 mt-1">管理可供使用者註冊的註冊碼列表。</p>
        </div>
        <button @click="openModal()" class="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-lg shadow-md transition flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          新增註冊碼
        </button>
      </div>

      <div v-if="isLoading" class="text-center py-10 text-gray-500">載入註冊碼中...</div>
      <div v-else-if="codes.length === 0" class="text-center py-10 text-gray-500">尚未建立任何註冊碼。</div>
      <div v-else class="overflow-x-auto table-responsive">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">註冊碼</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">描述</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">綁定角色</th>
              <th class="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">使用次數</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">過期時間</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">建立者</th>
              <th class="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-100">
            <tr v-for="code in codes" :key="code.id" class="hover:bg-gray-50">
              <td data-label="註冊碼" class="px-6 py-4 font-mono text-indigo-700 font-semibold">{{ code.code }}</td>
              <td data-label="描述" class="px-6 py-4 text-sm text-gray-500">{{ code.description || '—' }}</td>
              <td data-label="綁定角色" class="px-6 py-4 text-sm text-gray-600">
                <span :class="getRoleClass(getRoleName(code.role_id))">
                  {{ getRoleDisplayName(getRoleName(code.role_id)) }}
                </span>
              </td>
              <td data-label="使用次數" class="px-6 py-4 text-sm text-center">
                <span :class="getUsageClass(code)">{{ code.times_used }} / {{ code.usage_limit || '∞' }}</span>
              </td>
              <td data-label="過期時間" class="px-6 py-4 text-sm">
                <span :class="getExpiryClass(code.expires_at)">{{ formatDateTime(code.expires_at) || '永不過期' }}</span>
              </td>
              <td data-label="建立者" class="px-6 py-4 text-sm text-gray-500">{{ code.profiles?.nickname || '未知' }}</td>
              <td data-label="操作" class="px-6 py-4 text-right text-sm font-medium">
                <button @click="openModal(code)" class="text-indigo-600 hover:text-indigo-800 mr-3 p-1 rounded-full hover:bg-indigo-100" aria-label="編輯">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" />
                  </svg>
                </button>
                <button @click="confirmDelete(code)" class="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-100" aria-label="刪除">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <Modal :show="isModalOpen" @close="closeModal">
      <template #header>{{ isEditing ? '編輯註冊碼' : '新增註冊碼' }}</template>
      <form @submit.prevent="saveCode" class="space-y-4">
        <div>
          <label for="code" class="block text-sm font-medium text-gray-700">註冊碼</label>
          <div class="mt-1 flex rounded-md shadow-sm">
            <input type="text" id="code" v-model="editableCode.code" required class="flex-1 block w-full border-gray-300 rounded-none rounded-l-md focus:ring-indigo-500 focus:border-indigo-500">
            <button @click="generateRandomCode" type="button" class="relative -ml-px inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 text-sm font-medium rounded-r-md text-gray-700 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6V4m0 16v-2m8-8h2M4 12H2m15.364 6.364l-1.414-1.414M6.343 6.343l-1.414 1.414m12.728 0l-1.414-1.414M6.343 17.657l-1.414-1.414M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span>隨機</span>
            </button>
          </div>
        </div>
        <div>
          <label for="description" class="block text-sm font-medium text-gray-700">描述 (選填)</label>
          <input type="text" id="description" v-model="editableCode.description" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
        </div>
        <div>
          <label for="role" class="block text-sm font-medium text-gray-700">綁定角色</label>
          <select id="role" v-model="editableCode.role_id" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white">
            <option v-for="role in availableRoles" :key="role.id" :value="role.id">{{ getRoleDisplayName(role.name) }}</option>
          </select>
        </div>
        <div>
          <label for="usage_limit" class="block text-sm font-medium text-gray-700">使用次數上限 (選填，留空表示無限)</label>
          <input type="number" id="usage_limit" v-model.number="editableCode.usage_limit" min="0" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
        </div>
        <div>
          <label for="expires_at" class="block text-sm font-medium text-gray-700">過期時間 (選填，留空表示永不過期)</label>
          <input type="datetime-local" id="expires_at" v-model="editableCode.expires_at" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
        </div>
        <div class="pt-4 flex justify-end gap-3">
          <button type="button" @click="closeModal" class="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300">取消</button>
          <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">儲存</button>
        </div>
      </form>
    </Modal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { useUiStore } from '@/store/ui';
import { useDataStore } from '@/store/data';
import { useAuthStore } from '@/store/auth';
import * as api from '@/services/api';
import Modal from '@/components/Modal.vue';
import { format, parseISO, isPast } from 'date-fns';
import { USER_ROLE_NAMES } from '@/utils/constants';

const uiStore = useUiStore();
const dataStore = useDataStore();
const authStore = useAuthStore();

const isLoading = ref(true);

const settings = reactive({
  registration_code_required: false,
});
const codes = ref([]);

const isModalOpen = ref(false);
const isEditing = ref(false);
const editableCode = ref({});

const availableRoles = computed(() => {
  const currentUserRole = authStore.user?.roles?.name;
  
  if (currentUserRole === 'superadmin') {
    return dataStore.roles;
  }
  if (currentUserRole === 'admin') {
    return dataStore.roles.filter(r => r.name !== 'superadmin');
  }
  if (currentUserRole === 'sdc') {
    return dataStore.roles.filter(r => !['superadmin', 'admin'].includes(r.name));
  }
  return [];
});

const toLocalISOString = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
};

onMounted(async () => {
  isLoading.value = true;
  uiStore.setLoading(true);
  try {
    await Promise.all([
      loadSettings(),
      loadCodes(),
      dataStore.fetchRolesAndPermissions()
    ]);
  } catch (error) {
    uiStore.showMessage(`讀取設定失敗: ${error.message}`, 'error');
  } finally {
    isLoading.value = false;
    uiStore.setLoading(false);
  }
});

const loadSettings = async () => {
  const fetchedSettings = await api.fetchSettings();
  settings.registration_code_required = fetchedSettings.registration_code_required || false;
};

const loadCodes = async () => {
  codes.value = await api.fetchRegistrationCodes();
};

const getRoleName = (roleId) => {
  if (!roleId) return null;
  const role = dataStore.roles.find(r => r.id === roleId);
  return role ? role.name : '未知角色';
};

const getRoleDisplayName = (roleName) => USER_ROLE_NAMES[roleName] || roleName || '預設';

const getRoleClass = (roleName) => {
  switch (roleName) {
    case 'superadmin': return 'px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800';
    case 'admin': return 'px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800';
    case 'sdc': return 'px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800';
    case 'operator': return 'px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800';
    case 'sdsc': return 'px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800';
    default: return 'px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800';
  }
};

const saveSettings = async () => {
  uiStore.setLoading(true);
  try {
    await api.updateSetting('registration_code_required', settings.registration_code_required);
    uiStore.showMessage('設定已儲存', 'success');
  } catch (error) {
    uiStore.showMessage(`儲存設定失敗: ${error.message}`, 'error');
    settings.registration_code_required = !settings.registration_code_required;
  } finally {
    uiStore.setLoading(false);
  }
};

const openModal = (code = null) => {
  isEditing.value = !!code;
  if (code) {
    editableCode.value = { 
      ...code,
      expires_at: toLocalISOString(code.expires_at)
    };
  } else {
    editableCode.value = {
      code: '',
      description: '',
      role_id: availableRoles.value[0]?.id || null,
      usage_limit: 1,
      expires_at: '',
    };
  }
  isModalOpen.value = true;
};

const closeModal = () => {
  isModalOpen.value = false;
};

const saveCode = async () => {
  uiStore.setLoading(true);
  try {
    const payload = {
      ...editableCode.value,
      usage_limit: editableCode.value.usage_limit || null,
      expires_at: editableCode.value.expires_at ? new Date(editableCode.value.expires_at).toISOString() : null,
    };
    
    // Ensure times_used is not sent on creation
    if (!isEditing.value) {
      delete payload.times_used;
    }

    if (isEditing.value) {
      await api.updateRegistrationCode(payload.id, payload);
    } else {
      await api.createRegistrationCode(payload);
    }
    uiStore.showMessage('註冊碼已儲存', 'success');
    await loadCodes();
    closeModal();
  } catch (error)
 {
    uiStore.showMessage(`儲存註冊碼失敗: ${error.message}`, 'error');
  } finally {
    uiStore.setLoading(false);
  }
};

const confirmDelete = (code) => {
  uiStore.showConfirmation(
    '確認刪除',
    `您確定要刪除註冊碼 "${code.code}" 嗎？此操作無法復原。`,
    '確認刪除',
    'bg-red-600 hover:bg-red-700'
  ).then(async () => {
    uiStore.setLoading(true);
    try {
      await api.deleteRegistrationCode(code.id);
      uiStore.showMessage('註冊碼已刪除', 'success');
      await loadCodes();
    } catch (error) {
      uiStore.showMessage(`刪除失敗: ${error.message}`, 'error');
    } finally {
      uiStore.setLoading(false);
    }
  });
};

const generateRandomCode = () => {
   const length = 8;
   let result = '';
   const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
   const charactersLength = characters.length;
   for (let i = 0; i < length; i++) {
     result += characters.charAt(Math.floor(Math.random() * charactersLength));
   }
   editableCode.value.code = result;
};

const formatDateTime = (isoString) => {
  if (!isoString) return null;
  return format(parseISO(isoString), 'yyyy-MM-dd HH:mm');
};

const getUsageClass = (code) => {
  if (code.usage_limit !== null && code.times_used >= code.usage_limit) {
    return 'font-bold text-red-600';
  }
  return 'text-gray-700';
};

const getExpiryClass = (expires_at) => {
  if (expires_at && isPast(parseISO(expires_at))) {
    return 'font-bold text-red-600';
  }
  return 'text-gray-700';
};
</script>