<template>
  <div class="container mx-auto px-4 py-8">
    <div class="bg-gradient-to-br from-custom-rich-black/90 to-custom-midnight-green/90 text-custom-beige rounded-xl shadow-lg p-8 md:p-12 text-center mb-8">
      <h1
        class="text-4xl md:text-5xl font-extrabold mb-4 cursor-pointer inline-block"
        @click="triggerWelcomeAnimation"
        :class="{ 'animate-wiggle': showWelcomeAnimation }"
      >
        歡迎使用報到管理系統 <span class="text-3xl">👋</span>
      </h1>
      <p class="text-xl md:text-2xl opacity-90">
        <span v-if="authStore.isLoggedIn">歡迎，{{ authStore.user?.nickname || '使用者' }}！</span>
        請選擇您要前往的功能頁面，開始您的工作。
      </p>
    </div>

    <div class="home-stars"></div>
    <div class="home-floating-element"></div>

    <div class="floating-snacks-container">
      <div
        v-for="snack in floatingSnacks"
        :key="snack.id"
        class="floating-snack"
        :style="{ top: snack.y, left: snack.x, animationDuration: snack.duration }"
        @click="triggerSnackEffect(snack)"
        :class="{ 'snack-clicked': snack.clicked }"
      >
        <component :is="snack.iconComponent" class="w-12 h-12 md:w-16 md:h-16" />
      </div>
    </div>

    <div class="meteor-shower-container">
      <div v-for="i in 5" :key="i" class="meteor" :style="{ animationDelay: `${i * 3}s` }"></div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
      <router-link to="/import/personnel" class="feature-card group" v-if="canView('personnel:create')">
        <div class="icon-wrapper bg-sky-200 group-hover:bg-sky-600 group-hover:text-white group-hover:animate-spin-hover">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-10 h-10 text-sky-800 group-hover:text-white">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4m-3 3h22"/>
          </svg>
        </div>
        <h2 class="card-title">人員資料匯入</h2>
        <p class="card-description">批次新增或更新人員資料，簡化數據管理。</p>
      </router-link>

      <router-link to="/import/checkin" class="feature-card group" v-if="canView('records:create')">
        <div class="icon-wrapper bg-amber-200 group-hover:bg-amber-600 group-hover:text-white group-hover:animate-wiggle-subtle">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-10 h-10 text-amber-800 group-hover:text-white">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 13h6M9 17h6M9 9h.01M12 16h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <h2 class="card-title">簽到記錄匯入</h2>
        <p class="card-description">從外部來源匯入簽到記錄，自動建立或更新。</p>
      </router-link>

      <router-link to="/checkin" class="feature-card group" v-if="canView('checkin:use')">
        <div class="icon-wrapper bg-emerald-200 group-hover:bg-emerald-600 group-hover:text-white group-hover:animate-spin-hover">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-10 h-10 text-emerald-800 group-hover:text-white">
            <rect x="3" y="5" width="18" height="14" rx="2" ry="2" stroke-linejoin="round"/>
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 10h8M8 14h4M9 18l3 3 6-6"/>
          </svg>
        </div>
        <h2 class="card-title">報到系統</h2>
        <p class="card-description">直觀的介面，支援學號/卡號輸入進行簽到與簽退。</p>
      </router-link>

      <router-link to="/overview" class="feature-card group" v-if="canView('overview:view')">
        <div class="icon-wrapper bg-blue-200 group-hover:bg-blue-600 group-hover:text-white group-hover:animate-wiggle-subtle">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-10 h-10 text-blue-800 group-hover:text-white">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 17h4v-6H3v6zM9 17h4v-10H9v10zM15 17h4v-4h-4v4z"/>
          </svg>
        </div>
        <h2 class="card-title">系統總覽</h2>
        <p class="card-description">提供人員、活動、簽到總數等統計數據與圖表。</p>
      </router-link>

      <router-link to="/dashboard" class="feature-card group" v-if="canView('reports:view')">
        <div class="icon-wrapper bg-violet-200 group-hover:bg-violet-600 group-hover:text-white group-hover:animate-spin-hover">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-10 h-10 text-violet-800 group-hover:text-white">
            <circle cx="12" cy="12" r="9" stroke-linejoin="round"/>
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6l4 2"/>
          </svg>
        </div>
        <h2 class="card-title">活動儀表板</h2>
        <p class="card-description">針對單一活動提供應到/實到人數、簽到時間線分析。</p>
      </router-link>

      <router-link to="/report" class="feature-card group" v-if="canView('reports:view')">
        <div class="icon-wrapper bg-orange-200 group-hover:bg-orange-600 group-hover:text-white group-hover:animate-wiggle-subtle">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-10 h-10 text-orange-800 group-hover:text-white">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6M9 16h6M9 8h6M7 20h10a2 2 0 002-2V6a2 2 0 00-2-2H7a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
        </div>
        <h2 class="card-title">活動報表分析</h2>
        <p class="card-description">提供基於日期範圍的活動參與、棟別、人員分析。</p>
      </router-link>

      <router-link
        to="/system/accounts"
        class="feature-card group"
        v-if="canViewAny(['accounts:manage_users', 'accounts:manage'])"
      >
        <div class="icon-wrapper bg-rose-200 group-hover:bg-rose-600 group-hover:text-white group-hover:animate-spin-hover">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-10 h-10 text-rose-800 group-hover:text-white">
            <circle cx="12" cy="12" r="3" stroke-linejoin="round"/>
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.4 15a1.7 1.7 0 00.33 2.03l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.7 1.7 0 00-2.03-.33 1.7 1.7 0 00-1 1.52V21a2 2 0 01-4 0v-.09a1.7 1.7 0 00-1-1.52 1.7 1.7 0 00-2.03.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.7 1.7 0 00.33-2.03 1.7 1.7 0 00-1.52-1H3a2 2 0 010-4h.09a1.7 1.7 0 001.52-1 1.7 1.7 0 00-.33-2.03l-.06-.06a2 2 0 012.83-2.83l.06.06a1.7 1.7 0 002.03.33h.01a1.7 1.7 0 001-1.52V3a2 2 0 014 0v.09a1.7 1.7 0 001 1.52z"/>
          </svg>
        </div>
        <h2 class="card-title">系統管理</h2>
        <p class="card-description">管理使用者帳號及角色權限分配。</p>
      </router-link>

      <router-link
        to="/personnel"
        class="feature-card group"
        v-if="canViewAny(['personnel:read', 'events:create', 'personnel:create', 'records:create'])"
      >
        <div class="icon-wrapper bg-teal-200 group-hover:bg-teal-600 group-hover:text-white group-hover:animate-spin-hover">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-10 h-10 text-teal-800 group-hover:text-white">
            <circle cx="12" cy="7" r="4" stroke-linejoin="round"/>
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 21v-2a4 4 0 018 0v2"/>
            <path stroke-linecap="round" stroke-linejoin="round" d="M18 21v-2a4 4 0 00-3-3.87"/>
          </svg>
        </div>
        <h2 class="card-title">資料管理</h2>
        <p class="card-description">管理人員、活動資料，並支援檔案匯入與記錄匯入。</p>
      </router-link>
    </div>

    <div class="text-center mt-12 text-gray-500 hidden-message">
      <p>
        這是一個隱藏的訊息：<span class="unselectable">「感謝您的使用，祝您工作順利！」</span>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useAuthStore } from '@/store/auth';

const authStore = useAuthStore();
const showWelcomeAnimation = ref(false);

const canView = (permission) => authStore.hasPermission(permission);
const canViewAny = (permissions) => permissions.some(permission => authStore.hasPermission(permission));

const triggerWelcomeAnimation = () => {
  showWelcomeAnimation.value = true;
  setTimeout(() => {
    showWelcomeAnimation.value = false;
  }, 1000); // 動畫時長
};

// --- 台灣小吃彩蛋數據與邏輯 ---
// 簡單的 SVG 組件，表示小吃
const BubbleTeaIcon = {
  template: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-pink-400">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
      <line x1="6" y1="6" x2="18" y2="6"></line>
      <path d="M12 18V8"></path>
      <circle cx="12" cy="15" r="2"></circle>
      <circle cx="9" cy="12" r="1.5"></circle>
      <circle cx="15" cy="11" r="1.5"></circle>
    </svg>
  `
};
const XiaoLongBaoIcon = {
  template: `
    <svg viewBox="0 0 24 24" fill="currentColor" class="text-green-500">
      <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"></path>
      <path d="M12 10a4 4 0 0 1 4 4c0 1.1-.9 2-2 2s-2-.9-2-2v-4zM12 10a4 4 0 0 0-4 4c0 1.1.9 2 2 2s2-.9 2-2v-4z"></path>
      <circle cx="12" cy="7" r="1" fill="#FFD166"></circle>
    </svg>
  `
};
const PineappleCakeIcon = {
  template: `
    <svg viewBox="0 0 24 24" fill="currentColor" class="text-yellow-600">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
      <circle cx="8" cy="8" r="1" fill="white"></circle>
      <circle cx="12" cy="12" r="1" fill="white"></circle>
      <circle cx="16" cy="16" r="1" fill="white"></circle>
      <circle cx="8" cy="16" r="1" fill="white"></circle>
      <circle cx="16" cy="8" r="1" fill="white"></circle>
    </svg>
  `
};

const floatingSnacks = ref([]);
let snackSpawnInterval;

const createSnack = () => {
  const snackTypes = [
    { component: BubbleTeaIcon, color: 'text-pink-400' },
    { component: XiaoLongBaoIcon, color: 'text-green-500' },
    { component: PineappleCakeIcon, color: 'text-yellow-600' },
  ];
  const randomSnackType = snackTypes[Math.floor(Math.random() * snackTypes.length)];

  return {
    id: Date.now() + Math.random(),
    iconComponent: randomSnackType.component,
    x: `${Math.random() * 90}%`,
    y: `${Math.random() * 90}%`,
    duration: `${Math.random() * 10 + 5}s`, // 5 to 15 seconds
    clicked: false,
  };
};

const triggerSnackEffect = (snack) => {
  snack.clicked = true;
  setTimeout(() => {
    snack.clicked = false;
  }, 300); // Reset click effect after 0.3s
  // 可以這裡增加音效或其他效果
};

onMounted(() => {
  // 輕量級創建背景星星 (模仿 NotFoundView)
  const createHomeStars = () => {
    const container = document.querySelector('.home-stars');
    if (!container) return;
    for (let i = 0; i < 50; i++) { // 減少星星數量避免過於密集
      const star = document.createElement('div');
      star.classList.add('home-star');
      star.style.left = `${Math.random() * 100}%`;
      star.style.top = `${Math.random() * 100}%`;
      const size = Math.random() * 2 + 0.5; // 0.5px 到 2.5px
      star.style.width = `${size}px`;
      star.style.height = `${size}px`;
      star.style.animationDelay = `${Math.random() * 5}s`;
      container.appendChild(star);
    }
  };
  createHomeStars();

  // 每隔一段時間生成新的漂浮小吃
  snackSpawnInterval = setInterval(() => {
    if (floatingSnacks.value.length < 5) { // 最多同時顯示5個
      floatingSnacks.value.push(createSnack());
    }
    // 移除舊的小吃，避免無限增加
    if (floatingSnacks.value.length > 10) {
      floatingSnacks.value.shift();
    }
  }, 3000); // 每3秒生成一個
});

</script>

<style scoped>
/* 自定義顏色變數 */
.bg-custom-rich-black { background-color: #01161e; }
.bg-custom-midnight-green { background-color: #124559; }
.bg-custom-air-force-blue { background-color: #598392; }
.bg-custom-ash-gray { background-color: #aec3b0; }
.text-custom-beige { color: #eff6e0; }
.text-custom-midnight-green { color: #124559; }

/* 功能卡片通用樣式 */
.feature-card {
  @apply relative overflow-hidden bg-white rounded-xl shadow-lg p-6 border border-gray-200 flex flex-col items-center text-center transition-transform duration-300 hover:shadow-2xl hover:-translate-y-1 hover:scale-105;
}

.feature-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #598392 0%, #aec3b0 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
  border-radius: 1rem;
  z-index: 0;
}

.feature-card:hover::before {
  opacity: 0.1;
}

.feature-card > * {
  position: relative;
  z-index: 10;
}

/* 圖示包裹器樣式 */
.icon-wrapper {
  @apply w-20 h-20 rounded-full flex items-center justify-center mb-4 transition-colors duration-300;
}

/* hover 動畫目標 */
.group:hover .icon-wrapper {
  /* @apply bg-custom-air-force-blue text-white;  這部分已經被個別設定覆蓋 */
}

.card-title {
  @apply text-2xl font-extrabold text-gray-900 mb-2;
}

.card-description {
  @apply text-base text-gray-700;
}

/* --- 新增的太空主題背景動畫 --- */
.home-stars {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  z-index: 0; /* 確保在內容之下 */
  pointer-events: none; /* 不會阻擋滑鼠事件 */
}

.home-star {
  position: absolute;
  background-color: rgba(255, 255, 255, 0.8);
  border-radius: 50%;
  opacity: 0;
  animation: twinkle-home 4s ease-in-out infinite;
  box-shadow: 0 0 4px rgba(255, 255, 255, 0.5);
}

@keyframes twinkle-home {
  0%, 100% { opacity: 0; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
}

.home-floating-element {
  position: absolute;
  width: 50px;
  height: 50px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  top: 10%;
  left: 5%;
  filter: blur(10px); /* 模糊效果 */
  animation: float-element 15s ease-in-out infinite alternate;
  z-index: 0;
  pointer-events: none;
}

@keyframes float-element {
  0% { transform: translate(0, 0) scale(1); opacity: 0.8; }
  25% { transform: translate(15vw, 5vh) scale(1.1); opacity: 0.6; }
  50% { transform: translate(30vw, 0) scale(0.9); opacity: 0.9; }
  75% { transform: translate(10vw, -8vh) scale(1.2); opacity: 0.7; }
  100% { transform: translate(0, 0) scale(1); opacity: 0.8; }
}

/* --- 圖示 hover 動畫 --- */
@keyframes spin-hover {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes wiggle-subtle {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-5deg); }
  50% { transform: rotate(5deg); }
  75% { transform: rotate(-5deg); }
}

.group-hover\:animate-spin-hover .icon-wrapper > svg {
  animation: spin-hover 0.5s linear infinite; /* 持續旋轉 */
}

.group-hover\:animate-wiggle-subtle .icon-wrapper > svg {
  animation: wiggle-subtle 0.5s ease-in-out infinite; /* 輕微搖擺 */
}

/* --- 歡迎標題彩蛋動畫 --- */
@keyframes wiggle {
  0%, 100% { transform: rotate(0deg); }
  20%, 60% { transform: rotate(-8deg); }
  40%, 80% { transform: rotate(8deg); }
}
.animate-wiggle {
  animation: wiggle 0.5s ease-in-out;
}

/* --- 漂浮的台灣小吃樣式 --- */
.floating-snacks-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none; /* 預設不阻擋下方事件 */
  overflow: hidden;
  z-index: 1; /* 在背景之上，內容之下 */
}

.floating-snack {
  position: absolute;
  pointer-events: auto; /* 讓小吃可點擊 */
  cursor: pointer;
  animation: float-snack linear infinite alternate;
  transition: transform 0.1s ease-out;
}

.floating-snack.snack-clicked {
  transform: scale(1.3);
}

@keyframes float-snack {
  0% { transform: translateY(0) rotate(0deg); }
  25% { transform: translateY(-10px) rotate(5deg); }
  50% { transform: translateY(0) rotate(0deg); }
  75% { transform: translateY(10px) rotate(-5deg); }
  100% { transform: translateY(0) rotate(0deg); }
}

/* --- 流星雨樣式 --- */
.meteor-shower-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: hidden;
  z-index: 0; /* 與星星同層或更低 */
}

.meteor {
  position: absolute;
  top: -10px; /* 從螢幕外開始 */
  right: -100px; /* 從螢幕右側外開始 */
  width: 2px;
  height: 2px;
  background: white;
  border-radius: 50%;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.4),
              0 0 0 2px rgba(255, 255, 255, 0.2),
              0 0 10px rgba(255, 255, 255, 0.8);
  animation: meteor-fall 10s linear infinite;
}

@keyframes meteor-fall {
  0% {
    transform: translate(0, 0) scale(1);
    opacity: 0;
  }
  10% {
    opacity: 1;
    transform: translate(-10vw, 10vh) scale(1.5);
  }
  20% {
    opacity: 0;
    transform: translate(-20vw, 20vh) scale(0.5);
  }
  100% {
    opacity: 0;
    transform: translate(-100vw, 100vh) scale(0);
  }
}

/* --- 隱藏文字樣式 --- */
.hidden-message {
  user-select: none; /* 防止直接選取 */
  -webkit-user-select: none; /* For Webkit browsers */
  -moz-user-select: none; /* For Firefox */
  -ms-user-select: none; /* For Internet Explorer/Edge */
  color: transparent; /* 預設文字透明 */
  text-shadow: 0 0 8px rgba(0,0,0,0.5); /* 模糊陰影模擬隱藏 */
  transition: color 0.3s ease, text-shadow 0.3s ease;
}

/* 當滑鼠選取文字時，顯示文字 */
.hidden-message::selection {
  background-color: transparent; /* 保持背景透明 */
  color: #eff6e0; /* 顯示文字顏色 */
  text-shadow: none; /* 移除陰影 */
}
/* For older browsers that don't support ::selection pseudo-element for custom text selection behavior */
.hidden-message:hover .unselectable {
  color: #eff6e0; /* 顯示文字顏色 */
  text-shadow: none; /* 移除陰影 */
}
</style>
