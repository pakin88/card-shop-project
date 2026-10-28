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
  <div data-theme="light" class="min-h-screen flex flex-col bg-base-200 text-base-content">
    <!-- Navbar รองรับทั้งมือถือและคอมพิวเตอร์ -->
    <header class="bg-base-100 shadow-md border-b border-base-300 sticky top-0 z-40">
      <div class="navbar px-3 md:px-8 min-h-[3.5rem] justify-between">
        
        <!-- ฝั่งซ้าย: โลโก้ร้าน + หมวดหมู่ Format (แสดงบนจอคอม) -->
        <div class="flex items-center gap-1 md:gap-2">
          <button @click="selectFormat(null)" class="btn btn-ghost text-lg md:text-xl font-extrabold text-primary px-2">
            Vanguard Shop
          </button>

          <div class="divider divider-horizontal mx-0 hidden lg:flex"></div>

          <!-- ปุ่ม Format สำหรับจอคอมพิวเตอร์ -->
          <div class="hidden lg:flex items-center gap-1">
            <button 
              @click="selectFormat(null)" 
              class="btn btn-sm"
              :class="!route.query.category && route.path === '/' ? 'btn-primary text-white font-medium' : 'btn-ghost text-slate-700'"
            >
              ทั้งหมด
            </button>

            <button 
              v-for="format in vanguardFormats" 
              :key="format"
              @click="selectFormat(format)"
              class="btn btn-sm"
              :class="route.query.category === format ? 'btn-primary text-white font-medium' : 'btn-ghost text-slate-700'"
            >
              {{ format }}
            </button>
          </div>
        </div>

        <!-- ฝั่งขวา: ตะกร้าสินค้า + เมนูบนคอม + ปุ่มเปิดเมนูบนมือถือ -->
        <div class="flex items-center gap-2">
          <!-- ปุ่มตะกร้าสินค้า: ซ่อนถ้าเป็น Admin -->
          <router-link 
            v-if="!authStore.isAdmin" 
            to="/cart" 
            @click="isMobileMenuOpen = false"
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

              <button @click="handleLogout" class="btn btn-outline btn-error btn-sm font-medium">
                ออกจากระบบ
              </button>
            </template>

            <template v-else>
              <router-link to="/login" class="btn btn-primary btn-sm text-white font-medium">เข้าสู่ระบบ</router-link>
              <router-link to="/register" class="btn btn-outline btn-primary btn-sm hover:text-white font-medium">สมัครสมาชิก</router-link>
            </template>
          </div>

          <!-- ปุ่มเปิด-ปิดเมนูสำหรับมือถือและแท็บเล็ต -->
          <button 
            @click="isMobileMenuOpen = !isMobileMenuOpen" 
            class="btn btn-ghost btn-sm lg:hidden border border-base-300"
          >
            <svg v-if="!isMobileMenuOpen" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span v-else class="text-sm font-bold">✕</span>
            <span class="text-xs ml-1">เมนู</span>
          </button>
        </div>
      </div>

      <!-- แถบเลือก Format แบบเลื่อนซ้าย-ขวาสำหรับมือถือ -->
      <div class="flex lg:hidden overflow-x-auto gap-1.5 px-3 py-2 bg-base-200/60 border-t border-base-300 whitespace-nowrap">
        <button 
          @click="selectFormat(null)" 
          class="btn btn-xs shrink-0"
          :class="!route.query.category && route.path === '/' ? 'btn-primary text-white font-medium' : 'btn-ghost bg-base-100 text-slate-700'"
        >
          ทั้งหมด
        </button>
        <button 
          v-for="format in vanguardFormats" 
          :key="format"
          @click="selectFormat(format)"
          class="btn btn-xs shrink-0"
          :class="route.query.category === format ? 'btn-primary text-white font-medium' : 'btn-ghost bg-base-100 text-slate-700'"
        >
          {{ format }}
        </button>
      </div>

      <!-- กล่องเมนูที่กางออกเมื่อกดปุ่มเมนูบนมือถือ -->
      <div v-if="isMobileMenuOpen" class="lg:hidden bg-base-100 border-t border-base-300 px-4 py-3 space-y-2 shadow-xl">
        <template v-if="authStore.isLoggedIn">
          <div class="flex items-center justify-between pb-2 mb-2 border-b border-base-200">
            <span class="text-xs text-slate-500">บัญชีที่เข้าสู่ระบบ:</span>
            <span class="text-sm font-bold text-emerald-600">{{ authStore.user?.username }}</span>
          </div>

          <router-link 
            v-if="!authStore.isAdmin" 
            to="/my-orders" 
            @click="isMobileMenuOpen = false"
            class="btn btn-ghost btn-sm w-full justify-start bg-base-200 text-slate-800"
          >
            ประวัติการสั่งซื้อ
          </router-link>

          <div v-if="authStore.isAdmin" class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <router-link 
              to="/admin/orders" 
              @click="isMobileMenuOpen = false"
              class="btn btn-warning btn-sm text-slate-900 font-bold w-full"
            >
              จัดการออเดอร์ (Admin)
            </router-link>
            <router-link 
              to="/admin/products" 
              @click="isMobileMenuOpen = false"
              class="btn btn-accent btn-sm text-slate-900 font-bold w-full"
            >
              จัดการสินค้า (Admin)
            </router-link>
          </div>

          <button @click="handleLogout" class="btn btn-error btn-sm w-full mt-2 text-white font-medium">
            ออกจากระบบ
          </button>
        </template>

        <template v-else>
          <div class="grid grid-cols-2 gap-2">
            <router-link 
              to="/login" 
              @click="isMobileMenuOpen = false"
              class="btn btn-primary btn-sm text-white w-full font-medium"
            >
              เข้าสู่ระบบ
            </router-link>
            <router-link 
              to="/register" 
              @click="isMobileMenuOpen = false"
              class="btn btn-outline btn-primary btn-sm w-full hover:text-white font-medium"
            >
              สมัครสมาชิก
            </router-link>
          </div>
        </template>
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