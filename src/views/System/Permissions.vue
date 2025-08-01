<template>
  <div class="p-6 bg-white rounded-xl shadow-lg border border-indigo-200">
    <h2 class="text-3xl font-bold mb-6 text-indigo-800">角色與權限管理</h2>
    
    <div class="flex flex-col md:flex-row gap-8">
      <div class="md:w-1/3">
        <h3 class="text-xl font-semibold mb-4 text-gray-700">角色列表</h3>
        <div v-if="isLoading" class="text-center py-4 text-gray-500">
            載入角色中...
        </div>
        <div v-else-if="roles.length > 0" class="space-y-2">
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
        <div v-else class="text-center py-4 text-gray-500">
            沒有可用的角色。
        </div>
      </div>

      <div class="md:w-2/3">
        <div v-if="isLoading" class="flex items-center justify-center h-full bg-gray-50 rounded-lg p-8">
            <p class="text-gray-500 text-center">
                <svg class="animate-spin -ml-1 mr-3 h-8 w-8 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span class="mt-2 block font-medium">載入權限中...</span>
            </p>
        </div>
        <div v-else-if="selectedRole">
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
            <button @click="updatePermissions" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg transition shadow-md flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
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
import { ref, onMounted, computed, watch } from 'vue';
import { useUiStore } from '@/store/ui';
import { useDataStore } from '@/store/data';
import * as api from '@/services/api';

const uiStore = useUiStore();
const dataStore = useDataStore(); // 獲取 dataStore 實例

// Reactive state
const isLoading = ref(true); // 頁面整體載入狀態
const roles = computed(() => dataStore.roles); // 從 Pinia 獲取角色列表
const permissions = computed(() => dataStore.permissions); // 從 Pinia 獲取所有權限
const selectedRole = ref(null);
const rolePermissionIds = ref([]); // 只儲存 selectedRole 擁有的 permission ID 陣列

// Fetch initial data on component mount
onMounted(async () => {
  uiStore.setLoading(true); // 顯示全局載入遮罩
  isLoading.value = true; // 設置頁面載入狀態
  try {
    // 平行獲取所有角色和所有權限，並儲存到 dataStore
    await Promise.all([
      dataStore.fetchRolesAndPermissions(), // 這會更新 dataStore.roles
      dataStore.fetchAllPermissions() // 這會更新 dataStore.permissions
    ]);

    // 如果有角色，預設選中第一個角色 (或根據需要設定邏輯)
    if (roles.value.length > 0) {
      await selectRole(roles.value[0]);
    }
  } catch (error) {
    uiStore.showMessage(`讀取權限資料失敗: ${error.message}`, 'error');
  } finally {
    isLoading.value = false; // 隱藏頁面載入狀態
    uiStore.setLoading(false); // 隱藏全局載入遮罩
  }
});

// Watch for changes in selectedRole to fetch its permissions
watch(selectedRole, async (newRole) => {
    if (newRole) {
        uiStore.setLoading(true);
        try {
            const currentPermissions = await api.fetchPermissionsForRole(newRole.id);
            rolePermissionIds.value = currentPermissions.map(p => p.permission_id);
        } catch (error) {
            uiStore.showMessage(`讀取角色權限失敗: ${error.message}`, 'error');
        } finally {
            uiStore.setLoading(false);
        }
    } else {
        rolePermissionIds.value = []; // 如果沒有選中角色，則清空權限列表
    }
});


// Group permissions by category (e.g., 'personnel:read' -> 'personnel')
const groupedPermissions = computed(() => {
  if (!permissions.value) return {};
  return permissions.value.reduce((acc, permission) => {
    const groupName = permission.name.split(':')[0]; // 例如 'personnel:read' 變成 'personnel'
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
  // watch(selectedRole) 會自動觸發權限獲取
};

// Function to update permissions on save button click
const updatePermissions = async () => {
  if (!selectedRole.value) {
    uiStore.showMessage('請先選擇一個角色。', 'warning');
    return;
  }
  
  uiStore.setLoading(true);
  try {
    await api.updatePermissionsForRole(selectedRole.value.id, rolePermissionIds.value);
    uiStore.showMessage(`角色 "${selectedRole.value.name}" 的權限已更新`, 'success');
    // 更新成功後，重新獲取所有角色與權限數據，以確保 Pinia Store 是最新的
    await dataStore.fetchRolesAndPermissions(); 
  } catch (error) {
    uiStore.showMessage(`更新權限失敗: ${error.message}`, 'error');
    // 如果更新失敗，重新獲取一次資料以確保 checkbox 狀態正確
    await selectRole(selectedRole.value);
  } finally {
      uiStore.setLoading(false);
  }
};
</script>
