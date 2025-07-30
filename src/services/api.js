import { supabase } from './supabase';
import { getStartOfToday, getEndOfToday } from '@/utils';

// --- Personnel ---
export const getAllPersonnel = async () => {
  const { data, error } = await supabase
    .from('personnel')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return data;
};

export const getPersonnelById = async (id) => {
  const { data, error } = await supabase
    .from('personnel')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
};

export const addPersonnel = async (person) => {
  const { data, error } = await supabase
    .from('personnel')
    .insert(person)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updatePersonnel = async (id, updates) => {
  const { data, error } = await supabase
    .from('personnel')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deletePersonnel = async (id) => {
  const { error } = await supabase.from('personnel').delete().eq('id', id);
  if (error) throw error;
};

export const bulkInsertPersonnel = async (personnel) => {
    const { data, error } = await supabase
        .from('personnel')
        .insert(personnel)
        .select();
    if (error) {
        console.error("Supabase bulk insert error:", error);
        throw error;
    }
    return data;
};

// --- Events ---
export const getEvents = async () => {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('start_time', { ascending: false });
  if (error) throw error;
  return data;
};

export const getEventById = async (id) => {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
};

export const addEvent = async (event) => {
  const { data, error } = await supabase
    .from('events')
    .insert(event)
    .select('*')
    .single();
  if (error) throw error;
  return data;
};

export const updateEvent = async (id, updates) => {
  const { data, error } = await supabase
    .from('events')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
};

export const deleteEvent = async (id) => {
  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) throw error;
};

// --- CheckIn Records ---
export const addCheckInRecord = async (record) => {
  const { data, error } = await supabase
    .from('checkin_records')
    .insert(record)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const getDailyRecords = async () => {
    const { data, error } = await supabase
        .from('checkin_records')
        .select(`
            *,
            personnel (name, code, card_number),
            events (name)
        `)
        .gte('timestamp', getStartOfToday())
        .lte('timestamp', getEndOfToday())
        .order('timestamp', { ascending: false });

    if (error) throw error;
    return data;
};

export const getActivityRecords = async (eventId) => {
    const { data, error } = await supabase
        .from('checkin_records')
        .select(`
            *,
            personnel (name, code, card_number)
        `)
        .eq('event_id', eventId)
        .order('timestamp', { ascending: false });
    if (error) throw error;
    return data;
};

export const saveRecords = async (records) => {
    const { data, error } = await supabase
        .from('checkin_records')
        .insert(records)
        .select();

    if (error) {
        console.error('Error saving records:', error);
        throw error;
    }
    return data;
};


// --- Settings ---
export const getSettings = async () => {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('id', 1)
    .single();
  
  if (error && error.code === 'PGRST116') {
    // No settings row found, return default
    return { id: 1, current_event_id: null };
  }
  if (error) throw error;
  return data;
};

export const updateSettings = async (settings) => {
    const { data, error } = await supabase
        .from('settings')
        .upsert({ ...settings, id: 1 })
        .select()
        .single();

    if (error) {
        console.error('Error updating settings:', error);
        throw error;
    }
    return data;
};
