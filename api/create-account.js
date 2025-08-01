import { createClient } from '@supabase/supabase-js';

/**
 * 在 Serverless Function 中記錄稽核日誌。
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

export default async function handler(req, res) { // 確保這裡使用 export default async function
  // 確保請求方法是 POST
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
      db: {
        schema: 'public', // 明確指定 schema
      },
      auth: {
        autoRefreshToken: false, // 在 Serverless 環境中通常不需要
        persistSession: false,   // 在 Serverless 環境中通常不需要
      }
    }
  );

  let { email, password, role: roleName, nickname } = req.body; // 這裡的 roleName 已經是前端傳過來的名稱了
  const adminUserId = req.headers['x-admin-user-id'];

  try {
    if (!adminUserId) {
      return res.status(401).json({ error: '此操作需要管理員使用者 ID。' });
    }
    
    // 獲取執行操作的管理員角色和權限
    const { data: adminProfile, error: adminProfileError } = await supabaseAdmin
      .from('profiles')
      .select('roles(name)')
      .eq('id', adminUserId)
      .single();

    if (adminProfileError || !adminProfile?.roles?.name) {
        console.error("建立帳號：未授權或未指派管理員角色", { adminUserId, adminProfileError });
        return res.status(403).json({ error: '未授權的操作或未指派管理員角色。' });
    }

    const adminRole = adminProfile.roles.name;

    // --- 新增權限檢查：是否允許建立使用者 ---
    const { data: hasCreateUsersPermission, error: rpcError } = await supabaseAdmin.rpc('user_has_permission', { p_user_id: adminUserId, p_permission_name: 'accounts:create_users' });
    
    if (rpcError) {
      console.error("建立帳號：RPC 權限檢查失敗", { adminUserId, rpcError });
      return res.status(500).json({ error: '權限檢查失敗。' });
    }

    // 如果執行者不是 'superadmin' 並且沒有 'accounts:create_users' 權限，則拒絕
    if (adminRole !== 'superadmin' && !hasCreateUsersPermission) {
      console.warn("建立帳號：非超級管理員且無建立權限。", { adminUserId });
      return res.status(403).json({ error: '未經授權：您沒有權限建立使用者帳號。' });
    }
    // --- 權限檢查結束 ---

    // 安全性檢查：admin 不能建立 superadmin (即使有 create_users 權限)
    if (adminRole === 'admin' && roleName === 'superadmin') {
        console.warn("建立帳號：管理員嘗試建立超級管理員帳號。", { adminUserId });
        return res.status(403).json({ error: '管理員無法建立超級管理員帳號。' });
    }

    const { data: userData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // 自動確認 Email
    });

    if (signUpError) {
      console.error("建立帳號：Supabase auth.admin.createUser 失敗", {
        email,
        errorMessage: signUpError.message,
        originalError: signUpError
      });
      if (signUpError.message.includes('User already registered')) {
        return res.status(409).json({ error: '此 Email 已被其他帳號使用。' });
      }
      return res.status(500).json({ error: signUpError.message || '建立認證使用者失敗。' });
    }

    const { data: roleData, error: fetchRoleError } = await supabaseAdmin.from('roles').select('id').eq('name', roleName).single();
    if (fetchRoleError || !roleData) {
      console.error("建立帳號：找不到角色 ID 或查詢失敗", { roleName, fetchRoleError });
      // 如果找不到角色，則刪除剛創建的認證用戶以保持數據一致性
      await supabaseAdmin.auth.admin.deleteUser(userData.user.id);
      return res.status(400).json({ error: `找不到角色 '${roleName}'。` });
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({ id: userData.user.id, email, role_id: roleData.id, nickname }, { onConflict: 'id' });

    if (profileError) {
        console.error("建立帳號：Supabase profiles 表 upsert 失敗", {
          newUserId: userData.user.id,
          profileData: { email, role_id: roleData.id, nickname },
          errorMessage: profileError.message,
          originalError: profileError
        });
        // 如果 profile 更新失敗，最好將剛建立的 auth user 刪除以保持資料一致性
        await supabaseAdmin.auth.admin.deleteUser(userData.user.id);
        return res.status(500).json({ error: profileError.message || '建立使用者資料失敗。' });
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
    res.status(500).json({ error: error.message || '發生預期外的錯誤' });
  }
}
