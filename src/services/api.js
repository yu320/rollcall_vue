// src/services/api.js

/**
 * API 請求模組
 *
 * 職責:
 * - 封裝所有與後端 (Supabase) 的通訊。
 * - 處理數據的獲取、新增、更新、刪除。
 * - 讓業務邏輯層的程式碼更簡潔，不需關心數據庫操作的具體細節。
 */
import { supabase } from './supabase';
import { BATCH_SIZE } from '@/utils/constants';

// --- 私有輔助函數 ---

/**
 * (伺服器端與客戶端共用) 獲取當前操作者的 User ID
 * @returns {Promise<string>} 當前登入使用者的 ID
 * @throws 如果使用者未登入，則拋出錯誤
 */
async function getAdminUserId() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('未授權的操作');
    return session.user.id;
}

/**
 * (客戶端專用) 記錄稽核日誌
 * @param {object} logDetails - 稽核日誌的詳細內容
 */
async function recordAuditLog(logDetails) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return; // 未登入則不記錄

    const { user } = session;
    const logData = {
        user_id: user.id,
        user_email: user.email,
        ...logDetails,
        // Supabase 的 jsonb 欄位需要傳入物件或字串，而非 null
        old_value: logDetails.old_value || {},
        new_value: logDetails.new_value || {},
    };

    const { error } = await supabase.from('audit_logs').insert(logData);
    if (error) console.error("記錄稽核日誌失敗:", error);
}

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
    const { data: { user } } = await supabase.auth.getUser();
    const payload = { ...eventData, created_by: user.id };
    const { data, error } = await supabase.from('events').insert(payload).select().single();
    if (error) throw error;
    await recordAuditLog({ action_type: 'CREATE', target_table: 'events', target_id: data.id, description: `新增活動: ${data.name}`, new_value: data });
    return data;
}

export async function updateEvent(id, eventData) {
    const { data: oldData } = await supabase.from('events').select('*').eq('id', id).single();
    const { data, error } = await supabase.from('events').update(eventData).eq('id', id).select().single();
    if (error) throw error;
    await recordAuditLog({ action_type: 'UPDATE', target_table: 'events', target_id: data.id, description: `更新活動: ${data.name}`, old_value: oldData, new_value: data });
    return data;
}

export async function deleteEvent(id) {
    const { data: oldData } = await supabase.from('events').select('*').eq('id', id).single();
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) throw error;
    if (oldData) {
        await recordAuditLog({ action_type: 'DELETE', target_table: 'events', target_id: id, description: `刪除活動: ${oldData.name}`, old_value: oldData });
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
    await recordAuditLog({ action_type: 'CREATE', target_table: 'personnel', target_id: data.id, description: `新增人員: ${data.name}`, new_value: data });
    return data;
}

export async function updatePersonnel(id, personData) {
    const { data: oldData } = await supabase.from('personnel').select('*').eq('id', id).single();
    const { data, error } = await supabase.from('personnel').update(personData).eq('id', id).select().single();
    if (error) throw error;
    await recordAuditLog({ action_type: 'UPDATE', target_table: 'personnel', target_id: data.id, description: `更新人員: ${data.name}`, old_value: oldData, new_value: data });
    return data;
}

export async function upsertPersonnel(personnelList) {
    const { data, error } = await supabase.from('personnel').upsert(personnelList, { onConflict: 'code' }).select();
    if (error) throw error;
    await recordAuditLog({ action_type: 'UPSERT_BATCH', target_table: 'personnel', description: `批量新增或更新 ${data.length} 位人員`, new_value: data });
    return data;
}

export async function batchDeletePersonnel(ids) {
    const { data: oldData } = await supabase.from('personnel').select('*').in('id', ids);
    const { error } = await supabase.from('personnel').delete().in('id', ids);
    if (error) throw error;
    if (oldData) {
        await recordAuditLog({ action_type: 'DELETE_BATCH', target_table: 'personnel', description: `批量刪除 ${oldData.length} 位人員`, old_value: oldData });
    }
}


// --- 報到記錄 API ---

/**
 * [新增] 處理單筆報到或簽退的核心邏輯
 */
export async function processCheckIn({ input, mode, eventId, deviceId }) {
    // 根據輸入是數字還是字串來決定查詢欄位
    const isCard = /^\d+$/.test(input);
    const queryField = isCard ? 'card_number' : 'code';

    // 1. 查找人員
    const { data: person, error: personError } = await supabase
        .from('personnel')
        .select('*')
        .eq(queryField, input)
        .single();

    if (personError || !person) {
        throw new Error('找不到該人員');
    }

    // 2. 檢查是否重複操作
    let existingRecordQuery = supabase
        .from('check_in_records')
        .select('id')
        .eq('personnel_id', person.id)
        .eq('action_type', mode);
    
    if (eventId) {
        existingRecordQuery = existingRecordQuery.eq('event_id', eventId);
    } else {
        // 如果沒有活動，則檢查今日是否已有相同操作
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        existingRecordQuery = existingRecordQuery.gte('created_at', today.toISOString());
    }

    const { data: existingRecord, error: existingError } = await existingRecordQuery.maybeSingle();
    if(existingError) throw existingError;
    if (existingRecord) {
        throw new Error(`重複${mode}`);
    }

    // 3. 判斷狀態
    let status = '成功';
    if (mode === '簽到') {
        status = '準時'; // 預設準時
        if (eventId) {
            const { data: event } = await supabase.from('events').select('start_time').eq('id', eventId).single();
            if (new Date() > new Date(event.start_time)) {
                status = '遲到';
            }
        }
    } else { // 簽退
        status = '簽退成功';
    }
    
    // 4. 準備要寫入的資料
    const recordData = {
        input: input,
        input_type: isCard ? 'card' : 'code',
        success: true,
        name_at_checkin: person.name,
        personnel_id: person.id,
        device_id: deviceId,
        event_id: eventId,
        status: status,
        action_type: mode
    };
    
    // 返回結果，讓前端決定何時寫入
    return { recordData, personInfo: { name: person.name, status: status } };
}


export async function fetchAllSavedDatesWithStats() {
    const { data, error } = await supabase
        .from('check_in_records')
        .select('created_at');
    if (error) throw error;
    return data;
}

export async function fetchRecordsByDate(dateString) {
    const startOfDay = new Date(dateString);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateString);
    endOfDay.setHours(23, 59, 59, 999);
    
    const { data, error } = await supabase
        .from('check_in_records')
        .select('*, events(name)')
        .gte('created_at', startOfDay.toISOString())
        .lt('created_at', endOfDay.toISOString())
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
    let query = supabase.from('check_in_records').select('*, personnel(id, name, code, building, tags)').order('created_at', { ascending: false });
    if (startDate) query = query.gte('created_at', startDate.toISOString());
    if (endDate) query = query.lte('created_at', endDate.toISOString());
    const { data, error } = await query;
    if (error) throw error;
    return data;
}

/**
 * [修改] `saveRecords` -> `batchSaveRecords`，語意更清晰
 */
export async function batchSaveRecords(records) {
    // 移除前端產生的臨時 id
    const recordsToInsert = records.map(({ id, ...rest }) => rest);
    if (recordsToInsert.length === 0) return;
    
    for (let i = 0; i < recordsToInsert.length; i += BATCH_SIZE) {
        const batch = recordsToInsert.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from('check_in_records').insert(batch);
        if (error) throw error;
    }
    await recordAuditLog({ action_type: 'CREATE_BATCH', target_table: 'check_in_records', description: `批量新增 ${recordsToInsert.length} 筆報到記錄`, new_value: { count: recordsToInsert.length } });
}

export async function batchDeleteRecords(ids) {
    if (!ids || ids.length === 0) return;
    const { data: recordsToDelete } = await supabase.from('check_in_records').select('*').in('id', ids);
    
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
        const batch = ids.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from('check_in_records').delete().in('id', batch);
        if (error) throw error;
    }

    if (recordsToDelete && recordsToDelete.length > 0) {
       await recordAuditLog({ action_type: 'DELETE_BATCH', target_table: 'check_in_records', description: `批量刪除 ${recordsToDelete.length} 筆報到記錄`, old_value: recordsToDelete });
    }
}

/**
 * [新增] 處理從外部 CSV 匯入的簽到記錄
 */
export async function importCheckinRecords({ records, eventId, actionType }) {
    // 實現匯入邏輯...
    // 這裡只是個範例框架，實際邏輯會更複雜
    const result = { successCount: 0, autoCreatedCount: 0, errors: [] };
    // 1. 獲取所有現存人員
    // 2. 遍歷要匯入的 records
    // 3. 比對人員，不存在則建立
    // 4. 建立報到記錄
    // 5. 返回結果
    console.log('Importing records:', { records, eventId, actionType });
    // 模擬成功
    result.successCount = records.length;
    return result;
}


// --- 儀錶板 API ---
/**
 * [新增] 獲取儀錶板數據
 */
export async function getDashboardData(eventId) {
    if (!eventId) throw new Error('需要提供活動 ID');

    const [eventData, records] = await Promise.all([
        supabase.from('events').select('*').eq('id', eventId).single(),
        supabase.from('check_in_records').select('*, personnel(id, code, name)').eq('event_id', eventId)
    ]);

    if (eventData.error) throw eventData.error;
    if (records.error) throw records.error;

    // 在此處處理數據並返回前端需要的格式
    const processedData = {
        summary: { expectedCount: 100 /* 範例 */, actualCount: records.data.length },
        attendees: records.data,
        charts: {}
    };
    return processedData;
}


// --- 帳號管理 (Serverless Function Wrappers) ---

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

export async function deleteAccounts(ids) {
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
        .select('id, email, nickname, roles(id, name)')
        .order('email', { ascending: true });
    if (error) throw error;
    // 整理回傳格式，確保 role 是一個物件
    return data.map(p => ({ ...p, role: p.roles || { id: null, name: '未知' } }));
}


// --- 權限管理 API ---
/**
 * [修改] `fetchAllRolesAndPermissions` -> `fetchAllRoles`，功能更單一
 */
export async function fetchAllRoles() {
    const { data, error } = await supabase
        .from('roles')
        .select(`id, name, description`);
    if (error) throw error;
    return data;
}

export async function fetchAllPermissions() {
    const { data, error } = await supabase.from('permissions').select('*');
    if (error) throw error;
    return data;
}

/**
 * [新增] 獲取指定角色的權限
 */
export async function fetchPermissionsForRole(roleId) {
    const { data, error } = await supabase
        .from('role_permissions')
        .select('permission_id')
        .eq('role_id', roleId);
    if (error) throw error;
    return data;
}

/**
 * [修改] `updateRolePermissions` -> `updatePermissionsForRole`
 */
export async function updatePermissionsForRole(roleId, permissionIds) {
    // 1. 刪除該角色所有舊的權限關聯
    const { error: deleteError } = await supabase.from('role_permissions').delete().eq('role_id', roleId);
    if (deleteError) throw deleteError;

    // 2. 如果有要新增的權限，則插入新的關聯
    if (permissionIds && permissionIds.length > 0) {
        const newLinks = permissionIds.map(pid => ({ role_id: roleId, permission_id: pid }));
        const { error: insertError } = await supabase.from('role_permissions').insert(newLinks);
        if (insertError) throw insertError;
    }
    await recordAuditLog({ action_type: 'UPDATE', target_table: 'role_permissions', target_id: roleId, description: `更新角色ID ${roleId} 的權限`, new_value: { permissionIds } });
}
