// src/store/ui.js
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useUiStore = defineStore('ui', () => {
  // --- State ---
  const isLoading = ref(false);
  const message = ref({
    text: '',
    type: 'info', // 'info', 'success', 'warning', 'error'
    visible: false,
    id: 0, // 用於觸發 watcher
  });

  // --- Actions ---
  
  /**
   * 設定全域載入狀態
   * @param {boolean} status - 是否正在載入
   */
  const setLoading = (status) => {
    isLoading.value = status;
  };

  /**
   * 顯示訊息提示框
   * @param {string} text - 要顯示的訊息
   * @param {string} type - 訊息類型
   */
  const showMessage = (text, type = 'info') => {
    message.value = {
      text,
      type,
      visible: true,
      id: Date.now(), // 產生唯一 ID 來觸發顯示
    };
  };
  
  /**
   * 隱藏訊息提示框
   */
  const hideMessage = () => {
    message.value.visible = false;
  };

  return {
    isLoading,
    message,
    setLoading,
    showMessage,
    hideMessage,
  };
});
