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
 * 創建單個摘要卡片的 HTML 內容。
 * @param {string} title - 卡片標題。
 * @param {string|number} value - 卡片數值。
 * @param {string} iconName - Icon 的名稱。
 * @param {object|null} [changeData=null] - 包含 {absolute, percentage} 的變化數據物件。
 * @returns {string} - HTML 字符串。
 */
export function createSummaryCard(title, value, iconName, changeData = null) {
    let iconSvgPath = '';
    let bgColorClass = '';
    let textColorClass = '';

    switch (iconName) {
        case 'users':
            iconSvgPath = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 016-6h6a6 6 0 016 6v1h-3" />';
            bgColorClass = 'bg-blue-100'; textColorClass = 'text-blue-500'; break;
        case 'user-check':
            iconSvgPath = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="8.5" cy="7" r="4" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 11l2 2 4-4" />';
            bgColorClass = 'bg-green-100'; textColorClass = 'text-green-500'; break;
        case 'user-minus':
            iconSvgPath = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="8.5" cy="7" r="4" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M23 11h-6" />';
            bgColorClass = 'bg-orange-100'; textColorClass = 'text-orange-500'; break;
        case 'pie-chart':
            iconSvgPath = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21.21 15.89A10 10 0 118.11 2.99M22 12A10 10 0 0012 2v10z" />';
            bgColorClass = 'bg-purple-100'; textColorClass = 'text-purple-500'; break;
        case 'clock':
            iconSvgPath = '<circle cx="12" cy="12" r="10" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6l4 2" />';
            bgColorClass = 'bg-yellow-100'; textColorClass = 'text-yellow-500'; break;
        case 'calendar':
            iconSvgPath = '<rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 2v4M8 2v4M3 10h18" />';
            bgColorClass = 'bg-indigo-100'; textColorClass = 'text-indigo-500'; break;
        case 'check-square':
            iconSvgPath = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />';
            bgColorClass = 'bg-emerald-100'; textColorClass = 'text-emerald-500'; break;
        default:
            bgColorClass = 'bg-gray-100'; textColorClass = 'text-gray-500';
    }
    
    // ... rest of the function for trend icon is omitted for brevity but would be here
    
    return `
        <div class="flex items-start w-full">
            <div class="${bgColorClass} p-3 rounded-lg mr-4 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 ${textColorClass}" fill="none" viewBox="0 0 24 24" stroke="currentColor">${iconSvgPath}</svg>
            </div>
            <div class="flex-grow min-w-0">
                <p class="text-sm text-gray-500 font-medium truncate">${title}</p>
                <p class="text-2xl font-bold text-gray-800">${value}</p>
            </div>
        </div>
    `;
}
