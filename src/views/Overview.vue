// src/utils/index.js

/**
 * 通用輔助函數模組
 *
 * 職責:
 * - 提供與 DOM、UI 無直接關聯，可在多處重複使用的純函數。
 * - 例如：日期格式化、資料驗證、本地儲存操作等。
 */

/**
 * 將日期字串格式化為 YYYY-MM-DD HH:MM:SS (24小時制)。
 * @param {string|Date} dateInput - 日期字串或 Date 物件。
 * @returns {string} - 格式化後的日期時間字串。
 */
export function formatDateTime(dateInput) {
    if (!dateInput) return '';
    const date = new Date(dateInput);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 將 Date 物件格式化為 YYYY-MM-DD。
 * @param {Date} date - Date 物件。
 * @returns {string} - 格式化後的日期字串。
 */
export function formatDate(date) {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * 根據輸入字串的第一個字元返回 Tailwind CSS 顏色類別。
 * @param {string} input - 輸入字串 (學號或卡號)。
 * @returns {string} - 顏色類別字串。
 */
export function getInputColorClass(input) {
    if (!input || typeof input !== 'string' || input.length === 0) return '';
    const firstChar = input.charAt(0).toLowerCase();
    if (/[a-z]/.test(firstChar)) return `code-${firstChar}`;
    if (/[0-9]/.test(firstChar)) return `code-digit-${firstChar}`;
    return '';
}

/**
 * 驗證學號格式是否有效 (必須以字母開頭)。
 * @param {string} code - 學號字串。
 * @returns {boolean} - 如果有效則為 true，否則為 false。
 */
export function isValidCode(code) {
    return /^[A-Za-z]/.test(code);
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
 * 創建單個摘要卡片的 HTML 內容。
 * @param {string} title - 卡片標題。
 * @param {string|number} value - 卡片數值。
 * @param {string} iconName - Feather Icon 的名稱 (這裡使用自定義的SVG路徑代替)。
 * @param {object|null} [changeData=null] - 包含 {absolute, percentage} 的變化數據物件。
 * @returns {string} - HTML 字符串。
 */
export function createSummaryCard(title, value, iconName, changeData = null) {
    let iconSvgPath = '';
    let bgColorClass = '';
    let textColorClass = '';

    switch (iconName) {
        case 'users':
            iconSvgPath = '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2m8-14a4 4 0 100 8 4 4 0 000-8z" />';
            bgColorClass = 'bg-blue-100'; textColorClass = 'text-blue-500'; break;
        case 'user-check':
            iconSvgPath = '<path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><polyline points="16 11 18 13 22 9"></polyline>';
            bgColorClass = 'bg-green-100'; textColorClass = 'text-green-500'; break;
        case 'user-minus':
            iconSvgPath = '<path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="23" y1="11" x2="17" y2="11"></line>';
            bgColorClass = 'bg-orange-100'; textColorClass = 'text-orange-500'; break;
        case 'pie-chart':
            iconSvgPath = '<path d="M21.21 15.89A10 10 0 1 1 8.11 2.99"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path>';
            bgColorClass = 'bg-purple-100'; textColorClass = 'text-purple-500'; break;
        case 'clock':
            iconSvgPath = '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>';
            bgColorClass = 'bg-yellow-100'; textColorClass = 'text-yellow-500'; break;
        case 'calendar':
            iconSvgPath = '<path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />';
            bgColorClass = 'bg-indigo-100'; textColorClass = 'text-indigo-500'; break;
        case 'check-square':
            iconSvgPath = '<polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>';
            bgColorClass = 'bg-emerald-100'; textColorClass = 'text-emerald-500'; break;
        default:
            bgColorClass = 'bg-gray-100'; textColorClass = 'text-gray-500';
    }

    let trendIconAndText = '';
    if (changeData && typeof changeData === 'object' && changeData.hasOwnProperty('absolute') && changeData.hasOwnProperty('percentage')) {
        const { absolute: absoluteChange, percentage: percentageChange } = changeData;
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
            trendText = Math.abs(absoluteChange) > changeThreshold ? `${absoluteChange > 0 ? '+' : ''}${absoluteChange.toFixed(1)} %` : '持平';
        } else {
            trendText = Math.round(absoluteChange) !== 0 ? `${absoluteChange > 0 ? '+' : ''}${Math.round(absoluteChange)}` : '持平';
        }

        trendIconAndText = `
            <div class="ml-2 flex items-center text-sm ${trendColorClass} font-semibold">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">${trendSvgPath}</svg>
                <span>${trendText}</span>
            </div>
        `;
    }
    
    const formattedTitle = title.replace(/(\s*\([^)]+\))/g, '<br><span class="text-xs font-normal">$1</span>');

    return `
        <div class="flex items-start w-full">
            <div class="${bgColorClass} p-3 rounded-lg mr-4 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 ${textColorClass}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">${iconSvgPath}</svg>
            </div>
            <div class="flex-grow min-w-0 flex flex-col items-center"> <p class="text-sm text-gray-500 font-medium">${formattedTitle}</p>
                <div class="flex items-baseline mt-1">
                    <p class="text-2xl font-bold text-gray-800">${value}</p>
                    ${trendIconAndText}
                </div>
            </div>
        </div>
    `;
}
