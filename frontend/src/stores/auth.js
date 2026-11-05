import { defineStore } from 'pinia';
import axios from 'axios';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: JSON.parse(localStorage.getItem('user')) || null,
    token: localStorage.getItem('token') || null,
  }),
  getters: {
    isLoggedIn: (state) => !!state.token,
    isAdmin: (state) => state.user?.role === 'admin'
  },
  actions: {
    async login(email, password) {
      try {
const res = await axios.post('https://card-shop-project.onrender.com/api/auth/login', { email, password });        this.token = res.data.token;
        this.user = res.data.user;
        // บันทึกลงเครื่อง เวลารีเฟรชจะได้ไม่หลุดล็อกอิน
        localStorage.setItem('token', this.token);
        localStorage.setItem('user', JSON.stringify(this.user));
        return { success: true };
      } catch (error) {
        return { success: false, message: error.response?.data?.message || 'เกิดข้อผิดพลาด' };
      }
    },
    logout() {
      this.user = null;
      this.token = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
    async register(userData) {
      try {
        // ยิงไปที่ URL ของ Render เลย เพราะตอนนี้ระบบเราออนไลน์แล้ว
        const response = await axios.post('https://card-shop-project.onrender.com/api/auth/register', userData);
        return { success: true, message: response.data.message };
      } catch (error) {
        return { success: false, message: error.response?.data?.message || 'สมัครสมาชิกไม่สำเร็จ' };
      }
    },
  }
});