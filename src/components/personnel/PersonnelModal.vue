<template>
  <Modal :show="show" @close="$emit('close')">
    <template #header>{{ isEditing ? '編輯人員' : '新增人員' }}</template>
    <form @submit.prevent="handleSave">
      <div class="space-y-4">
        <div>
          <label for="name" class="block text-sm font-medium text-gray-700">姓名</label>
          <input type="text" id="name" v-model="form.name" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
        </div>
        <div>
          <label for="code" class="block text-sm font-medium text-gray-700">學號</label>
          <input type="text" id="code" v-model="form.code" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
        </div>
         <div>
          <label for="card_number" class="block text-sm font-medium text-gray-700">卡號</label>
          <input type="text" id="card_number" v-model="form.card_number" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
        </div>
        <div>
          <label for="building" class="block text-sm font-medium text-gray-700">棟別 (選填)</label>
          <input type="text" id="building" v-model="form.building" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
        </div>
         <div>
          <label for="tags" class="block text-sm font-medium text-gray-700">標籤 (選填，用分號 ; 或 ； 分隔)</label>
          <input type="text" id="tags" v-model="form.tags" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3">
        </div>
      </div>
      <div class="mt-6 flex justify-end gap-3">
          <button type="button" @click="$emit('close')" class="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300">取消</button>
          <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">儲存</button>
      </div>
    </form>
  </Modal>
</template>

<script setup>
import { ref, watch, computed } from 'vue';

import Modal from '@/components/Modal.vue';

const props = defineProps({
  show: Boolean,
  person: Object,
});

const emit = defineEmits(['close', 'save']);

const form = ref({});

const isEditing = computed(() => !!(props.person && props.person.id));

watch(() => props.show, (newVal) => {
  if (newVal) {
    if (isEditing.value) {
      form.value = { ...props.person, tags: Array.isArray(props.person.tags) ? props.person.tags.join(';') : '' };
    } else {
      form.value = { name: '', code: '', card_number: '', building: '', tags: '' };
    }
  }
});

const handleSave = () => {
  const personData = { 
    ...form.value, 
    tags: form.value.tags.split(/[;；]/).map(t => t.trim()).filter(Boolean)
  };
  emit('save', personData);
};
</script>