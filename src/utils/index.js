// src/utils/index.js
/**
 * 通用輔助函數模組
 *
 * 職責:
 * - 提供與框架無關、可在多處重複使用的純函數。
 * - 例如：日期格式化、資料驗證、ID 生成等。
 */

/**
 * 將日期物件或字串格式化為 'YYYY-MM-DD HH:MM:SS'。
 * @param {string | Date} dateInput - 日期物件或有效的日期字串。
 * @returns {string} 格式化後的日期時間字串，如果輸入無效則返回空字串。
 */
export function formatDateTime(dateInput) {
  if (!dateInput) return '';
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return ''; // 檢查無效日期

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch (e) {
    console.error("日期時間格式化錯誤:", e);
    return '';
  }
}

/**
 * 將日期物件或字串格式化為 'YYYY-MM-DD'。
 * @param {string | Date} dateInput - 日期物件或有效的日期字串。
 * @returns {string} 格式化後的日期字串，如果輸入無效則返回空字串。
 */
export function formatDate(dateInput) {
  if (!dateInput) return '';
   try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return ''; // 檢查無效日期

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  } catch (e) {
    console.error("日期格式化錯誤:", e);
    return '';
  }
}

/**
 * 根據輸入字串的第一個字元返回對應的 CSS 顏色 class。
 * 用於在 UI 上為不同的學號或卡號提供視覺區分。
 * @param {string} input - 輸入的字串。
 * @returns {string} Tailwind CSS 顏色 class。
 */
export function getInputColorClass(input) {
  if (!input || typeof input !== 'string' || input.length === 0) return '';
  const firstChar = input.charAt(0).toLowerCase();

  if (/[a-z]/.test(firstChar)) {
    return `code-${firstChar}`; // 對應 main.css 中的 .code-a, .code-b...
  }
  if (/[0-9]/.test(firstChar)) {
    return `code-digit-${firstChar}`; // 對應 main.css 中的 .code-digit-0, .code-digit-1...
  }
  return '';
}

/**
 * 驗證學號格式是否有效 (必須以英文字母開頭)。
 * @param {string} code - 學號字串。
 * @returns {boolean} 如果有效返回 true，否則 false。
 */
export function isValidCode(code) {
  if (typeof code !== 'string') return false;
  return /^[A-Za-z]/.test(code);
}

/**
 * 驗證卡號格式是否有效 (必須為純數字)。
 * @param {string} cardNumber - 卡號字串。
 * @returns {boolean} 如果有效返回 true，否則 false。
 */
export function isValidCardNumber(cardNumber) {
  if (typeof cardNumber !== 'string') return false;
  return /^\d+$/.test(cardNumber);
}

/**
 * 獲取或生成一個儲存在 localStorage 的唯一裝置 ID。
 * @returns {string} 裝置的 UUID。
 */
export function getDeviceId() {
  const LS_DEVICE_ID_KEY = 'rollcall_vue_deviceId';
  let id = localStorage.getItem(LS_DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(LS_DEVICE_ID_KEY, id);
  }
  return id;
}
