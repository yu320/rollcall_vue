// src/services/api/settings.js
import { supabase } from '../supabase';
import { recordAuditLog, getAdminUserId } from './helpers';

export async function fetchSettings() {
    const { data, error } = await supabase.from('settings').select('key, value');
    if (error) throw error;
    return data.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
    }, {});
}

export async function updateSetting(key, value) {
    const { data, error } = await supabase.from('settings').upsert({ key: key, value: value }, { onConflict: 'key' }).select().single();
    if (error) throw error;
    recordAuditLog({ action_type: 'UPDATE', target_table: 'settings', target_id: key, description: `更新系統設定: ${key}`, new_value: { value } });
    return data;
}

export async function fetchRegistrationCodes() {
    const { data, error } = await supabase.from('registration_codes').select('*, profiles!registration_codes_created_by_fkey(nickname)').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
}

export async function createRegistrationCode(codeData) {
    const adminUserId = await getAdminUserId();
    const payload = { ...codeData, created_by: adminUserId };
    
    // 步驟 1: 先執行插入操作
    const { error } = await supabase.from('registration_codes').insert(payload);
    if (error) throw error;

    // 步驟 2: 嘗試讀取剛插入的資料用於日誌記錄
    // 即使因為 RLS 延遲讀取失敗，也不會讓整個操作崩潰
    const { data: insertedData } = await supabase
        .from('registration_codes')
        .select('*')
        .eq('code', payload.code)
        .single();

    recordAuditLog({
        action_type: 'CREATE',
        target_table: 'registration_codes',
        target_id: insertedData ? insertedData.id : null,
        description: `新增註冊碼: ${codeData.code}`,
        new_value: insertedData || payload
    });
    
    // 步驟 3: 回傳一個非 null 的值，確保前端判斷成功
    return insertedData || payload;
}

export async function updateRegistrationCode(id, updateData) {
    const { data: oldData } = await supabase.from('registration_codes').select('*').eq('id', id).single();
    
    // 步驟 1: 先執行更新操作
    const { error } = await supabase.from('registration_codes').update(updateData).eq('id', id);
    if (error) throw error;

    // 步驟 2: 嘗試讀取更新後的資料用於日誌記錄
    const { data: updatedData } = await supabase
        .from('registration_codes')
        .select('*')
        .eq('id', id)
        .single();

    recordAuditLog({
        action_type: 'UPDATE',
        target_table: 'registration_codes',
        target_id: id,
        description: `更新註冊碼: ${updatedData ? updatedData.code : '(ID: ' + id + ')'}`,
        old_value: oldData,
        new_value: updatedData || updateData
    });

    // 步驟 3: 回傳一個非 null 的值
    return updatedData || { ...updateData, id: id };
}

export async function deleteRegistrationCode(id) {
    const { data: oldData } = await supabase.from('registration_codes').select('*').eq('id', id).single();
    const { error } = await supabase.from('registration_codes').delete().eq('id', id);
    if (error) throw error;
    if (oldData) {
        recordAuditLog({ action_type: 'DELETE', target_table: 'registration_codes', target_id: id, description: `刪除註冊碼: ${oldData.code}`, old_value: oldData });
    }
}