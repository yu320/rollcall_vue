// src/utils/index.js

import { format } from 'date-fns';

/**
 * 通用輔助函數模組
 */

/**
 * 將日期字串或 Date 物件格式化為指定格式。
 * @param {string|Date} dateInput - 日期字串或 Date 物件。
 * @param {string} formatString - date-fns 的格式字串。
 * @returns {string} - 格式化後的日期時間字串。
 */
export function formatDateTime(dateInput, formatString = 'yyyy-MM-dd HH:mm:ss') {
    if (!dateInput) return '';
    try {
        return format(new Date(dateInput), formatString);
    } catch (e) {
        console.error("Invalid date for formatting:", dateInput);
        return '無效日期';
    }
}

/**
 * [NEW] 獲取或生成一個唯一的設備 ID。
 * 它會儲存在 localStorage 中，以便在不同 session 中保持一致。
 * @returns {string} - 唯一的設備 ID。
 */
export function getDeviceId() {
  let deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    // crypto.randomUUID() is a modern, secure way to get a UUID
    deviceId = crypto.randomUUID();
    localStorage.setItem('deviceId', deviceId);
  }
  return deviceId;
}

/**
 * 根據輸入字串的第一個字元返回 Tailwind CSS 顏色類別。
 * @param {string} input - 輸入字串 (學號或卡號)。
 * @returns {string} - 顏色類別字串。
 */
export function getInputColorClass(input) {
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

/**
 * 驗證學號格式是否有效 (目前只檢查是否為字母數字組合)。
 * @param {string} code - 學號字串。
 * @returns {boolean} - 如果有效則為 true，否則為 false。
 */
export function isValidCode(code) {
    return /^[A-Za-z0-9]+$/.test(code);
}

/**
 * 驗證卡號格式是否有效 (必須為純數字)。
 * @param {string} cardNumber - 卡號字串。
 * @returns {boolean} - 如果有效則為 true，否則為 false。
 */
export function isValidCardNumber(cardNumber) {
    return /^\d+$/.test(cardNumber);
}

/**
 * [NEW] 解析多種格式的日期時間字串，包含台灣常用的格式。
 * 例如："2025/3/4 下午 06:41:25" 或 "2025-07-26 09:00:00"
 * @param {string} dateTimeStr - 要解析的日期時間字串。
 * @returns {Date} - 一個 Date 物件，如果解析失敗則為無效日期。
 */
export function parseFlexibleDateTime(dateTimeStr) {
    // 首先，嘗試標準的 JS Date 建構函式，它可以處理 ISO 8601 和其他常見格式
    let date = new Date(dateTimeStr);
    if (!isNaN(date.getTime())) {
        return date;
    }

    // 如果標準解析失敗，嘗試自定義解析台灣格式 "YYYY/M/D 上午/下午 HH:MM:SS"
    const parts = dateTimeStr.split(' ');
    if (parts.length < 2) return new Date(NaN); // 不是可識別的格式

    try {
        const datePart = parts[0];
        const timePart = parts[parts.length - 1];
        const ampmPart = parts.length > 2 ? parts[1] : '';

        const [year, month, day] = datePart.split(/[\/-]/).map(Number);
        let [hours, minutes, seconds] = timePart.split(':').map(Number);

        if ((ampmPart.includes('下午') || ampmPart.toLowerCase().includes('pm')) && hours >= 1 && hours <= 11) {
            hours += 12;
        } else if ((ampmPart.includes('上午') || ampmPart.toLowerCase().includes('am')) && hours === 12) {
            hours = 0; // 處理上午12點（午夜）的情況
        }
        
        // 最後檢查數字是否有效
        if ([year, month, day, hours, minutes, seconds].some(isNaN)) {
            return new Date(NaN);
        }

        // JavaScript 的月份是 0-indexed
        return new Date(year, month - 1, day, hours, minutes, seconds || 0);
    } catch (e) {
        return new Date(NaN); // 如果在解析過程中發生任何錯誤，返回無效日期
    }
}
