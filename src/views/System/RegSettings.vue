<template>
  <Modal :show="isModalOpen" @close="closeModal">
      <template #header>{{ isEditing ? '編輯註冊碼' : '新增註冊碼' }}</template>
      <form @submit.prevent="saveCode" class="space-y-4">
        <div>
          <label for="code" class="block text-sm font-medium text-gray-700">註冊碼</label>
          <input type="text" id="code" v-model="editableCode.code" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
        </div>
        <div>
          <label for="description" class="block text-sm font-medium text-gray-700">描述 (選填)</label>
          <input type="text" id="description" v-model="editableCode.description" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
        </div>

        <div>
          <label for="role" class="block text-sm font-medium text-gray-700">指定角色 (選填，預設為訪客)</label>
          <select id="role" v-model="editableCode.role_id" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white">
            <option :value="null">-- 無指定 (註冊後為 訪客) --</option>
            <option v-for="role in availableRolesForAssignment" :key="role.id" :value="role.id">
              {{ getRoleDisplayName(role.name) }}
            </option>
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
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'; // 引入 computed
import { useUiStore } from '@/store/ui';
import { useAuthStore } from '@/store/auth'; // 引入 authStore
import { useDataStore } from '@/store/data'; // 引入 dataStore
import * as api from '@/services/api';
import Modal from '@/components/Modal.vue';
import { format, parseISO, isPast } from 'date-fns';
import { USER_ROLE_NAMES } from '@/utils/constants'; // 引入角色名稱對應

const uiStore = useUiStore();
const authStore = useAuthStore();
const dataStore = useDataStore();
const isLoading = ref(true);

const settings = reactive({
  registration_code_required: false,
});
const codes = ref([]);

const isModalOpen = ref(false);
const isEditing = ref(false);
const editableCode = ref({});

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
      dataStore.fetchRolesAndPermissions() // 確保角色資料已載入

    ]);
  } catch (error) {
    uiStore.showMessage(`讀取設定失敗: ${error.message}`, 'error');
  } finally {
    isLoading.value = false;
    uiStore.setLoading(false);
  }
});

// 【*** 新增：過濾可指派角色的計算屬性 ***】
const availableRolesForAssignment = computed(() => {
    const currentUserRole = authStore.user?.roles?.name;
    if (currentUserRole === 'superadmin') {
        // 超級管理員可以指派所有角色
        return dataStore.roles; 
    }
    if (currentUserRole === 'admin') {
        // admin 不能指派 superadmin
        return dataStore.roles.filter(role => role.name !== 'superadmin');
    }
    if (currentUserRole === 'sdc') {
        // sdc 不能指派 superadmin 和 admin
        return dataStore.roles.filter(role => role.name !== 'superadmin' && role.name !== 'admin');
    }
    return []; // 其他角色不能指派
});

const getRoleDisplayName = (roleName) => USER_ROLE_NAMES[roleName] || roleName || '未知';

const loadSettings = async () => {
  const fetchedSettings = await api.fetchSettings();
  settings.registration_code_required = fetchedSettings.registration_code_required || false;
};

const loadCodes = async () => {
  codes.value = await api.fetchRegistrationCodes();
};

const saveSettings = async () => {
  uiStore.setLoading(true);
  try {
    await api.updateSetting('registration_code_required', settings.registration_code_required);
    uiStore.showMessage('設定已儲存', 'success');
  } catch (error) {
    uiStore.showMessage(`儲存設定失敗: ${error.message}`, 'error');
    // 回滾UI狀態
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
      role_id: code.role_id || null // 確保 role_id 被正確載入
    };
  } else {
    editableCode.value = {
      code: '',
      description: '',
      usage_limit: null,
      expires_at: '',
      role_id: null // 新增時預設為 null
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
      // 確保空字串轉為 null
      usage_limit: editableCode.value.usage_limit || null,
      expires_at: editableCode.value.expires_at ? new Date(editableCode.value.expires_at).toISOString() : null,
    };

    if (isEditing.value) {
      await api.updateRegistrationCode(payload.id, payload);
    } else {
      await api.createRegistrationCode(payload);
    }
    uiStore.showMessage('註冊碼已儲存', 'success');
    await loadCodes();
    closeModal();
  } catch (error) {
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
