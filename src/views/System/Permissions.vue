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
            <p class="text-sm text-gray-500">{{ role.description }}</p>
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
            <div v-for="(group, groupName) in groupedPermissions" :key="groupName" class="p-4 border rounded-lg bg-white">
              <h4 class="font-semibold text-lg mb-3 text-gray-800 capitalize">{{ groupName }}</h4>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label v-for="permission in group" :key="permission.id" class="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-50">
                  <input 
                    type="checkbox"
                    :value="permission.id"
                    v-model="rolePermissions"
                    @change="updatePermissions"
                    class="h-5 w-5 rounded text-indigo-600 focus:ring-indigo-500"
                  >
                  <span class="text-gray-700">{{ permission.description }}</span>
                </label>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="flex items-center justify-center h-full bg-gray-50 rounded-lg">
          <p class="text-gray-500">請從左側選擇一個角色以編輯其權限。</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useUiStore } from '@/store/ui';
import { api } from '@/services/api';

const uiStore = useUiStore();

// Reactive state
const roles = ref([]);
const permissions = ref([]);
const selectedRole = ref(null);
const rolePermissions = ref([]); // Array of permission IDs for the selected role

// Fetch initial data on component mount
onMounted(async () => {
  uiStore.setLoading(true);
  try {
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
    const currentPermissions = await api.fetchPermissionsForRole(role.id);
    rolePermissions.value = currentPermissions.map(p => p.permission_id);
  } catch (error) {
    uiStore.showMessage(`讀取角色權限失敗: ${error.message}`, 'error');
  } finally {
    uiStore.setLoading(false);
  }
};

// Function to update permissions when a checkbox is toggled
const updatePermissions = async () => {
  if (!selectedRole.value) return;
  
  // Use a slight debounce/delay to prevent rapid-fire API calls
  // In a real app, you might use a more robust debounce function
  setTimeout(async () => {
    try {
      await api.updatePermissionsForRole(selectedRole.value.id, rolePermissions.value);
      uiStore.showMessage(`角色 "${selectedRole.value.name}" 的權限已更新`, 'success');
    } catch (error) {
      uiStore.showMessage(`更新權限失敗: ${error.message}`, 'error');
      // Re-fetch to revert checkbox state on failure
      selectRole(selectedRole.value);
    }
  }, 300);
};
</script>
