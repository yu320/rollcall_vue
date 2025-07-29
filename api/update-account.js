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
    console.error('Server configuration error: SUPABASE_URL or SUPABASE_SERVICE_KEY not set.');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const { id, email, password, role: incomingRole, nickname } = req.body; // Rename role to incomingRole
  const adminUserId = req.headers['x-admin-user-id'];

  // Validate that a user ID was provided
  if (!id) {
    return res.status(400).json({ error: 'User ID is required for an update.' });
  }

  try {
    // Security check: Verify the user performing the action is an admin
    if (!adminUserId) {
      return res.status(401).json({ error: 'Admin user ID is required.' });
    }
    const { data: adminProfile, error: adminError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', adminUserId)
      .single();

    if (adminError || !adminProfile || adminProfile.role !== 'admin') {
      console.warn('Unauthorized attempt to update account:', { adminUserId, adminProfile, adminError });
      return res.status(403).json({ error: 'Unauthorized action.' });
    }

    // Fetch existing profile to compare email and record old_value for audit log
    const { data: existingProfile, error: fetchProfileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, role, nickname') // Select all fields relevant for audit
      .eq('id', id)
      .single();

    if (fetchProfileError || !existingProfile) {
      console.error('Error fetching existing profile for update:', { id, error: fetchProfileError });
      return res.status(404).json({ error: 'Target account not found.' });
    }

    // --- Update Auth user data (password and email) ---
    const userUpdateData = {};
    let emailChanged = false;

    // Check if email is provided and different from existing email
    if (email && email !== existingProfile.email) {
      userUpdateData.email = email;
      emailChanged = true;
    }
    // Only add password to update if it's provided and meets minimum length
    if (password && password.length >= 6) {
      userUpdateData.password = password;
    } else if (password && password.length < 6) {
      // If password is provided but too short, return an error
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    if (Object.keys(userUpdateData).length > 0) {
      const { error: updateUserError } = await supabaseAdmin.auth.admin.updateUserById(
        id,
        userUpdateData
      );
      if (updateUserError) {
        console.error("Supabase auth update error:", {
          id,
          userUpdateData,
          error: updateUserError.message,
          originalError: updateUserError
        });
        if (updateUserError.message.includes("User not found")) {
            return res.status(404).json({ error: 'Account does not exist.' });
        }
        if (updateUserError.message.includes("Email already registered")) {
            return res.status(409).json({ error: 'Email already exists.' });
        }
        return res.status(500).json({ error: updateUserError.message || "Error updating user in Supabase Auth." });
      }
    }

    // --- Update Profile data (role, nickname, and sync email if changed) ---
    const profileUpdateData = {};
    
    // --- START FIX: Robust role handling for update ---
    if (incomingRole !== undefined) {
        if (typeof incomingRole === 'string' && incomingRole.trim() !== '') {
            profileUpdateData.role = incomingRole.trim();
        } else if (incomingRole === null || (typeof incomingRole === 'string' && incomingRole.trim() === '')) {
            profileUpdateData.role = 'operator';
        }
    }
    // --- END FIX ---

    // Allow nickname to be set to an empty string
    if (nickname || nickname === '') {
      profileUpdateData.nickname = nickname;
    }
    // Sync email to profiles table if it was changed in auth
    if (emailChanged) {
        profileUpdateData.email = email;
    }

    let updatedProfileData = null; // To store new profile data for audit log

    if (Object.keys(profileUpdateData).length > 0) {
      const { data: updatedData, error: updateProfileError } = await supabaseAdmin
        .from('profiles')
        .update(profileUpdateData)
        .eq('id', id)
        .select('*'); // Select all fields to get the new_value for audit log

      if (updateProfileError) {
        console.error("Supabase profile update error:", {
          id,
          profileUpdateData,
          error: updateProfileError.message,
          originalError: updateProfileError
        });
        return res.status(500).json({ error: updateProfileError.message || "Error updating user profile." });
      }
      updatedProfileData = updatedData ? updatedData[0] : null;
    } else {
        // If no profile data was explicitly updated, use the existing profile data as the "new" data
        // in case only email/password changed via auth.admin.updateUserById
        updatedProfileData = existingProfile;
    }
    
    // [NEW] 記錄稽核日誌
    await recordAdminAuditLog(supabaseAdmin, adminUserId, {
        action_type: 'UPDATE',
        target_table: 'profiles',
        target_id: id,
        description: `更新帳號: ${updatedProfileData?.email || email} (角色: ${updatedProfileData?.role || incomingRole})`,
        old_value: existingProfile,
        new_value: updatedProfileData
    });

    res.status(200).json({ success: true, message: 'Account updated successfully.' });
  } catch (error) {
    console.error("Update account handler failed unexpectedly:", error);
    res.status(500).json({ error: error.message || 'An unexpected error occurred during the update process.' });
  }
};
