<template>
  <div class="p-6 bg-white rounded-xl shadow-lg border border-indigo-200">
    <h2 class="text-3xl font-bold mb-6 text-indigo-800">帳號管理</h2>

    <!-- Section for Batch Account Import -->
    <div class="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
      <h3 class="text-xl font-bold text-indigo-700 mb-4">批次新增帳號</h3>
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
        <label for="importAccountFile" class="block text-gray-700 font-medium">選擇 CSV 檔案匯入</label>
        <a href="#" @click.prevent="downloadSample" class="text-sm text-indigo-600 hover:text-indigo-800 font-medium mt-2 sm:mt-0">下載範例檔</a>
      </div>
      <input type="file" @change="handleFileSelect" accept=".csv" class="w-full text-gray-700 border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-400">
      <p v-if="selectedFile" class="text-gray-500 text-sm mt-2">已選擇檔案: {{ selectedFile.name }}</p>
      <button @click="importAccounts" class="mt-5 w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-6 rounded-lg transition duration-300 flex items-center justify-center shadow-md hover:shadow-lg">
        匯入帳號檔案
      </button>
    </div>

    <!-- Action bar: Search, Batch Delete, Add Account -->
    <div class="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
      <div class="relative w-full sm:w-auto">
        <input type="text" v-model="searchTerm" placeholder="搜尋帳號..." class="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 w-full sm:w-64">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
      </div>
      <div class="flex items-center gap-3 flex-wrap justify-center sm:justify-end w-full sm:w-auto">
        <button v-if="selectedAccounts.length > 0" @click="confirmBatchDelete" class="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition duration-300 flex items-center justify-center shadow-sm hover:shadow-md">
          批次刪除 ({{ selectedAccounts.length }})
        </button>
        <button @click="openModal()" class="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition duration-300 flex items-center justify-center shadow-md hover:shadow-lg">
          新增帳號
        </button>
      </div>
    </div>

    <!-- Accounts Table -->
    <div class="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-md table-responsive">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-4 py-3 text-left"><input type="checkbox" v-model="selectAll" class="h-4 w-4 text-indigo-600 rounded focus:ring-indigo-500"></th>
            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">電子郵件</th>
            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">暱稱</th>
            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">角色</th>
            <th class="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">操作</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-100">
          <tr v-for="account in filteredAccounts" :key="account.id">
            <td data-label="選取" class="px-4 py-4"><input type="checkbox" v-model="selectedAccounts" :value="account.id" class="h-4 w-4 text-indigo-600 rounded"></td>
            <td data-label="電子郵件" class="px-6 py-4 text-sm font-medium text-gray-900"><div>{{ account.email }}</div></td>
            <td data-label="暱稱" class="px-6 py-4 text-sm text-gray-500"><div>{{ account.nickname || '-' }}</div></td>
            <td data-label="角色" class="px-6 py-4 text-sm text-gray-500"><div>{{ account.roles.name }}</div></td>
            <td data-label="操作" class="px-6 py-4 text-right text-sm font-medium">
              <div>
                <button @click="openModal(account)" class="text-indigo-600 hover:text-indigo-800 mr-4">編輯</button>
                <button @click="confirmSingleDelete(account)" class="text-red-600 hover:text-red-800" :disabled="isCurrentUser(account.id)">刪除</button>
              </div>
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
          <label for="accountUsername" class="block text-gray-700 font-medium mb-2">使用者名稱 (Email)</label>
          <input type="email" id="accountUsername" v-model="editableAccount.email" required class="w-full px-4 py-2 border border-gray-300 rounded-lg">
        </div>
        <div class="mb-4">
          <label for="accountNickname" class="block text-gray-700 font-medium mb-2">暱稱</label>
          <input type="text" id="accountNickname" v-model="editableAccount.nickname" class="w-full px-4 py-2 border border-gray-300 rounded-lg">
        </div>
        <div class="mb-4">
          <label for="accountPassword" class="block text-gray-700 font-medium mb-2">密碼 <span v-if="isEditing" class="text-sm text-gray-500">(留空表示不修改)</span></label>
          <input type="password" id="accountPassword" v-model="editableAccount.password" :required="!isEditing" minlength="6" class="w-full px-4 py-2 border border-gray-300 rounded-lg">
        </div>
        <div class="mb-6">
          <label for="accountRole" class="block text-gray-700 font-medium mb-2">角色</label>
          <select id="accountRole" v-model="editableAccount.role_id" class="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white">
            <option v-for="role in roles" :key="role.id" :value="role.id">{{ role.name }}</option>
          </select>
        </div>
        <div class="flex flex-col sm:flex-row-reverse gap-3">
          <button type="submit" class="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-lg">儲存</button>
          <button type="button" @click="closeModal" class="w-full sm:w-auto bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-6 rounded-lg">取消</button>
        </div>
      </form>
    </Modal>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useUiStore } from '@/store/ui';
import { useAuthStore } from '@/store/auth';
import { api } from '@/services/api';
import Modal from '@/components/Modal.vue';

const uiStore = useUiStore();
const authStore = useAuthStore();

const accounts = ref([]);
const roles = ref([]);
const searchTerm = ref('');
const selectedAccounts = ref([]);
const isModalOpen = ref(false);
const isEditing = ref(false);
const editableAccount = ref({});
const selectedFile = ref(null);

// Fetch initial data
onMounted(async () => {
  uiStore.setLoading(true);
  try {
    const [accountsData, rolesData] = await Promise.all([
      api.fetchAllAccounts(),
      api.fetchAllRoles()
    ]);
    accounts.value = accountsData;
    roles.value = rolesData;
  } catch (error) {
    uiStore.showMessage(`讀取資料失敗: ${error.message}`, 'error');
  } finally {
    uiStore.setLoading(false);
  }
});

// Computed property for filtering accounts
const filteredAccounts = computed(() => {
  if (!searchTerm.value) {
    return accounts.value;
  }
  return accounts.value.filter(acc => 
    acc.email.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
    (acc.nickname && acc.nickname.toLowerCase().includes(searchTerm.value.toLowerCase()))
  );
});

// Computed property for select all functionality
const selectAll = computed({
  get: () => {
    return filteredAccounts.value.length > 0 && selectedAccounts.value.length === filteredAccounts.value.length;
  },
  set: (value) => {
    selectedAccounts.value = value ? filteredAccounts.value.map(acc => acc.id) : [];
  }
});

const isCurrentUser = (id) => authStore.user?.id === id;

// Modal handling
const openModal = (account = null) => {
  if (account) {
    isEditing.value = true;
    editableAccount.value = { ...account, role_id: account.roles.id, password: '' };
  } else {
    isEditing.value = false;
    editableAccount.value = { email: '', nickname: '', password: '', role_id: roles.value[0]?.id };
  }
  isModalOpen.value = true;
};

const closeModal = () => {
  isModalOpen.value = false;
};

// CRUD operations
const saveAccount = async () => {
  uiStore.setLoading(true);
  try {
    if (isEditing.value) {
      await api.updateAccount(editableAccount.value);
      uiStore.showMessage('帳號更新成功', 'success');
    } else {
      await api.createAccount(editableAccount.value);
      uiStore.showMessage('帳號建立成功', 'success');
    }
    accounts.value = await api.fetchAllAccounts();
    closeModal();
  } catch (error) {
    uiStore.showMessage(`操作失敗: ${error.message}`, 'error');
  } finally {
    uiStore.setLoading(false);
  }
};

const confirmSingleDelete = (account) => {
  if (confirm(`確定要刪除帳號 ${account.email} 嗎？`)) {
    deleteAccounts([account.id]);
  }
};

const confirmBatchDelete = () => {
  if (confirm(`確定要刪除選取的 ${selectedAccounts.value.length} 個帳號嗎？`)) {
    deleteAccounts(selectedAccounts.value);
  }
};

const deleteAccounts = async (ids) => {
  uiStore.setLoading(true);
  try {
    await api.deleteAccounts(ids);
    uiStore.showMessage('帳號刪除成功', 'success');
    accounts.value = await api.fetchAllAccounts();
    selectedAccounts.value = [];
  } catch (error) {
    uiStore.showMessage(`刪除失敗: ${error.message}`, 'error');
  } finally {
    uiStore.setLoading(false);
  }
};

// Import functionality
const handleFileSelect = (event) => {
  selectedFile.value = event.target.files[0];
};

const importAccounts = () => {
  // Logic to parse CSV and call API
  if (!selectedFile.value) {
    uiStore.showMessage('請先選擇檔案', 'info');
    return;
  }
  uiStore.showMessage('匯入功能待實現', 'info');
};

const downloadSample = () => {
  const csvContent = 'email,password,nickname,role_name\nuser1@example.com,password123,使用者一,operator\nuser2@example.com,password456,使用者二,sdc';
  const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = '帳號匯入範例.csv';
  link.click();
  URL.revokeObjectURL(link.href);
};

</script>
