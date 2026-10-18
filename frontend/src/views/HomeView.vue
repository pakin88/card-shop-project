<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { useCartStore } from '../stores/cart'; // <-- นำเข้า Cart Store

const cartStore = useCartStore(); // <-- เรียกใช้งาน
// ตัวแปรสำหรับเก็บรายการสินค้าที่ดึงมาจาก API
const products = ref([]);
const loading = ref(true);
const error = ref(null);

// ฟังก์ชันดึงข้อมูลจาก Backend
const fetchProducts = async () => {
  try {
    // ยิง GET Request ไปที่ API ของเรา
const response = await axios.get('https://card-shop-project.onrender.com/api/products');    products.value = response.data; // เอาข้อมูลไปใส่ในตัวแปร
  } catch (err) {
    error.value = 'ไม่สามารถโหลดข้อมูลสินค้าได้: ' + err.message;
  } finally {
    loading.value = false; // ปิดสถานะกำลังโหลด
  }
const getImageUrl = (img) => {
  if (!img) return '';
  if (img.startsWith('data:image') || img.startsWith('http')) return img;
  return `https://card-shop-project.onrender.com/uploads/${img.replace(/^\/?uploads[\/\\]/, '')}`;
};
};

// ให้เรียกฟังก์ชันดึงข้อมูลทันทีที่เปิดหน้านี้ขึ้นมา
onMounted(() => {
  fetchProducts();
});
</script>

<template>
  <div class="p-6">
    <h1 class="text-3xl font-bold text-center mb-8">การ์ดทั้งหมดในคลัง</h1>

    <!-- แสดงข้อความกำลังโหลด หรือ ข้อผิดพลาด -->
    <div v-if="loading" class="text-center text-lg">กำลังโหลดข้อมูล...</div>
    <div v-else-if="error" class="text-center text-error">{{ error }}</div>

    <!-- แสดงกรณีที่ไม่มีการ์ดเลย -->
    <div v-else-if="products.length === 0" class="text-center text-gray-500 text-lg">
      ยังไม่มีสินค้าในระบบ
    </div>

    <!-- ส่วนแสดงการ์ด (Grid System) -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <!-- วนลูป (v-for) เพื่อสร้างกล่องการ์ดตามจำนวนข้อมูลที่มี -->
      <div v-for="product in products" :key="product.id" class="card bg-base-100 shadow-xl border border-gray-100">
        
        <!-- รูปภาพการ์ด (ถ้าไม่มีรูปให้โชว์กล่องสีเทาแทน) -->
        <figure class="px-4 pt-4">
<img v-if="product.image_url" :src="getImageUrl(product.image_url)" :alt="product.name" class="w-full h-full object-contain" />
          <div v-else class="rounded-xl h-48 w-full bg-gray-200 flex items-center justify-center text-gray-400">
            ไม่มีรูปภาพ
          </div>
        </figure>

        <!-- รายละเอียดการ์ด -->
        <div class="card-body p-4">
          <h2 class="card-title text-lg h-14 overflow-hidden">{{ product.name }}</h2>
          
          <div class="flex justify-between items-center text-sm text-gray-500 mb-2">
            <span>หมวดหมู่: {{ product.category_name || 'ไม่ระบุ' }}</span>
            <span class="badge badge-outline">{{ product.rarity }}</span>
          </div>

          <div class="flex justify-between items-end mt-auto">
            <div>
              <p class="text-xl font-bold text-primary">฿{{ product.price }}</p>
              <p class="text-xs" :class="product.stock > 0 ? 'text-success' : 'text-error'">
                คลัง: {{ product.stock }} ใบ
              </p>
            </div>
            
            <button 
              class="btn btn-primary btn-sm" 
              :disabled="product.stock === 0"
              @click="cartStore.addToCart(product)"
            >
              ใส่ตะกร้า
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>