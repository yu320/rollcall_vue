// src/services/api.js

/**
 * API 請求模組
 *
 * 職責:
 * - 封裝所有與後端 (Supabase) 的通訊。
 * - 處理數據的獲取、新增、更新、刪除。
 * - 讓業務邏輯層的程式碼更簡潔，不需關心數據庫操作的具體細節。
 */
import supabase from './supabase';

// --- 身份驗證 API ---

/**
 * 使用者登入
 * @param {string} email - 使用者 Email
 * @param {string} password - 使用者密碼
 * @returns {Promise<object>} 使用者資料和 session
 */
export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

/**
 * 使用者登出
 * @returns {Promise<void>}
 */
export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * 獲取當前 session
 * @returns {Promise<object|null>} 當前 session 或 null
 */
export async function getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
}

/**
 * 獲取使用者個人資料 (包含角色和權限)
 * @param {string} userId - 使用者 ID
 * @returns {Promise<object>} 使用者個人資料
 */
export async function getUserProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      *,
      roles (
        name,
        role_permissions (
          permissions (name)
        )
      )
    `)
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}


// --- 其他 API (保持不變) ---

// (此處省略了其他所有 API 函式，它們的內容與之前相同)
// 只需要確保每個函式都使用了 `export async function ...` 的方式導出即可。
// 例如：
export async function fetchAllPersonnel() {
    const { data, error } = await supabase.from('personnel').select('*');
    if (error) throw error;
    return data;
}

// ... 其他所有 fetch, create, update, delete 函式 ...

