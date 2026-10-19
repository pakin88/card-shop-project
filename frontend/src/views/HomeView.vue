<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { useCartStore } from '../stores/cart';

const cartStore = useCartStore();

// ตัวแปรสำหรับเก็บรายการสินค้าที่ดึงมาจาก API
const products = ref([]);
const loading = ref(true);
const error = ref(null);

// ฟังก์ชันดึงข้อมูลจาก Backend
const fetchProducts = async () => {
  try {
    const response = await axios.get('https://card-shop-project.onrender.com/api/products');
    products.value = response.data;
  } catch (err) {
    error.value = 'ไม่สามารถโหลดข้อมูลสินค้าได้: ' + err.message;
  } finally {
    loading.value = false;
  }
};

// ฟังก์ชันแปลงลิงก์รูปภาพ (แยกออกมาอยู่นอก fetchProducts แล้ว)
const getImageUrl = (img) => {
  if (!img) return '';
  if (img.startsWith('data:image') || img.startsWith('http')) return img;
  return `https://card-shop-project.onrender.com/uploads/${img.replace(/^\/?uploads[\/\\]/, '')}`;
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
      <div v-for="product in products" :key="product.id" class="card bg-base-100 shadow-xl border border-base-300">
        
        <!-- รูปภาพการ์ด (ถ้าไม่มีรูปให้โชว์กล่องสีเทาแทน) -->
        <figure class="px-4 pt-4">
          <img 
            v-if="product.image_url" 
            :src="getImageUrl(product.image_url)" 
            alt="Card Image" 
            class="rounded-xl h-48 object-contain w-full"
          />
          <div v-else class="rounded-xl h-48 w-full bg-base-200 flex items-center justify-center text-gray-400">
            ไม่มีรูปภาพ
          </div>
        </figure>

        <!-- รายละเอียดการ์ด -->
        <div class="card-body p-4">
          <h2 class="card-title text-lg h-14 overflow-hidden">{{ product.name }}</h2>
          
          <div class="flex justify-between items-center text-sm text-gray-400 mb-2">
            <span>หมวดหมู่: {{ product.category_name || product.category || 'ไม่ระบุ' }}</span>
            <span class="badge badge-outline">{{ product.rarity }}</span>
          </div>

          <div class="flex justify-between items-end mt-auto">
            <div>
              <p class="text-xl font-bold text-primary">฿{{ Number(product.price).toLocaleString() }}</p>
              <p class="text-xs" :class="product.stock > 0 ? 'text-success' : 'text-error'">
                คลัง: {{ product.stock }} ใบ
              </p>
            </div>
            
            <button 
              class="btn btn-primary btn-sm text-white" 
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