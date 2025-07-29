import { createClient } from '@supabase/supabase-js';

/**
 * 在 Serverless Function 中記錄稽核日誌。
 * @param {object} supabaseAdmin - 已初始化的 Supabase 管理員客戶端。
 * @param {string} adminUserId - 執行此操作的管理員使用者 ID。
 * @param {object} logDetails - 稽核日誌的詳細內容。
 */
async function recordAdminAuditLog(supabaseAdmin, adminUserId, logDetails) {
  try {
    const { data: adminProfile } = await supabaseAdmin.from('profiles').select('email').eq('id', adminUserId).single();
    const userEmail = adminProfile ? adminProfile.email : 'unknown@example.com';

    const old_value_json = logDetails.old_value ? JSON.stringify(logDetails.old_value) : null;
    const new_value_json = logDetails.new_value ? JSON.stringify(logDetails.new_value) : null;

    const { error } = await supabaseAdmin.from('audit_logs').insert({
      user_id: adminUserId,
      user_email: userEmail,
      action_type: logDetails.action_type,
      target_table: logDetails.target_table,
      target_id: logDetails.target_id,
      description: logDetails.description,
      old_value: old_value_json,
      new_value: new_value_json,
    });
    if (error) console.error("記錄管理員稽核日誌失敗:", error);
  } catch (err) {
    console.error("記錄管理員稽核日誌時發生錯誤:", err);
  }
}

export default async function handler(req, res) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: '伺服器設定錯誤' });
  }

  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const { ids } = req.body;
  const adminUserId = req.headers['x-admin-user-id'];

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: '請提供一個要刪除的帳號 ID 陣列。' });
  }

  try {
    if (!adminUserId) {
      return res.status(401).json({ error: '需要管理員使用者 ID。' });
    }
    // [修正] 以更穩健的兩步驟檢查管理員角色
    const { data: adminProfile, error: adminProfileError } = await supabaseAdmin
      .from('profiles')
      .select('role_id')
      .eq('id', adminUserId)
      .single();

    if (adminProfileError || !adminProfile?.role_id) {
        return res.status(403).json({ error: '未授權的操作或未指派管理員角色。' });
    }

    const { data: adminRoleData, error: adminRoleError } = await supabaseAdmin
      .from('roles')
      .select('name')
      .eq('id', adminProfile.role_id)
      .single();
    
    const adminRole = adminRoleData?.name;
    if (adminRoleError || !adminRole || !['admin', 'superadmin'].includes(adminRole)) {
      return res.status(403).json({ error: '未授權的操作。' });
    }

    const successfulDeletes = [];
    const failedDeletes = [];
    
    // [修正] 以更穩健的方式獲取待刪除的個人資料及其角色
    const { data: profilesToDelete, error: fetchProfilesError } = await supabaseAdmin
        .from('profiles')
        .select('id, email, nickname, roles(name)')
        .in('id', ids);
    if (fetchProfilesError) console.warn("刪除帳號前無法獲取舊資料用於稽核:", fetchProfilesError.message);
    const profileMap = new Map((profilesToDelete || []).map(p => [p.id, p]));

    for (const id of ids) {
      try {
        const profileToDelete = profileMap.get(id);

        if (adminRole === 'admin' && profileToDelete?.roles?.name === 'superadmin') {
            failedDeletes.push({ id: id, reason: '管理員無法刪除超級管理員帳號。' });
            continue;
        }

        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
        if (authError) {
          throw authError;
        }

        successfulDeletes.push(id);
        
        await recordAdminAuditLog(supabaseAdmin, adminUserId, {
            action_type: 'DELETE',
            target_table: 'profiles',
            target_id: id,
            description: `刪除帳號: ${profileToDelete?.email || id}`,
            old_value: profileToDelete || null
        });

      } catch (error) {
        failedDeletes.push({ id: id, reason: error.message });
        console.error(`刪除 ID 為 ${id} 的使用者失敗:`, error.message);
      }
    }
    
    if (failedDeletes.length > 0) {
      return res.status(500).json({ 
        success: false, 
        message: `成功刪除 ${successfulDeletes.length} 個帳號，但有 ${failedDeletes.length} 個失敗。`,
        failed: failedDeletes,
        succeeded: successfulDeletes
      });
    }

    res.status(200).json({ success: true, message: `成功刪除 ${successfulDeletes.length} 個帳號。` });

  } catch (error) {
    console.error("批次刪除帳號失敗:", error);
    res.status(500).json({ error: error.message || '批次刪除過程中發生未知錯誤。' });
  }
}
