import { createClient } from '@supabase/supabase-js';

/**
 * In a Serverless Function, log an audit trail.
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
    if (error) console.error("Failed to record admin audit log:", error);
  } catch (err) {
    console.error("Error occurred while recording admin audit log:", err);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Request method ${req.method} not allowed` });
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('Server configuration error: SUPABASE_URL or SUPABASE_SERVICE_KEY not set in environment variables.');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    {
      db: {
        schema: 'public', // Explicitly specify the schema
      },
      auth: {
        autoRefreshToken: false, // Typically not needed in a serverless environment
        persistSession: false,   // Typically not needed in a serverless environment
      }
    }
  );

  let { email, password, role: roleName, nickname } = req.body;
  const adminUserId = req.headers['x-admin-user-id'];

  try {
    if (!adminUserId) {
      return res.status(401).json({ error: 'Admin user ID is required for this operation.' });
    }
    
    const { data: adminProfile, error: adminProfileError } = await supabaseAdmin
      .from('profiles')
      .select('roles(name)')
      .eq('id', adminUserId)
      .single();

    if (adminProfileError || !adminProfile?.roles?.name) {
        console.error("Account creation failed: Unauthorized or unassigned admin role", { adminUserId, adminProfileError });
        return res.status(403).json({ error: 'Unauthorized operation or unassigned admin role.' });
    }

    const adminRole = adminProfile.roles.name;

    // --- **CORE FIX 1:** Update permission check to 'accounts:manage_users' ---
    const { data: hasPermission, error: rpcError } = await supabaseAdmin.rpc('user_has_permission', { p_user_id: adminUserId, p_permission_name: 'accounts:manage_users' });
    
    if (rpcError) {
      console.error("Account creation failed: RPC permission check failed", { adminUserId, rpcError });
      return res.status(500).json({ error: 'Permission check failed.' });
    }

    if (adminRole !== 'superadmin' && !hasPermission) {
      console.warn("Account creation attempt by non-superadmin without permission.", { adminUserId });
      return res.status(403).json({ error: 'Unauthorized: You do not have permission to create user accounts.' });
    }
    
    if (adminRole === 'admin' && roleName === 'superadmin') {
        console.warn("Admin attempted to create a superadmin account.", { adminUserId });
        return res.status(403).json({ error: 'Admins cannot create superadmin accounts.' });
    }

    // --- **CORE FIX 2:** Pass user details in `app_metadata` for the trigger to use ---
    const { data: userData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm the email
      app_metadata: {
        source: 'admin_creation', // Mark this as an admin action
        role: roleName,           // Pass the role name
        nickname: nickname        // Pass the nickname
      }
    });

    if (signUpError) {
      if (signUpError.message.includes('User already registered')) {
        return res.status(409).json({ error: 'This email is already in use by another account.' });
      }
      return res.status(500).json({ error: signUpError.message || 'Failed to create authentication user.' });
    }

    // --- **CORE FIX 3:** Remove manual profile creation; the DB trigger now handles it ---
    
    await recordAdminAuditLog(supabaseAdmin, adminUserId, {
        action_type: 'CREATE',
        target_table: 'profiles',
        target_id: userData.user.id,
        description: `Created account: ${email} (Role: ${roleName})`,
        new_value: { id: userData.user.id, email, role: roleName, nickname }
    });

    res.status(200).json({ success: true, userId: userData.user.id });
  } catch (error) {
    console.error("An unexpected error occurred in the create-account handler:", error);
    res.status(500).json({ error: error.message || 'An unexpected error occurred' });
  }
}