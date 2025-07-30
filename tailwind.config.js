/** @type {import('tailwindcss').Config} */
export default {
  // 設定要掃描的檔案路徑
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'custom-air-force-blue': '#598392',
        'custom-ash-gray': '#aec3b0',
        'custom-midnight-green': '#124559',
        'custom-rich-black': '#01161e',
        'custom-beige': '#eff6e0',
      },
    },
  },
  variants: {
    extend: {
      backgroundColor: ['group-hover'],
      textColor: ['group-hover'],
    },
  },
  plugins: [],
}
