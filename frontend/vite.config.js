import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    cssMinify: false // <-- คำสั่งสวรรค์ สั่งให้ Vercel ข้ามการบีบอัด CSS ที่มีปัญหา
  }
})