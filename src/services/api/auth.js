// src/services/api/auth.js
import { supabase } from '../supabase';
import { recordAuditLog } from './helpers';

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
    // 關鍵修改: 確保查詢能夠深度關聯到 roles 和 permissions
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
  // 返回的 data 包含 roles 和其下的 role_permissions
  return data;
}

export async function updateUserPassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
}

export async function updateUserProfile(userId, payload) {
    let success = true;
    let errorMessage = '';

    try {
        if (payload.nickname !== undefined) {
            const { data: oldProfileData } = await supabase
                .from('profiles')
                .select('nickname')
                .eq('id', userId)
                .single();
            
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ nickname: payload.nickname, updated_at: new Date() }) 
                .eq('id', userId);
            
            if (profileError) {
                errorMessage = profileError.message;
                success = false;
            } else {
                 recordAuditLog({
                    action_type: 'UPDATE',
                    target_table: 'profiles',
                    target_id: userId,
                    description: `更新使用者暱稱`,
                    old_value: { nickname: oldProfileData?.nickname || null },
                    new_value: { nickname: payload.nickname }
                });
            }
        }

        if (payload.password) {
            const { error: authError } = await supabase.auth.updateUser({ password: payload.password });
            if (authError) {
                errorMessage = authError.message;
                success = false;
            } else {
                recordAuditLog({
                    action_type: 'UPDATE',
                    target_table: 'auth.users',
                    target_id: userId,
                    description: `更新使用者密碼`,
                    old_value: { password_changed: false },
                    new_value: { password_changed: true }
                });
            }
        }

        if (!success) {
            throw new Error(errorMessage || '更新個人資料失敗。');
        }
        return true;
    } catch (error) {
        console.error("更新個人資料時發生錯誤:", error);
        throw error;
    }
}
