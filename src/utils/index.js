// src/utils/index.js

import { format, parse, isValid } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { DATETIME_PARSE_FORMATS } from '@/utils/constants';

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
        const date = new Date(dateInput);
        if (!isValid(date)) throw new Error('Invalid date');
        return format(date, formatString, { locale: zhTW });
    } catch (e) {
        console.error("Invalid date for formatting:", dateInput, e);
        return '無效日期';
    }
}

/**
 * 將 Date 物件格式化為 YYYY-MM-DD。
 * @param {Date} date - Date 物件。
 * @returns {string} - 格式化後的日期字串。
 */
export function formatDate(date) {
    if (!date) return '';
    try {
        const dateObj = new Date(date);
        if (!isValid(dateObj)) throw new Error('Invalid date');
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch(e) {
        console.error("Invalid date for formatting:", date, e);
        return '';
    }
}

/**
 * 彈性解析日期時間字串。
 * 嘗試多種常見的日期時間格式進行解析。
 * @param {string} dateTimeStr - 日期時間字串。
 * @returns {Date} - 解析後的 Date 物件。
 */
export function parseFlexibleDateTime(dateTimeStr) {
    if (!dateTimeStr || typeof dateTimeStr !== 'string') {
        return new Date(NaN);
    }

    let normalizedString = dateTimeStr.trim();

    // [FIXED] 轉換全形數字為半形數字
    normalizedString = normalizedString.replace(/[０-９]/g, function(s) {
        return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
    });

    // [FIXED] 轉換全形空格為半形空格
    normalizedString = normalizedString.replace(/　/g, ' ');

    // 將中文的「下午/上午」替換為 date-fns 可以識別的 AM/PM
    normalizedString = normalizedString
        .replace(/下午/g, 'PM')
        .replace(/上午/g, 'AM');

    // 遍歷所有可能的格式進行解析
    for (const fmt of DATETIME_PARSE_FORMATS) {
        // 使用 date-fns 的 parse 函數，並提供 locale 來正確解析 AM/PM
        const parsedDate = parse(normalizedString, fmt, new Date(), { locale: zhTW });
        
        // 如果解析出來是有效的日期，就立刻返回結果
        if (isValid(parsedDate)) {
            return parsedDate;
        }
    }

    // 如果所有預設格式都失敗，最後嘗試讓瀏覽器原生解析一次
    try {
        const nativeParsedDate = new Date(normalizedString);
        if (isValid(nativeParsedDate)) {
            return nativeParsedDate;
        }
    } catch(e) {
        // 忽略原生解析的錯誤
    }

    // 如果所有方法都失敗，返回無效日期
    return new Date(NaN);
}
/**
 * 檢查是否為有效的卡號 (純數字)。
 * @param {string} cardNumber - 卡號字串。
 * @returns {boolean} - 如果是純數字且非空，則為 true。
 */
export function isValidCardNumber(cardNumber) {
    return typeof cardNumber === 'string' && cardNumber.length > 0 && /^\d+$/.test(cardNumber);
}


/**
 * 獲取或生成一個唯一的設備 ID。
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
            iconSvgPath = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />';
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
    
    let trendIconAndText = '';
    if (changeData && typeof changeData === 'object' && changeData.hasOwnProperty('absolute') && changeData.hasOwnProperty('percentage')) {
        const absoluteChange = changeData.absolute;
        const percentageChange = changeData.percentage;

        let trendColorClass = 'text-gray-500';
        let trendSvgPath;
        let trendText;
        const changeThreshold = 0.1;

        if (percentageChange > changeThreshold) {
            trendColorClass = 'text-green-500';
            trendSvgPath = '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline>';
        } else if (percentageChange < -changeThreshold) {
            trendColorClass = 'text-red-500';
            trendSvgPath = '<polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline>';
        } else {
            trendSvgPath = '<line x1="5" y1="12" x2="19" y2="12"></line>';
        }

        if (title.includes('參與率')) {
            if (Math.abs(absoluteChange) > changeThreshold) {
                 trendText = `${absoluteChange > 0 ? '+' : ''}${absoluteChange.toFixed(1)} %`;
            } else {
                 trendText = '持平';
            }
        } else {
            if (Math.round(absoluteChange) !== 0) {
                trendText = `${absoluteChange > 0 ? '+' : ''}${Math.round(absoluteChange)}`;
            } else {
                trendText = '持平';
            }
        }

        trendIconAndText = `
            <div class="ml-2 flex items-center text-sm ${trendColorClass} font-semibold">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    ${trendSvgPath}
                </svg>
                <span>${trendText}</span>
            </div>
        `;
    }
    
    const formattedTitle = title.replace(/(\s*\([^)]+\))/g, '<br><span class="text-xs font-normal">$1</span>');

    return `
        <div class="flex items-center w-full">
            <div class="${bgColorClass} p-3 rounded-lg mr-4 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 ${textColorClass}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    ${iconSvgPath}
                </svg>
            </div>
            <div class="flex-grow min-w-0 flex flex-col items-center">
                <p class="text-sm text-gray-500 font-medium text-center">${formattedTitle}</p>
                <div class="flex items-baseline mt-1">
                    <p class="text-2xl font-bold text-gray-800">${value}</p>
                    ${trendIconAndText}
                </div>
            </div>
        </div>
    `;
}
