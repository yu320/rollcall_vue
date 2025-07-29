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

// --- Helper for Audit Logging ---
async function recordAuditLog(logDetails) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return; 

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

// --- Auth & Permissions API ---

export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function getUserProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select(`id, email, nickname, roles ( name, role_permissions ( permissions (name) ) )`)
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

export async function updateUserPassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
}

// --- Personnel API ---

export async function fetchAllPersonnel() {
    const { data, error } = await supabase.from('personnel').select('*').order('name', { ascending: true });
    if (error) throw error;
    return data;
}

export async function upsertPersonnel(personnelData) {
    let successCount = 0;
    let updateCount = 0;
    const errors = [];

    // Fetch existing personnel to distinguish between inserts and updates
    const existingPersonnel = await supabase.from('personnel').select('code, card_number, id');
    const existingCodes = new Set(existingPersonnel.data.map(p => p.code));
    const existingCardNumbers = new Set(existingPersonnel.data.map(p => p.card_number));
    const existingPersonnelMap = new Map(existingPersonnel.data.map(p => [p.code, p]));


    const inserts = personnelData.filter(p => !existingCodes.has(p.code) && !existingCardNumbers.has(p.card_number));
    const updates = personnelData.filter(p => existingCodes.has(p.code) || existingCardNumbers.has(p.card_number));

    // Process inserts in batches
    for (let i = 0; i < inserts.length; i += BATCH_SIZE) {
        const chunk = inserts.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from('personnel').insert(chunk);
        if (error) {
            chunk.forEach(item => errors.push(`插入失敗 (${item.name}, ${item.code}): ${error.message}`));
        } else {
            successCount += chunk.length;
        }
    }

    // Process updates in batches
    // For updates, we need to get the ID for the `eq` clause.
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
        const chunk = updates.slice(i, i + BATCH_SIZE);
        const updatePromises = chunk.map(async (item) => {
            const existingPerson = existingPersonnelMap.get(item.code) || existingPersonnel.data.find(p => p.card_number === item.card_number);
            if (existingPerson) {
                const { error } = await supabase.from('personnel').update(item).eq('id', existingPerson.id);
                if (error) {
                    errors.push(`更新失敗 (${item.name}, ${item.code}): ${error.message}`);
                } else {
                    updateCount++;
                }
            } else {
                errors.push(`更新失敗 (找不到對應人員 ${item.name}, ${item.code}): 無法找到對應 ID`);
            }
        });
        await Promise.all(updatePromises);
    }
    
    // Audit log for upsert is complex due to mixed create/update.
    // A simplified log can be made, or detailed logs for each individual operation if needed.
    recordAuditLog({ 
        action_type: 'UPSERT', 
        target_table: 'personnel', 
        description: `批量匯入/更新人員：新增 ${successCount} 筆，更新 ${updateCount} 筆，失敗 ${errors.length} 筆。`,
        new_value: { successCount, updateCount, errors }
    });

    return { successCount, updateCount, errors };
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

// [NEW] Function to update personnel tags
export async function updatePersonnelTags(id, tags) { // Removed the duplicate 'export'
    const { data: oldData, error: fetchError } = await supabase.from('personnel').select('id, name, code, tags').eq('id', id).single();
    if (fetchError) console.warn("更新人員標籤前無法獲取舊資料用於稽核:", fetchError.message);

    const { data, error } = await supabase
        .from('personnel')
        .update({ tags: tags, updated_at: new Date() })
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
     if (data) {
        recordAuditLog({
            action_type: 'UPDATE',
            target_table: 'personnel',
            target_id: data.id,
            description: `更新人員標籤: ${data.name} (學號: ${data.code})`,
            old_value: oldData ? { tags: oldData.tags } : null,
            new_value: { tags: data.tags }
        });
    }
    return data;
}


// --- Events API ---

export async function fetchEvents() {
    const supabase = getSupabase();
    const { data, error } = await supabase
        .from('events')
        .select(`
            *,
            profiles:created_by(nickname)
        `)
        .order('start_time', { ascending: false });
    if (error) throw error;
    return data.map(event => ({
        ...event,
        profiles: event.profiles || { nickname: '未知' }
    }));
}

export async function createEvent(eventData) {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('events').insert([eventData]).select();
    if (error) throw error;
    // [NEW] 記錄稽核日誌
    if (data && data.length > 0) {
        recordAuditLog({
            action_type: 'CREATE',
            target_table: 'events',
            target_id: data[0].id,
            description: `新增活動: ${data[0].name}`,
            new_value: data[0]
        });
    }
    return data;
}

export async function updateEvent(id, eventData) {
    const supabase = getSupabase();
    // [NEW] 獲取舊值以便記錄
    const { data: oldData, error: fetchError } = await supabase.from('events').select('*').eq('id', id).single();
    if (fetchError) console.warn("更新活動前無法獲取舊資料用於稽核:", fetchError.message);

    const { data, error } = await supabase.from('events').update(eventData).eq('id', id).select();
    if (error) throw error;
    // [NEW] 記錄稽核日誌
    if (data && data.length > 0) {
        recordAuditLog({
            action_type: 'UPDATE',
            target_table: 'events',
            target_id: data[0].id,
            description: `更新活動: ${data[0].name}`,
            old_value: oldData || null,
            new_value: data[0]
        });
    }
    return data;
}

export async function deleteEvent(id) {
    const supabase = getSupabase();
    // [NEW] 獲取舊值以便記錄
    const { data: oldData, error: fetchError } = await supabase.from('events').select('*').eq('id', id).single();
    if (fetchError) console.warn("刪除活動前無法獲取舊資料用於稽核:", fetchError.message);

    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) throw error;
    // [NEW] 記錄稽核日誌
    if (oldData) {
        recordAuditLog({
            action_type: 'DELETE',
            target_table: 'events',
            target_id: id,
            description: `刪除活動: ${oldData.name}`,
            old_value: oldData
        });
    }
}


// --- Check-in Records API ---

export async function processCheckIn(checkInData) {
  const { data, error } = await supabase.rpc('process_check_in', checkInData);
  if (error) throw error;
  return data;
}

export async function fetchRecordsByDate(date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const { data, error } = await supabase
        .from('check_in_records')
        .select('*, events(name)')
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString())
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
    let query = supabase.from('check_in_records').select('*, personnel(code, building, tags), events(name)').order('created_at', { ascending: false });
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

// [NEW] Function for Overview page
export async function fetchRecentRecords(hours = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
        .from('check_in_records')
        .select('*, events(name)')
        .gte('created_at', since)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
}

// [NEW] Function for Daily Records page
export async function fetchAllSavedDatesWithStats() {
    const { data, error } = await supabase.rpc('get_daily_record_stats');
    if (error) throw error;
    return data;
}

// [NEW] Function for Check-in Import page
export async function importCheckinRecords(importData) {
    const { data, error } = await supabase.rpc('import_checkin_records_with_personnel_creation', { records_to_import: importData });
    if (error) throw error;
    return data;
}


// --- Dashboard & Reports API ---

export async function getDashboardData(eventId) {
    const { data, error } = await supabase.rpc('get_event_dashboard_data', { p_event_id: eventId });
    if (error) throw error;
    return data;
}


// --- Account Management (Serverless Wrappers) ---

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

export async function batchCreateAccounts(accounts) {
    const adminUserId = await getAdminUserId();
    const results = [];
    for (const account of accounts) {
        try {
            const result = await createAccount(account);
            results.push({ ...result, success: true });
        } catch (error) {
            results.push({ email: account.email, success: false, error: error.message });
        }
    }
    return results;
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
    return data;
}

// --- Roles & Permissions Management ---

export async function fetchAllRoles() {
    const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('name');
    if (error) throw error;
    return data;
}

export async function fetchPermissionsForRole(roleId) {
    const { data, error } = await supabase
        .from('role_permissions')
        .select('permission_id')
        .eq('role_id', roleId);
    if (error) throw error;
    return data;
}

// [NEW] Function needed by data.js
export async function fetchAllRolesAndPermissions() {
    const { data, error } = await supabase
        .from('roles')
        .select(`id, name, description, role_permissions ( permissions (id, name, description) )`);
    if (error) throw error;
    return data;
}

export async function fetchAllPermissions() {
    const { data, error } = await supabase.from('permissions').select('*').order('name');
    if (error) throw error;
    return data;
}

// [NEW] Function needed by data.js and Permissions.vue
export async function updatePermissionsForRole(roleId, permissionIds) {
    const { data: oldPerms } = await supabase.from('role_permissions').select('permission_id').eq('role_id', roleId);
    
    const { error: deleteError } = await supabase.from('role_permissions').delete().eq('role_id', roleId);
    if (deleteError) throw deleteError;

    if (permissionIds.length > 0) {
        const newLinks = permissionIds.map(pid => ({ role_id: roleId, permission_id: pid }));
        const { error: insertError } = await supabase.from('role_permissions').insert(newLinks);
        if (insertError) throw insertError;
    }
    
    recordAuditLog({
        action_type: 'UPDATE',
        target_table: 'role_permissions',
        target_id: roleId,
        description: `更新角色權限 (ID: ${roleId})`,
        old_value: oldPerms,
        new_value: permissionIds.map(id => ({ permission_id: id }))
    });
}
