<script setup>
import { useCartStore } from '../stores/cart';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const cartStore = useCartStore();
const authStore = useAuthStore();
const router = useRouter();

const proceedToCheckout = () => {
  if (!authStore.isLoggedIn) {
    alert('กรุณาเข้าสู่ระบบก่อนทำการสั่งซื้อ');
    router.push('/login');
  } else {
    router.push('/checkout'); // <-- เปลี่ยนจาก alert เป็นบรรทัดนี้
  }
};
</script>

<template>
  <div class="p-6 max-w-4xl mx-auto">
    <h1 class="text-3xl font-bold mb-8">ตะกร้าสินค้าของคุณ</h1>

    <!-- ถ้าไม่มีสินค้าในตะกร้า -->
    <div v-if="cartStore.items.length === 0" class="text-center py-12 bg-base-100 rounded-xl shadow-sm border border-gray-100">
      <h2 class="text-2xl text-gray-500 mb-4">ตะกร้าว่างเปล่า</h2>
      <router-link to="/" class="btn btn-primary">กลับไปเลือกซื้อการ์ด</router-link>
    </div>

    <!-- ถ้ามีสินค้า -->
    <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-6">
      
      <!-- ฝั่งซ้าย: รายการการ์ด -->
      <div class="md:col-span-2 space-y-4">
        <div v-for="item in cartStore.items" :key="item.id" class="flex items-center bg-base-100 p-4 rounded-xl shadow-sm border border-gray-100">
          
          <img 
            v-if="item.image_url" 
            :src="'http://localhost:3000/uploads/products/' + item.image_url" 
            class="w-20 h-24 object-cover rounded border"
          />
          <div v-else class="w-20 h-24 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-400">
            ไม่มีรูป
          </div>

          <div class="ml-4 flex-1">
            <h3 class="font-bold text-lg">{{ item.name }}</h3>
            <p class="text-primary font-semibold">฿{{ item.price }} / ใบ</p>
          </div>

          <!-- ตัวปรับจำนวน -->
          <div class="flex items-center space-x-2 mx-4">
            <button @click="cartStore.decreaseQuantity(item.id)" class="btn btn-square btn-sm btn-outline">-</button>
            <span class="w-8 text-center font-bold">{{ item.quantity }}</span>
            <button @click="cartStore.increaseQuantity(item.id)" class="btn btn-square btn-sm btn-outline" :disabled="item.quantity >= item.stock">+</button>
          </div>

          <!-- ปุ่มลบ -->
          <button @click="cartStore.removeFromCart(item.id)" class="btn btn-square btn-error btn-sm">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      </div>

      <!-- ฝั่งขวา: สรุปยอดเงิน -->
      <div class="bg-base-100 p-6 rounded-xl shadow-md border border-gray-200 h-fit">
        <h2 class="text-xl font-bold mb-4 border-b pb-2">สรุปคำสั่งซื้อ</h2>
        
        <div class="flex justify-between mb-2">
          <span>จำนวนการ์ดรวม:</span>
          <span class="font-bold">{{ cartStore.totalItems }} ใบ</span>
        </div>
        
        <div class="flex justify-between mb-6 text-xl font-bold text-primary">
          <span>ยอดรวมทั้งสิ้น:</span>
          <span>฿{{ cartStore.totalPrice.toLocaleString() }}</span>
        </div>

        <button @click="proceedToCheckout" class="btn btn-primary w-full text-white text-lg">
          ดำเนินการชำระเงิน
        </button>
      </div>

    </div>
  </div>
</template>