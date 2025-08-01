// src/services/api/accounts.js (帳號管理相關)
import { supabase } from '../supabase';
import { getAdminUserId } from './helpers';

export async function createAccount(accountData) {
    const adminUserId = await getAdminUserId();
    const response = await fetch('/api/create-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-User-Id': adminUserId },
        body: JSON.stringify(accountData)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    return result;
}

export async function batchCreateAccounts(accounts) {
    const results = [];
    for (const account of accounts) {
        try {
            const result = await createAccount(account);
            results.push({ ...result, success: true });
        } catch (error) {
            results.push({ email: account.email, success: false, error: error.message });
        }
    }
    return results;
}

export async function updateAccount(accountData) {
    const adminUserId = await getAdminUserId();
    const response = await fetch('/api/update-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-User-Id': adminUserId },
        body: JSON.stringify(accountData)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    return result;
}

export async function deleteAccounts(ids) {
    const adminUserId = await getAdminUserId();
    const response = await fetch('/api/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-User-Id': adminUserId },
        body: JSON.stringify({ ids })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || result.message);
    return result;
}

export async function fetchAllAccounts() {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, email, nickname, roles(id, name)')
        .order('email', { ascending: true });
    if (error) throw error;
    return data;
}

export async function batchUpdateAccounts(accountsToUpdate) {
    const results = [];
    for (const account of accountsToUpdate) {
        try {
            const result = await updateAccount(account);
            results.push({ ...result, success: true, email: account.email });
        } catch (error) {
            results.push({ id: account.id, success: false, error: error.message, email: account.email });
        }
    }
    return results;
}