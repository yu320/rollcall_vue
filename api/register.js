// /api/register.js
import { createClient } from '@supabase/supabase-js';

// 輔助函數：記錄稽核日誌 (從現有 API 檔案中借鑒)
async function recordSystemAuditLog(supabaseAdmin, logDetails) {
  try {
    const { error } = await supabaseAdmin.from('audit_logs').insert({
      user_id: logDetails.user_id,
      user_email: logDetails.user_email,
      action_type: 'CREATE',
      target_table: 'auth.users',
      target_id: logDetails.user_id,
      description: logDetails.description,
      new_value: logDetails.new_value,
    });
    if (error) console.error("記錄系統稽核日誌失敗:", error);
  } catch (err) {
    console.error("記錄系統稽核日誌時發生錯誤:", err);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: `不允許的方法 ${req.method}` });
  }

  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const { email, password, nickname, registration_code } = req.body;

  if (!email || !password || !nickname) {
    return res.status(400).json({ error: '電子郵件、密碼和暱稱皆為必填項。' });
  }

  try {
    // 1. 檢查系統設定是否需要註冊碼
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('settings')
      .select('value')
      .eq('key', 'registration_code_required')
      .single();

    if (settingsError) throw new Error('無法讀取系統設定。');

    const isCodeRequired = settings.value === true;
    let role_id_from_code = null;
    let code_id_to_update = null;

    if (isCodeRequired) {
      if (!registration_code) {
        return res.status(400).json({ error: '系統目前需要註冊碼才能註冊。' });
      }

      // 2. 驗證註冊碼
      const { data: codeData, error: codeError } = await supabaseAdmin
        .from('registration_codes')
        .select('id, role_id, expires_at, uses_left')
        .eq('code', registration_code)
        .single();

      if (codeError || !codeData) {
        return res.status(404).json({ error: '無效的註冊碼。' });
      }

      if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
        return res.status(410).json({ error: '此註冊碼已過期。' });
      }

      if (codeData.uses_left <= 0) {
        return res.status(409).json({ error: '此註冊碼已達使用次數上限。' });
      }

      role_id_from_code = codeData.role_id;
      code_id_to_update = codeData.id;
    }

    // 3. 建立使用者 (auth.users)
    const { data: userData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // 自動確認 Email
    });

    if (signUpError) {
      if (signUpError.message.includes('User already registered')) {
        return res.status(409).json({ error: '此 Email 已被註冊。' });
      }
      throw signUpError;
    }

    // `handle_new_user` 觸發器會先建立一個預設的 profile
    // 4. 更新 profile 以設定正確的角色和暱稱
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        nickname: nickname,
        // 如果有來自註冊碼的角色，就使用它；否則保持觸發器設定的預設角色
        role_id: role_id_from_code || undefined
      })
      .eq('id', userData.user.id);
      
    if (profileError) {
      // 如果 profile 更新失敗，刪除剛建立的 auth user 以保持資料一致性
      await supabaseAdmin.auth.admin.deleteUser(userData.user.id);
      throw profileError;
    }

    // 5. 如果使用了註冊碼，則更新其剩餘次數
    if (isCodeRequired && code_id_to_update) {
      const { error: updateCodeError } = await supabaseAdmin.rpc('decrement_code_uses', { code_id: code_id_to_update });
      if (updateCodeError) {
        // 即使這裡失敗，使用者也已建立成功，僅記錄錯誤
        console.error(`更新註冊碼 ${code_id_to_update} 次數失敗:`, updateCodeError);
      }
    }

    // 6. 記錄稽核日誌
    await recordSystemAuditLog(supabaseAdmin, {
      user_id: userData.user.id,
      user_email: email,
      description: `使用者 ${email} 透過公開註冊成功建立帳號。`,
      new_value: { id: userData.user.id, email, nickname, source: 'public_registration' }
    });

    res.status(200).json({ success: true, userId: userData.user.id });

  } catch (error) {
    console.error("註冊 API 錯誤:", error);
    res.status(500).json({ error: error.message || '發生未預期的伺服器錯誤。' });
  }
}