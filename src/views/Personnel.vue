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
          <input type="checkbox" v-model="selectAll" class="h-4 w-4 text-indigo-600 rounded mr-2">
          <label for="selectAll" class="text-sm text-gray-600">全選</label>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <div v-for="person in sortedPersonnel" :key="person.id" 
             :class="['person-card bg-white rounded-lg shadow-md border-2 transition-all cursor-pointer', isSelected(person.id) ? 'border-indigo-500 shadow-lg' : 'border-transparent hover:border-indigo-300']"
             @click="toggleSelection(person.id)">
          <div class="p-4">
            <div class="flex items-center mb-3">
              <input type="checkbox" :checked="isSelected(person.id)" @click.stop class="h-4 w-4 text-indigo-600 rounded mr-3">
              <h3 class="font-bold text-lg text-gray-800 truncate">{{ person.name }}</h3>
            </div>
            <p class="text-sm text-gray-600">學號: <span class="font-mono">{{ person.code }}</span></p>
            <p class="text-sm text-gray-600">卡號: <span class="font-mono">{{ person.card_number }}</span></p>
            <p class="text-sm text-gray-600">棟別: <span class="font-medium">{{ person.building || '未設定' }}</span></p>
            <div v-if="person.tags && person.tags.length" class="mt-2 flex flex-wrap gap-1">
              <span v-for="tag in person.tags" :key="tag" class="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full">{{ tag }}</span>
            </div>
          </div>
          <div class="px-4 pb-4 flex justify-end gap-2 border-t pt-3 bg-gray-50">
            <button @click.stop="openModal(person)" class="text-sm text-blue-600 hover:text-blue-800 font-medium">編輯</button>
            <button @click.stop="confirmDelete(person)" class="text-sm text-red-600 hover:text-red-800 font-medium">刪除</button>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="text-center py-12 text-gray-500">
      <p>找不到符合條件的人員，或尚未新增任何人員。</p>
    </div>

    <!-- Add/Edit Modal -->
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
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useUiStore } from '@/store/ui';
import { useDataStore } from '@/store/data';
import Modal from '@/components/Modal.vue';

const uiStore = useUiStore();
const dataStore = useDataStore();
const isLoading = ref(true);
const selectedPersonnel = ref([]);

const filters = ref({
    searchTerm: '',
    sortBy: 'name_asc',
});

onMounted(async () => {
    isLoading.value = true;
    if (dataStore.personnel.length === 0) {
        await dataStore.fetchAllPersonnel();
    }
    isLoading.value = false;
});

const filteredPersonnel = computed(() => {
    const term = filters.value.searchTerm.toLowerCase();
    if (!term) return dataStore.personnel;
    return dataStore.personnel.filter(p =>
        p.name.toLowerCase().includes(term) ||
        p.code.toLowerCase().includes(term) ||
        p.card_number.toLowerCase().includes(term)
    );
});

const sortedPersonnel = computed(() => {
    const [key, direction] = filters.value.sortBy.split('_');
    return [...filteredPersonnel.value].sort((a, b) => {
        let valA = a[key].toLowerCase();
        let valB = b[key].toLowerCase();
        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
    });
});

// Selection Logic
const isSelected = (id) => selectedPersonnel.value.includes(id);

const toggleSelection = (id) => {
    const index = selectedPersonnel.value.indexOf(id);
    if (index > -1) {
        selectedPersonnel.value.splice(index, 1);
    } else {
        selectedPersonnel.value.push(id);
    }
};

const selectAll = computed({
    get: () => sortedPersonnel.value.length > 0 && selectedPersonnel.value.length === sortedPersonnel.value.length,
    set: (value) => {
        selectedPersonnel.value = value ? sortedPersonnel.value.map(p => p.id) : [];
    }
});

// Modal logic
const isModalOpen = ref(false);
const isEditing = ref(false);
const editablePerson = ref({});

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
    uiStore.setLoading(true);
    const success = await dataStore.savePerson(personData);
    uiStore.setLoading(false);
    if (success) {
        closeModal();
    }
};

const confirmDelete = async (person) => {
    if(confirm(`確定要刪除 ${person.name} (${person.code}) 嗎？`)) {
        await dataStore.batchDeletePersonnel([person.id]);
    }
};

const confirmBatchDelete = async () => {
    if(confirm(`確定要刪除選取的 ${selectedPersonnel.value.length} 位人員嗎？`)) {
        await dataStore.batchDeletePersonnel(selectedPersonnel.value);
        selectedPersonnel.value = []; // Clear selection after deletion
    }
};
</script>

<style scoped>
.person-card {
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
}
</style>
