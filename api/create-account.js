import { createClient } from '@supabase/supabase-js';

/**
 * 在 Serverless Function 中記錄稽核日誌。
 * 這個函式可以直接使用 supabaseAdmin 客戶端。
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
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `請求方法 ${req.method} 不允許` });
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('伺服器設定錯誤: 環境變數中未設定 SUPABASE_URL 或 SUPABASE_SERVICE_KEY。');
    return res.status(500).json({ error: '伺服器設定錯誤' });
  }

  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    {
      db: { schema: 'public' },
      auth: { autoRefreshToken: false, persistSession: false }
    }
  );

  // 從請求主體中解構出 registration_code
  let { email, password, role: roleName, nickname, registration_code } = req.body;
  const adminUserId = req.headers['x-admin-user-id'];

  try {
    if (!adminUserId) {
      return res.status(401).json({ error: '此操作需要管理員使用者 ID。' });
    }
    
    const { data: adminProfile, error: adminProfileError } = await supabaseAdmin
      .from('profiles')
      .select('roles(name)')
      .eq('id', adminUserId)
      .single();

    if (adminProfileError || !adminProfile?.roles?.name) {
      return res.status(403).json({ error: '未授權的操作或未指派管理員角色。' });
    }

    const adminRole = adminProfile.roles.name;

    const { data: hasPermission, error: rpcError } = await supabaseAdmin.rpc('user_has_permission', { p_user_id: adminUserId, p_permission_name: 'accounts:manage_users' });
    
    if (rpcError) {
      return res.status(500).json({ error: '權限檢查失敗。' });
    }
    
    if (adminRole !== 'superadmin' && !hasPermission) {
      return res.status(403).json({ error: '未經授權：您沒有權限建立使用者帳號。' });
    }

    // [新增] 檢查要建立的角色是否存在且合法
    const { data: targetRole, error: roleError } = await supabaseAdmin
      .from('roles')
      .select('id, name')
      .eq('name', roleName)
      .single();

    if (roleError || !targetRole) {
      return res.status(400).json({ error: `指定的角色名稱 '${roleName}' 無效或不存在。` });
    }

    // [新增] 管理員不能建立超級管理員帳號的檢查
    if (adminRole === 'admin' && targetRole.name === 'superadmin') {
      return res.status(403).json({ error: '管理員無法建立超級管理員帳號。' });
    }

    // 將 roleName 傳遞給 app_metadata
    const { data: userData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: {
        source: 'admin_creation',
        role: roleName,
        nickname: nickname
      }
    });

    if (signUpError) {
      if (signUpError.message.includes('User already registered')) {
        return res.status(409).json({ error: '此 Email 已被其他帳號使用。' });
      }
      return res.status(500).json({ error: `建立認證使用者失敗: ${signUpError.message}` });
    }
    
    // 使用 Supabase Admin 客戶端直接更新 profiles 表格，並包含 registration_code
    const { error: profileInsertError } = await supabaseAdmin
      .from('profiles')
      .update({ registration_code: registration_code })
      .eq('id', userData.user.id);
      
    if (profileInsertError) {
        console.error("更新使用者檔案 (profiles) 失敗:", profileInsertError);
        // 如果 profiles 表格更新失敗，您可能需要處理使用者帳號的刪除以保持資料一致性
        await supabaseAdmin.auth.admin.deleteUser(userData.user.id);
        return res.status(500).json({ error: `更新使用者檔案失敗: ${profileInsertError.message}` });
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
    console.error("建立帳號 handler 發生未預期錯誤:", error);
    // 確保所有錯誤都以 JSON 格式返回
    res.status(500).json({ error: error.message || '發生預期外的錯誤' });
  }
}
