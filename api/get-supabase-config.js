// /api/get-supabase-config.js
// 這是一個 Vercel Serverless Function，用於安全地將 Supabase 設定提供給前端。

export default function handler(req, res) {
  // 確保請求方法是 GET
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `請求方法 ${req.method} 不允許` });
  }

  // [修正] 後端環境變數不應使用 'VITE_' 前綴
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  // 檢查是否已在 Vercel 環境變數中設定了必要的金鑰
  if (supabaseUrl && supabaseAnonKey) {
    // 如果金鑰存在，則將它們作為 JSON 物件回傳
    res.status(200).json({
      supabaseUrl: supabaseUrl,
      supabaseAnonKey: supabaseAnonKey,
    });
  } else {
    // 如果缺少任何一個金鑰，則回傳 500 伺服器錯誤
    console.error('伺服器設定錯誤：Supabase URL 或 Anon Key 未在伺服器環境變數中設定。');
    res.status(500).json({
      error: '伺服器設定錯誤。',
    });
  }
}
