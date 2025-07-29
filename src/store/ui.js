// src/store/ui.js
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useUiStore = defineStore('ui', () => {
  // --- State ---
  const isLoading = ref(false);
  // [MODIFIED] 將 message 改為 messages 陣列，以支援多個同時顯示的訊息
  const messages = ref([]);

  // [NEW] 新增確認彈窗的狀態
  const confirmation = ref({
    visible: false,
    title: '',
    body: '',
    confirmText: '確認',
    confirmColorClass: 'bg-red-600 hover:bg-red-700',
    resolve: null, // 用於儲存 Promise 的 resolve 函數
    reject: null,  // 用於儲存 Promise 的 reject 函數
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
   * @param {string} type - 訊息類型 ('info', 'success', 'warning', 'error')
   */
  const showMessage = (text, type = 'info') => {
    const id = Date.now() + Math.random(); // 產生唯一 ID
    messages.value.push({ id, text, type });
    // 設定計時器，3 秒後自動移除此訊息
    setTimeout(() => removeMessage(id), 3000);
  };
  
  /**
   * 根據 ID 移除訊息
   * @param {number} id - 要移除的訊息 ID
   */
  const removeMessage = (id) => {
    const index = messages.value.findIndex(m => m.id === id);
    if (index > -1) {
      messages.value.splice(index, 1);
    }
  };

  /**
   * [NEW] 顯示確認彈窗並返回一個 Promise
   * @param {string} title - 彈窗標題
   * @param {string} body - 彈窗內容
   * @param {string} [confirmText='確認'] - 確認按鈕文字
   * @param {string} [confirmColorClass='bg-red-600 hover:bg-red-700'] - 確認按鈕樣式
   * @returns {Promise<void>} - 當使用者點擊確認時 resolve，點擊取消時 reject
   */
  const showConfirmation = (title, body, confirmText = '確認', confirmColorClass = 'bg-red-600 hover:bg-red-700') => {
    return new Promise((resolve, reject) => {
      confirmation.value = {
        visible: true,
        title,
        body,
        confirmText,
        confirmColorClass,
        resolve,
        reject,
      };
    });
  };

  /**
   * [NEW] 處理確認操作
   */
  const handleConfirm = () => {
    if (confirmation.value.resolve) {
      confirmation.value.resolve();
    }
    hideConfirmation();
  };

  /**
   * [NEW] 處理取消操作
   */
  const handleCancel = () => {
    if (confirmation.value.reject) {
      confirmation.value.reject(new Error('User cancelled'));
    }
    hideConfirmation();
  };

  /**
   * [NEW] 隱藏確認彈窗並重置狀態
   */
  const hideConfirmation = () => {
    confirmation.value.visible = false;
  };


  return {
    isLoading,
    messages, // [MODIFIED] 導出 messages 陣列
    confirmation, // [NEW] 導出確認彈窗狀態
    setLoading,
    showMessage,
    removeMessage, // [MODIFIED] 導出移除訊息的 action
    showConfirmation, // [NEW]
    handleConfirm,    // [NEW]
    handleCancel,     // [NEW]
  };
});
