// /api/get-supabase-config.js
// 這是一個 Vercel Serverless Function，用於安全地將 Supabase 設定提供給前端。

export default function handler(req, res) {
  // 檢查是否已在 Vercel 環境變數中設定了必要的金鑰
  if (process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY) {
    // 如果金鑰存在，則將它們作為 JSON 物件回傳
    res.status(200).json({
      supabaseUrl: process.env.VITE_SUPABASE_URL,
      supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY,
    });
  } else {
    // 如果缺少任何一個金鑰，則回傳 500 伺服器錯誤
    res.status(500).json({
      error: '伺服器設定錯誤：Supabase URL 或 Anon Key 未在伺服器環境變數中設定。',
    });
  }
}
