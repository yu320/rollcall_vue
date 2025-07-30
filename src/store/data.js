import { supabase } from '@/services/supabase';

export default {
  namespaced: true,
  state: {
    // 將初始狀態從 null 改為空陣列 []，這是更安全的做法
    personnel: [],
    events: [],
    dailyRecords: [],
    activityRecords: [],
  },
  getters: {
    allPersonnel: (state) => state.personnel,
    allEvents: (state) => state.events,
    getPersonnelById: (state) => (id) => {
      // 確保 state.personnel 存在
      if (!state.personnel) return null;
      return state.personnel.find(p => p.id === id);
    },
    getEventById: (state) => (id) => {
      if (!state.events) return null;
      return state.events.find(e => e.id === id);
    }
  },
  mutations: {
    // 確保提交的永遠是陣列
    SET_PERSONNEL(state, personnel) {
      state.personnel = personnel || [];
    },
    SET_EVENTS(state, events) {
      state.events = events || [];
    },
    SET_DAILY_RECORDS(state, records) {
      state.dailyRecords = records || [];
    },
    SET_ACTIVITY_RECORDS(state, records) {
      state.activityRecords = records || [];
    }
  },
  actions: {
    // 獲取人員資料
    async fetchPersonnel({ commit, state }) {
      // 如果已有資料，則不重複獲取
      if (state.personnel && state.personnel.length > 0) {
        return;
      }
      try {
        const { data, error } = await supabase.from('personnel').select('*');
        if (error) throw error;
        commit('SET_PERSONNEL', data);
      } catch (error) {
        console.error('Error fetching personnel:', error.message);
        commit('SET_PERSONNEL', []); // 發生錯誤時，確保狀態是乾淨的空陣列
      }
    },
    // 獲取活動資料
    async fetchEvents({ commit, state }) {
      if (state.events && state.events.length > 0) {
        return;
      }
      try {
        const { data, error } = await supabase.from('events').select('*').order('start_time', { ascending: false });
        if (error) throw error;
        commit('SET_EVENTS', data);
      } catch (error) {
        console.error('Error fetching events:', error.message);
        commit('SET_EVENTS', []); // 發生錯誤時，確保狀態是乾淨的空陣列
      }
    },
  },
};
