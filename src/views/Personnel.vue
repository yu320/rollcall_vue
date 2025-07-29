<template>
  <div class="bg-white rounded-xl shadow-lg p-6 mb-8 border border-indigo-200">
    <h2 class="text-3xl font-bold text-indigo-800 mb-6">人員管理</h2>
    
    <!-- Actions Bar -->
    <div class="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        <input type="text" v-model="filters.searchTerm" placeholder="搜尋人員..." class="w-full md:w-1/3 border rounded-lg px-4 py-2">
        <select v-model="filters.sortBy" class="w-full md:w-auto border rounded-lg px-4 py-2 bg-white">
            <option value="name_asc">依姓名排序 (A-Z)</option>
            <!-- other sort options -->
        </select>
        <button @click="openModal()" class="w-full sm:w-auto bg-indigo-600 text-white py-2 px-6 rounded-lg">新增人員</button>
    </div>

    <!-- Personnel List -->
    <div v-if="!isLoading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <div v-for="person in filteredPersonnel" :key="person.id" class="person-card bg-white rounded-lg shadow-md">
            <!-- Person card content -->
            <div class="p-4">
                <h3 class="font-bold">{{ person.name }}</h3>
                <p>學號: {{ person.code }}</p>
                <!-- ... other details ... -->
            </div>
            <div class="px-4 pb-4 flex justify-end gap-2">
                <button @click="openModal(person)">編輯</button>
                <button @click="confirmDelete(person)">刪除</button>
            </div>
        </div>
    </div>
     <div v-else>載入中...</div>

    <!-- Add/Edit Modal -->
    <Modal :show="isModalOpen" @close="closeModal">
      <template #header>{{ isEditing ? '編輯人員' : '新增人員' }}</template>
      <form @submit.prevent="savePerson">
        <!-- form fields for name, code, card_number, etc. -->
        <div class="mt-6 flex justify-end gap-3">
            <button type="button" @click="closeModal">取消</button>
            <button type="submit">儲存</button>
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
// ... other imports

const uiStore = useUiStore();
const dataStore = useDataStore();
const isLoading = ref(true);

const filters = ref({
    searchTerm: '',
    sortBy: 'name_asc',
});

// Watch for filter changes and re-fetch data
watch(filters, () => dataStore.fetchPersonnel(filters.value), { deep: true });

onMounted(async () => {
    isLoading.value = true;
    await dataStore.fetchPersonnel(filters.value);
    isLoading.value = false;
});

const filteredPersonnel = computed(() => dataStore.personnel);

// Modal logic
const isModalOpen = ref(false);
const isEditing = ref(false);
const editablePerson = ref({});

const openModal = (person = null) => {
    isEditing.value = !!person;
    editablePerson.value = person ? { ...person } : { name: '', code: '', card_number: '' };
    isModalOpen.value = true;
};
const closeModal = () => isModalOpen.value = false;

const savePerson = async () => {
    // save logic
    closeModal();
};

const confirmDelete = (person) => {
    if(confirm(`確定要刪除 ${person.name} 嗎？`)) {
        // delete logic
    }
};

</script>
