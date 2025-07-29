<template>
  <div class="bg-white rounded-xl shadow-lg p-6 mb-8 border border-indigo-200">
    <h2 class="text-3xl font-bold text-indigo-800 mb-6">人員管理</h2>
    
    <!-- Actions Bar -->
    <div class="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
      <div class="relative w-full md:w-1/3">
        <input type="text" v-model="filters.searchTerm" placeholder="搜尋姓名、學號、卡號..." class="w-full border rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-indigo-400">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
      </div>
      <select v-model="filters.sortBy" class="w-full md:w-auto border rounded-lg px-4 py-2 bg-white focus:ring-2 focus:ring-indigo-400">
        <option value="name_asc">依姓名排序 (A-Z)</option>
        <option value="name_desc">依姓名排序 (Z-A)</option>
        <option value="code_asc">依學號排序 (A-Z)</option>
        <option value="code_desc">依學號排序 (Z-A)</option>
      </select>
      <div class="flex items-center gap-2 w-full md:w-auto">
        <button v-if="selectedPersonnel.length > 0" @click="confirmBatchDelete" class="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg shadow-sm transition">
          刪除選取 ({{ selectedPersonnel.length }})
        </button>
        <button @click="openBatchAddTagsModal" :disabled="selectedPersonnel.length === 0" class="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition duration-300 flex items-center justify-center shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h.01M7 11h.01M7 15h.01M7 19h.01M15 7h.01M15 3h.01M15 11h.01M15 15h.01M15 19h.01M19 7h.01M19 3h.01M19 11h.01M19 15h.01M19 19h.01M3 3h.01M3 7h.01M3 11h.01M3 15h.01M3 19h.01M11 3h.01M11 7h.01M11 11h.01M11 15h.01M11 19h.01" /></svg>
          批量增加標籤
        </button>
        <button @click="exportPersonnelData" class="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-6 rounded-lg transition duration-300 flex items-center justify-center shadow-md hover:shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            匯出人員資料
        </button>
        <button @click="openModal()" class="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-lg shadow-sm transition">新增人員</button>
      </div>
    </div>

    <!-- Personnel List -->
    <div v-if="isLoading" class="text-center py-12">
      <div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
      <p class="mt-4 text-gray-600">正在載入人員資料...</p>
    </div>
    <div v-else-if="sortedPersonnel.length > 0">
      <div class="flex items-center mb-4">
          <input type="checkbox" v-model="selectAll" id="selectAllCheckbox" class="h-4 w-4 text-indigo-600 rounded mr-2">
          <label for="selectAllCheckbox" class="text-sm text-gray-600">全選</label>
      </div>
      <!-- Personnel card structure updated to match old version -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <div v-for="person in sortedPersonnel" :key="person.id" 
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

    <!-- Add/Edit Personnel Modal -->
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

    <!-- Batch Add Tags Modal -->
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
import * as api from '@/services/api'; // 確保引入 api
import { formatDate } from '@/utils'; // 引入 formatDate 函數
import Modal from '@/components/Modal.vue';

const uiStore = useUiStore();
const dataStore = useDataStore();
const isLoading = ref(true);

// 篩選與排序相關狀態
const filters = ref({
    searchTerm: '',
    sortBy: 'name_asc', // 預設依姓名升序
});

// 選取人員相關狀態
const selectedPersonnel = ref([]);

// 新增/編輯 Modal 相關狀態
const isModalOpen = ref(false);
const isEditing = ref(false);
const editablePerson = ref({}); // 用於 Modal 中編輯的人員資料

// 批量增加標籤 Modal 相關狀態
const isBatchAddTagsModalOpen = ref(false);
const newTagsInput = ref('');

// 組件載入時，獲取所有人員資料
onMounted(async () => {
    isLoading.value = true;
    uiStore.setLoading(true);
    try {
        await dataStore.fetchAllPersonnel(); // 從 Pinia Store 獲取人員資料
    } catch (error) {
        // 錯誤已在 dataStore 處理，這裡只需捕獲
    } finally {
        isLoading.value = false;
        uiStore.setLoading(false);
    }
});

// 監聽篩選條件變化，自動重新計算過濾與排序
watch(() => filters.value.searchTerm, () => {
  // 如果是實時搜尋，這裡會觸發，但我們讓 computed 屬性處理重算
});
watch(() => filters.value.sortBy, () => {
  // 如果是排序方式變化，這裡會觸發，但我們讓 computed 屬性處理重算
});

// 過濾人員資料
const filteredPersonnel = computed(() => {
    const term = filters.value.searchTerm.toLowerCase();
    if (!term) return dataStore.personnel;
    
    // 實現舊專案的搜索邏輯：支援姓名、學號、卡號或標籤的模糊匹配
    return dataStore.personnel.filter(p =>
        p.name.toLowerCase().includes(term) ||
        p.code.toLowerCase().includes(term) ||
        p.card_number.toLowerCase().includes(term) ||
        (p.tags && p.tags.some(tag => tag.toLowerCase().includes(term)))
    );
});

// 排序人員資料
const sortedPersonnel = computed(() => {
    const [key, direction] = filters.value.sortBy.split('_');
    return [...filteredPersonnel.value].sort((a, b) => {
        let valA = a[key]?.toLowerCase() || '';
        let valB = b[key]?.toLowerCase() || '';

        // 特殊處理數字排序，例如學號和卡號
        if (key === 'code' || key === 'card_number') {
            const numA = parseInt(valA.replace(/[^0-9]/g, ''), 10);
            const numB = parseInt(valB.replace(/[^0-9]/g, ''), 10);
            if (!isNaN(numA) && !isNaN(numB)) {
                return direction === 'asc' ? numA - numB : numB - numA;
            }
        }
        // 處理日期排序 (created_at, updated_at)
        if (key.includes('_at')) {
            const dateA = new Date(a[key]);
            const dateB = new Date(b[key]);
            return direction === 'asc' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
        }

        // 默認字符串排序
        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
    });
});

// 選取邏輯：判斷單個人員是否被選中
const isSelected = (id) => selectedPersonnel.value.includes(id);

// 選取邏輯：全選/取消全選
const selectAll = computed({
    get: () => sortedPersonnel.value.length > 0 && selectedPersonnel.value.length === sortedPersonnel.value.length,
    set: (value) => {
        selectedPersonnel.value = value ? sortedPersonnel.value.map(p => p.id) : [];
    }
});

// --- 新增/編輯人員 Modal 相關邏輯 ---
const openModal = (person = null) => {
    isEditing.value = !!person;
    if (person) {
        // 複製人員資料，並將 tags 陣列轉換為分號分隔的字串
        editablePerson.value = { ...person, tags: Array.isArray(person.tags) ? person.tags.join(';') : '' };
    } else {
        // 初始化空白人員資料
        editablePerson.value = { name: '', code: '', card_number: '', building: '', tags: '' };
    }
    isModalOpen.value = true;
};
const closeModal = () => isModalOpen.value = false;

const handleSave = async () => {
    // 儲存時，將 tags 字串重新轉換為陣列
    const personData = { 
        ...editablePerson.value, 
        tags: editablePerson.value.tags.split(';').map(t => t.trim()).filter(Boolean)
    };
    uiStore.setLoading(true);
    // 調用 dataStore 中的 savePerson 方法
    const success = await dataStore.savePerson(personData);
    uiStore.setLoading(false);
    if (success) {
        closeModal();
    }
};

// --- 單筆/批次刪除人員相關邏輯 ---
const confirmDelete = async (person) => {
    if(confirm(`確定要刪除 ${person.name} (${person.code}) 嗎？`)) {
        await dataStore.batchDeletePersonnel([person.id]); // 調用 dataStore 的批次刪除方法
        selectedPersonnel.value = selectedPersonnel.value.filter(id => id !== person.id); // 更新選取狀態
    }
};

const confirmBatchDelete = async () => {
    if(selectedPersonnel.value.length === 0) {
        uiStore.showMessage('請至少選擇一位人員進行批量刪除。', 'info');
        return;
    }
    if(confirm(`確定要刪除選取的 ${selectedPersonnel.value.length} 位人員嗎？此操作無法復原。`)) {
        await dataStore.batchDeletePersonnel(selectedPersonnel.value);
        selectedPersonnel.value = []; // 清空選取狀態
    }
};

// --- 批量增加標籤 Modal 相關邏輯 ---
const openBatchAddTagsModal = () => {
    if (selectedPersonnel.value.length === 0) {
        uiStore.showMessage('請至少選擇一位人員。', 'info');
        return;
    }
    newTagsInput.value = ''; // 清空輸入框
    isBatchAddTagsModalOpen.value = true;
};
const closeBatchAddTagsModal = () => isBatchAddTagsModalOpen.value = false;

const handleBatchAddTags = async () => {
    const tagsToAdd = newTagsInput.value.trim().split(';').map(tag => tag.trim()).filter(Boolean);
    if (tagsToAdd.length === 0) {
        uiStore.showMessage('請輸入要增加的標籤。', 'warning');
        return;
    }

    uiStore.setLoading(true);
    try {
        const allPersonnel = dataStore.personnel;
        const updatePromises = selectedPersonnel.value.map(id => {
            const person = allPersonnel.find(p => p.id === id);
            if (!person) return Promise.resolve(); // 如果人員不存在，跳過
            
            // 合併現有標籤和新標籤，並去重
            const currentTags = new Set(person.tags || []);
            tagsToAdd.forEach(tag => currentTags.add(tag));
            const updatedTags = Array.from(currentTags);
            
            return api.updatePersonnelTags(id, updatedTags); // 調用 API 更新標籤
        });
        
        await Promise.all(updatePromises);
        uiStore.showMessage(`已成功為 ${selectedPersonnel.value.length} 位人員增加標籤。`, 'success');
        await dataStore.fetchAllPersonnel(); // 重新獲取人員資料以更新 UI
        selectedPersonnel.value = []; // 清空選取
        closeBatchAddTagsModal();
    } catch (error) {
        uiStore.showMessage(`批量增加標籤失敗: ${error.message}`, 'error');
    } finally {
        uiStore.setLoading(false);
    }
};

// --- 匯出人員資料 ---
const exportPersonnelData = () => {
    if (dataStore.personnel.length === 0) {
        uiStore.showMessage('沒有人員資料可匯出。', 'info');
        return;
    }

    let csvContent = '姓名,學號,卡號,棟別,標籤\n';
    dataStore.personnel.forEach(person => {
        const name = `"${person.name}"`;
        const code = `"${person.code}"`;
        const cardNumber = `"${person.card_number}"`;
        const building = `"${person.building || ''}"`;
        const tags = `"${(person.tags || []).join(';')}"`;
        csvContent += `${name},${code},${cardNumber},${building},${tags}\n`;
    });

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' }); // 添加 BOM 以確保中文顯示正常
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `人員資料_${formatDate(new Date())}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    uiStore.showMessage('人員資料已匯出。', 'success');
};

</script>

<style scoped>
/* Style to match the old project's card shadow and hover effect */
.person-card {
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
}
</style>
