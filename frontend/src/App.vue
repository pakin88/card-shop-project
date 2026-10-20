<script setup>
import { useAuthStore } from './stores/auth';
import { useCartStore } from './stores/cart';
import { useRouter, useRoute } from 'vue-router';

const authStore = useAuthStore();
const cartStore = useCartStore();
const router = useRouter();
const route = useRoute();

// หมวดหมู่ Format บน Navbar ฝั่งซ้าย
const vanguardFormats = [
  'แวนการ์ด D ไทย',
  'แวนการ์ด D JP',
  'แวนการ์ด Premium'
];

const selectFormat = (format) => {
  if (format) {
    router.push({ path: '/', query: { category: format } });
  } else {
    router.push({ path: '/' });
  }
};

const handleLogout = () => {
  authStore.logout();
  router.push('/login');
};
</script>

<template>
  <div class="min-h-screen flex flex-col bg-base-200 text-base-content">
    <!-- Navbar -->
    <div class="navbar bg-base-100 shadow-md px-4 md:px-8 border-b border-base-300 flex-wrap justify-between sticky top-0 z-40">
      
      <!-- ฝั่งซ้าย: โลโก้ร้าน + หมวดหมู่ Format แวนการ์ด -->
      <div class="flex items-center flex-wrap gap-1 md:gap-2">
        <button @click="selectFormat(null)" class="btn btn-ghost text-xl font-extrabold text-primary px-2">
           Vanguard Shop
        </button>

        <div class="divider divider-horizontal mx-0 hidden md:flex"></div>

        <!-- ปุ่มเลือก Format -->
        <button 
          @click="selectFormat(null)" 
          class="btn btn-xs sm:btn-sm"
          :class="!route.query.category && route.path === '/' ? 'btn-primary text-white' : 'btn-ghost'"
        >
          ทั้งหมด
        </button>

        <button 
          v-for="format in vanguardFormats" 
          :key="format"
          @click="selectFormat(format)"
          class="btn btn-xs sm:btn-sm"
          :class="route.query.category === format ? 'btn-primary text-white' : 'btn-ghost'"
        >
          {{ format }}
        </button>
      </div>

      <!-- ฝั่งขวา: เมนูผู้ใช้ / ตะกร้า / แอดมิน -->
      <div class="flex items-center flex-wrap gap-2 mt-2 sm:mt-0">
        <!-- ปุ่มตะกร้าสินค้า: ซ่อนถ้าเป็น Admin -->
        <router-link v-if="!authStore.isAdmin" to="/cart" class="btn btn-ghost btn-circle btn-sm mr-1">
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

    <!-- เนื้อหาของแต่ละหน้า (ดัน Footer ให้อยู่ล่างสุดเสมอด้วย flex-grow) -->
    <main class="flex-grow">
      <router-view />
    </main>

    <!-- Footer ด้านล่างสำหรับติดต่อเพจร้าน -->
    <footer class="bg-base-300 text-base-content border-t border-base-100 mt-16">
      <div class="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-3 gap-8">
        <!-- คอลัมน์ 1: เกี่ยวกับร้าน -->
        <div>
          <h3 class="text-xl font-extrabold text-primary mb-3">Vanguard Shop</h3>
          <p class="text-sm text-gray-400 leading-relaxed">
            ศูนย์รวมการ์ดไฟท์!! แวนการ์ด แยกใบและจัดเด็ค ทั้งฟอยล์ RRR, SP, SEC ครบทุก Format (D ไทย / D ญี่ปุ่น / Premium) การันตีการ์ดแท้ แพ็คดามการ์ดอย่างดีทุกออเดอร์
          </p>
        </div>

        <!-- คอลัมน์ 2: หมวดหมู่สินค้า -->
        <div>
          <h4 class="font-bold text-base mb-3">หมวดหมู่ Format การ์ด</h4>
          <ul class="space-y-2 text-sm text-gray-400">
            <li><button @click="selectFormat('แวนการ์ด D ไทย')" class="hover:text-primary transition-colors">• แวนการ์ด D ไทย (Vanguard D TH)</button></li>
            <li><button @click="selectFormat('แวนการ์ด D JP')" class="hover:text-primary transition-colors">• แวนการ์ด D JP (Vanguard D Japan)</button></li>
            <li><button @click="selectFormat('แวนการ์ด Premium')" class="hover:text-primary transition-colors">• แวนการ์ด Premium / V-Series</button></li>
          </ul>
        </div>

        <!-- คอลัมน์ 3: ช่องทางติดต่อเพจร้าน -->
        <div>
          <h4 class="font-bold text-base mb-3">ติดต่อเพจร้าน / สอบถาม</h4>
          <ul class="space-y-2 text-sm text-gray-400">
            <li class="flex items-center gap-2">
              <span class="badge badge-primary badge-sm text-white">FB</span>
              <a href="https://facebook.com" target="_blank" class="hover:text-primary underline">
                Facebook: Vanguard Card Shop Thailand
              </a>
            </li>
            <li class="flex items-center gap-2">
              <span class="badge badge-success badge-sm text-white">LINE</span>
              <span>Line Official: @vanguardshop</span>
            </li>
            <li class="flex items-center gap-2">
              <span class="badge badge-neutral badge-sm">โทร</span>
              <span>08X-XXX-XXXX (เปิดบริการทุกวัน 10:00 - 22:00 น.)</span>
            </li>
          </ul>
        </div>
      </div>

      <div class="bg-base-100 py-4 text-center text-xs text-gray-500 border-t border-base-200">
        © {{ new Date().getFullYear() }} Vanguard Shop Project. All rights reserved.
      </div>
    </footer>
  </div>
</template>