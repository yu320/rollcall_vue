# 報到管理系統 (Vue.js)

一個基於 Vue.js 3、Pinia 和 Supabase 構建的全面性報到管理系統，旨在提供高效的簽到/簽退、人員與活動管理、數據分析和基於角色的存取控制 (RBAC) 功能。

## ✨ 主要功能

* **使用者認證**：提供安全的登入與登出流程。
* **角色基礎的存取控制 (RBAC)**：支援多種使用者角色（如管理員、宿委會、操作員、宿服），並根據角色精細控制頁面和功能權限。
* **人員管理**：增、刪、改、查人員資料，並支援從 CSV 檔案批次匯入人員。
* **活動管理**：建立、編輯、刪除活動，並設定活動的起訖時間。
* **報到/簽退系統**：直觀的介面，支援學號/卡號輸入進行簽到與簽退，並暫存今日記錄。
* **記錄檢視**：提供每日報到記錄和活動報到記錄的詳細檢視，支援篩選與匯出。
* **數據匯入**：除了人員資料匯入，也支援從 CSV 檔案匯入簽到/簽退記錄。
* **儀錶板與報表**：
    * **系統總覽**：提供人員總數、活動數、簽到/簽退人次及平均參與率等統計數據，並透過圖表展示操作狀態分佈和近期活動趨勢。
    * **活動儀錶板**：針對單一活動提供應到/實到人數、簽到時間線和狀態分佈等詳細分析。
    * **活動報表分析**：提供基於日期範圍的活動參與、棟別活動和人員活動參與報表，並支援匯出 Excel。
* **帳號管理**：管理員可以增、刪、改使用者帳號，設定電子郵件、暱稱和角色，並支援批次匯入帳號。
* **權限管理**：動態指派不同權限給各個角色。
* **稽核日誌**：記錄重要的管理操作，便於追蹤和安全性審計。
* **響應式設計**：優化在不同裝置上的顯示與操作體驗。
* **404 頁面**：自訂動態效果的 404 錯誤頁面。

## 📁 專案結構
```


uivue/
├── public/                     # 靜態資源，如 favicon、圖片
│   ├── favicon.ico
│   └── images/
│       └── logo.jpg
├── src/                        # 主要應用程式原始碼
│   ├── api/                    # (此處為前端對接後端 API 的抽象層，實際檔案不存在，而是透過 api.js 實現)
│   ├── assets/                 # 靜態檔案與樣式
│   │   └── styles/             # 全域 CSS 樣式 (tailwind.css, main.css)
│   ├── components/             # 可重用 UI 元件 (AppHeader, AppNav, LoadingOverlay, MessageBox, Modal)
│   ├── router/                 # Vue Router 配置 (index.js)
│   ├── services/               # 服務層，如 Supabase 客戶端初始化 (supabase.js) 及 API 呼叫 (api.js)
│   ├── store/                  # Pinia 狀態管理模組 (auth.js, data.js, ui.js)
│   ├── utils/                  # 通用工具函數 (index.js)
│   ├── views/                  # 應用程式主要頁面元件
│   │   ├── DataImport/         # 資料匯入相關頁面 (CheckInImport, PersonnelImport)
│   │   ├── Records/            # 記錄檢視相關頁面 (ActivityRecords, DailyRecords)
│   │   ├── System/             # 系統設定相關頁面 (AccountManagement, Permissions)
│   │   ├── CheckIn.vue
│   │   ├── Dashboard.vue
│   │   ├── Events.vue
│   │   ├── Login.vue
│   │   ├── NotFoundView.vue
│   │   ├── Overview.vue
│   │   ├── Personnel.vue
│   │   └── Report.vue
│   ├── App.vue                 # 根 Vue 元件
│   └── main.js                 # 應用程式入口點
├── api/                        # Vercel Serverless Functions 程式碼 (後端 API)
│   ├── create-account.js
│   ├── delete-account.js
│   ├── get-supabase-config.js
│   └── update-account.js
├── SQL.md                      # 資料庫結構與 RBAC 權限系統的 SQL 腳本
├── index.html                  # 應用程式的 HTML 模板
├── package.json                # 專案依賴與腳本定義
└── vite.config.js              # Vite 配置檔案

```

## 🛠️ 技術棧

* **前端框架**：[Vue.js 3](https://vuejs.org/)
* **狀態管理**：[Pinia](https://pinia.vuejs.org/)
* **路由管理**：[Vue Router 4](https://router.vuejs.org/)
* **樣式框架**：[Tailwind CSS](https://tailwindcss.com/)
* **圖表庫**：[Chart.js](https://www.chartjs.org/) 搭配 `chartjs-adapter-date-fns` 和 `date-fns`
* **後端服務**：[Supabase](https://supabase.com/) (PostgreSQL 資料庫, 認證服務 Auth, Edge Functions)
* **開發與建置工具**：[Vite](https://vitejs.dev/)
* **Serverless Functions**：部署在 [Vercel](https://vercel.com/) (用於處理 Supabase 的管理員級別操作，如帳號建立/刪除/更新)

## 📁 專案結構