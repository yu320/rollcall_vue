<template>
  <div class="p-6 bg-white rounded-xl shadow-lg border border-indigo-200">
    <h2 class="text-3xl font-bold mb-6 text-indigo-800">角色與權限管理</h2>
    
    <div class="flex flex-col md:flex-row gap-8">
      <!-- Roles List -->
      <div class="md:w-1/3">
        <h3 class="text-xl font-semibold mb-4 text-gray-700">角色列表</h3>
        <div class="space-y-2">
          <div 
            v-for="role in roles" 
            :key="role.id"
            @click="selectRole(role)"
            :class="['p-4 rounded-lg cursor-pointer transition-all duration-200 border-2', selectedRole?.id === role.id ? 'bg-indigo-100 border-indigo-500 shadow-md' : 'bg-gray-50 hover:bg-gray-100 border-transparent']"
          >
            <p class="font-bold text-gray-800">{{ role.name }}</p>
            <p class="text-sm text-gray-500">{{ role.description || '暫無描述' }}</p>
          </div>
        </div>
      </div>

      <!-- Permissions Matrix -->
      <div class="md:w-2/3">
        <div v-if="selectedRole">
          <h3 class="text-xl font-semibold mb-4 text-gray-700">
            編輯角色 <span class="font-bold text-indigo-600">"{{ selectedRole.name }}"</span> 的權限
          </h3>
          <div class="space-y-4">
            <div v-for="(group, groupName) in groupedPermissions" :key="groupName" class="p-4 border rounded-lg bg-white shadow-sm">
              <h4 class="font-semibold text-lg mb-3 text-gray-800 capitalize border-b pb-2">{{ groupName }}</h4>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label v-for="permission in group" :key="permission.id" class="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-50 cursor-pointer">
                  <input 
                    type="checkbox"
                    :value="permission.id"
                    v-model="rolePermissionIds"
                    class="h-5 w-5 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                  >
                  <span class="text-gray-700">{{ permission.description || permission.name }}</span>
                </label>
              </div>
            </div>
          </div>
           <div class="mt-6 flex justify-end">
            <button @click="updatePermissions" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg transition shadow-md">
              儲存變更
            </button>
          </div>
        </div>
        <div v-else class="flex items-center justify-center h-full bg-gray-50 rounded-lg p-8">
          <p class="text-gray-500 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 17l-5-5m0 0l5-5m-5 5h12" /></svg>
            <span class="mt-2 block font-medium">請從左側選擇一個角色以編輯其權限。</span>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useUiStore } from '@/store/ui';
// [FIXED] 修正 API 匯入方式，使用 * as api
import * as api from '@/services/api';

const uiStore = useUiStore();

// Reactive state
const roles = ref([]);
const permissions = ref([]);
const selectedRole = ref(null);
const rolePermissionIds = ref([]); // 只儲存 permission ID 的陣列

// 用於 debounce 的計時器
let debounceTimer = null;

// Fetch initial data on component mount
onMounted(async () => {
  uiStore.setLoading(true);
  try {
    // 平行獲取所有角色和所有權限
    [roles.value, permissions.value] = await Promise.all([
      api.fetchAllRoles(),
      api.fetchAllPermissions()
    ]);
  } catch (error) {
    uiStore.showMessage(`讀取權限資料失敗: ${error.message}`, 'error');
  } finally {
    uiStore.setLoading(false);
  }
});

// Group permissions by category (e.g., 'personnel:read' -> 'personnel')
const groupedPermissions = computed(() => {
  if (!permissions.value) return {};
  return permissions.value.reduce((acc, permission) => {
    const groupName = permission.name.split(':')[0];
    if (!acc[groupName]) {
      acc[groupName] = [];
    }
    acc[groupName].push(permission);
    return acc;
  }, {});
});

// Function to handle role selection
const selectRole = async (role) => {
  selectedRole.value = role;
  uiStore.setLoading(true);
  try {
    // [FIXED] 呼叫新增的 fetchPermissionsForRole API
    const currentPermissions = await api.fetchPermissionsForRole(role.id);
    // 將結果轉換為 ID 陣列
    rolePermissionIds.value = currentPermissions.map(p => p.permission_id);
  } catch (error) {
    uiStore.showMessage(`讀取角色權限失敗: ${error.message}`, 'error');
  } finally {
    uiStore.setLoading(false);
  }
};

// Function to update permissions on save button click
const updatePermissions = async () => {
  if (!selectedRole.value) return;
  
  uiStore.setLoading(true);
  try {
    // [FIXED] 呼叫新增的 updatePermissionsForRole API
    await api.updatePermissionsForRole(selectedRole.value.id, rolePermissionIds.value);
    uiStore.showMessage(`角色 "${selectedRole.value.name}" 的權限已更新`, 'success');
  } catch (error) {
    uiStore.showMessage(`更新權限失敗: ${error.message}`, 'error');
    // 如果更新失敗，重新獲取一次資料以確保 checkbox 狀態正確
    await selectRole(selectedRole.value);
  } finally {
      uiStore.setLoading(false);
  }
};
</script>
