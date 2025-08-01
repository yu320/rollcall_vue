<template>
  <div class="space-y-8">
    <div class="bg-white rounded-xl shadow-lg p-6 border border-indigo-200">
      <h2 class="text-3xl font-bold text-indigo-800 mb-4">系統設定</h2>
      <div class="space-y-4">
        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
          <div>
            <h3 class="font-semibold text-gray-800">啟用註冊碼功能</h3>
            <p class="text-sm text-gray-600">開啟後，所有新使用者必須提供有效的註冊碼才能註冊。</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" v-model="settings.registration_code_required" @change="updateSettings" class="sr-only peer">
            <div class="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-indigo-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>
      </div>
    </div>

    <div class="bg-white rounded-xl shadow-lg p-6 border border-indigo-200">
      <div class="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 class="text-3xl font-bold text-indigo-800">註冊碼管理</h2>
        <button @click="openModal()" class="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-lg">
          新增註冊碼
        </button>
      </div>
      
      <div v-if="isLoading" class="text-center py-10">載入中...</div>
      <div v-else class="overflow-x-auto table-responsive">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">註冊碼</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">綁定角色</th>
              <th class="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">剩餘次數</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">有效期限</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">創建者</th>
              <th class="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">操作</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-100">
            <tr v-for="code in codes" :key="code.id">
              <td data-label="註冊碼" class="px-6 py-4 font-mono text-indigo-600">{{ code.code }}</td>
              <td data-label="綁定角色" class="px-6 py-4">{{ getRoleName(code.role_id) }}</td>
              <td data-label="剩餘次數" class="px-6 py-4 text-center">{{ code.uses_left }}</td>
              <td data-label="有效期限" class="px-6 py-4">{{ code.expires_at ? formatDateTime(code.expires_at) : '永久有效' }}</td>
              <td data-label="創建者" class="px-6 py-4">{{ code.profiles?.nickname || '未知' }}</td>
              <td data-label="操作" class="px-6 py-4 text-right">
                <button @click="confirmDelete(code)" class="text-red-600 hover:text-red-800">刪除</button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="codes.length === 0" class="text-center py-10 text-gray-500">
          目前沒有任何註冊碼。
        </div>
      </div>
    </div>
    
    <Modal :show="isModalOpen" @close="closeModal">
      <template #header>新增註冊碼</template>
      <form @submit.prevent="handleSave">
        <div class="space-y-4">
          <div>
            <label for="code" class="block text-sm font-medium text-gray-700">註冊碼 (留空將自動生成)</label>
            <input type="text" id="code" v-model="editableCode.code" class="mt-1 block w-full border rounded-md p-2" placeholder="例如: NEW-USER-2025">
          </div>
          <div>
            <label for="role" class="block text-sm font-medium text-gray-700">綁定角色</label>
            <select id="role" v-model="editableCode.role_id" required class="mt-1 block w-full border rounded-md p-2 bg-white">
              <option disabled :value="null">請選擇一個角色</option>
              <option v-for="role in availableRoles" :key="role.id" :value="role.id">{{ role.name }}</option>
            </select>
          </div>
          <div>
            <label for="uses_left" class="block text-sm font-medium text-gray-700">可使用次數</label>
            <input type="number" id="uses_left" v-model.number="editableCode.uses_left" required min="1" class="mt-1 block w-full border rounded-md p-2">
          </div>
           <div>
            <label for="expires_at" class="block text-sm font-medium text-gray-700">有效期限 (選填)</label>
            <input type="datetime-local" id="expires_at" v-model="editableCode.expires_at" class="mt-1 block w-full border rounded-md p-2">
          </div>
        </div>
        <div class="mt-6 flex justify-end gap-3">
          <button type="button" @click="closeModal" class="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300">取消</button>
          <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">儲存</button>
        </div>
      </form>
    </Modal>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, computed } from 'vue';
import { useUiStore } from '@/store/ui';
import { useDataStore } from '@/store/data';
import * as api from '@/services/api';
import { formatDateTime } from '@/utils';
import Modal from '@/components/Modal.vue';

const uiStore = useUiStore();
const dataStore = useDataStore();

const isLoading = ref(true);
// 【修正】將預設值改為 true
const settings = reactive({ registration_code_required: true });
const codes = ref([]);
const isModalOpen = ref(false);
const editableCode = ref({});

const availableRoles = computed(() => dataStore.roles.filter(r => r.name !== 'superadmin'));

onMounted(async () => {
  await loadAllData();
});

const loadAllData = async () => {
  isLoading.value = true;
  uiStore.setLoading(true);
  try {
    await dataStore.fetchRolesAndPermissions();
    const fetchedSettings = await api.fetchSettings();
    // 【修正】只有當資料庫明確存儲為 false 時，才設定為 false。否則預設為 true。
    settings.registration_code_required = fetchedSettings.registration_code_required !== false;
    codes.value = await api.fetchRegistrationCodes();
  } catch (error) {
    uiStore.showMessage(`載入資料失敗: ${error.message}`, 'error');
  } finally {
    isLoading.value = false;
    uiStore.setLoading(false);
  }
};

const updateSettings = async () => {
  uiStore.setLoading(true);
  try {
    await api.updateSetting('registration_code_required', settings.registration_code_required);
    uiStore.showMessage('設定已更新', 'success');
  } catch (error) {
    uiStore.showMessage(`更新設定失敗: ${error.message}`, 'error');
    // 回滾更改
    settings.registration_code_required = !settings.registration_code_required;
  } finally {
    uiStore.setLoading(false);
  }
};

const getRoleName = (roleId) => {
  const role = dataStore.roles.find(r => r.id === roleId);
  return role ? role.name : '未知角色';
};

const openModal = () => {
  editableCode.value = {
    code: '',
    role_id: null,
    uses_left: 1,
    expires_at: ''
  };
  isModalOpen.value = true;
};

const closeModal = () => isModalOpen.value = false;

const handleSave = async () => {
  uiStore.setLoading(true);
  try {
    const payload = { ...editableCode.value };
    // 如果 code 是空的，則讓後端自動生成或處理
    if (!payload.code) delete payload.code;
    // 將本地時間轉換為 ISO 字串
    if (payload.expires_at) {
      payload.expires_at = new Date(payload.expires_at).toISOString();
    } else {
      payload.expires_at = null;
    }
    
    await api.createRegistrationCode(payload);
    uiStore.showMessage('註冊碼新增成功', 'success');
    await loadAllData();
    closeModal();
  } catch (error) {
    uiStore.showMessage(`新增失敗: ${error.message}`, 'error');
  } finally {
    uiStore.setLoading(false);
  }
};

const confirmDelete = (code) => {
  uiStore.showConfirmation(
    '確認刪除',
    `確定要刪除註冊碼 "${code.code}" 嗎？`,
    '刪除',
    'bg-red-600 hover:bg-red-700'
  ).then(async () => {
    uiStore.setLoading(true);
    try {
      await api.deleteRegistrationCode(code.id);
      uiStore.showMessage('刪除成功', 'success');
      await loadAllData();
    } catch (error) {
      uiStore.showMessage(`刪除失敗: ${error.message}`, 'error');
    } finally {
      uiStore.setLoading(false);
    }
  });
};
</script>