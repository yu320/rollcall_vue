// src/router/index.js

import { createRouter, createWebHashHistory } from 'vue-router';
import { useAuthStore } from '@/store/auth';

// --- 路由元件引入 ---
// 使用動態引入 (Lazy Loading) 可以優化初始載入速度
const Login = () => import('@/views/Login.vue');
const Overview = () => import('@/views/Overview.vue');
const CheckIn = () => import('@/views/CheckIn.vue');
const Dashboard = () => import('@/views/Dashboard.vue');
const Report = () => import('@/views/Report.vue');
const Personnel = () => import('@/views/Personnel.vue');
const Events = () => import('@/views/Events.vue');
const DailyRecords = () => import('@/views/Records/DailyRecords.vue');
const ActivityRecords = () => import('@/views/Records/ActivityRecords.vue');
const PersonnelImport = () => import('@/views/DataImport/PersonnelImport.vue');
const CheckInImport = () => import('@/views/DataImport/CheckInImport.vue');
const AccountManagement = () => import('@/views/System/AccountManagement.vue');
const Permissions = () => import('@/views/System/Permissions.vue');
// [NEW] 引入 404 頁面
const NotFound = () => import('@/views/NotFoundView.vue');

// --- 路由定義 ---
const routes = [
  { path: '/login', name: 'Login', component: Login, meta: { requiresAuth: false } },
  { path: '/', name: 'Overview', component: Overview, meta: { requiresAuth: true, permission: 'overview:view' } },
  { path: '/checkin', name: 'CheckIn', component: CheckIn, meta: { requiresAuth: true, permission: 'checkin:use' } },
  { path: '/dashboard', name: 'Dashboard', component: Dashboard, meta: { requiresAuth: true, permission: 'reports:view' } },
  { path: '/report', name: 'Report', component: Report, meta: { requiresAuth: true, permission: 'reports:view' } },
  { path: '/personnel', name: 'Personnel', component: Personnel, meta: { requiresAuth: true, permission: 'personnel:read' } },
  { path: '/events', name: 'Events', component: Events, meta: { requiresAuth: true, permission: 'events:create' } }, // 假設有 create 就有 read
  { path: '/records/daily', name: 'DailyRecords', component: DailyRecords, meta: { requiresAuth: true, permission: 'records:view' } },
  { path: '/records/activity', name: 'ActivityRecords', component: ActivityRecords, meta: { requiresAuth: true, permission: 'records:view' } },
  { path: '/import/personnel', name: 'PersonnelImport', component: PersonnelImport, meta: { requiresAuth: true, permission: 'personnel:create' } },
  { path: '/import/checkin', name: 'CheckInImport', component: CheckInImport, meta: { requiresAuth: true, permission: 'records:create' } },
  { path: '/system/accounts', name: 'AccountManagement', component: AccountManagement, meta: { requiresAuth: true, permission: 'accounts:manage' } },
  { path: '/system/permissions', name: 'Permissions', component: Permissions, meta: { requiresAuth: true, permission: 'accounts:manage' } },

  // [NEW] 萬用路由規則
  // 這條規則必須放在所有路由的最後面。
  // 它會匹配所有未被前面規則捕獲的路徑。
  { path: '/:pathMatch(.*)*', name: 'NotFound', component: NotFound },
];

// --- 建立 Router 實例 ---
const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

// --- 導航守衛 (Navigation Guard) ---
// 這是前端權限控制的核心。
// 在每次路由切換之前，都會執行此函式。
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();

  // 確保在檢查權限前，已經從 Supabase 獲取了使用者狀態
  if (!authStore.isInitialized) {
    await authStore.checkInitialAuth();
  }

  const isLoggedIn = authStore.isLoggedIn;
  const requiresAuth = to.meta.requiresAuth;
  const requiredPermission = to.meta.permission;

  if (requiresAuth && !isLoggedIn) {
    // 如果頁面需要登入但使用者未登入，導向到登入頁
    next({ name: 'Login' });
  } else if (isLoggedIn && to.name === 'Login') {
    // 如果使用者已登入，但嘗試訪問登入頁，將其導向到首頁
    next({ name: 'Overview' });
  } else if (requiresAuth && isLoggedIn && requiredPermission) {
    // 如果頁面需要特定權限
    if (authStore.hasPermission(requiredPermission)) {
      // 使用者有權限，允許進入
      next();
    } else {
      // 使用者沒有權限，顯示提示訊息並導向到首頁
      const { showMessage } = useUiStore();
      showMessage('您沒有權限訪問此頁面。', 'error');
      next({ name: 'Overview' });
    }
  } else {
    // 其他情況 (例如訪問不需權限的頁面)，直接放行
    next();
  }
});

export default router;
