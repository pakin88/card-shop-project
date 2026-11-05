<script setup>
import { ref } from 'vue';
import { useAuthStore } from './stores/auth';
import { useCartStore } from './stores/cart';
import { useRouter, useRoute } from 'vue-router';

const authStore = useAuthStore();
const cartStore = useCartStore();
const router = useRouter();
const route = useRoute();

const isMobileMenuOpen = ref(false);

const vanguardFormats = [
  'แวนการ์ด D ไทย',
  'แวนการ์ด D JP',
  'แวนการ์ด Premium'
];

const goHome = () => {
  isMobileMenuOpen.value = false;
  window.location.href = '/'; 
};

const selectFormat = (format) => {
  isMobileMenuOpen.value = false;
  if (format) {
    router.push({ path: '/', query: { category: format } });
  } else {
    router.push({ path: '/' });
  }
};

const handleLogout = () => {
  isMobileMenuOpen.value = false;
  authStore.logout();
  router.push('/login');
};
</script>

<template>
  <div data-theme="light" class="min-h-screen flex flex-col bg-base-200 text-base-content relative overflow-x-hidden">
    
    <!-- แถบเมนูด้านข้าง (Sidebar) สำหรับมือถือ -->
    <!-- 1. Overlay สีดำโปร่งแสง (กดเพื่อปิดเมนู) -->
    <div 
      v-if="isMobileMenuOpen" 
      class="fixed inset-0 bg-black/50 z-50 lg:hidden transition-opacity"
      @click="isMobileMenuOpen = false"
    ></div>

    <!-- 2. ตัว Sidebar เลื่อนจากซ้าย -->
    <div 
      class="fixed top-0 left-0 h-full w-4/5 max-w-[300px] bg-base-100 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out lg:hidden flex flex-col"
      :class="isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <!-- หัวเมนู -->
      <div class="p-4 border-b border-base-200 flex justify-between items-center bg-primary text-white">
        <span class="font-extrabold text-lg">Vanguard Shop</span>
        <button @click="isMobileMenuOpen = false" class="btn btn-ghost btn-sm btn-circle text-white">✕</button>
      </div>

      <!-- เนื้อหาในเมนู (เลื่อนได้ถ้าจอยาวไม่พอ) -->
      <div class="p-4 flex-1 overflow-y-auto flex flex-col gap-4">
        
        <!-- ส่วนข้อมูลบัญชี หรือ ปุ่ม Login/Register -->
        <div v-if="authStore.isLoggedIn" class="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
          <p class="text-xs text-slate-500 mb-1">บัญชีที่เข้าสู่ระบบ:</p>
          <p class="font-bold text-emerald-700 truncate">{{ authStore.user?.username }}</p>
        </div>
        <div v-else class="grid grid-cols-2 gap-2">
          <router-link to="/login" @click="isMobileMenuOpen = false" class="btn btn-primary btn-sm text-white font-medium">เข้าสู่ระบบ</router-link>
          <router-link to="/register" @click="isMobileMenuOpen = false" class="btn btn-outline btn-primary btn-sm font-medium">สมัครสมาชิก</router-link>
        </div>

        <div class="divider my-0 text-xs font-bold text-slate-400">หมวดหมู่สินค้า</div>

        <!-- รายการหมวดหมู่ Format -->
        <ul class="menu menu-sm bg-base-100 w-full p-0 gap-1 text-slate-700 font-medium">
          <li>
            <button @click="selectFormat(null)" :class="!route.query.category && route.path === '/' ? 'active bg-primary text-white' : ''">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
              หน้าแรก / ทั้งหมด
            </button>
          </li>
          <li v-for="format in vanguardFormats" :key="format">
            <button @click="selectFormat(format)" :class="route.query.category === format ? 'active bg-primary text-white' : ''">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
              {{ format }}
            </button>
          </li>
        </ul>

        <template v-if="authStore.isLoggedIn">
          <div class="divider my-0 text-xs font-bold text-slate-400">เมนูผู้ใช้งาน</div>
          <ul class="menu menu-sm bg-base-100 w-full p-0 gap-1 text-slate-700 font-medium">
            <li v-if="!authStore.isAdmin">
              <router-link to="/my-orders" @click="isMobileMenuOpen = false">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                ประวัติการสั่งซื้อ
              </router-link>
            </li>
            
            <template v-if="authStore.isAdmin">
              <li>
                <router-link to="/admin/dashboard" @click="isMobileMenuOpen = false" class="text-primary font-bold">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                  แดชบอร์ดร้านค้า (Admin)
                </router-link>
              </li>
              <li>
                <router-link to="/admin/orders" @click="isMobileMenuOpen = false" class="text-amber-700">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                  จัดการออเดอร์ (Admin)
                </router-link>
              </li>
              <li>
                <router-link to="/admin/products" @click="isMobileMenuOpen = false" class="text-emerald-700">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                  จัดการสินค้า (Admin)
                </router-link>
              </li>
            </template>
          </ul>
        </template>
      </div>

      <!-- ปุ่มออกจากระบบ (อยู่ล่างสุดของเมนู) -->
      <div v-if="authStore.isLoggedIn" class="p-4 border-t border-base-200 mt-auto bg-base-50">
        <button @click="handleLogout" class="btn btn-outline btn-error btn-sm font-medium hover:text-white hover:bg-error p-2 w-full">
          ออกจากระบบ
        </button>
      </div>
    </div>


    <!-- Navbar หลัก -->
    <header class="bg-base-100 shadow-md border-b border-base-300 sticky top-0 z-40">
      <div class="navbar px-3 md:px-8 min-h-[3.5rem] justify-between">
        
        <!-- ฝั่งซ้าย: โลโก้ร้าน + หมวดหมู่ Format (แสดงเฉพาะบนจอคอม) -->
        <div class="flex items-center gap-1 md:gap-2">
          <button @click="goHome" class="btn btn-ghost text-lg md:text-xl font-extrabold text-primary px-2">
            Vanguard Shop
          </button>

          <div class="divider divider-horizontal mx-0 hidden lg:flex"></div>

          <div class="hidden lg:flex items-center gap-1">
            <button 
              @click="selectFormat(null)" 
              class="btn btn-sm"
              :class="!route.query.category && route.path === '/' ? 'btn-primary text-black text-bold font-medium' : 'btn-ghost text-slate-700'"
            >
              ทั้งหมด
            </button>

            <button 
              v-for="format in vanguardFormats" 
              :key="format"
              @click="selectFormat(format)"
              class="btn btn-sm"
              :class="route.query.category === format ? 'btn-primary text-black text-bold font-medium' : 'btn-ghost text-slate-700'"
            >
              {{ format }}
            </button>
          </div>
        </div>

        <!-- ฝั่งขวา: ตะกร้าสินค้า + เมนูบนคอม + ปุ่ม Hamburger เปิดเมนูบนมือถือ -->
        <div class="flex items-center gap-2">
          <!-- ปุ่มตะกร้าสินค้า: ซ่อนถ้าเป็น Admin -->
          <router-link 
            v-if="!authStore.isAdmin" 
            to="/cart" 
            class="btn btn-ghost btn-circle btn-sm"
          >
            <div class="indicator">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span v-if="cartStore.totalItems > 0" class="badge badge-sm badge-primary indicator-item text-white">
                {{ cartStore.totalItems }}
              </span>
            </div>
          </router-link>

          <!-- เมนูผู้ใช้สำหรับจอคอมพิวเตอร์ (ซ่อนบนมือถือ) -->
          <div class="hidden lg:flex items-center gap-2">
            <template v-if="authStore.isLoggedIn">
              <router-link 
                v-if="!authStore.isAdmin" 
                to="/my-orders" 
                class="btn btn-ghost btn-sm text-slate-700 font-medium"
              >
                ประวัติการสั่งซื้อ
              </router-link>

              <template v-if="authStore.isAdmin">
                <router-link to="/admin/dashboard" class="btn btn-primary btn-sm text-black font-bold shadow-sm">
                  📊 แดชบอร์ด (Admin)
                </router-link>
                <router-link to="/admin/orders" class="btn btn-warning btn-sm text-slate-900 font-bold shadow-sm">
                  จัดการออเดอร์ (Admin)
                </router-link>
                <router-link to="/admin/products" class="btn btn-accent btn-sm text-slate-900 font-bold shadow-sm">
                  จัดการสินค้า (Admin)
                </router-link>
              </template>

              <span class="text-sm font-semibold text-emerald-600 px-2">
                {{ authStore.user?.username }}
              </span>

              <button @click="handleLogout" class="btn btn-outline btn-error btn-sm font-medium hover:text-white hover:bg-error p-2">
                ออกจากระบบ
              </button>
            </template>

            <template v-else>
              <router-link to="/login" class="btn btn-primary btn-sm text-white font-medium">เข้าสู่ระบบ</router-link>
              <router-link 
                to="/register" 
                class="btn btn-outline btn-primary btn-sm hover:text-white active:text-white focus:text-white font-medium"
              >
                สมัครสมาชิก
              </router-link>
            </template>
          </div>

          <!-- ปุ่มเปิดเมนู Hamburger สำหรับมือถือ -->
          <button 
            @click="isMobileMenuOpen = true" 
            class="btn btn-ghost btn-sm lg:hidden border border-base-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span class="text-xs ml-1">เมนู</span>
          </button>
        </div>
      </div>
    </header>

    <!-- เนื้อหาของแต่ละหน้า -->
    <main class="flex-grow">
      <router-view />
    </main>

    <!-- Footer ด้านล่างสำหรับติดต่อเพจร้าน -->
    <footer class="bg-base-300 text-base-content border-t border-base-100 mt-12 md:mt-16">
      <div class="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-10 grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        <div>
          <h3 class="text-lg md:text-xl font-extrabold text-primary mb-2 md:mb-3">Vanguard Shop</h3>
          <p class="text-xs md:text-sm text-slate-600 leading-relaxed">
            ศูนย์รวมสินค้าการ์ดไฟท์ แวนการ์ด ทั้งการ์ดแยกใบ บ็อกซ์บูสเตอร์ เด็คพร้อมเล่น และอุปกรณ์เสริม ครบทุก Format (D ไทย / D ญี่ปุ่น / Premium) การันตีของแท้ แพ็คกันกระแทกอย่างดีทุกออเดอร์
          </p>
        </div>

        <div>
          <h4 class="font-bold text-sm md:text-base mb-2 md:mb-3 text-slate-800">หมวดหมู่ Format สินค้า</h4>
          <ul class="space-y-1.5 text-xs md:text-sm text-slate-600">
            <li><button @click="selectFormat('แวนการ์ด D ไทย')" class="hover:text-primary transition-colors">- แวนการ์ด D ไทย (Vanguard D TH)</button></li>
            <li><button @click="selectFormat('แวนการ์ด D JP')" class="hover:text-primary transition-colors">- แวนการ์ด D JP (Vanguard D Japan)</button></li>
            <li><button @click="selectFormat('แวนการ์ด Premium')" class="hover:text-primary transition-colors">- แวนการ์ด Premium / V-Series</button></li>
          </ul>
        </div>

        <div>
          <h4 class="font-bold text-sm md:text-base mb-2 md:mb-3 text-slate-800">ติดต่อเพจร้าน / สอบถาม</h4>
          <ul class="space-y-2 text-xs md:text-sm text-slate-700">
            <li class="flex items-center gap-2">
              <span class="badge badge-primary badge-sm text-white">FB</span>
              <a href="https://facebook.com" target="_blank" class="hover:text-primary underline truncate">
                Facebook: Vanguard Card Shop Thailand
              </a>
            </li>
            <li class="flex items-center gap-2">
              <span class="badge badge-success badge-sm text-white">LINE</span>
              <span>Line Official: @vanguardshop</span>
            </li>
            <li class="flex items-center gap-2">
              <span class="badge badge-neutral badge-sm">โทร</span>
              <span>08X-XXX-XXXX (10:00 - 22:00 น.)</span>
            </li>
          </ul>
        </div>
      </div>

      <div class="bg-base-100 py-4 text-center text-xs text-slate-500 border-t border-base-200 px-4">
        © {{ new Date().getFullYear() }} Vanguard Shop Project. All rights reserved.
      </div>
    </footer>
  </div>
</template>