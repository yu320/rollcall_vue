// src/services/supabase.js

import { createClient } from '@supabase/supabase-js';

// 從 Vite 的環境變數中讀取 Supabase 的設定
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 初始化 Supabase 客戶端並將其「具名導出」
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
