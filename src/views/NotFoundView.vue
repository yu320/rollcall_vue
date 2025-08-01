<template>
  <div class="page-container" :style="pageStyle">
    <canvas ref="canvasEl" class="effects-canvas"></canvas>

    <div class="stars" id="stars-container" :class="{ 'lightspeed': easterEggs.lightspeed.active }"></div>
    
    <div class="ufo" :class="{ 'ufo-abducting': easterEggs.konami.activated }">
        <svg width="120" height="70" viewBox="0 0 120 70" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="60" cy="30" rx="40" ry="15" fill="#73D2DE"/>
            <ellipse cx="60" cy="30" rx="30" ry="10" fill="#118AB2"/>
            <path d="M40 30C40 30 50 40 60 40C70 40 80 30 80 30" stroke="#FFD166" stroke-width="2"/>
            <ellipse cx="60" cy="20" rx="20" ry="10" fill="#06D6A0"/>
            <circle cx="60" cy="20" r="5" fill="#FFD166"/>
        </svg>
        <div class="tractor-beam"></div>
    </div>

    <div class="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 text-center">
        <div 
          class="astronaut mb-6" 
          id="astronaut" 
          @click="handleAstronautClick"
          :class="{ 'barrel-roll': easterEggs.astronaut.isRolling }"
        >
            <svg width="150" height="150" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="#FFD166"/>
                <path d="M12 17C14.7614 17 17 14.7614 17 12C17 9.23858 14.7614 7 12 7C9.23858 7 7 9.23858 7 12C7 14.7614 9.23858 17 12 17Z" fill="#06D6A0"/>
                <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" fill="#118AB2"/>
            </svg>
        </div>
        
        <h1 class="error-text text-8xl font-bold text-white mb-2" :class="{ 'text-abducted': easterEggs.konami.activated }">404</h1>
        <h2 class="text-3xl font-semibold text-white mb-6">哎呀！頁面走丟了</h2>
        <p class="text-lg text-white max-w-md mb-8 bg-white/20 p-4 rounded-xl backdrop-blur-sm">
            看來您迷失在了宇宙的某個角落！別擔心，點擊下方按鈕返回安全區域。
            <br/>(偷偷告訴你：這裡藏著一些秘密...)
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
import { onMounted, onUnmounted, ref, reactive, computed } from 'vue';

// --- 彩蛋狀態管理 ---
const easterEggs = reactive({
    konami: {
        sequence: ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'],
        activated: false,
    },
    astronaut: {
        clicks: 0,
        isRolling: false,
    },
    lightspeed: {
        sequence: ['s', 'p', 'a', 'c', 'e'],
        active: false,
    },
    matrix: {
        sequence: ['m', 'a', 't', 'r', 'i', 'x'],
        exitSequence: ['e', 'x', 'i', 't'],
        normalSequence: ['n', 'o', 'r', 'm', 'a', 'l'],
        active: false,
    },
    color: {
        sequence: ['c', 'o', 'l', 'o', 'r'],
        themes: [
            'linear-gradient(135deg, #1e1e3f, #3c1e5a)', // 預設深空
            'linear-gradient(135deg, #FF6B6B, #FF8E53)', // 原始日落
            'linear-gradient(135deg, #09203F, #537895)', // 藍色深海
            'linear-gradient(135deg, #2E3192, #1BFFFF)', // 電子藍
            'linear-gradient(135deg, #c0392b, #8e44ad)', // 紫紅星雲
        ],
        currentIndex: 0,
    }
});
const keySequence = ref([]);

// --- Canvas 相關 ---
const canvasEl = ref(null);
let ctx = null;
let particles = [];
let animationFrameId;
let matrixColumns = [];

// --- 背景樣式 ---
const pageStyle = computed(() => ({
    background: easterEggs.color.themes[easterEggs.color.currentIndex],
}));


// --- 事件處理 ---

// 鍵盤輸入處理
const handleKeyDown = (e) => {
    const key = e.key.toLowerCase();
    keySequence.value.push(key);
    // 保持序列長度，避免無限增長
    if (keySequence.value.length > 10) {
        keySequence.value.shift();
    }
    
    const currentSequence = keySequence.value.join('');

    // 檢查 Konami Code
    if (currentSequence.endsWith(easterEggs.konami.sequence.join(''))) {
        easterEggs.konami.activated = true;
        keySequence.value = []; // 重置序列
    }
    // 檢查光速
    if (currentSequence.endsWith(easterEggs.lightspeed.sequence.join(''))) {
        easterEggs.lightspeed.active = true;
        setTimeout(() => easterEggs.lightspeed.active = false, 1000);
        keySequence.value = [];
    }
    // 檢查 Matrix 啟動
    if (currentSequence.endsWith(easterEggs.matrix.sequence.join(''))) {
        easterEggs.matrix.active = true;
        keySequence.value = [];
    }
    // 檢查 Matrix 關閉
    if (currentSequence.endsWith(easterEggs.matrix.exitSequence.join('')) || currentSequence.endsWith(easterEggs.matrix.normalSequence.join(''))) {
        easterEggs.matrix.active = false;
        keySequence.value = [];
    }
    // 檢查顏色切換
    if (currentSequence.endsWith(easterEggs.color.sequence.join(''))) {
        easterEggs.color.currentIndex = (easterEggs.color.currentIndex + 1) % easterEggs.color.themes.length;
        keySequence.value = [];
    }
};

// 點擊太空人處理
const handleAstronautClick = () => {
    if (easterEggs.astronaut.isRolling) return;
    easterEggs.astronaut.clicks++;
    if (easterEggs.astronaut.clicks >= 10) {
        easterEggs.astronaut.isRolling = true;
        easterEggs.astronaut.clicks = 0;
        setTimeout(() => {
            easterEggs.astronaut.isRolling = false;
        }, 1000); // 動畫時長
    }
};

// 滑鼠移動處理
const handleMouseMove = (e) => {
    if (easterEggs.matrix.active) return; // Matrix 模式下不產生粒子
    for (let i = 0; i < 2; i++) {
        particles.push({
            x: e.clientX,
            y: e.clientY,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            life: 50,
            color: `hsl(${Math.random() * 60 + 180}, 100%, 75%)`
        });
    }
};


// --- 動畫與初始化 ---

// 動態創建星星
const createStars = () => {
  const container = document.getElementById('stars-container');
  if (!container) return;
  container.innerHTML = ''; // 清除舊的星星
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

// Canvas 動畫循環
const animateCanvas = () => {
    if (!ctx || !canvasEl.value) return;

    if (easterEggs.matrix.active) {
        // --- Matrix 繪圖邏輯 ---
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.fillRect(0, 0, canvasEl.value.width, canvasEl.value.height);
        ctx.fillStyle = '#0F0';
        ctx.font = '16px monospace';
        
        matrixColumns.forEach((y, index) => {
            const text = String.fromCharCode(0x30A0 + Math.random() * 96); // 片假名
            const x = index * 20;
            ctx.fillText(text, x, y);
            if (y > canvasEl.value.height && Math.random() > 0.975) {
                matrixColumns[index] = 0;
            } else {
                matrixColumns[index] = y + 20;
            }
        });
    } else {
        // --- 粒子繪圖邏輯 ---
        ctx.clearRect(0, 0, canvasEl.value.width, canvasEl.value.height);
        particles = particles.filter(p => p.life > 0);
        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(0, p.life / 25), 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life / 50;
            ctx.fill();
            ctx.globalAlpha = 1;
        });
    }
    
    animationFrameId = requestAnimationFrame(animateCanvas);
};

// 初始化 Canvas
const setupCanvas = () => {
    if (!canvasEl.value) return;
    ctx = canvasEl.value.getContext('2d');
    canvasEl.value.width = window.innerWidth;
    canvasEl.value.height = window.innerHeight;
    
    // 初始化 Matrix
    const columnCount = Math.floor(canvasEl.value.width / 20);
    matrixColumns = Array(columnCount).fill(1).map(() => Math.random() * canvasEl.value.height);
};

// --- 生命週期鉤子 ---
onMounted(() => {
  createStars();
  setupCanvas();
  animateCanvas();
  
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('resize', setupCanvas);

  // 彩蛋 7: 開發者控制台密語
  console.log(
    `%c
      .--.
     |o_o |
     |:_/ |
    //   \\ \\
   (|     | )
  /'\\_   _/\`\\
  \\___)=(___/
    
    你發現了我們的秘密發射台！
    試試輸入 'space', 'matrix', 'color' 或是... 你知道那個經典密技嗎？`,
    "font-family:monospace; color: #06D6A0;"
  );
});

onUnmounted(() => {
    cancelAnimationFrame(animationFrameId);
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('resize', setupCanvas);
    // Reset any persistent effects when component is unmounted
    easterEggs.konami.activated = false;
    easterEggs.lightspeed.active = false;
    easterEggs.matrix.active = false;
    easterEggs.color.currentIndex = 0; // Reset to default color
    easterEggs.astronaut.isRolling = false;
    easterEggs.astronaut.clicks = 0;
});

</script>

<style scoped>
/* 基礎樣式 */
.page-container {
    font-family: 'Noto Sans TC', sans-serif;
    min-height: 100vh;
    overflow: hidden;
    position: relative;
    transition: background 1s ease-in-out;
}

.effects-canvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1;
    pointer-events: none;
}

.astronaut {
    animation: float 6s ease-in-out infinite;
    cursor: pointer;
    z-index: 10;
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
    transition: transform 0.5s ease-out;
}

@keyframes twinkle {
    0% { opacity: 0; }
    50% { opacity: 1; }
    100% { opacity: 0; }
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
    100% { transform: translateY(0); } /* Ensure it ends at the start position */
}

.btn {
    transition: all 0.3s;
}

.btn:hover {
    transform: translateY(-5px);
}

/* --- 彩蛋動畫樣式 --- */

/* 1. Konami Code: UFO 綁架 */
.ufo-abducting {
    animation: ufo-abduction-path 4s ease-in-out forwards;
}
.tractor-beam {
    position: absolute; bottom: -150px; left: 50%;
    transform: translateX(-50%) perspective(200px) rotateX(45deg);
    width: 80px; height: 150px;
    background: linear-gradient(to bottom, rgba(115, 210, 222, 0.7), transparent);
    clip-path: polygon(20% 0, 80% 0, 100% 100%, 0% 100%);
    opacity: 0;
}
.ufo-abducting .tractor-beam {
    animation: beam-in 4s ease-in-out forwards;
}
.text-abducted {
    animation: text-abduction-path 4s ease-in-out forwards;
}
@keyframes ufo-abduction-path {
    0% { top: 15%; left: -150px; transform: translateX(0); }
    25% { top: calc(50% - 220px); left: 50%; transform: translateX(-50%); }
    75% { top: calc(50% - 220px); left: 50%; transform: translateX(-50%); }
    100% { top: -200px; left: 50%; transform: translateX(-50%); }
}
@keyframes beam-in {
    0% { opacity: 0; height: 0; bottom: 0; }
    25% { opacity: 0.7; height: 150px; bottom: -150px; }
    75% { opacity: 0.7; height: 150px; bottom: -150px; }
    100% { opacity: 0; height: 0; bottom: 0; }
}
@keyframes text-abduction-path {
    0% { transform: translateY(0) scale(1); opacity: 1; }
    25% { transform: translateY(0) scale(1); opacity: 1; }
    75% { transform: translateY(-180px) scale(0); opacity: 0.5; }
    100% { transform: translateY(-180px) scale(0); opacity: 0; }
}

/* 2. 點擊太空人: 桶滾 */
.barrel-roll {
    animation: do-a-barrel-roll 1s ease-in-out;
}
@keyframes do-a-barrel-roll {
    0% { transform: rotate(0) scale(1); }
    50% { transform: rotate(180deg) scale(1.2); }
    100% { transform: rotate(360deg) scale(1); }
}

/* 3. 光速飛行 */
.lightspeed .star {
    transform: translateX(-2000px); /* 將星星拉長 */
    animation-play-state: paused; /* 暫停閃爍 */
    background: linear-gradient(to left, white, transparent);
    width: 100px !important; /* 覆蓋原有寬度 */
    height: 1px !important; /* 覆蓋原有高度 */
}

</style>
