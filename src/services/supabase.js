// src/services/supabase.js
/**
 * Supabase 客戶端初始化模組
 *
 * 職責:
 * - 讀取環境變數中的 Supabase URL 和 Anon Key。
 * - 建立並導出一個單例 (Singleton) 的 Supabase 客戶端實例。
 * - 整個應用程式都將透過這個實例與 Supabase 進行通訊。
 */
import { createClient } from '@supabase/supabase-js';

// 從 Vite 的環境變數中獲取 Supabase 的設定
// 變數名稱必須以 VITE_ 開頭才能在前端被讀取
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 檢查環境變數是否存在，如果缺少則在開發者控制台報錯
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL 或 Anon Key 未在 .env.local 檔案中設定。");
}

// 建立並導出 Supabase 客戶端
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
