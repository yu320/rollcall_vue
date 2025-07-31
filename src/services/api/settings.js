// src/services/api/settings.js 註冊設定
import { supabase } from '../supabase';

// --- System Settings ---

export async function fetchSettings() {
  const { data, error } = await supabase.from('settings').select('*');
  if (error) throw error;
  // 將陣列轉換為 key-value 物件
  return data.reduce((acc, setting) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {});
}

export async function updateSetting(key, value) {
  const { error } = await supabase.from('settings').upsert({ key, value });
  if (error) throw error;
}

// --- Registration Codes ---

export async function fetchRegistrationCodes() {
  const { data, error } = await supabase
    .from('registration_codes')
    .select('*, profiles(nickname)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createRegistrationCode(codeData) {
  const { data, error } = await supabase.from('registration_codes').insert(codeData).select().single();
  if (error) throw error;
  return data;
}

export async function updateRegistrationCode(id, codeData) {
  const { data, error } = await supabase.from('registration_codes').update(codeData).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteRegistrationCode(id) {
  const { error } = await supabase.from('registration_codes').delete().eq('id', id);
  if (error) throw error;
}