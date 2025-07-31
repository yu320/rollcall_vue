// src/services/api/reports.js (報表與儀表板相關)
import { supabase } from '../supabase';

export async function getDashboardData(eventId) {
    const { data, error } = await supabase.rpc('get_event_dashboard_data', { p_event_id: eventId });
    if (error) throw error;
    return data;
}