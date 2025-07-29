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
    if (error) console.error("記錄稽核日誌失敗:", error);
  } catch (err) {
    console.error("記錄稽核日誌時發生錯誤:", err);
  }
}

export default async function handler(req, res) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('伺服器設定錯誤: 環境變數中未設定 SUPABASE_URL 或 SUPABASE_SERVICE_KEY。');
    return res.status(500).json({ error: '伺服器設定錯誤' });
  }

  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  let { email, password, role: roleName, nickname } = req.body;
  const adminUserId = req.headers['x-admin-user-id'];

  try {
    if (!adminUserId) {
      return res.status(401).json({ error: '此操作需要管理員使用者 ID。' });
    }
    
    // 以更穩健的兩步驟檢查管理員角色
    const { data: adminProfile, error: adminProfileError } = await supabaseAdmin
      .from('profiles')
      .select('role_id')
      .eq('id', adminUserId)
      .single();

    if (adminProfileError || !adminProfile?.role_id) {
        return res.status(403).json({ error: '未經授權的操作或未指派管理員角色。' });
    }

    const { data: adminRoleData, error: adminRoleError } = await supabaseAdmin
      .from('roles')
      .select('name')
      .eq('id', adminProfile.role_id)
      .single();
    
    const adminRole = adminRoleData?.name;
    if (adminRoleError || !adminRole || !['admin', 'superadmin'].includes(adminRole)) {
      return res.status(403).json({ error: '未經授權：您沒有權限執行此操作。' });
    }

    // 安全性檢查：admin 不能建立 superadmin
    if (adminRole === 'admin' && roleName === 'superadmin') {
        return res.status(403).json({ error: '管理員無法建立超級管理員帳號。' });
    }

    const { data: userData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // 自動確認 Email
    });

    if (signUpError) {
      if (signUpError.message.includes('User already registered')) {
        return res.status(409).json({ error: '此 Email 已被註冊' });
      }
      throw signUpError;
    }

    const { data: roleData } = await supabaseAdmin.from('roles').select('id').eq('name', roleName).single();
    if (!roleData) throw new Error(`找不到角色 '${roleName}'。`);

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({ id: userData.user.id, email, role_id: roleData.id, nickname }, { onConflict: 'id' });

    if (profileError) {
        throw profileError;
    }

    await recordAdminAuditLog(supabaseAdmin, adminUserId, {
        action_type: 'CREATE',
        target_table: 'profiles',
        target_id: userData.user.id,
        description: `建立帳號: ${email} (角色: ${roleName})`,
        new_value: { id: userData.user.id, email, role: roleName, nickname }
    });

    res.status(200).json({ success: true, userId: userData.user.id });
  } catch (error) {
    console.error("錯誤：建立帳號失敗:", error);
    res.status(500).json({ error: error.message || '發生預期外的錯誤' });
  }
}
