// src/services/api/roles.js  (角色與權限相關)
import { supabase } from '../supabase';
import { recordAuditLog } from './helpers';

export async function fetchAllRoles() {
    const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('name');
    if (error) throw error;
    return data;
}

export async function fetchPermissionsForRole(roleId) {
    const { data, error } = await supabase
        .from('role_permissions')
        .select('permission_id')
        .eq('role_id', roleId);
    if (error) throw error;
    return data;
}

export async function fetchAllRolesAndPermissions() {
    const { data, error } = await supabase
        .from('roles')
        .select(`id, name, description, role_permissions ( permissions (id, name, description) )`);
    if (error) throw error;
    return data;
}

export async function fetchAllPermissions() {
    const { data, error } = await supabase.from('permissions').select('*').order('name');
    if (error) throw error;
    return data;
}

export async function updatePermissionsForRole(roleId, permissionIds) {
    const { data: oldPerms } = await supabase.from('role_permissions').select('permission_id').eq('role_id', roleId);
    
    const { error: deleteError } = await supabase.from('role_permissions').delete().eq('role_id', roleId);
    if (deleteError) throw deleteError;

    if (permissionIds.length > 0) {
        const newLinks = permissionIds.map(pid => ({ role_id: roleId, permission_id: pid }));
        const { error: insertError } = await supabase.from('role_permissions').insert(newLinks);
        if (insertError) throw insertError;
    }
    
    recordAuditLog({
        action_type: 'UPDATE',
        target_table: 'role_permissions',
        target_id: roleId,
        description: `更新角色權限 (ID: ${roleId})`,
        old_value: oldPerms,
        new_value: permissionIds.map(id => ({ permission_id: id }))
    });
}