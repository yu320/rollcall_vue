// src/services/api.js

/**
 * API 請求模組
 *
 * 職責:
 * - 封裝所有與後端 (Supabase) 的通訊。
 * - 處理數據的獲取、新增、更新、刪除。
 * - 讓業務邏輯層的程式碼更簡潔，不需關心數據庫操作的具體細節。
 */
import { supabase } from './supabase'; // 關鍵修正：使用具名引入
import { BATCH_SIZE } from '@/utils/constants';

// --- 身份驗證 & 權限 API ---

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
      id,
      email,
      nickname,
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

/**
 * 更新使用者密碼
 * @param {string} newPassword
 */
export async function updateUserPassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
}


// --- 稽核日誌 API ---

/**
 * (客戶端) 記錄稽核日誌
 * @param {object} logDetails - 稽核日誌的詳細內容
 */
export async function recordAuditLog(logDetails) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return; // 未登入則不記錄

    const { user } = session;
    const logData = {
        user_id: user.id,
        user_email: user.email,
        ...logDetails,
        old_value: logDetails.old_value ? JSON.stringify(logDetails.old_value) : null,
        new_value: logDetails.new_value ? JSON.stringify(logDetails.new_value) : null,
    };

    const { error } = await supabase.from('audit_logs').insert(logData);
    if (error) console.error("記錄稽核日誌失敗:", error);
}


// --- 活動 API ---

export async function fetchEvents() {
    const { data, error } = await supabase
        .from('events')
        .select('*, profiles:created_by(nickname)')
        .order('start_time', { ascending: false });
    if (error) throw error;
    return data;
}

export async function createEvent(eventData) {
    const { data, error } = await supabase.from('events').insert(eventData).select().single();
    if (error) throw error;
    recordAuditLog({ action_type: 'CREATE', target_table: 'events', target_id: data.id, description: `新增活動: ${data.name}`, new_value: data });
    return data;
}

export async function updateEvent(id, eventData) {
    const { data: oldData } = await supabase.from('events').select('*').eq('id', id).single();
    const { data, error } = await supabase.from('events').update(eventData).eq('id', id).select().single();
    if (error) throw error;
    recordAuditLog({ action_type: 'UPDATE', target_table: 'events', target_id: data.id, description: `更新活動: ${data.name}`, old_value: oldData, new_value: data });
    return data;
}

export async function deleteEvent(id) {
    const { data: oldData } = await supabase.from('events').select('*').eq('id', id).single();
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) throw error;
    if (oldData) {
        recordAuditLog({ action_type: 'DELETE', target_table: 'events', target_id: id, description: `刪除活動: ${oldData.name}`, old_value: oldData });
    }
}


// --- 人員 API ---

export async function fetchAllPersonnel() {
    const { data, error } = await supabase.from('personnel').select('*').order('name', { ascending: true });
    if (error) throw error;
    return data;
}

export async function createPersonnel(personData) {
    const { data, error } = await supabase.from('personnel').insert(personData).select().single();
    if (error) throw error;
    recordAuditLog({ action_type: 'CREATE', target_table: 'personnel', target_id: data.id, description: `新增人員: ${data.name}`, new_value: data });
    return data;
}

export async function updatePersonnel(id, personData) {
    const { data: oldData } = await supabase.from('personnel').select('*').eq('id', id).single();
    const { data, error } = await supabase.from('personnel').update(personData).eq('id', id).select().single();
    if (error) throw error;
    recordAuditLog({ action_type: 'UPDATE', target_table: 'personnel', target_id: data.id, description: `更新人員: ${data.name}`, old_value: oldData, new_value: data });
    return data;
}

export async function batchDeletePersonnel(ids) {
    const { data: oldData } = await supabase.from('personnel').select('*').in('id', ids);
    const { error } = await supabase.from('personnel').delete().in('id', ids);
    if (error) throw error;
    if (oldData) {
        recordAuditLog({ action_type: 'DELETE_BATCH', target_table: 'personnel', description: `批量刪除 ${oldData.length} 位人員`, old_value: oldData });
    }
}


// --- 報到記錄 API ---
export async function fetchRecordsByDate(date) {
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).toISOString();
    
    const { data, error } = await supabase
        .from('check_in_records')
        .select('*, events(name)')
        .gte('created_at', startOfDay)
        .lt('created_at', endOfDay)
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
}

export async function fetchRecordsByEventId(eventId) {
    const { data, error } = await supabase
        .from('check_in_records')
        .select('*, events(name)')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
}

export async function fetchRecordsByDateRange(startDate, endDate) {
    let query = supabase.from('check_in_records').select('*').order('created_at', { ascending: false });
    if (startDate) query = query.gte('created_at', startDate.toISOString());
    if (endDate) query = query.lte('created_at', endDate.toISOString());
    const { data, error } = await query;
    if (error) throw error;
    return data;
}

export async function saveRecords(records) {
    const recordsToInsert = records.map(({ id, ...rest }) => rest);
    const { error } = await supabase.from('check_in_records').insert(recordsToInsert);
    if (error) throw error;
    recordAuditLog({ action_type: 'CREATE_BATCH', target_table: 'check_in_records', description: `批量新增 ${recordsToInsert.length} 筆報到記錄` });
}

export async function batchDeleteRecords(ids) {
    const { data: recordsToDelete } = await supabase.from('check_in_records').select('*').in('id', ids);
    const { error } = await supabase.from('check_in_records').delete().in('id', ids);
    if (error) throw error;
    if (recordsToDelete && recordsToDelete.length > 0) {
       recordAuditLog({ action_type: 'DELETE_BATCH', target_table: 'check_in_records', description: `批量刪除 ${recordsToDelete.length} 筆報到記錄`, old_value: recordsToDelete });
    }
}

// --- 帳號管理 (Serverless Function Wrappers) ---

async function getAdminUserId() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('未授權的操作');
    return session.user.id;
}

export async function createAccount(accountData) {
    const adminUserId = await getAdminUserId();
    const response = await fetch('/api/create-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-User-Id': adminUserId },
        body: JSON.stringify(accountData)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    return result;
}

export async function updateAccount(accountData) {
    const adminUserId = await getAdminUserId();
    const response = await fetch('/api/update-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-User-Id': adminUserId },
        body: JSON.stringify(accountData)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    return result;
}

export async function batchDeleteAccounts(ids) {
    const adminUserId = await getAdminUserId();
    const response = await fetch('/api/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-User-Id': adminUserId },
        body: JSON.stringify({ ids })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || result.message);
    return result;
}

export async function fetchAllAccounts() {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, email, roles(name), nickname')
        .order('email', { ascending: true });
    if (error) throw error;
    return data.map(p => ({ ...p, role: p.roles?.name || '未知' }));
}

// --- 權限管理 API ---
export async function fetchAllRolesAndPermissions() {
    const { data, error } = await supabase
        .from('roles')
        .select(`id, name, role_permissions ( permissions (id, name) )`);
    if (error) throw error;
    return data;
}

export async function fetchAllPermissions() {
    const { data, error } = await supabase.from('permissions').select('*');
    if (error) throw error;
    return data;
}

export async function updateRolePermissions(roleId, permissionIds) {
    await supabase.from('role_permissions').delete().eq('role_id', roleId);
    if (permissionIds.length > 0) {
        const newLinks = permissionIds.map(pid => ({ role_id: roleId, permission_id: pid }));
        const { error } = await supabase.from('role_permissions').insert(newLinks);
        if (error) throw error;
    }
}
