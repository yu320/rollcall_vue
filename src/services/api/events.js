// src/services/api/events.js 活動相關
import { supabase } from '../supabase';
import { recordAuditLog } from './helpers';

export async function fetchEvents() {
    const { data, error } = await supabase
        .from('events')
        .select(`
            *,
            profiles:created_by(nickname),
            event_participants(personnel_id)
        `)
        .order('start_time', { ascending: false });

    if (error) throw error;
    return data.map(event => ({
        ...event,
        profiles: event.profiles || { nickname: '未知' }
    }));
}

export async function fetchEventParticipants(eventId) {
    const { data, error } = await supabase
        .from('event_participants')
        .select('personnel(*)')
        .eq('event_id', eventId);
    if (error) throw error;
    return data.map(p => p.personnel);
}

export async function saveEvent(eventData, participantIds = []) {
    const { data, error } = await supabase.rpc('save_event_with_participants', {
        event_data: eventData,
        participant_ids: participantIds
    });

    if (error) throw error;

    const action = eventData.id ? 'UPDATE' : 'CREATE';
    const description = action === 'CREATE' ? `新增活動: ${eventData.name}` : `更新活動: ${eventData.name}`;

    recordAuditLog({
        action_type: action,
        target_table: 'events',
        target_id: data[0].id,
        description: description,
        new_value: { event: data[0], participants: participantIds }
    });
    
    return data[0];
}

export async function deleteEvent(id) {
    const { data: oldData } = await supabase.from('events').select('*').eq('id', id).single();
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) throw error;
    if (oldData) {
        recordAuditLog({
            action_type: 'DELETE',
            target_table: 'events',
            target_id: id,
            description: `刪除活動: ${oldData.name}`,
            old_value: oldData
        });
    }
}