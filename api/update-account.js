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

export default async function handler(req, res) { // 確保這裡使用 export default async function
    // 確保請求方法是 POST
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: `請求方法 ${req.method} 不允許` });
    }
    
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
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

    const { id, email, password, nickname, role_id } = req.body;
    const adminUserId = req.headers['x-admin-user-id'];

    if (!id) {
        return res.status(400).json({ error: '更新帳號需要使用者 ID。' });
    }
    if (!adminUserId) {
        return res.status(401).json({ error: '需要管理員使用者 ID。' });
    }

    try {
        // 【修正】獲取執行操作的管理員角色和權限，欄位從 'name' 改為 'role'
        const { data: adminProfile, error: adminProfileError } = await supabaseAdmin
            .from('profiles')
            .select('roles(role)') // 修正點 1
            .eq('id', adminUserId)
            .single();

        if (adminProfileError || !adminProfile?.roles?.role) { // 修正點 2
            console.error("更新帳號：未授權或未指派管理員角色", { adminUserId, adminProfileError });
            return res.status(403).json({ error: '未授權的操作或未指派管理員角色。' });
        }

        const adminRole = adminProfile.roles.role; // 修正點 3

        // --- 新增權限檢查：是否允許更新使用者 ---
        // 這裡使用 rpc 函數檢查是否有 accounts:update_users 權限
        const { data: hasUpdateUsersPermission, error: rpcError } = await supabaseAdmin.rpc('user_has_permission', { p_user_id: adminUserId, p_permission_name: 'accounts:update_users' });
        
        if (rpcError) {
            console.error("更新帳號：RPC 權限檢查失敗", { adminUserId, rpcError });
            return res.status(500).json({ error: '權限檢查失敗。' });
        }

        // 如果執行者是 'admin' 角色，並且明確要求 'admin' 不能更新 (即 hasUpdateUsersPermission 為 false)
        if (adminRole === 'admin' && !hasUpdateUsersPermission) {
            console.warn("更新帳號：管理員無權限執行更新操作。", { adminUserId });
            return res.status(403).json({ error: '管理員帳號目前無權限執行更新操作。' });
        }
        // 如果不是 superadmin 且沒有 accounts:update_users 權限，則拒絕
        if (adminRole !== 'superadmin' && !hasUpdateUsersPermission) {
            console.warn("更新帳號：非超級管理員且無更新權限。", { adminUserId });
            return res.status(403).json({ error: '未經授權：您沒有更新使用者帳號的權限。' });
        }
        // --- 權限檢查結束 ---

        // 【修正】安全性規則：admin 不能修改 superadmin，欄位從 'name' 改為 'role'
        const { data: targetUser, error: targetUserError } = await supabaseAdmin
            .from('profiles')
            .select('roles(role)') // 修正點 4
            .eq('id', id)
            .single();

        if (targetUserError) {
            console.warn(`更新帳號：找不到目標使用者設定檔: ${targetUserError.message}`, { targetUserId: id });
            // 如果找不到目標用戶，但不是權限問題，而是資料庫問題，需要判斷是否返回404
            // 這裡暫時仍視為潛在的後續錯誤，讓執行繼續，如果 auth.admin.updateUserById 也找不到會報錯
        }
        
        if (adminRole === 'admin' && targetUser?.roles?.role === 'superadmin') { // 修正點 5
            console.warn("更新帳號：管理員嘗試修改超級管理員帳號", { adminUserId, targetUserId: id });
            return res.status(403).json({ error: '管理員無法修改超級管理員帳號。' });
        }

        // 為了稽核日誌，先獲取更新前的舊資料
        const { data: oldData, error: fetchOldDataError } = await supabaseAdmin.from('profiles').select('*').eq('id', id).single();
        if (fetchOldDataError) {
            console.warn(`更新帳號：無法獲取用於稽核日誌的舊個人資料: ${fetchOldDataError.message}`, { targetUserId: id });
        }


        // 1. 更新認證資訊 (如果前端有提供)
        const authUpdatePayload = {};
        if (email) authUpdatePayload.email = email;
        if (password) authUpdatePayload.password = password;

        if (Object.keys(authUpdatePayload).length > 0) {
            const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, authUpdatePayload);
            if (authError) {
                console.error("更新帳號：Supabase auth.admin.updateUserById 失敗", {
                    targetUserId: id,
                    authUpdatePayload,
                    errorMessage: authError.message,
                    originalError: authError
                });
                // 更具體的錯誤處理
                if (authError.message.includes('unique constraint') && authError.message.includes('users_email_key')) {
                    return res.status(409).json({ error: '此 Email 已被其他帳號使用。' });
                }
                if (authError.message.includes('User not found')) {
                    return res.status(404).json({ error: '目標使用者不存在。' });
                }
                return res.status(500).json({ error: authError.message || '更新認證資訊失敗。' });
            }
        }

        // 2. 更新 Profile 表中的資訊 (如果前端有提供)
        const profileUpdatePayload = {};
        if (nickname) profileUpdatePayload.nickname = nickname;
        if (role_id) profileUpdatePayload.role_id = role_id;
        // 如果 auth 中的 email 更新了，profiles 表中的 email 也必須同步更新
        if (email) profileUpdatePayload.email = email;


        if (Object.keys(profileUpdatePayload).length > 0) {
            const { data: updatedProfileData, error: profileError } = await supabaseAdmin
                .from('profiles')
                .update(profileUpdatePayload)
                .eq('id', id)
                .select('*'); // 選取更新後的數據用於稽核日誌

            if (profileError) {
                console.error("更新帳號：Supabase profiles 表更新失敗", {
                    targetUserId: id,
                    profileUpdatePayload,
                    errorMessage: profileError.message,
                    originalError: profileError
                });
                return res.status(500).json({ error: profileError.message || '更新使用者資料失敗。' });
            }
            // 確保 oldData 在這裡用於稽核
            await recordAdminAuditLog(supabaseAdmin, adminUserId, {
                action_type: 'UPDATE',
                target_table: 'profiles',
                target_id: id,
                description: `更新帳號: ${email || oldData?.email || id}`,
                old_value: oldData || null, // 使用獲取的舊資料
                new_value: updatedProfileData ? updatedProfileData[0] : null // 使用更新後的資料
            });
        } else {
            // 如果沒有 profile 相關的數據更新，但有 auth 數據更新，也要記錄日誌
            if (Object.keys(authUpdatePayload).length > 0) {
                await recordAdminAuditLog(supabaseAdmin, adminUserId, {
                    action_type: 'UPDATE',
                    target_table: 'auth.users', // 或 profiles，取決於您希望如何記錄
                    target_id: id,
                    description: `更新帳號認證資訊: ${email || oldData?.email || id}`,
                    old_value: oldData ? { email: oldData.email, password_set: oldData.password_set } : null, // 示例，不洩漏舊密碼
                    new_value: { email: email, password_set: !!password } // 示例
                });
            }
        }


        res.status(200).json({ success: true, message: '帳號更新成功。' });

    } catch (error) {
        console.error("更新帳號 handler 發生未預期錯誤:", error);
        res.status(500).json({ error: error.message || '更新過程中發生未知錯誤。' });
    }
}
