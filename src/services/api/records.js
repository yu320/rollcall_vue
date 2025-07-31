// src/services/api/records.js (簽到記錄相關)
import { supabase } from '../supabase';
import { recordAuditLog } from './helpers';

export async function processCheckIn(checkInData) {
  const { data, error } = await supabase.rpc('process_check_in', checkInData);
  if (error) throw error;
  return data;
}

export async function fetchRecordsByDate(date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const { data, error } = await supabase
        .from('check_in_records')
        .select('*, events(name)')
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString())
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
}

export async function fetchRecordsByEventId(eventId) {
    const { data, error } = await supabase
        .from('check_in_records')
        .select('*, events(name)')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
}

export async function fetchRecordsByDateRange(startDate, endDate) {
    let query = supabase.from('check_in_records').select('*, personnel(code, building, tags), events(name)').order('created_at', { ascending: false });
    if (startDate) query = query.gte('created_at', startDate.toISOString());
    if (endDate) query = query.lte('created_at', endDate.toISOString());
    const { data, error } = await query;
    if (error) throw error;
    return data;
}

export async function saveRecords(records) {
    const recordsToInsert = records.map(({ id, ...rest }) => rest);
    const { error } = await supabase.from('check_in_records').insert(recordsToInsert);
    if (error) throw error;
    recordAuditLog({ action_type: 'CREATE_BATCH', target_table: 'check_in_records', description: `批量新增 ${recordsToInsert.length} 筆報到記錄` });
}

export async function batchDeleteRecords(ids) {
    const { data: recordsToDelete } = await supabase.from('check_in_records').select('*').in('id', ids);
    const { error } = await supabase.from('check_in_records').delete().in('id', ids);
    if (error) throw error;
    if (recordsToDelete && recordsToDelete.length > 0) {
       recordAuditLog({ action_type: 'DELETE_BATCH', target_table: 'check_in_records', description: `批量刪除 ${recordsToDelete.length} 筆報到記錄`, old_value: recordsToDelete });
    }
}

export async function fetchRecentRecords(limit = 50, offset = 0) {
    const { data, error } = await supabase
        .from('check_in_records')
        .select('*, events(name)')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
    if (error) throw error;
    return data;
}

export async function fetchAllSavedDatesWithStats() {
    const { data, error } = await supabase.rpc('get_daily_record_stats');
    if (error) throw error;
    return data;
}

export async function importCheckinRecords(importData) {
    const { records, eventId, actionType, userDefinedTags } = importData;
    const { data, error } = await supabase.rpc('import_checkin_records_with_personnel_creation', { 
        records_to_import: records, 
        eventid: eventId, 
        actiontype: actionType,
        user_defined_tags: userDefinedTags
    });
    if (error) throw error;
    return data;
}