<script setup>
import { useAuthStore } from './stores/auth';
import { useCartStore } from './stores/cart';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const cartStore = useCartStore();
const router = useRouter();

const handleLogout = () => {
  authStore.logout();
  router.push('/login');
};
</script>

<template>
  <div class="min-h-screen bg-base-200 text-base-content">
    <!-- Navbar -->
    <div class="navbar bg-base-100 shadow-md px-4 md:px-8 border-b border-base-300 flex-wrap justify-between">
      <div class="flex items-center">
        <router-link to="/" class="btn btn-ghost text-xl font-bold text-primary">
          Vanguard Shop
        </router-link>
      </div>

      <div class="flex items-center flex-wrap gap-2">
        <router-link to="/" class="btn btn-ghost btn-sm">หน้าแรก</router-link>

        <!-- ปุ่มตะกร้าสินค้า: ซ่อนถ้าเป็น Admin -->
        <router-link v-if="!authStore.isAdmin" to="/cart" class="btn btn-ghost btn-circle btn-sm mr-2">
          <div class="indicator">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span v-if="cartStore.totalItems > 0" class="badge badge-sm badge-primary indicator-item text-white">
              {{ cartStore.totalItems }}
            </span>
          </div>
        </router-link>

        <!-- กรณีล็อกอินแล้ว -->
        <template v-if="authStore.isLoggedIn">
          <!-- ปุ่มประวัติการสั่งซื้อ: แสดงเฉพาะลูกค้าทั่วไป (Admin ไม่เห็น) -->
          <router-link 
            v-if="!authStore.isAdmin" 
            to="/my-orders" 
            class="btn btn-ghost btn-sm"
          >
            ประวัติการสั่งซื้อ
          </router-link>

          <!-- ปุ่มสำหรับ Admin เท่านั้น -->
          <template v-if="authStore.isAdmin">
            <router-link to="/admin/orders" class="btn btn-warning btn-sm text-black font-bold">
              จัดการออเดอร์ (Admin)
            </router-link>
            <router-link to="/admin/products" class="btn btn-accent btn-sm text-black font-bold">
              จัดการสินค้า (Admin)
            </router-link>
          </template>

          <span class="text-sm font-semibold text-success px-2">
            {{ authStore.user?.username }}
          </span>

          <button @click="handleLogout" class="btn btn-outline btn-error btn-sm">
            ออกจากระบบ
          </button>
        </template>

        <!-- กรณียังไม่ได้ล็อกอิน -->
        <template v-else>
          <router-link to="/login" class="btn btn-primary btn-sm text-white">เข้าสู่ระบบ</router-link>
          <router-link to="/register" class="btn btn-outline btn-primary btn-sm">สมัครสมาชิก</router-link>
        </template>
      </div>
    </div>

    <!-- เนื้อหาของแต่ละหน้า -->
    <router-view />
  </div>
</template>