// src/utils/constants.js
/**
 * 應用程式的常數設定
 * 將固定不變的數值或字串集中管理，方便未來修改。
 */

// 批量操作的大小
export const BATCH_SIZE = 500;

// 預設的使用者名稱後綴 (Email 網域)
export const DEFAULT_EMAIL_DOMAIN = '@hyou.eu.org';

// 閒置自動登出的時間 (毫秒) - 15 分鐘
export const INACTIVITY_LOGOUT_TIME = 15 * 60 * 1000;

// 在自動登出前多久顯示警告 (毫秒) - 1 分鐘
export const INACTIVITY_WARNING_TIME = 1 * 60 * 1000;

// 使用者角色的顯示名稱
export const USER_ROLE_NAMES = {
    superadmin: '超級管理員',
    admin: '管理員',
    operator: '操作員',
    sdc: '宿委會',
    sdsc: '宿服'
};
