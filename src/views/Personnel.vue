<template>
  <div class="bg-white rounded-xl shadow-lg p-6 mb-8 border border-indigo-200">
    <h2 class="text-3xl font-bold text-indigo-800 mb-6">人員管理</h2>
    
    <div class="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
      <div class="relative w-full md:w-1/3">
        <input type="text" v-model="filters.searchTerm" placeholder="搜尋姓名、學號、卡號..." class="w-full border rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-indigo-400">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
      </div>
      <div class="flex items-center gap-2 w-full md:w-auto flex-wrap justify-end">
        <select v-model="filters.sortBy" class="w-full sm:w-auto border rounded-lg px-4 py-2 bg-white focus:ring-2 focus:ring-indigo-400">
          <option value="name_asc">依姓名排序 (A-Z)</option>
          <option value="name_desc">依姓名排序 (Z-A)</option>
          <option value="code_asc">依學號排序 (A-Z)</option>
          <option value="code_desc">依學號排序 (Z-A)</option>
        </select>
         <select v-model.number="pagination.pageSize" class="w-full sm:w-auto border rounded-lg px-4 py-2 bg-white focus:ring-2 focus:ring-indigo-400">
          <option value="12">每頁 12 筆</option>
          <option value="24">每頁 24 筆</option>
          <option value="48">每頁 48 筆</option>
        </select>
        <button @click="openModal()" class="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-lg shadow-sm transition flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
          新增人員
        </button>
      </div>
    </div>
    
    <div v-if="selectedPersonnel.length > 0" class="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg flex flex-wrap items-center gap-4">
        <span class="text-sm font-medium text-indigo-800">{{ selectedPersonnel.length }} 位已選取</span>
        <div class="flex items-center gap-2 flex-wrap">
            <button @click="confirmBatchDelete" class="bg-red-600 hover:bg-red-700 text-white font-medium py-1 px-3 rounded-lg text-sm shadow-sm transition flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clip-rule="evenodd" /></svg>
              刪除選取
            </button>
            <button @click="openBatchAddTagsModal" class="bg-blue-600 hover:bg-blue-700 text-white font-medium py-1 px-3 rounded-lg text-sm transition shadow-sm flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M7 7h.01M7 3h5c.512 0 1.02.052 1.514.156M21 12v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h5m2 2l-2 2m4-4l-2 2" /></svg>
              批量增加標籤
            </button>
            <button @click="exportSelectedPersonnelData" class="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-1 px-3 rounded-lg text-sm transition shadow-sm flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                匯出選取
            </button>
        </div>
    </div>

    <div v-if="isLoading" class="text-center py-12">
      <div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
      <p class="mt-4 text-gray-600">正在載入人員資料...</p>
    </div>
    <div v-else-if="sortedPersonnel.length > 0">
        <div class="flex items-center mb-4">
            <input type="checkbox" v-model="selectAll" id="selectAllCheckbox" class="h-4 w-4 text-indigo-600 rounded mr-2">
            <label for="selectAllCheckbox" class="text-sm text-gray-600">全選本頁</label>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <div v-for="person in paginatedPersonnel" :key="person.id" 
                 class="person-card bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300 hover:shadow-xl flex flex-col justify-between"
                 :class="{ 'ring-2 ring-indigo-500': isSelected(person.id) }">
              
              <div>
                <div class="bg-purple-100 px-5 py-3 border-b border-purple-200">
                    <h3 class="text-lg font-bold text-purple-800 truncate">{{ person.name }}</h3>
                </div>
                <div class="p-4 space-y-3">
                    <div class="bg-green-50 p-3 rounded-lg">
                        <div class="flex items-center text-sm text-green-800 font-semibold">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                            <span class="ml-2">學號</span>
                        </div>
                        <p class="font-mono text-xl mt-1 ml-1 tracking-wider" :class="dataStore.getInputColorClass(person.code)">{{ person.code }}</p>
                    </div>
                    <div class="bg-blue-50 p-3 rounded-lg">
                        <div class="flex items-center text-sm text-blue-800 font-semibold">
                             <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v12a1 1 0 01-1-1H4a1 1 0 01-1-1V4zm3 2a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 4a1 1 0 100 2h4a1 1 0 100-2H7z" clip-rule="evenodd" /></svg>
                            <span class="ml-2">卡號</span>
                        </div>
                        <p class="text-gray-900 font-mono text-xl mt-1 ml-1 tracking-wider">{{ person.card_number }}</p>
                    </div>
                    <div class="bg-teal-50 p-3 rounded-lg">
                        <div class="flex items-center text-sm text-teal-800 font-semibold">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1h-2V3a1 1 0 011-1zM5 5a1 1 0 011-1h8a1 1 0 011 1v1H5V5zm0 2h10v9a1 1 0 01-1 1H6a1 1 0 01-1-1V7zm2 2a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd" /></svg>
                            <span class="ml-2">棟別</span>
                        </div>
                        <p class="text-gray-900 font-mono text-xl mt-1 ml-1 tracking-wider">{{ person.building || '-' }}</p>
                    </div>
                    <div class="pt-2">
                        <p class="text-sm font-medium text-gray-500 mb-2">標籤:</p>
                        <div v-if="person.tags && person.tags.length" class="flex flex-wrap gap-2">
                            <span v-for="tag in person.tags" :key="tag" class="bg-yellow-200 text-yellow-800 text-xs font-medium px-2.5 py-1 rounded-full">{{ tag }}</span>
                        </div>
                        <span v-else class="text-gray-400">-</span>
                    </div>
                </div>
              </div>
              <div class="px-4 pb-4 pt-2 flex justify-end items-center gap-4">
                <input type="checkbox" :value="person.id" v-model="selectedPersonnel" class="personnel-checkbox h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" @click.stop>
                <button @click.stop="openModal(person)" class="edit-btn text-indigo-600 hover:text-indigo-800 p-1 rounded-full transition-colors" :aria-label="'編輯人員 ' + person.name"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                <button @click.stop="confirmDelete(person)" class="delete-btn text-red-600 hover:text-red-800 p-1 rounded-full transition-colors" :aria-label="'刪除人員 ' + person.name"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
              </div>
            </div>
        </div>
    </div>
    <div v-else class="text-center py-12 text-gray-500">
      <p>找不到符合條件的人員，或尚未新增任何人員。</p>
    </div>

    <div v-if="!isLoading && sortedPersonnel.length > 0 && pagination.totalPages > 1" class="mt-6 flex justify-center items-center space-x-4 text-sm">
        <button @click="pagination.currentPage--" :disabled="pagination.currentPage === 1" class="px-3 py-1 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition">
            上一頁
        </button>
        <span>
            第 {{ pagination.currentPage }} / {{ pagination.totalPages }} 頁 (共 {{ sortedPersonnel.length }} 筆)
        </span>
        <button @click="pagination.currentPage++" :disabled="pagination.currentPage === pagination.totalPages" class="px-3 py-1 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition">
            下一頁
        </button>
    </div>

    <Modal :show="isModalOpen" @close="closeModal">
      <template #header>{{ isEditing ? '編輯人員' : '新增人員' }}</template>
      <form @submit.prevent="handleSave">
        <div class="space-y-4">
          <div>
            <label for="name" class="block text-sm font-medium text-gray-700">姓名</label>
            <input type="text" id="name" v-model="editablePerson.name" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
          </div>
          <div>
            <label for="code" class="block text-sm font-medium text-gray-700">學號</label>
            <input type="text" id="code" v-model="editablePerson.code" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
          </div>
           <div>
            <label for="card_number" class="block text-sm font-medium text-gray-700">卡號</label>
            <input type="text" id="card_number" v-model="editablePerson.card_number" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
          </div>
          <div>
            <label for="building" class="block text-sm font-medium text-gray-700">棟別 (選填)</label>
            <input type="text" id="building" v-model="editablePerson.building" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
          </div>
           <div>
            <label for="tags" class="block text-sm font-medium text-gray-700">標籤 (選填，用分號 ; 分隔)</label>
            <input type="text" id="tags" v-model="editablePerson.tags" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
          </div>
        </div>
        <div class="mt-6 flex justify-end gap-3">
            <button type="button" @click="closeModal" class="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300">取消</button>
            <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">儲存</button>
        </div>
      </form>
    </Modal>

    <Modal :show="isBatchAddTagsModalOpen" @close="closeBatchAddTagsModal">
      <template #header>批量增加標籤</template>
      <form @submit.prevent="handleBatchAddTags">
          <p class="text-gray-700 mb-4">請輸入要增加的標籤，以分號分隔。這些標籤將會被新增到所有選取的人員資料中。</p>
          <div class="mb-6">
              <label for="newTagsInput" class="block text-gray-700 font-medium mb-2">新增標籤 (以分號 ; 分隔)</label>
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
import { useUiStore } from '@/store/ui';
import { useDataStore } from '@/store/data';
import * as api from '@/services/api';
import { formatDate } from '@/utils';
import Modal from '@/components/Modal.vue';

const uiStore = useUiStore();
const dataStore = useDataStore();
const isLoading = ref(true);

const filters = ref({
    searchTerm: '',
    sortBy: 'name_asc',
});

const pagination = ref({
    currentPage: 1,
    pageSize: 12, // 預設每頁顯示 12 筆，以符合卡片網格佈局
    totalPages: 1,
});

const selectedPersonnel = ref([]);
const isModalOpen = ref(false);
const isEditing = ref(false);
const editablePerson = ref({});
const isBatchAddTagsModalOpen = ref(false);
const newTagsInput = ref('');

onMounted(async () => {
    isLoading.value = true;
    uiStore.setLoading(true);
    try {
        await dataStore.fetchAllPersonnel();
    } finally {
        isLoading.value = false;
        uiStore.setLoading(false);
    }
});

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

        if (key === 'code' || key === 'card_number') {
            const numA = parseInt(valA.replace(/[^0-9]/g, ''), 10);
            const numB = parseInt(valB.replace(/[^0-9]/g, ''), 10);
            if (!isNaN(numA) && !isNaN(numB)) {
                return direction === 'asc' ? numA - numB : numB - numA;
            }
        }
        if (key.includes('_at')) {
            const dateA = new Date(a[key]);
            const dateB = new Date(b[key]);
            return direction === 'asc' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
        }

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

const isSelected = (id) => selectedPersonnel.value.includes(id);

const selectAll = computed({
    get: () => {
        const pageIds = new Set(paginatedPersonnel.value.map(p => p.id));
        const selectedOnPage = selectedPersonnel.value.filter(id => pageIds.has(id));
        return pageIds.size > 0 && selectedOnPage.length === pageIds.size;
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

const openModal = (person = null) => {
    isEditing.value = !!person;
    if (person) {
        editablePerson.value = { ...person, tags: Array.isArray(person.tags) ? person.tags.join(';') : '' };
    } else {
        editablePerson.value = { name: '', code: '', card_number: '', building: '', tags: '' };
    }
    isModalOpen.value = true;
};

const closeModal = () => isModalOpen.value = false;

const handleSave = async () => {
    const personData = { 
        ...editablePerson.value, 
        tags: editablePerson.value.tags.split(';').map(t => t.trim()).filter(Boolean)
    };
    const success = await dataStore.savePerson(personData);
    if (success) {
        closeModal();
    }
};

const confirmDelete = (person) => {
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
    newTagsInput.value = '';
    isBatchAddTagsModalOpen.value = true;
};

const closeBatchAddTagsModal = () => isBatchAddTagsModalOpen.value = false;

const handleBatchAddTags = async () => {
    const tagsToAdd = newTagsInput.value.trim().split(';').map(tag => tag.trim()).filter(Boolean);
    if (tagsToAdd.length === 0) return;

    uiStore.setLoading(true);
    try {
        const updatePromises = selectedPersonnel.value.map(id => {
            const person = dataStore.personnel.find(p => p.id === id);
            if (!person) return Promise.resolve();
            
            const currentTags = new Set(person.tags || []);
            tagsToAdd.forEach(tag => currentTags.add(tag));
            const updatedTags = Array.from(currentTags);
            
            return api.updatePersonnelTags(id, updatedTags);
        });
        
        await Promise.all(updatePromises);
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

const exportData = (dataToExport, filename) => {
    if (dataToExport.length === 0) {
        uiStore.showMessage('沒有資料可匯出。', 'info');
        return;
    }
    let csvContent = '姓名,學號,卡號,棟別,標籤\n';
    dataToExport.forEach(person => {
        const row = [
            `"${person.name}"`,
            `"${person.code}"`,
            `"${person.card_number}"`,
            `"${person.building || ''}"`,
            `"${(person.tags || []).join(';')}"`
        ].join(',');
        csvContent += row + '\n';
    });

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    uiStore.showMessage('資料已匯出。', 'success');
};


const exportSelectedPersonnelData = () => {
    const selectedData = dataStore.personnel.filter(p => selectedPersonnel.value.includes(p.id));
    exportData(selectedData, `選取人員資料_${formatDate(new Date())}.csv`);
};
</script>

<style scoped>
.person-card {
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
}
</style>
