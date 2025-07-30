// src/store/data.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import * as api from '@/services/api';
import { useUiStore } from './ui';

export const useDataStore = defineStore('data', () => {
  const uiStore = useUiStore();

  // --- State ---
  const personnel = ref([]);
  const events = ref([]);
  const roles = ref([]);
  const permissions = ref([]);

  // --- Getters (as computed properties) ---
  const getPersonnelById = computed(() => {
    return (id) => personnel.value.find(p => p.id === id);
  });

  const getEventById = computed(() => {
    return (id) => events.value.find(e => e.id === id);
  });

  const getInputColorClass = (input) => {
    if (!input) return '';
    const lastChar = input.slice(-1).toLowerCase();
    if (/\d/.test(lastChar)) {
        return `code-digit-${lastChar}`;
    } else if (/[a-z]/.test(lastChar)) {
        return `code-${lastChar}`;
    }
    return '';
  };

  // --- Actions ---
  async function fetchAllPersonnel() {
    try {
      const data = await api.fetchAllPersonnel();
      personnel.value = data || [];
    } catch (error) {
      uiStore.showMessage(`讀取人員資料失敗: ${error.message}`, 'error');
      personnel.value = [];
    }
  }

  async function fetchEvents() {
    try {
        const data = await api.fetchEvents();
        events.value = data || [];
    } catch (error) {
        uiStore.showMessage(`讀取活動資料失敗: ${error.message}`, 'error');
        events.value = [];
    }
  }

  async function createEvent(eventData) {
    try {
      const newEvent = await api.createEvent(eventData);
      if (newEvent && newEvent.length > 0) {
        // 將新活動加到列表頂部
        events.value.unshift(newEvent[0]);
        await fetchEvents(); // 重新獲取以確保 created_by 等關聯資料正確
        return newEvent[0];
      }
    } catch (error) {
      uiStore.showMessage(`建立活動失敗: ${error.message}`, 'error');
      throw error;
    }
  }

  async function updateEvent(eventData) {
    try {
      const updatedEvent = await api.updateEvent(eventData.id, eventData);
       if (updatedEvent && updatedEvent.length > 0) {
        const index = events.value.findIndex(e => e.id === eventData.id);
        if (index !== -1) {
          events.value[index] = updatedEvent[0];
        }
        await fetchEvents(); // 重新獲取以確保 created_by 等關聯資料正確
        return updatedEvent[0];
      }
    } catch (error) {
      uiStore.showMessage(`更新活動失敗: ${error.message}`, 'error');
      throw error;
    }
  }

  async function deleteEvent(eventId) {
    try {
      await api.deleteEvent(eventId);
      events.value = events.value.filter(e => e.id !== eventId);
      uiStore.showMessage('活動已成功刪除', 'success');
      return true;
    } catch (error) {
      uiStore.showMessage(`刪除活動失敗: ${error.message}`, 'error');
      throw error;
    }
  }

  async function savePerson(personData) {
    try {
      let savedPerson;
      if (personData.id) { // Update existing person
        savedPerson = await api.updatePersonnel(personData.id, personData);
        const index = personnel.value.findIndex(p => p.id === personData.id);
        if (index !== -1) {
          personnel.value[index] = savedPerson;
        }
        uiStore.showMessage('人員資料更新成功', 'success');
      } else { // Create new person
        savedPerson = await api.createPersonnel(personData);
        personnel.value.push(savedPerson);
        uiStore.showMessage('人員新增成功', 'success');
      }
      return true;
    } catch (error) {
      uiStore.showMessage(`儲存人員資料失敗: ${error.message}`, 'error');
      return false;
    }
  }

  async function batchDeletePersonnel(ids) {
    uiStore.setLoading(true);
    try {
        await api.batchDeletePersonnel(ids);
        personnel.value = personnel.value.filter(p => !ids.includes(p.id));
        uiStore.showMessage(`成功刪除 ${ids.length} 位人員`, 'success');
    } catch (error) {
        uiStore.showMessage(`刪除人員失敗: ${error.message}`, 'error');
    } finally {
        uiStore.setLoading(false);
    }
  }


  async function fetchRolesAndPermissions() {
    try {
        const data = await api.fetchAllRolesAndPermissions();
        roles.value = data || [];
    } catch (error) {
        uiStore.showMessage(`讀取角色列表失敗: ${error.message}`, 'error');
        roles.value = [];
    }
  }
  
  async function fetchAllPermissions() {
      try {
          const data = await api.fetchAllPermissions();
          permissions.value = data || [];
      } catch (error) {
          uiStore.showMessage(`讀取權限列表失敗: ${error.message}`, 'error');
          permissions.value = [];
      }
  }

  return {
    // State
    personnel,
    events,
    roles,
    permissions,
    // Getters
    getPersonnelById,
    getEventById,
    getInputColorClass,
    // Actions
    fetchAllPersonnel,
    fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    savePerson,
    batchDeletePersonnel,
    fetchRolesAndPermissions,
    fetchAllPermissions,
  };
});
