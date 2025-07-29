<template>
  <div class="p-6 bg-white rounded-xl shadow-lg border border-indigo-200">
    <h2 class="text-3xl font-bold mb-6 text-indigo-800">帳號管理</h2>

    <!-- Section for Batch Account Import -->
    <div v-if="canManageAccounts" class="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
      <h3 class="text-xl font-bold text-indigo-700 mb-4">批次新增帳號</h3>
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
        <label for="importAccountFile" class="block text-gray-700 font-medium">從 CSV 檔案匯入</label>
        <a href="#" @click.prevent="downloadSample" class="text-sm text-indigo-600 hover:text-indigo-800 font-medium mt-2 sm:mt-0">下載範例檔</a>
      </div>
      <input type="file" @change="handleFileSelect" accept=".csv" class="w-full text-gray-700 border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-400">
      <p v-if="selectedFile" class="text-gray-500 text-sm mt-2">已選擇檔案: {{ selectedFile.name }}</p>
      <button @click="importAccounts" :disabled="!selectedFile" class="mt-5 w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-6 rounded-lg transition duration-300 flex items-center justify-center shadow-md hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed">
        匯入帳號
      </button>
      <div v-if="importResults.failed.length > 0" class="mt-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
        <p class="font-semibold">部分帳號匯入失敗:</p>
        <ul class="list-disc list-inside mt-1">
          <li v-for="(error, index) in importResults.failed" :key="index">{{ error.email || '未知帳號' }}: {{ error.error }}</li>
        </ul>
      </div>
    </div>

    <!-- Action bar: Search, Batch Delete, Batch Edit, Add Account -->
    <div class="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
      <div class="relative w-full sm:w-auto">
        <input type="text" v-model="searchTerm" placeholder="搜尋 Email 或暱稱..." class="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 w-full sm:w-64">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
      </div>
      <div class="flex items-center gap-3 flex-wrap justify-center sm:justify-end w-full sm:w-auto">
        <button v-if="selectedAccounts.length > 0 && canManageAccounts" @click="confirmBatchDelete" class="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition duration-300 flex items-center justify-center shadow-sm hover:shadow-md">
          批次刪除 ({{ selectedAccounts.length }})
        </button>
        <!-- [NEW] Batch Edit Button -->
        <button v-if="selectedAccounts.length > 0 && canManageAccounts" @click="openBatchEditModal" class="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition duration-300 flex items-center justify-center shadow-sm hover:shadow-md">
          批次修改 ({{ selectedAccounts.length }})
        </button>
        <button v-if="canManageAccounts" @click="openModal()" class="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition duration-300 flex items-center justify-center shadow-md hover:shadow-lg">
          新增單一帳號
        </button>
      </div>
    </div>

    <!-- Accounts Table -->
    <div v-if="isLoading" class="text-center py-10">載入中...</div>
    <div v-else class="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-md table-responsive">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-4 py-3 text-left w-12"><input type="checkbox" v-model="selectAll" :disabled="!canManageAccounts" class="h-4 w-4 text-indigo-600 rounded focus:ring-indigo-500"></th>
            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">電子郵件</th>
            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">暱稱</th>
            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">角色</th>
            <th class="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">操作</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-100">
          <tr v-for="account in filteredAccounts" :key="account.id" class="hover:bg-gray-50">
            <td data-label="選取" class="px-4 py-4"><input type="checkbox" v-model="selectedAccounts" :value="account.id" :disabled="!canEditAccount(account)" class="h-4 w-4 text-indigo-600 rounded disabled:bg-gray-300"></td>
            <td data-label="電子郵件" class="px-6 py-4 text-sm font-medium text-gray-900 break-all">{{ account.email }}</td>
            <td data-label="暱稱" class="px-6 py-4 text-sm text-gray-500">{{ account.nickname || '—' }}</td>
            <td data-label="角色" class="px-6 py-4 text-sm"><span :class="getRoleClass(account.roles?.name)">{{ getRoleDisplayName(account.roles?.name) }}</span></td>
            <td data-label="操作" class="px-6 py-4 text-right text-sm font-medium">
              <button v-if="canEditAccount(account)" @click="openModal(account)" class="text-indigo-600 hover:text-indigo-800 mr-4">編輯</button>
              <button v-if="canEditAccount(account)" @click="confirmSingleDelete(account)" class="text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed" :disabled="isCurrentUser(account.id)">刪除</button>
              <span v-else class="text-gray-400">—</span>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="filteredAccounts.length === 0" class="py-12 text-center">
        <p class="text-gray-500">沒有找到符合的帳號。</p>
      </div>
    </div>

    <!-- Add/Edit Account Modal -->
    <Modal :show="isModalOpen" @close="closeModal">
      <template #header>{{ isEditing ? '編輯帳號' : '新增帳號' }}</template>
      <form @submit.prevent="saveAccount">
        <div class="mb-4">
          <label for="accountEmail" class="block text-gray-700 font-medium mb-2">使用者 Email</label>
          <!-- [MODIFIED] 將 type 改為 text, 以避免瀏覽器預設的 Email 驗證 -->
          <input type="text" id="accountEmail" v-model="editableAccount.email" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
        </div>
        <div class="mb-4">
          <label for="accountNickname" class="block text-gray-700 font-medium mb-2">暱稱</label>
          <input type="text" id="accountNickname" v-model="editableAccount.nickname" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
        </div>
        <div class="mb-4">
          <label for="accountPassword" class="block text-sm font-medium text-gray-700">密碼 <span v-if="isEditing" class="text-sm text-gray-500">(留空表示不修改)</span></label>
          <input type="password" id="accountPassword" v-model="editableAccount.password" :required="!isEditing" minlength="6" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="至少6位數">
        </div>
        <div class="mb-6">
          <label for="accountRole" class="block text-gray-700 font-medium mb-2">角色</label>
          <select id="accountRole" v-model="editableAccount.role_id" class="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500">
            <option v-for="role in availableRolesForAssignment" :key="role.id" :value="role.id">
              {{ getRoleDisplayName(role.name) }}
            </option>
          </select>
        </div>
        <div class="flex flex-col sm:flex-row-reverse gap-3">
          <button type="submit" class="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-lg">儲存</button>
          <button type="button" @click="closeModal" class="w-full sm:w-auto bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-6 rounded-lg">取消</button>
        </div>
      </form>
    </Modal>

    <!-- [NEW] Batch Edit Modal -->
    <Modal :show="isBatchEditModalOpen" @close="closeBatchEditModal">
      <template #header>批量修改帳號 ({{ selectedAccounts.length }} 個)</template>
      <form @submit.prevent="handleBatchEdit">
        <div class="mb-4">
          <label for="batchRole" class="block text-gray-700 font-medium mb-2">新的角色 (選填)</label>
          <select id="batchRole" v-model="batchEditData.new_role_id" class="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500">
            <option :value="null">-- 不修改 --</option>
            <option v-for="role in availableRolesForAssignment" :key="role.id" :value="role.id">
              {{ getRoleDisplayName(role.name) }}
            </option>
          </select>
        </div>
        <div class="mb-6">
          <label for="batchPassword" class="block text-gray-700 font-medium mb-2">新的密碼 (選填，留空表示不修改)</label>
          <input type="password" id="batchPassword" v-model="batchEditData.new_password" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="至少6位數">
          <p v-if="batchEditPasswordError" class="text-red-600 text-sm mt-1">{{ batchEditPasswordError }}</p>
        </div>
        <div class="flex flex-col sm:flex-row-reverse gap-3">
          <button type="submit" class="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-lg">確認修改</button>
          <button type="button" @click="closeBatchEditModal" class="w-full sm:w-auto bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-6 rounded-lg">取消</button>
        </div>
      </form>
    </Modal>

  </div>
</template>

<script setup>
import { ref, onMounted, computed, reactive } from 'vue'; // 引入 reactive
import { useUiStore } from '@/store/ui';
import { useAuthStore } from '@/store/auth';
import { useDataStore } from '@/store/data';
import * as api from '@/services/api';
import Modal from '@/components/Modal.vue';
import { DEFAULT_EMAIL_DOMAIN, USER_ROLE_NAMES } from '@/utils/constants';

const uiStore = useUiStore();
const authStore = useAuthStore();
const dataStore = useDataStore();

const isLoading = ref(true);
const accounts = ref([]);
const searchTerm = ref('');
const selectedAccounts = ref([]);
const isModalOpen = ref(false);
const isEditing = ref(false);
const editableAccount = ref({});
const selectedFile = ref(null);
const importResults = ref({ success: 0, failed: [] });

// [NEW] Batch Edit Modal State
const isBatchEditModalOpen = ref(false);
const batchEditData = reactive({
  new_role_id: null,
  new_password: '',
});
const batchEditPasswordError = ref(''); // For password validation in batch edit modal

// 將 canManageAccounts 權限檢查更改為 accounts:manage_users
const canManageAccounts = computed(() => authStore.hasPermission('accounts:manage_users'));
const currentUserRole = computed(() => authStore.user?.roles?.name);

onMounted(async () => {
  isLoading.value = true;
  await Promise.all([
    refreshAccounts(),
    dataStore.fetchRolesAndPermissions()
  ]);
  isLoading.value = false;
});

const refreshAccounts = async () => {
  try {
    accounts.value = await api.fetchAllAccounts();
  } catch(error) {
    uiStore.showMessage(`讀取帳號列表失敗: ${error.message}`, 'error');
  }
};

const filteredAccounts = computed(() => {
  if (!searchTerm.value) return accounts.value;
  const lowercasedFilter = searchTerm.value.toLowerCase();
  return accounts.value.filter(acc => 
    acc.email.toLowerCase().includes(lowercasedFilter) ||
    (acc.nickname && acc.nickname.toLowerCase().includes(lowercasedFilter))
  );
});

const availableRolesForAssignment = computed(() => {
    if (currentUserRole.value === 'superadmin') {
        return dataStore.roles;
    }
    // 管理員不能建立超級管理員，但可以建立其他所有角色
    if (currentUserRole.value === 'admin') { 
        return dataStore.roles.filter(role => role.name !== 'superadmin');
    }
    return []; // 其他角色不能建立帳號
});

const selectAll = computed({
  get: () => {
    const selectableAccounts = filteredAccounts.value.filter(acc => canEditAccount(acc));
    return selectableAccounts.length > 0 && selectedAccounts.value.length === selectableAccounts.length;
  },
  set: (value) => {
    if (!canManageAccounts.value) { // 這裡仍使用 canManageAccounts 來判斷是否有權限進行批量選擇
        selectedAccounts.value = [];
        return;
    }
    const selectableAccountIds = filteredAccounts.value.filter(acc => canEditAccount(acc)).map(acc => acc.id);
    selectedAccounts.value = value ? selectableAccountIds : [];
  }
});

const isCurrentUser = (id) => authStore.user?.id === id;

const canEditAccount = (account) => {
    // 這裡的邏輯與 api/update-account.js 的後端權限驗證保持一致
    // 只有當前用戶有 manage_users 權限且不是修改自己或修改 superadmin 時才允許
    if (!authStore.hasPermission('accounts:manage_users')) {
        return false;
    }
    // admin 不能編輯或刪除 superadmin
    if (currentUserRole.value === 'admin' && account.roles?.name === 'superadmin') {
        return false;
    }
    // 不能編輯自己的帳號
    if (isCurrentUser(account.id)) {
      return false;
    }
    return true;
};

const getRoleDisplayName = (roleName) => USER_ROLE_NAMES[roleName] || roleName || '未知';

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

const openModal = (account = null) => {
  if (!canManageAccounts.value) { // 使用新的權限檢查
    uiStore.showMessage('您沒有權限執行此操作。', 'error');
    return;
  }
  isEditing.value = !!account;
  if (account) {
    // [MODIFIED] 如果是編輯模式且 Email 包含預設網域，則移除它
    const displayEmail = account.email.endsWith(DEFAULT_EMAIL_DOMAIN)
      ? account.email.slice(0, -DEFAULT_EMAIL_DOMAIN.length)
      : account.email;

    editableAccount.value = { 
        ...account, 
        email: displayEmail, // 顯示處理後的 Email
        password: '',
        role_id: account.roles?.id
    };
  } else {
    editableAccount.value = { 
        email: '', 
        nickname: '', 
        password: '', 
        role_id: availableRolesForAssignment.value[0]?.id || null
    };
  }
  isModalOpen.value = true;
};

const closeModal = () => {
  isModalOpen.value = false;
};

// [MODIFIED] saveAccount 中處理 Email 網域補齊邏輯已確認
const saveAccount = async () => {
  uiStore.setLoading(true);
  try {
    const payload = { ...editableAccount.value };
    
    // 在提交前補齊 Email 網域，只有當 Email 不包含 '@' 符號時
    if (payload.email && !payload.email.includes('@')) {
        payload.email = payload.email + DEFAULT_EMAIL_DOMAIN;
    }

    if (isEditing.value && !payload.password) {
      delete payload.password;
    }
    if (payload.password && payload.password.length < 6) {
        throw new Error('密碼長度至少需要6位。');
    }
    // Only require role_id on creation, allow editing to change role
    if (!isEditing.value && !payload.role_id) {
        throw new Error('請選擇一個角色。');
    }
    // If editing, but no role_id is selected, keep the existing role
    if (isEditing.value && !payload.role_id && editableAccount.value.roles?.id) {
      payload.role_id = editableAccount.value.roles.id;
    }


    const selectedRole = dataStore.roles.find(r => r.id === payload.role_id);
    if (payload.role_id && !selectedRole) throw new Error('無效的角色選擇。');
    payload.role = selectedRole ? selectedRole.name : undefined; // Set role name for API payload, or undefined if no role selected

    if (isEditing.value) {
      await api.updateAccount({ id: payload.id, ...payload });
      uiStore.showMessage('帳號更新成功', 'success');
    } else {
      await api.createAccount(payload);
      uiStore.showMessage('帳號建立成功', 'success');
    }
    await refreshAccounts();
    closeModal();
  } catch (error) {
    uiStore.showMessage(`操作失敗: ${error.message}`, 'error');
  } finally {
    uiStore.setLoading(false);
  }
};

const confirmSingleDelete = (account) => {
  if (!canEditAccount(account)) { // 使用 canEditAccount 判斷
    uiStore.showMessage('您沒有權限刪除此帳號。', 'error');
    return;
  }
  uiStore.showConfirmation(
    '確認刪除帳號',
    `您確定要刪除帳號 ${account.email} 嗎？此操作無法復原。`,
    '刪除',
    'bg-red-600 hover:bg-red-700'
  ).then(() => {
    deleteAccounts([account.id]);
  });
};

const confirmBatchDelete = () => {
  const accountsToDelete = selectedAccounts.value.filter(id => {
      const acc = accounts.value.find(a => a.id === id);
      return acc && canEditAccount(acc); // 使用 canEditAccount 判斷
  });

  if (accountsToDelete.length === 0) {
      uiStore.showMessage('沒有可刪除的選取帳號。', 'info');
      return;
  }
  uiStore.showConfirmation(
    '確認批次刪除帳號',
    `您確定要刪除選取的 ${accountsToDelete.length} 個帳號嗎？此操作無法復原。`,
    '刪除',
    'bg-red-600 hover:bg-red-700'
  ).then(() => {
    deleteAccounts(accountsToDelete);
  });
};

const deleteAccounts = async (ids) => {
  uiStore.setLoading(true);
  try {
    const result = await api.deleteAccounts(ids);
    uiStore.showMessage(result.message, 'success');
    await refreshAccounts();
    selectedAccounts.value = [];
  } catch (error) {
    uiStore.showMessage(`刪除失敗: ${error.message}`, 'error');
  } finally {
    uiStore.setLoading(false);
  }
};

const handleFileSelect = (event) => {
  selectedFile.value = event.target.files[0];
  importResults.value = { success: 0, failed: [] };
};

const importAccounts = async () => {
  if (!selectedFile.value) {
    uiStore.showMessage('請先選擇檔案', 'info');
    return;
  }
  uiStore.setLoading(true);
  importResults.value = { success: 0, failed: [] };
  try {
    const csvText = await selectedFile.value.text();
    const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) throw new Error('檔案中沒有有效資料。');

    const headers = lines[0].split(',').map(h => h.trim());
    const accountsToCreate = [];
    const validationErrors = [];

    const emailIndex = headers.indexOf('email');
    const passwordIndex = headers.indexOf('password');
    const nicknameIndex = headers.indexOf('nickname');
    const roleNameIndex = headers.indexOf('role_name');

    if (emailIndex === -1 || passwordIndex === -1 || nicknameIndex === -1 || roleNameIndex === -1) {
        throw new Error('CSV 標頭格式不正確，請確保包含 email,password,nickname,role_name。');
    }

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const parts = line.split(',').map(p => p.trim());
        const email = parts[emailIndex];
        const password = parts[passwordIndex];
        const nickname = parts[nicknameIndex];
        const roleName = parts[roleNameIndex];

        if (!email || !password || !roleName) {
            validationErrors.push(`第 ${i + 1} 行資料不完整。`);
            continue;
        }
        if (password.length < 6) {
            validationErrors.push(`第 ${i + 1} 行密碼長度不足。`);
            continue;
        }
        const role = dataStore.roles.find(r => r.name === roleName);
        if (!role) {
            validationErrors.push(`第 ${i + 1} 行角色名稱 '${roleName}' 無效。`);
            continue;
        }
        // Admin cannot create superadmin accounts via import (這裡的邏輯不變)
        if (currentUserRole.value === 'admin' && role.name === 'superadmin') {
            validationErrors.push(`第 ${i + 1} 行：管理員無權限建立超級管理員帳號。`);
            continue;
        }

        accountsToCreate.push({ email, password, nickname: nickname || '', role: role.name, originalEmail: email });
    }

    if (validationErrors.length > 0) throw new Error(validationErrors.join('<br>'));
    if (accountsToCreate.length === 0) {
        uiStore.showMessage('檔案中沒有可匯入的有效帳號資料。', 'info');
        return;
    }

    const results = await api.batchCreateAccounts(accountsToCreate);
    let successCount = 0;
    const failedAccounts = [];
    results.forEach(res => {
        if (res.success) successCount++;
        else failedAccounts.push({ email: res.email || res.originalEmail, error: res.error });
    });
    importResults.value.success = successCount;
    importResults.value.failed = failedAccounts;

    if (failedAccounts.length > 0) {
        uiStore.showMessage(`批次匯入完成。成功 ${successCount} 筆，失敗 ${failedAccounts.length} 筆。`, 'warning', 5000);
    } else {
        uiStore.showMessage(`所有 ${successCount} 筆帳號已成功建立。`, 'success');
    }
    
    await refreshAccounts();
    selectedFile.value = null;
    const fileInput = document.getElementById('importAccountFile');
    if(fileInput) fileInput.value = '';

  } catch (error) {
    uiStore.showMessage(`批次匯入失敗: ${error.message}`, 'error');
  } finally {
    uiStore.setLoading(false);
  }
};

const downloadSample = () => {
  const csvContent = 'email,password,nickname,role_name\nuser1@example.com,password123,使用者一,operator\nuser2@example.com,password456,使用者二,sdc';
  const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = '帳號匯入範例.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};


// [NEW] Batch Edit Modal Functions
const openBatchEditModal = () => {
  if (selectedAccounts.value.length === 0) {
    uiStore.showMessage('請至少選擇一個帳號進行批量修改。', 'info');
    return;
  }
  // Reset form and errors
  batchEditData.new_role_id = null;
  batchEditData.new_password = '';
  batchEditPasswordError.value = '';
  isBatchEditModalOpen.value = true;
};

const closeBatchEditModal = () => {
  isBatchEditModalOpen.value = false;
};

const handleBatchEdit = async () => {
  batchEditPasswordError.value = ''; // Reset error

  if (!batchEditData.new_role_id && !batchEditData.new_password) {
    uiStore.showMessage('請至少選擇一個要修改的項目（角色或密碼）。', 'warning');
    return;
  }

  if (batchEditData.new_password && batchEditData.new_password.length < 6) {
    batchEditPasswordError.value = '新密碼長度至少需要6位。';
    return;
  }

  const accountsToUpdate = selectedAccounts.value.filter(id => {
    const acc = accounts.value.find(a => a.id === id);
    return acc && canEditAccount(acc); // Only update accounts the admin has permission to edit
  });

  if (accountsToUpdate.length === 0) {
    uiStore.showMessage('沒有可修改的選取帳號。', 'info');
    return;
  }

  uiStore.showConfirmation(
    '確認批量修改',
    `您確定要修改選取的 ${accountsToUpdate.length} 個帳號嗎？`,
    '確認修改',
    'bg-blue-600 hover:bg-blue-700'
  ).then(async () => {
    uiStore.setLoading(true);
    const updates = accountsToUpdate.map(id => {
      const payload = { id: id };
      if (batchEditData.new_role_id) {
        payload.role_id = batchEditData.new_role_id;
        const selectedRole = dataStore.roles.find(r => r.id === batchEditData.new_role_id);
        if (selectedRole) payload.role = selectedRole.name; // Pass role name for API payload
      }
      if (batchEditData.new_password) {
        payload.password = batchEditData.new_password;
      }
      return payload;
    });

    try {
      const results = await api.batchUpdateAccounts(updates);
      const successCount = results.filter(r => r.success).length;
      const failedCount = results.filter(r => !r.success).length;

      if (failedCount > 0) {
        const failedEmails = results.filter(r => !r.success).map(r => r.email || r.id).join(', ');
        uiStore.showMessage(`批量修改完成。成功 ${successCount} 筆，失敗 ${failedCount} 筆。失敗帳號: ${failedEmails}`, 'warning', 5000);
      } else {
        uiStore.showMessage(`所有 ${successCount} 筆帳號已成功修改。`, 'success');
      }
      
      await refreshAccounts();
      closeBatchEditModal();
      selectedAccounts.value = []; // Clear selection
    } catch (error) {
      uiStore.showMessage(`批量修改失敗: ${error.message}`, 'error');
    } finally {
      uiStore.setLoading(false);
    }
  }).catch(() => {
    // User cancelled
  });
};

</script>

<style scoped>
/*
  Table styles for responsiveness are managed in src/assets/styles/main.css
*/
</style>
