// src/store/data.js
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '@/services/api';
import { useUiStore } from './ui';

export const useDataStore = defineStore('data', () => {
  const uiStore = useUiStore();

  // --- State ---
  const personnel = ref([]);
  const events = ref([]);

  // --- Actions ---

  /**
   * 獲取所有人員資料
   */
  const fetchPersonnel = async (filters = {}) => {
    uiStore.setLoading(true);
    try {
      personnel.value = await api.fetchPersonnel(filters);
    } catch (error) {
      uiStore.showMessage(`獲取人員資料失敗: ${error.message}`, 'error');
    } finally {
      uiStore.setLoading(false);
    }
  };
  
  /**
   * 新增或更新人員
   * @param {Array} personnelArray - 要上傳的人員資料陣列
   */
  const upsertPersonnel = async (personnelArray) => {
      // Action-specific logic, can show loading here too
      await api.upsertPersonnel(personnelArray);
      await fetchPersonnel(); // Refresh the list
  };

  /**
   * 獲取所有活動資料
   */
  const fetchEvents = async () => {
    // 檢查是否已有資料，避免不必要的重複請求
    if (events.value.length > 0) return;
    
    uiStore.setLoading(true);
    try {
      events.value = await api.fetchEvents();
    } catch (error) {
      uiStore.showMessage(`獲取活動資料失敗: ${error.message}`, 'error');
    } finally {
      uiStore.setLoading(false);
    }
  };
  
  /**
   * 新增或更新活動
   * @param {object} eventData - 活動資料
   */
  const upsertEvent = async (eventData) => {
      await api.upsertEvent(eventData);
      await fetchEvents(); // Refresh
  };
  
   /**
   * 刪除活動
   * @param {string} eventId - 活動ID
   */
  const deleteEvent = async (eventId) => {
      await api.deleteEvent(eventId);
      await fetchEvents(); // Refresh
  };

  return {
    personnel,
    events,
    fetchPersonnel,
    upsertPersonnel,
    fetchEvents,
    upsertEvent,
    deleteEvent,
  };
});
