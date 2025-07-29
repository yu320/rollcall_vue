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
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // Create a Supabase admin client
  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  // Get data from the request body and headers
  const { ids } = req.body;
  const adminUserId = req.headers['x-admin-user-id'];

  // Validate that an array of IDs was provided
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Please provide an array of account IDs to delete.' });
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
      return res.status(403).json({ error: 'Unauthorized action.' });
    }

    const successfulDeletes = [];
    const failedDeletes = [];
    
    // [NEW] 預先獲取要刪除的帳號資料，以便記錄到稽核日誌
    const { data: profilesToDelete, error: fetchProfilesError } = await supabaseAdmin
        .from('profiles')
        .select('id, email, nickname, role')
        .in('id', ids);
    if (fetchProfilesError) console.warn("刪除帳號前無法獲取舊資料用於稽核:", fetchProfilesError.message);
    const profileMap = new Map((profilesToDelete || []).map(p => [p.id, p]));


    // Process each ID for deletion
    for (const id of ids) {
      try {
        const deletedProfile = profileMap.get(id); // Get profile before deleting

        // Step 1: Delete the user from the main authentication system
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
        if (authError) {
          throw authError;
        }

        // Step 2: Delete the corresponding user profile
        // This is a safeguard in case database cascading deletes are not set up
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .delete()
          .eq('id', id);

        if (profileError) {
          // Log a warning if the profile couldn't be deleted, but don't treat it as a critical failure
          console.warn(`Successfully deleted auth user ${id}, but failed to delete profile: ${profileError.message}`);
        }

        successfulDeletes.push(id);
        
        // [NEW] 記錄稽核日誌
        await recordAdminAuditLog(supabaseAdmin, adminUserId, {
            action_type: 'DELETE',
            target_table: 'profiles',
            target_id: id,
            description: `刪除帳號: ${deletedProfile?.email || id}`,
            old_value: deletedProfile || null // Record the profile data before deletion
        });

      } catch (error) {
        failedDeletes.push({ id: id, reason: error.message });
        console.error(`Failed to delete user with ID ${id}:`, error.message);
      }
    }
    
    // If some deletions failed, return a detailed error message
    if (failedDeletes.length > 0) {
      return res.status(500).json({ 
        success: false, 
        message: `Successfully deleted ${successfulDeletes.length} accounts, but ${failedDeletes.length} failed.`,
        failed: failedDeletes,
        succeeded: successfulDeletes
      });
    }

    res.status(200).json({ success: true, message: `Successfully deleted ${successfulDeletes.length} accounts.` });

  } catch (error) {
    console.error("Batch delete account failed:", error);
    res.status(500).json({ error: error.message || 'An unknown error occurred during batch deletion.' });
  }
};
