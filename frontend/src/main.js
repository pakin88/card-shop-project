import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import './style.css'
import App from './App.vue'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')

// เปิดไฟล์ frontend/src/main.js แล้วเพิ่มโค้ดชุดนี้ไว้ด้านล่างสุดของไฟล์
import axios from 'axios';

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    // ถ้าเซิร์ฟเวอร์แจ้งว่า 401 (Token หมดอายุหรือไม่ถูกต้อง) และไม่ได้อยู่หน้า login
    if (error.response && error.response.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      alert('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);