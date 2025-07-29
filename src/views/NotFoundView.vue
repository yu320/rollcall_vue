<template>
  <div class="page-container">
    <!-- 背景星星 -->
    <div class="stars" id="stars-container"></div>
    
    <!-- 飛行的 UFO -->
    <div class="ufo">
        <svg width="120" height="70" viewBox="0 0 120 70" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="60" cy="30" rx="40" ry="15" fill="#73D2DE"/>
            <ellipse cx="60" cy="30" rx="30" ry="10" fill="#118AB2"/>
            <path d="M40 30C40 30 50 40 60 40C70 40 80 30 80 30" stroke="#FFD166" stroke-width="2"/>
            <ellipse cx="60" cy="20" rx="20" ry="10" fill="#06D6A0"/>
            <circle cx="60" cy="20" r="5" fill="#FFD166"/>
            <path d="M45 35L40 50" stroke="#73D2DE" stroke-width="2"/>
            <path d="M55 40L50 55" stroke="#73D2DE" stroke-width="2"/>
            <path d="M65 40L70 55" stroke="#73D2DE" stroke-width="2"/>
            <path d="M75 35L80 50" stroke="#73D2DE" stroke-width="2"/>
        </svg>
    </div>

    <!-- 主要內容 -->
    <div class="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 text-center">
        <!-- 太空人 -->
        <div class="astronaut mb-6" id="astronaut">
            <svg width="150" height="150" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="#FFD166"/>
                <path d="M12 17C14.7614 17 17 14.7614 17 12C17 9.23858 14.7614 7 12 7C9.23858 7 7 9.23858 7 12C7 14.7614 9.23858 17 12 17Z" fill="#06D6A0"/>
                <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" fill="#118AB2"/>
                <path d="M19 7L17 9" stroke="white" stroke-width="2" stroke-linecap="round"/>
                <path d="M5 7L7 9" stroke="white" stroke-width="2" stroke-linecap="round"/>
                <path d="M19 17L17 15" stroke="white" stroke-width="2" stroke-linecap="round"/>
                <path d="M5 17L7 15" stroke="white" stroke-width="2" stroke-linecap="round"/>
            </svg>
        </div>
        
        <h1 class="error-text text-8xl font-bold text-white mb-2">404</h1>
        <h2 class="text-3xl font-semibold text-white mb-6">哎呀！頁面走丟了</h2>
        <p class="text-lg text-white max-w-md mb-8 bg-white/20 p-4 rounded-xl backdrop-blur-sm">
            看來您迷失在了宇宙的某個角落！別擔心，點擊下方按鈕返回安全區域。
        </p>
        
        <div class="flex flex-col sm:flex-row gap-4">
            <router-link to="/" class="btn button-glow px-8 py-3 bg-white text-pink-500 rounded-full font-medium hover:bg-opacity-95 transition-all transform hover:scale-105 shadow-lg">
                返回首頁 🚀
            </router-link>
            <button @click="$router.back()" class="btn px-8 py-3 bg-transparent border-2 border-white text-white rounded-full font-medium hover:bg-white/10 transition-all transform hover:scale-105">
                返回上一頁 👈
            </button>
        </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';

// 動態創建星星的函式
const createStars = () => {
  const container = document.getElementById('stars-container');
  if (!container) return;
  const starCount = 100;
  for (let i = 0; i < starCount; i++) {
    const star = document.createElement('div');
    star.classList.add('star');
    
    const x = Math.random() * 100;
    const y = Math.random() * 100;
    const size = Math.random() * 3;
    const duration = 3 + Math.random() * 4;
    
    star.style.left = `${x}%`;
    star.style.top = `${y}%`;
    star.style.width = `${size}px`;
    star.style.height = `${size}px`;
    star.style.setProperty('--duration', `${duration}s`);
    star.style.animationDelay = `${Math.random() * duration}s`;
    
    container.appendChild(star);
  }
};

let meteorInterval;

// 動態創建流星的函式
const createMeteor = () => {
    const container = document.getElementById('stars-container');
    if (!container) return;
    const meteor = document.createElement('div');
    meteor.classList.add('meteor');
    
    const x = Math.random() * 100;
    meteor.style.left = `${x}%`;
    meteor.style.top = '0';
    
    const travelX = 100 + Math.random() * 100;
    const travelY = 100 + Math.random() * 100;
    
    meteor.style.setProperty('--travel-x', `${travelX}px`);
    meteor.style.setProperty('--travel-y', `${travelY}px`);
    
    const duration = 1 + Math.random() * 2;
    meteor.style.animation = `meteor ${duration}s linear forwards`;
    
    container.appendChild(meteor);
    
    setTimeout(() => {
        meteor.remove();
    }, duration * 1000);
}

// 在元件掛載時，初始化背景動畫
onMounted(() => {
  createStars();
  createMeteor(); // 立即創建一顆
  meteorInterval = setInterval(createMeteor, 2000); // 每 2 秒創建一顆
});

// 在元件卸載時，清除計時器，避免記憶體洩漏
onUnmounted(() => {
    clearInterval(meteorInterval);
});

</script>

<style scoped>
/* 將 404demo.html 中的所有樣式複製到這裡 */
.page-container {
    font-family: 'Noto Sans TC', sans-serif;
    background: linear-gradient(135deg, #FF6B6B, #FF8E53);
    min-height: 100vh;
    overflow: hidden;
    position: relative;
}

.astronaut {
    animation: float 6s ease-in-out infinite;
    cursor: pointer;
}

@keyframes float {
    0% { transform: translateY(0px); }
    50% { transform: translateY(-20px); }
    100% { transform: translateY(0px); }
}

.stars {
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    z-index: 0;
}

.star {
    position: absolute;
    background-color: white;
    border-radius: 50%;
    animation: twinkle var(--duration) ease-in-out infinite;
    opacity: 0;
}

@keyframes twinkle {
    0% { opacity: 0; }
    50% { opacity: 1; }
    100% { opacity: 0; }
}

.meteor {
    position: absolute;
    width: 2px;
    height: 2px;
    background: white;
    border-radius: 50%;
    box-shadow: 0 0 10px 2px white;
    opacity: 0;
}

.meteor::before {
    content: "";
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 50px;
    height: 1px;
    background: linear-gradient(90deg, white, transparent);
    transform-origin: left;
}
        
@keyframes meteor {
    0% {
        opacity: 1;
        transform: translate(0, 0) rotate(-45deg) scale(0);
    }
    
    20% {
        opacity: 1;
    }
    
    60% {
        opacity: 0;
    }
    
    100% {
        transform: translate(var(--travel-x), var(--travel-y)) rotate(-45deg) scale(1);
        opacity: 0;
    }
}

.button-glow {
    animation: button-pulse 2s infinite;
}

@keyframes button-pulse {
    0% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.7); }
    70% { box-shadow: 0 0 0 15px rgba(255, 255, 255, 0); }
    100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
}

.ufo {
    position: absolute;
    animation: ufo-move 20s linear infinite;
    z-index: 5;
    top: 15%;
    left: -150px;
}

@keyframes ufo-move {
    0% { transform: translateX(0) translateY(0); left: -150px; }
    20% { transform: translateX(20vw) translateY(30px); }
    40% { transform: translateX(40vw) translateY(-20px); }
    60% { transform: translateX(60vw) translateY(10px); }
    80% { transform: translateX(80vw) translateY(-15px); }
    100% { transform: translateX(100vw) translateY(0); left: calc(100% + 150px); }
}

.error-text {
    animation: bounce 2s ease infinite;
    text-shadow: 3px 3px 0 #FF8E53;
}

@keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-20px); }
}

.btn {
    transition: all 0.3s;
}

.btn:hover {
    transform: translateY(-5px);
}
</style>
