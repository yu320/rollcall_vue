// src/services/api/personnel.js
import { supabase } from '../supabase';
import { recordAuditLog } from './helpers';
import { BATCH_SIZE } from '@/utils/constants';

export async function fetchAllPersonnel() {
    const { data, error } = await supabase.from('personnel').select('*').order('name', { ascending: true });
    if (error) throw error;
    return data;
}

export async function upsertPersonnel(personnelData) {
    let successCount = 0;
    let updateCount = 0;
    const errors = [];

    const { data: existingPersonnel, error: fetchExistingError } = await supabase.from('personnel').select('code, card_number, id');
    if (fetchExistingError) throw fetchExistingError;

    const existingCodes = new Set(existingPersonnel.map(p => p.code));
    const existingCardNumbers = new Set(existingPersonnel.map(p => p.card_number));
    const existingPersonnelMap = new Map(existingPersonnel.map(p => [p.code, p]));

    const inserts = personnelData.filter(p => !existingCodes.has(p.code) && !existingCardNumbers.has(p.card_number));
    const updates = personnelData.filter(p => existingCodes.has(p.code) || existingCardNumbers.has(p.card_number));

    for (let i = 0; i < inserts.length; i += BATCH_SIZE) {
        const chunk = inserts.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from('personnel').insert(chunk);
        if (error) {
            chunk.forEach(item => errors.push(`插入失敗 (${item.name}, ${item.code}): ${error.message}`));
        } else {
            successCount += chunk.length;
        }
    }

    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
        const chunk = updates.slice(i, i + BATCH_SIZE);
        const updatePromises = chunk.map(async (item) => {
            const existingPerson = existingPersonnelMap.get(item.code) || existingPersonnel.find(p => p.card_number === item.card_number);
            if (existingPerson) {
                const { error } = await supabase.from('personnel').update(item).eq('id', existingPerson.id);
                if (error) {
                    errors.push(`更新失敗 (${item.name}, ${item.code}): ${error.message}`);
                } else {
                    updateCount++;
                }
            } else {
                errors.push(`更新失敗 (找不到對應人員 ${item.name}, ${item.code}): 無法找到對應 ID`);
            }
        });
        await Promise.all(updatePromises);
    }
    
    recordAuditLog({ 
        action_type: 'UPSERT', 
        target_table: 'personnel', 
        description: `批量匯入/更新人員：新增 ${successCount} 筆，更新 ${updateCount} 筆，失敗 ${errors.length} 筆。`,
        new_value: { successCount, updateCount, errors }
    });

    return { successCount, updateCount, errors };
}

export async function createPersonnel(personData) {
    const { data, error } = await supabase.from('personnel').insert(personData).select().single();
    if (error) throw error;
    recordAuditLog({ action_type: 'CREATE', target_table: 'personnel', target_id: data.id, description: `新增人員: ${data.name}`, new_value: data });
    return data;
}

export async function updatePersonnel(id, personData) {
    const { data: oldData } = await supabase.from('personnel').select('*').eq('id', id).single();
    const { data, error } = await supabase.from('personnel').update(personData).eq('id', id).select().single();
    if (error) throw error;
    recordAuditLog({ action_type: 'UPDATE', target_table: 'personnel', target_id: data.id, description: `更新人員: ${data.name}`, old_value: oldData, new_value: data });
    return data;
}

export async function batchDeletePersonnel(ids) {
    const { data: oldData } = await supabase.from('personnel').select('*').in('id', ids);
    const { error } = await supabase.from('personnel').delete().in('id', ids);
    if (error) throw error;
    if (oldData) {
        recordAuditLog({ action_type: 'DELETE_BATCH', target_table: 'personnel', description: `批量刪除 ${oldData.length} 位人員`, old_value: oldData });
    }
}

export async function updatePersonnelTags(id, tags) {
    const { data: oldData } = await supabase.from('personnel').select('id, name, code, tags').eq('id', id).single();
    const { data, error } = await supabase
        .from('personnel')
        .update({ tags: tags, updated_at: new Date() })
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
     if (data) {
        recordAuditLog({
            action_type: 'UPDATE',
            target_table: 'personnel',
            target_id: data.id,
            description: `更新人員標籤: ${data.name} (學號: ${data.code})`,
            old_value: oldData ? { tags: oldData.tags } : null,
            new_value: { tags: data.tags }
        });
    }
    return data;
}