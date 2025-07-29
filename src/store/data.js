// src/store/data.js

import { defineStore } from 'pinia';
import { ref } from 'vue';
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

  // --- Actions for Personnel ---

  async function fetchAllPersonnel() {
    try {
      personnel.value = await api.fetchAllPersonnel();
    } catch (error) {
      uiStore.showMessage(`讀取人員資料失敗: ${error.message}`, 'error');
    }
  }

  async function savePerson(personData) {
    const isEditing = !!personData.id;
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
      return true; // Indicate success
    } catch (error) {
      uiStore.showMessage(`儲存人員失敗: ${error.message}`, 'error');
      return false; // Indicate failure
    }
  }

  async function batchDeletePersonnel(ids) {
    try {
      await api.batchDeletePersonnel(ids);
      personnel.value = personnel.value.filter(p => !ids.includes(p.id));
      uiStore.showMessage(`已成功刪除 ${ids.length} 位人員`, 'success');
    } catch (error) {
      uiStore.showMessage(`批量刪除人員失敗: ${error.message}`, 'error');
    }
  }

  // --- Actions for Events ---

  async function fetchEvents() {
    try {
      events.value = await api.fetchEvents();
    } catch (error) {
      uiStore.showMessage(`讀取活動資料失敗: ${error.message}`, 'error');
    }
  }
  
  async function saveEvent(eventData) {
    const isEditing = !!eventData.id;
    try {
      const savedEvent = isEditing 
        ? await api.updateEvent(eventData.id, eventData)
        : await api.createEvent(eventData);

      if (isEditing) {
        const index = events.value.findIndex(e => e.id === savedEvent.id);
        if (index !== -1) events.value[index] = savedEvent;
      } else {
        events.value.unshift(savedEvent); // Add new events to the top
      }
      uiStore.showMessage('活動資料已儲存', 'success');
      return true;
    } catch (error) {
      uiStore.showMessage(`儲存活動失敗: ${error.message}`, 'error');
      return false;
    }
  }

  async function deleteEvent(id) {
    try {
      await api.deleteEvent(id);
      events.value = events.value.filter(e => e.id !== id);
      uiStore.showMessage('活動已刪除', 'success');
    } catch (error) {
      uiStore.showMessage(`刪除活動失敗: ${error.message}`, 'error');
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
    try {
      await api.updateRolePermissions(roleId, permissionIds);
      // Refresh local data after update
      await fetchRolesAndPermissions();
      uiStore.showMessage('權限已更新', 'success');
    } catch (error) {
      uiStore.showMessage(`更新權限失敗: ${error.message}`, 'error');
    }
  }


  return {
    personnel,
    events,
    roles,
    permissions,
    fetchAllPersonnel,
    savePerson,
    batchDeletePersonnel,
    fetchEvents,
    saveEvent,
    deleteEvent,
    fetchRolesAndPermissions,
    fetchAllPermissions,
    updateRolePermissions,
  };
});
