// src/store/ui.js
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useUiStore = defineStore('ui', () => {
  // --- State ---
  const isLoading = ref(false);
  // [MODIFIED] Change 'message' to 'messages' array to support multiple notifications
  const messages = ref([]);
  let messageIdCounter = 0; // To ensure unique IDs for messages

  // [NEW] State for custom confirmation modal
  const confirmationModal = ref({
    isVisible: false,
    title: '',
    message: '',
    confirmText: '確認',
    confirmButtonClass: 'bg-red-600 hover:bg-red-700',
    resolvePromise: null, // Stores the resolve function of the promise
    rejectPromise: null,  // Stores the reject function of the promise
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
   * @param {number} duration - 訊息顯示時間 (毫秒)，預設 3000 毫秒
   */
  const showMessage = (text, type = 'info', duration = 3000) => {
    messageIdCounter++;
    const id = messageIdCounter;
    messages.value.push({
      id,
      text,
      type,
    });

    // 自動移除訊息
    setTimeout(() => {
      removeMessage(id);
    }, duration);
  };

  /**
   * 移除指定 ID 的訊息
   * @param {number} id - 要移除的訊息的 ID
   */
  const removeMessage = (id) => {
    messages.value = messages.value.filter(msg => msg.id !== id);
  };

  /**
   * 顯示確認對話框
   * @param {string} title - 對話框標題
   * @param {string} message - 對話框內容
   * @param {string} confirmText - 確認按鈕文字
   * @param {string} confirmButtonClass - 確認按鈕的 CSS 類別
   * @returns {Promise<void>} - Promise 在用戶確認時解決，取消時拒絕
   */
  const showConfirmation = (title, message, confirmText = '確認', confirmButtonClass = 'bg-red-600 hover:bg-red-700') => {
    return new Promise((resolve, reject) => {
      confirmationModal.value = {
        isVisible: true,
        title,
        message,
        confirmText,
        confirmButtonClass,
        resolvePromise: resolve,
        rejectPromise: reject,
      };
    });
  };

  /**
   * 用戶確認操作時呼叫
   */
  const confirmAction = () => {
    if (confirmationModal.value.resolvePromise) {
      confirmationModal.value.resolvePromise();
    }
    hideConfirmation();
  };

  /**
   * 用戶取消操作時呼叫
   */
  const cancelAction = () => {
    if (confirmationModal.value.rejectPromise) {
      confirmationModal.value.rejectPromise(new Error('User cancelled confirmation.'));
    }
    hideConfirmation();
  };

  /**
   * 隱藏確認對話框
   */
  const hideConfirmation = () => {
    confirmationModal.value = {
      isVisible: false,
      title: '',
      message: '',
      confirmText: '確認',
      confirmButtonClass: 'bg-red-600 hover:bg-red-700',
      resolvePromise: null,
      rejectPromise: null,
    };
  };


  return {
    isLoading,
    messages, // [MODIFIED] Expose 'messages' array
    confirmationModal, // [NEW] Expose confirmationModal state
    setLoading,
    showMessage,
    removeMessage, // [MODIFIED] Expose removeMessage
    showConfirmation, // Expose showConfirmation
    confirmAction,   // [NEW] Expose confirmAction
    cancelAction,    // [NEW] Expose cancelAction
  };
});
