// /api/get-supabase-config.js
// 這是一個 Vercel Serverless Function，用於安全地提供 Supabase 的設定給前端。

// 這個函式處理來自前端的請求
module.exports = (req, res) => {
  // 在這裡添加日誌，查看環境變數是否被正確讀取
  console.log('--- Checking Supabase config in API ---');
  console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
  console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY);
  console.log('SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY); // 也檢查一下 Service Key
  console.log('------------------------------------');

  // 檢查是否已在 Vercel 環境變數中設定了必要的金鑰
  // 這是保護您金鑰的最佳實踐
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    // 如果金鑰存在，則將它們作為 JSON 物件回傳
    // 前端將會收到這個物件並用它來初始化 Supabase
    res.status(200).json({
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    });
  } else {
    // 如果缺少任何一個金鑰，則回傳 500 伺服器錯誤
    // 並附帶一條明確的錯誤訊息，提示開發者檢查 Vercel 的環境變數設定
    res.status(500).json({
      error: '伺服器設定錯誤：Supabase URL 或 Anon Key 未在伺服器環境變數中設定。',
    });
  }
};