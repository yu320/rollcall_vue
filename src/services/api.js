// src/services/api.js

/**
 * API 請求模組
 *
 * 職責:
 * - 封裝所有與後端 (Supabase) 的通訊。
 * - 處理數據的獲取、新增、更新、刪除。
 * - 讓業務邏輯層的程式碼更簡潔，不需關心數據庫操作的具體細節。
 */

// src/services/api.js

export * from './api/auth';
export * from './api/personnel';
export * from './api/events';
export * from './api/records';
export * from './api/reports';
export * from './api/accounts';
export * from './api/roles';
export * from './api/settings'; // [新增]
