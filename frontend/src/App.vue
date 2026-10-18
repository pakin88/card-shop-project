<script setup>
import { useAuthStore } from './stores/auth';
import { useRouter } from 'vue-router';
import { useCartStore } from './stores/cart'; // <-- นำเข้า
const authStore = useAuthStore();
const router = useRouter();
const cartStore = useCartStore(); // <-- เรียกใช้งาน
const handleLogout = () => {
  authStore.logout();
  router.push('/login');
};
</script>

<template>
  <div class="min-h-screen bg-base-200">
    <!-- Navbar (DaisyUI) -->
    <div class="navbar bg-base-100 shadow-md px-4">
      <div class="flex-1">
        <router-link to="/" class="btn btn-ghost normal-case text-xl font-bold text-primary">Vanguard Shop</router-link>
      </div>
      <div class="flex-none space-x-2">
        <router-link to="/" class="btn btn-ghost">หน้าแรก</router-link>
        <router-link to="/cart" class="btn btn-ghost btn-circle">
          <div class="indicator">
            <!-- ไอคอนรถเข็น (SVG) -->
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <!-- แสดงตัวเลขจำนวนสินค้าถ้ามีมากกว่า 0 -->
            <span v-if="cartStore.totalItems > 0" class="badge badge-sm badge-secondary indicator-item">
              {{ cartStore.totalItems }}
            </span>
          </div>
        </router-link>
        <!-- แสดงปุ่มล็อกอินถ้ายังไม่เข้าระบบ -->
        <div v-if="!authStore.isLoggedIn" class="flex-none space-x-2">
          <router-link to="/register" class="btn btn-outline btn-primary btn-sm">สมัครสมาชิก</router-link>
          <router-link to="/login" class="btn btn-primary btn-sm text-white">เข้าสู่ระบบ</router-link>
        </div>

        <!-- แสดงชื่อและปุ่มออกจากระบบถ้าล็อกอินแล้ว -->
        <div v-else class="flex items-center space-x-4">
          <span class="font-semibold text-success">{{ authStore.user.username }}</span>
          <button @click="handleLogout" class="btn btn-error btn-sm">ออกจากระบบ</button>
          <!-- ปุ่มสำหรับ Admin เท่านั้น -->
           <router-link 
  v-if="authStore.isLoggedIn" 
  to="/my-orders" 
  class="btn btn-ghost btn-sm mr-2"
>
  ประวัติการสั่งซื้อ
</router-link>
          <router-link v-if="authStore.isAdmin" to="/admin/orders"
            class="btn btn-warning btn-sm text-black font-bold mr-2">
            จัดการออเดอร์ (Admin)
          </router-link>
        </div>
      </div>
    </div>

    <!-- ส่วนที่จะแสดงเนื้อหาของแต่ละหน้า (HomeView, LoginView) -->
    <main class="container mx-auto mt-6">
      <router-view></router-view>
    </main>
  </div>
</template>