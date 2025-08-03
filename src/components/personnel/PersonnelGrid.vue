<template>
  <div v-if="personnel.length > 0">
      <div class="flex items-center mb-4">
          <input 
            type="checkbox"
            :checked="allSelected"
            @change="$emit('update:allSelected', $event.target.checked)"
            id="selectAllCheckbox" 
            class="h-4 w-4 text-indigo-600 rounded mr-2"
          >
          <label for="selectAllCheckbox" class="text-sm text-gray-600">全選本頁</label>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <PersonCard
            v-for="person in personnel" 
            :key="person.id" 
            :person="person"
            :isSelected="selectedIds.includes(person.id)"
            @update:selected="toggleSelection(person.id, $event)"
            @edit="$emit('edit', person)"
            @delete="$emit('delete', person)"
          />
      </div>

      <div v-if="totalPages > 1" class="mt-6 flex justify-center items-center space-x-4 text-sm">
          <button @click="$emit('update:currentPage', currentPage - 1)" :disabled="currentPage === 1" class="px-3 py-1 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition">
              上一頁
          </button>
          <span>
              第 {{ currentPage }} / {{ totalPages }} 頁 (共 {{ totalCount }} 筆)
          </span>
          <button @click="$emit('update:currentPage', currentPage + 1)" :disabled="currentPage === totalPages" class="px-3 py-1 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition">
              下一頁
          </button>
      </div>
  </div>
  <div v-else class="text-center py-12 text-gray-500">
    <p>找不到符合條件的人員，或尚未新增任何人員。</p>
  </div>
</template>

<script setup>
import PersonCard from './PersonCard.vue';

const props = defineProps({
  personnel: Array,
  selectedIds: Array,
  allSelected: Boolean,
  currentPage: Number,
  totalPages: Number,
  totalCount: Number,
});

const emit = defineEmits([
  'update:selectedIds', 
  'update:allSelected', 
  'update:currentPage', 
  'edit', 
  'delete'
]);

const toggleSelection = (personId, isSelected) => {
  const newSelection = new Set(props.selectedIds);
  if (isSelected) {
    newSelection.add(personId);
  } else {
    newSelection.delete(personId);
  }
  emit('update:selectedIds', Array.from(newSelection));
};
</script>