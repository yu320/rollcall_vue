import { createClient } from '@supabase/supabase-js';

/**
 * 記錄 Serverless Function 中的稽核日誌。
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
        console.error('Server configuration error: SUPABASE_URL or SUPABASE_SERVICE_KEY not set.');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    const supabaseAdmin = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY,
        {
            db: {
                schema: 'public',
            },
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            }
        }
    );

    const { id, email, password, nickname, role_id: incomingRoleId } = req.body;
    const adminUserId = req.headers['x-admin-user-id'];

    if (!id) {
        return res.status(400).json({ error: '更新帳號需要使用者 ID。' });
    }
    if (!adminUserId) {
        return res.status(401).json({ error: '需要管理員使用者 ID。' });
    }

    try {
        const { data: adminProfile, error: adminProfileError } = await supabaseAdmin
            .from('profiles')
            .select('roles(name)')
            .eq('id', adminUserId)
            .single();

        const adminRoleName = adminProfile?.roles?.name;
        const isAdmin = adminRoleName === 'admin' || adminRoleName === 'superadmin';

        if (adminProfileError || !isAdmin) {
            console.warn("更新帳號：未授權或未指派管理員角色", { adminUserId, adminProfileError, adminProfile });
            return res.status(403).json({ error: '未授權的操作或未指派管理員角色。' });
        }

        const adminRole = adminRoleName;

        const { data: hasUpdateUsersPermission, error: rpcError } = await supabaseAdmin.rpc('user_has_permission', { p_user_id: adminUserId, p_permission_name: 'accounts:update_users' });
        
        if (rpcError) {
            console.error("更新帳號：RPC 權限檢查失敗", { adminUserId, rpcError });
            return res.status(500).json({ error: '權限檢查失敗。' });
        }

        if (adminRole === 'admin' && !hasUpdateUsersPermission) {
            console.warn("更新帳號：管理員無權限執行更新操作。", { adminUserId });
            return res.status(403).json({ error: '管理員帳號目前無權限執行更新操作。' });
        }
        if (adminRole !== 'superadmin' && !hasUpdateUsersPermission) {
            console.warn("更新帳號：非超級管理員且無更新權限。", { adminUserId });
            return res.status(403).json({ error: '未經授權：您沒有更新使用者帳號的權限。' });
        }

        const { data: targetUser, error: targetUserError } = await supabaseAdmin
            .from('profiles')
            .select('roles(name)')
            .eq('id', id)
            .single();

        if (targetUserError) {
            console.warn(`更新帳號：找不到目標使用者設定檔: ${targetUserError.message}`, { targetUserId: id });
        }
        
        if (adminRole === 'admin' && targetUser?.roles?.name === 'superadmin') {
            console.warn("更新帳號：管理員嘗試修改超級管理員帳號", { adminUserId, targetUserId: id });
            return res.status(403).json({ error: '管理員無法修改超級管理員帳號。' });
        }

        const { data: oldData, error: fetchOldDataError } = await supabaseAdmin
            .from('profiles')
            .select('*, roles(name)')
            .eq('id', id)
            .single();
        if (fetchOldDataError) {
            console.warn(`更新帳號：無法獲取用於稽核日誌的舊個人資料: ${fetchOldDataError.message}`, { targetUserId: id });
        }

        let emailChanged = false;
        const authUpdatePayload = {};
        if (email && email !== oldData?.email) {
            authUpdatePayload.email = email;
            emailChanged = true;
        }
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
                if (authError.message.includes('unique constraint') && authError.message.includes('users_email_key')) {
                    return res.status(409).json({ error: '此 Email 已被其他帳號使用。' });
                }
                if (authError.message.includes('User not found')) {
                    return res.status(404).json({ error: '目標使用者不存在。' });
                }
                return res.status(500).json({ error: authError.message || '更新認證資訊失敗。' });
            }
        }

        const profileUpdatePayload = {};
        if (nickname !== undefined) profileUpdatePayload.nickname = nickname;
        if (incomingRoleId !== undefined) profileUpdatePayload.role_id = incomingRoleId;
        if (emailChanged) profileUpdatePayload.email = email;


        if (Object.keys(profileUpdatePayload).length > 0) {
            const { data: updatedProfileData, error: profileError } = await supabaseAdmin
                .from('profiles')
                .update(profileUpdatePayload)
                .eq('id', id)
                .select('*, roles(name)');

            if (profileError) {
                console.error("更新帳號：Supabase profiles 表更新失敗", {
                    targetUserId: id,
                    profileUpdatePayload,
                    errorMessage: profileError.message,
                    originalError: profileError
                });
                return res.status(500).json({ error: profileError.message || '更新使用者資料失敗。' });
            }
            await recordAdminAuditLog(supabaseAdmin, adminUserId, {
                action_type: 'UPDATE',
                target_table: 'profiles',
                target_id: id,
                description: `更新帳號: ${email || oldData?.email || id} (角色: ${updatedProfileData?.[0]?.roles?.name || oldData?.roles?.name || '未知'})`,
                old_value: oldData || null,
                new_value: updatedProfileData ? updatedProfileData[0] : null
            });
        } else {
            if (Object.keys(authUpdatePayload).length > 0) {
                await recordAdminAuditLog(supabaseAdmin, adminUserId, {
                    action_type: 'UPDATE',
                    target_table: 'auth.users',
                    target_id: id,
                    description: `更新帳號認證資訊: ${email || oldData?.email || id}`,
                    old_value: oldData ? { email: oldData.email, password_set: oldData.password_set } : null,
                    new_value: { email: email, password_set: !!password }
                });
            }
        }


        res.status(200).json({ success: true, message: '帳號更新成功。' });

    } catch (error) {
        console.error("更新帳號 handler 發生未預期錯誤:", error);
        res.status(500).json({ error: error.message || '更新過程中發生未知錯誤。' });
    }
}
