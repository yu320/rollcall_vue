// src/store/data.js

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import * as api from '@/services/api';
import { useUiStore } from './ui';

export const useDataStore = defineStore('data', () => {
  // --- Stores ---
  const uiStore = useUiStore();

  // --- State ---
  const personnel = ref([]);
  const events = ref([]);
  const roles = ref([]);
  const permissions = ref([]);

  // --- Getters (as computed properties) ---
  const getPersonnelById = computed(() => {
    const personnelMap = new Map(personnel.value.map(p => [p.id, p]));
    return (id) => personnelMap.get(id);
  });
  
  const getEventById = computed(() => {
    const eventMap = new Map(events.value.map(e => [e.id, e]));
    return (id) => eventMap.get(id);
  });

  // --- [NEW] Helper function for UI ---
  /**
   * 根據輸入字串的第一個字元返回 Tailwind CSS 顏色類別。
   * @param {string} input - 輸入字串 (學號或卡號)。
   * @returns {string} - 顏色類別字串。
   */
  function getInputColorClass(input) {
    if (!input || typeof input !== 'string' || input.length === 0) return '';
    const firstChar = input.charAt(0).toLowerCase();
    if (/[a-z]/.test(firstChar)) {
        return `code-${firstChar}`;
    }
    if (/[0-9]/.test(firstChar)) {
        return `code-digit-${firstChar}`;
    }
    return '';
  }

  // --- Actions for Personnel ---

  async function fetchAllPersonnel() {
    try {
      personnel.value = await api.fetchAllPersonnel();
      return personnel.value;
    } catch (error) {
      uiStore.showMessage(`讀取人員資料失敗: ${error.message}`, 'error');
      return [];
    }
  }

  async function savePerson(personData) {
    const isEditing = !!personData.id;
    uiStore.setLoading(true);
    try {
      const savedPerson = isEditing
        ? await api.updatePersonnel(personData.id, personData)
        : await api.createPersonnel(personData);
      
      if (isEditing) {
        const index = personnel.value.findIndex(p => p.id === savedPerson.id);
        if (index !== -1) personnel.value[index] = savedPerson;
      } else {
        personnel.value.push(savedPerson);
      }
      uiStore.showMessage('人員資料已儲存', 'success');
      return true;
    } catch (error) {
      uiStore.showMessage(`儲存人員失敗: ${error.message}`, 'error');
      return false;
    } finally {
      uiStore.setLoading(false);
    }
  }

  async function batchDeletePersonnel(ids) {
    uiStore.setLoading(true);
    try {
      await api.batchDeletePersonnel(ids);
      personnel.value = personnel.value.filter(p => !ids.includes(p.id));
      uiStore.showMessage(`已成功刪除 ${ids.length} 位人員`, 'success');
    } catch (error) {
      uiStore.showMessage(`批量刪除人員失敗: ${error.message}`, 'error');
    } finally {
      uiStore.setLoading(false);
    }
  }

  // --- Actions for Events ---

  async function fetchEvents() {
    try {
      events.value = await api.fetchEvents();
      return events.value;
    } catch (error) {
      uiStore.showMessage(`讀取活動資料失敗: ${error.message}`, 'error');
      return [];
    }
  }
  
  async function createEvent(eventData) {
    uiStore.setLoading(true);
    try {
        await api.createEvent(eventData);
        await fetchEvents(); // Re-fetch to get the latest list
        uiStore.showMessage('活動已成功建立', 'success');
    } catch (error) {
        uiStore.showMessage(`建立活動失敗: ${error.message}`, 'error');
    } finally {
        uiStore.setLoading(false);
    }
  }

  async function updateEvent(eventData) {
    uiStore.setLoading(true);
    try {
        await api.updateEvent(eventData.id, eventData);
        await fetchEvents(); // Re-fetch to update the list
        uiStore.showMessage('活動已成功更新', 'success');
    } catch (error) {
        uiStore.showMessage(`更新活動失敗: ${error.message}`, 'error');
    } finally {
        uiStore.setLoading(false);
    }
  }


  async function deleteEvent(id) {
    uiStore.setLoading(true);
    try {
      await api.deleteEvent(id);
      events.value = events.value.filter(e => e.id !== id);
      uiStore.showMessage('活動已刪除', 'success');
    } catch (error) {
      uiStore.showMessage(`刪除活動失敗: ${error.message}`, 'error');
    } finally {
      uiStore.setLoading(false);
    }
  }

  // --- Actions for Roles & Permissions ---
  
  async function fetchRolesAndPermissions() {
    try {
      roles.value = await api.fetchAllRolesAndPermissions();
    } catch(error) {
      uiStore.showMessage(`讀取角色與權限失敗: ${error.message}`, 'error');
    }
  }

  async function fetchAllPermissions() {
    try {
      permissions.value = await api.fetchAllPermissions();
    } catch(error) {
      uiStore.showMessage(`讀取所有權限失敗: ${error.message}`, 'error');
    }
  }

  async function updateRolePermissions(roleId, permissionIds) {
    uiStore.setLoading(true);
    try {
      await api.updatePermissionsForRole(roleId, permissionIds);
      await fetchRolesAndPermissions(); // Refresh data after update
      uiStore.showMessage('權限已更新', 'success');
    } catch (error) {
      uiStore.showMessage(`更新權限失敗: ${error.message}`, 'error');
    } finally {
      uiStore.setLoading(false);
    }
  }


  return {
    personnel,
    events,
    roles,
    permissions,
    getPersonnelById,
    getEventById,
    getInputColorClass, // [NEW] Expose the function
    fetchAllPersonnel,
    savePerson,
    batchDeletePersonnel,
    fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    fetchRolesAndPermissions,
    fetchAllPermissions,
    updateRolePermissions,
  };
});
