const { createClient } = require('@supabase/supabase-js');

/**
 * 記錄 Serverless Function 中的稽核日誌。
 * 這個函式可以直接使用 supabaseAdmin 客戶端。
 * @param {object} supabaseAdmin - 已初始化的 Supabase 管理員客戶端。
 * @param {string} adminUserId - 執行此操作的管理員使用者 ID。
 * @param {object} logDetails - 稽核日誌的詳細內容。
 * @param {string} logDetails.action_type - 操作類型 (e.g., 'CREATE', 'UPDATE', 'DELETE')。
 * @param {string} logDetails.target_table - 被操作的資料表名稱。
 * @param {string} [logDetails.target_id] - 被操作的記錄 ID。
 * @param {string} logDetails.description - 對操作的簡潔描述。
 * @param {object} [logDetails.old_value=null] - 舊的資料快照。
 * @param {object} [logDetails.new_value=null] - 新的資料快照。
 */
async function recordAdminAuditLog(supabaseAdmin, adminUserId, logDetails) {
  try {
    // 獲取管理員的 Email，用於記錄在日誌中
    const { data: adminProfile } = await supabaseAdmin.from('profiles').select('email').eq('id', adminUserId).single();
    const userEmail = adminProfile ? adminProfile.email : 'unknown@example.com'; // Fallback

    // 將物件值轉換為 JSON 字串，以便儲存到 jsonb 類型欄位
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
    if (error) console.error("Failed to record admin audit log:", error);
  } catch (err) {
    console.error("Error recording admin audit log:", err);
  }
}


module.exports = async function handler(req, res) {
  // Check for server configuration
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('Server configuration error: SUPABASE_URL or SUPABASE_SERVICE_KEY not set in environment variables.');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // 使用服務金鑰建立 Supabase 管理員客戶端
  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  let { email, password, role: incomingRole, nickname } = req.body; // Rename role to incomingRole to safely process
  const adminUserId = req.headers['x-admin-user-id'];

  // --- START FIX: Robust role handling ---
  let roleToUse = 'operator'; // Default value as per schema
  if (typeof incomingRole === 'string' && incomingRole.trim() !== '') {
      roleToUse = incomingRole.trim();
  } else if (incomingRole !== undefined && incomingRole !== null && incomingRole.trim === undefined) {
      // This case handles if incomingRole is an empty string, null, or a non-string value that isn't undefined
      // and doesn't have a .trim() method. We'll default it to 'operator'.
      console.warn(`WARNING: Invalid or empty role received (${incomingRole}). Defaulting to "${roleToUse}".`);
  }
  // --- END FIX ---


  try {
    // --- 安全性強化 ---
    // 1. 檢查請求標頭中是否包含管理員 ID
    if (!adminUserId) {
      console.error('ERROR: Admin user ID is missing from request headers.');
      return res.status(401).json({ error: 'Admin user ID is required for this operation.' });
    }
    
    // 2. 查詢資料庫，驗證執行此操作的使用者是否為管理員
    const { data: adminProfile, error: adminError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', adminUserId)
      .single();

    // 3. 如果查詢出錯、找不到該使用者、或該使用者角色不是 'admin'，則拒絕操作
    if (adminError || !adminProfile || adminProfile.role !== 'admin') {
      console.error('ERROR: Unauthorized admin user check. adminError:', adminError, 'adminProfile:', adminProfile);
      return res.status(403).json({ error: 'Unauthorized: You do not have permission to perform this action.' });
    }
    // --- 強化結束 ---

    // 執行建立使用者的操作
    const { data: userData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // 自動確認 Email，使用者可直接登入
    });

    if (signUpError) {
      console.error('ERROR: Supabase createUser failed. signUpError:', signUpError);
      if (signUpError.message.includes('User already registered')) {
        return res.status(409).json({ error: 'Email already registered' });
      }
      throw signUpError;
    }

    // 在 profiles 表中建立對應的個人資料
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({ id: userData.user.id, email, role: roleToUse, nickname }, { onConflict: 'id' }); // Use roleToUse here

    if (profileError) {
        console.error('ERROR: Profiles upsert failed. profileError:', profileError);
        throw profileError;
    }

    // [NEW] 記錄稽核日誌
    await recordAdminAuditLog(supabaseAdmin, adminUserId, {
        action_type: 'CREATE',
        target_table: 'profiles',
        target_id: userData.user.id,
        description: `建立帳號: ${email} (角色: ${roleToUse})`,
        new_value: { id: userData.user.id, email, role: roleToUse, nickname }
    });

    res.status(200).json({ success: true, userId: userData.user.id });
  } catch (error) {
    console.error("ERROR: Create account failed in catch block:", error);
    res.status(500).json({ error: error.message || 'An unexpected error occurred' });
  }
};
