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
  // 確保請求方法是 POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '請求方法不允許' });
  }

  // 檢查伺服器環境變數是否設定
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: '伺服器設定錯誤' });
  }

  // 初始化 Supabase 管理員客戶端
  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  // 從請求主體中獲取更新資料
  const { id, email, password, nickname, role_id } = req.body;
  // 從請求標頭中獲取執行此操作的管理員 ID
  const adminUserId = req.headers['x-admin-user-id'];

  // 驗證輸入
  if (!id) {
    return res.status(400).json({ error: '更新帳號需要使用者 ID。' });
  }
  if (!adminUserId) {
    return res.status(401).json({ error: '需要管理員使用者 ID。' });
  }

  try {
    // --- 新增：驗證管理員權限 ---
    const { data: adminProfile, error: adminProfileError } = await supabaseAdmin
      .from('profiles')
      .select('roles(name)') // 直接獲取角色名稱
      .eq('id', adminUserId)
      .single();

    if (adminProfileError || !adminProfile?.roles?.name) {
        return res.status(403).json({ error: '未經授權的操作或未指派管理員角色。' });
    }

    const adminRole = adminProfile.roles.name;
    if (!['admin', 'superadmin'].includes(adminRole)) {
      return res.status(403).json({ error: '未經授權：您沒有權限執行此操作。' });
    }

    // 安全性規則：admin 不能修改 superadmin
    const { data: targetUser, error: targetUserError } = await supabaseAdmin
        .from('profiles')
        .select('roles(name)')
        .eq('id', id)
        .single();

    if (targetUserError) {
        console.warn(`更新目標使用者時找不到其設定檔: ${targetUserError.message}`);
    }
    
    if (adminRole === 'admin' && targetUser?.roles?.name === 'superadmin') {
        return res.status(403).json({ error: '管理員無法修改超級管理員帳號。' });
    }
    // --- 權限驗證結束 ---

    // 為了稽核日誌，先獲取更新前的舊資料
    const { data: oldData, error: fetchError } = await supabaseAdmin.from('profiles').select('*').eq('id', id).single();
    if (fetchError) {
        console.warn(`無法獲取用於稽核日誌的舊個人資料: ${fetchError.message}`);
    }


    // 1. 更新認證資訊 (如果前端有提供)
    const authUpdatePayload = {};
    if (email) authUpdatePayload.email = email;
    if (password) authUpdatePayload.password = password;

    if (Object.keys(authUpdatePayload).length > 0) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, authUpdatePayload);
      if (authError) {
        // --- 新增：更具體的錯誤處理 ---
        // 檢查是否為 Email 重複的錯誤
        if (authError.message.includes('unique constraint') && authError.message.includes('users_email_key')) {
            throw new Error('此 Email 已被其他帳號使用。');
        }
        // 若為其他錯誤，則直接拋出
        throw authError;
      }
    }

    // 2. 更新 Profile 表中的資訊 (如果前端有提供)
    const profileUpdatePayload = {};
    if (nickname) profileUpdatePayload.nickname = nickname;
    if (role_id) profileUpdatePayload.role_id = role_id;
    // 如果 auth 中的 email 更新了，profiles 表中的 email 也必須同步更新
    if (email) profileUpdatePayload.email = email;


    if (Object.keys(profileUpdatePayload).length > 0) {
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update(profileUpdatePayload)
            .eq('id', id);
        if (profileError) throw profileError;
    }

    // 3. 記錄稽核日誌
    await recordAdminAuditLog(supabaseAdmin, adminUserId, {
        action_type: 'UPDATE',
        target_table: 'profiles',
        target_id: id,
        description: `更新帳號: ${email || oldData?.email}`,
        old_value: oldData,
        new_value: { id, ...profileUpdatePayload, password: password ? '******' : undefined } // 不記錄明文密碼
    });

    res.status(200).json({ success: true, message: '帳號更新成功。' });

  } catch (error) {
    console.error("更新帳號失敗:", error);
    // 將更具體的錯誤訊息回傳給前端
    res.status(500).json({ error: error.message || '更新過程中發生未知錯誤。' });
  }
}
