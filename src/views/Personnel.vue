<template>
  <div class="bg-white rounded-xl shadow-lg p-6 mb-8 border border-indigo-200">
    <h2 class="text-3xl font-bold text-indigo-800 mb-6">人員管理</h2>
    
    <PersonnelToolbar
      v-model:filters="filters"
      v-model:pageSize="pagination.pageSize"
      :selectedCount="selectedPersonnel.length"
      @add-new="openModal()"
      @batch-delete="confirmBatchDelete"
      @batch-add-tags="openBatchAddTagsModal"
      @export-selected="exportSelectedPersonnelData"
    />

    <div v-if="isLoading" class="text-center py-12">
      <div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
      <p class="mt-4 text-gray-600">正在載入人員資料...</p>
    </div>
    
    <PersonnelGrid
      v-else
      :personnel="paginatedPersonnel"
      v-model:selectedIds="selectedPersonnel"
      v-model:allSelected="selectAll"
      v-model:currentPage="pagination.currentPage"
      :totalPages="pagination.totalPages"
      :totalCount="sortedPersonnel.length"
      @edit="openModal"
      @delete="confirmDelete"
    />

    <PersonnelModal
      :show="isModalOpen"
      :person="editablePerson"
      @close="closeModal"
      @save="handleSave"
    />

    <Modal :show="isBatchAddTagsModalOpen" @close="closeBatchAddTagsModal">
      <template #header>批量增加標籤</template>
      <form @submit.prevent="handleBatchAddTags">
          <p class="text-gray-700 mb-4">請輸入要增加的標籤，以分號分隔。這些標籤將會被新增到所有選取的人員資料中。</p>
          <div class="mb-6">
              <label for="newTagsInput" class="block text-gray-700 font-medium mb-2">新增標籤 (以分號 ; 或 ； 分隔)</label>
              <input type="text" id="newTagsInput" v-model="newTagsInput" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" placeholder="例如：學生;志工">
          </div>
          <div class="flex flex-col sm:flex-row-reverse gap-3">
              <button type="submit" class="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition duration-300 shadow-sm">確認增加</button>
              <button type="button" @click="closeBatchAddTagsModal" class="w-full sm:w-auto bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-6 rounded-lg transition duration-300 shadow-sm">取消</button>
          </div>
      </form>
    </Modal>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useUiStore } from '@/store/ui';
import { useDataStore } from '@/store/data';
import { useAuthStore } from '@/store/auth'; // 引入 Auth Store
import * as api from '@/services/api';
import { formatDate } from '@/utils';

// Import new components
import PersonnelToolbar from '@/components/personnel/PersonnelToolbar.vue';
import PersonnelGrid from '@/components/personnel/PersonnelGrid.vue';
import PersonnelModal from '@/components/personnel/PersonnelModal.vue';
import Modal from '@/components/Modal.vue'; // Keep for batch tags modal

const uiStore = useUiStore();
const dataStore = useDataStore();
const authStore = useAuthStore(); // 建立 Auth Store 實例
const router = useRouter();
const route = useRoute();
const isLoading = ref(true);

const filters = ref({
    searchTerm: '',
    sortBy: 'name_asc',
});

const pagination = ref({
    currentPage: 1,
    pageSize: 12,
    totalPages: 1,
});

const selectedPersonnel = ref([]);
const isModalOpen = ref(false);
const editablePerson = ref(null);
const isBatchAddTagsModalOpen = ref(false);
const newTagsInput = ref('');

// --- URL State Sync ---
onMounted(async () => {
    isLoading.value = true;
    uiStore.setLoading(true);
    try {
        filters.value.searchTerm = route.query.search || '';
        filters.value.sortBy = route.query.sort || 'name_asc';
        pagination.value.pageSize = parseInt(route.query.pageSize, 10) || 12;
        pagination.value.currentPage = parseInt(route.query.page, 10) || 1;
        await dataStore.fetchAllPersonnel();
    } finally {
        isLoading.value = false;
        uiStore.setLoading(false);
    }
});

watch([filters, () => pagination.value.currentPage, () => pagination.value.pageSize], () => {
    const query = {};
    if (filters.value.searchTerm) query.search = filters.value.searchTerm;
    if (filters.value.sortBy !== 'name_asc') query.sort = filters.value.sortBy;
    if (pagination.value.pageSize !== 12) query.pageSize = pagination.value.pageSize;
    if (pagination.value.currentPage > 1) query.page = pagination.value.currentPage;
    
    if (JSON.stringify(query) !== JSON.stringify(route.query)) {
        router.replace({ query });
    }
}, { deep: true });

// --- Computed Properties ---
const filteredPersonnel = computed(() => {
    const term = filters.value.searchTerm.toLowerCase();
    if (!term) return dataStore.personnel;
    
    return dataStore.personnel.filter(p =>
        p.name.toLowerCase().includes(term) ||
        p.code.toLowerCase().includes(term) ||
        p.card_number.toLowerCase().includes(term) ||
        (p.tags && p.tags.some(tag => tag.toLowerCase().includes(term)))
    );
});

const sortedPersonnel = computed(() => {
    const [key, direction] = filters.value.sortBy.split('_');
    return [...filteredPersonnel.value].sort((a, b) => {
        let valA = a[key]?.toLowerCase() || '';
        let valB = b[key]?.toLowerCase() || '';
        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
    });
});

const paginatedPersonnel = computed(() => {
    const start = (pagination.value.currentPage - 1) * pagination.value.pageSize;
    const end = start + pagination.value.pageSize;
    return sortedPersonnel.value.slice(start, end);
});

watch(sortedPersonnel, () => {
    pagination.value.currentPage = 1;
    pagination.value.totalPages = Math.ceil(sortedPersonnel.value.length / pagination.value.pageSize);
});

watch(() => pagination.value.pageSize, () => {
    pagination.value.currentPage = 1;
    pagination.value.totalPages = Math.ceil(sortedPersonnel.value.length / pagination.value.pageSize);
});

const selectAll = computed({
    get: () => {
        const pageIds = new Set(paginatedPersonnel.value.map(p => p.id));
        if (pageIds.size === 0) return false;
        const selectedOnPage = selectedPersonnel.value.filter(id => pageIds.has(id));
        return selectedOnPage.length === pageIds.size;
    },
    set: (value) => {
        const pageIds = paginatedPersonnel.value.map(p => p.id);
        if (value) {
            selectedPersonnel.value = [...new Set([...selectedPersonnel.value, ...pageIds])];
        } else {
            selectedPersonnel.value = selectedPersonnel.value.filter(id => !pageIds.includes(id));
        }
    }
});

// --- Methods with Permission Checks ---

const openModal = (person = null) => {
    const isEditing = !!person;
    const requiredPermission = isEditing ? 'personnel:update' : 'personnel:create';

    if (!authStore.hasPermission(requiredPermission)) {
        uiStore.showMessage('您沒有權限執行此操作。', 'error');
        return;
    }

    editablePerson.value = person;
    isModalOpen.value = true;
};

const closeModal = () => isModalOpen.value = false;

const handleSave = async (personData) => {
    // 儲存操作的權限已在 openModal 中檢查，此處直接執行
    const success = await dataStore.savePerson(personData);
    if (success) {
        closeModal();
    }
};

const confirmDelete = (person) => {
    if (!authStore.hasPermission('personnel:delete')) {
        uiStore.showMessage('您沒有權限執行此操作。', 'error');
        return;
    }
    uiStore.showConfirmation(
        '確認刪除',
        `確定要刪除 ${person.name} (${person.code}) 嗎？`,
        '確定',
        'bg-red-600 hover:bg-red-700'
    ).then(async () => {
        await dataStore.batchDeletePersonnel([person.id]);
        selectedPersonnel.value = selectedPersonnel.value.filter(id => id !== person.id);
    });
};

const confirmBatchDelete = () => {
    if (selectedPersonnel.value.length === 0) return;
    if (!authStore.hasPermission('personnel:delete')) {
        uiStore.showMessage('您沒有權限執行此操作。', 'error');
        return;
    }
    uiStore.showConfirmation(
        '確認批次刪除',
        `確定要刪除選取的 ${selectedPersonnel.value.length} 位人員嗎？`,
        '確定刪除',
        'bg-red-600 hover:bg-red-700'
    ).then(async () => {
        await dataStore.batchDeletePersonnel(selectedPersonnel.value);
        selectedPersonnel.value = [];
    });
};

const openBatchAddTagsModal = () => {
    if (selectedPersonnel.value.length === 0) return;
    if (!authStore.hasPermission('personnel:update')) {
        uiStore.showMessage('您沒有權限執行此操作。', 'error');
        return;
    }
    newTagsInput.value = '';
    isBatchAddTagsModalOpen.value = true;
};

const closeBatchAddTagsModal = () => isBatchAddTagsModalOpen.value = false;

const handleBatchAddTags = async () => {
    // 權限已在 openBatchAddTagsModal 中檢查
    const tagsToAdd = newTagsInput.value.trim().split(/[;；]/).map(tag => tag.trim()).filter(Boolean);
    if (tagsToAdd.length === 0) return;

    uiStore.setLoading(true);
    try {
        await Promise.all(selectedPersonnel.value.map(id => {
            const person = dataStore.personnel.find(p => p.id === id);
            if (!person) return Promise.resolve();
            const currentTags = new Set(person.tags || []);
            tagsToAdd.forEach(tag => currentTags.add(tag));
            return api.updatePersonnelTags(id, Array.from(currentTags));
        }));
        
        uiStore.showMessage(`已成功為 ${selectedPersonnel.value.length} 位人員增加標籤。`, 'success');
        await dataStore.fetchAllPersonnel();
        selectedPersonnel.value = [];
        closeBatchAddTagsModal();
    } catch (error) {
        uiStore.showMessage(`批量增加標籤失敗: ${error.message}`, 'error');
    } finally {
        uiStore.setLoading(false);
    }
};

const exportSelectedPersonnelData = () => {
    const selectedData = dataStore.personnel.filter(p => selectedPersonnel.value.includes(p.id));
    if (selectedData.length === 0) {
        uiStore.showMessage('沒有選取資料可匯出。', 'info');
        return;
    }
    let csvContent = '姓名,學號,卡號,棟別,標籤\n';
    selectedData.forEach(person => {
        const row = [
            `"${person.name}"`, `"${person.code}"`, `"${person.card_number}"`,
            `"${person.building || ''}"`, `"${(person.tags || []).join(';')}"`
        ].join(',');
        csvContent += row + '\n';
    });

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `選取人員資料_${formatDate(new Date())}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    uiStore.showMessage('資料已匯出。', 'success');
};
</script>
