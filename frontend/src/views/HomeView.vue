<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { useCartStore } from '../stores/cart';
import { useAuthStore } from '../stores/auth';
import { useRouter } from 'vue-router';

const cartStore = useCartStore();
const authStore = useAuthStore();
const router = useRouter();

const products = ref([]);
const loading = ref(true);
const error = ref(null);

// เก็บข้อมูลการ์ดที่ถูกคลิกเพื่อเปิดดูรายละเอียดขนาดใหญ่
const selectedProduct = ref(null);

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

const getImageUrl = (img) => {
  if (!img) return '';
  if (img.startsWith('data:image') || img.startsWith('http')) return img;
  return `https://card-shop-project.onrender.com/uploads/${img.replace(/^\/?uploads[\/\\]/, '')}`;
};

// พา Admin ไปหน้าจัดการสินค้าพร้อมสั่งเปิด Modal แก้ไขการ์ดใบนั้นทันที
const goToEditProduct = (productId) => {
  router.push({ path: '/admin/products', query: { edit: productId } });
};

onMounted(() => {
  fetchProducts();
});
</script>

<template>
  <div class="p-6 max-w-7xl mx-auto">
    <h1 class="text-3xl font-bold text-center mb-8">การ์ดทั้งหมดในคลัง</h1>

    <div v-if="loading" class="text-center py-10">
      <span class="loading loading-spinner loading-lg text-primary"></span>
      <p class="mt-2 text-lg">กำลังโหลดข้อมูล...</p>
    </div>
    <div v-else-if="error" class="text-center text-error">{{ error }}</div>

    <div v-else-if="products.length === 0" class="text-center text-gray-500 text-lg">
      ยังไม่มีสินค้าในระบบ
    </div>

    <!-- ส่วนแสดงการ์ด (Grid System) -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div 
        v-for="product in products" 
        :key="product.id" 
        class="card bg-base-100 shadow-xl border border-base-300 hover:border-primary transition-all duration-200"
      >
        <!-- รูปภาพการ์ด (คลิกเพื่อดูรายละเอียดได้) -->
        <figure 
          class="px-4 pt-4 cursor-pointer relative group" 
          @click="selectedProduct = product"
        >
          <img 
            v-if="product.image_url" 
            :src="getImageUrl(product.image_url)" 
            :alt="product.name" 
            class="rounded-xl h-56 object-contain w-full group-hover:scale-105 transition-transform duration-200"
          />
          <div v-else class="rounded-xl h-56 w-full bg-base-200 flex items-center justify-center text-gray-400">
            ไม่มีรูปภาพ
          </div>
          <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center rounded-xl m-4">
            <span class="badge badge-neutral opacity-0 group-hover:opacity-100 transition-opacity">คลิกดูรายละเอียด</span>
          </div>
        </figure>

        <!-- รายละเอียดการ์ด -->
        <div class="card-body p-4">
          <h2 
            class="card-title text-lg h-14 overflow-hidden cursor-pointer hover:text-primary transition-colors"
            @click="selectedProduct = product"
          >
            {{ product.name }}
          </h2>
          
          <div class="flex justify-between items-center text-sm text-gray-400 mb-2">
            <span>หมวดหมู่: {{ product.category_name || product.category || 'ไม่ระบุ' }}</span>
            <span class="badge badge-outline">{{ product.rarity }}</span>
          </div>

          <div class="flex justify-between items-end mt-auto pt-2 border-t border-base-200">
            <div>
              <p class="text-xl font-bold text-primary">฿{{ Number(product.price).toLocaleString() }}</p>
              <p class="text-xs" :class="product.stock > 0 ? 'text-success' : 'text-error'">
                คลัง: {{ product.stock }} ใบ
              </p>
            </div>
            
            <!-- ถ้าเป็น Admin ให้แสดงปุ่ม "แก้ไขการ์ด" แทนปุ่ม "ใส่ตะกร้า" -->
            <button 
              v-if="authStore.isAdmin"
              class="btn btn-info btn-sm text-white" 
              @click="goToEditProduct(product.id)"
            >
              แก้ไขการ์ด
            </button>

            <!-- ถ้าเป็นลูกค้าทั่วไป แสดงปุ่ม "ใส่ตะกร้า" -->
            <button 
              v-else
              class="btn btn-primary btn-sm text-white" 
              :disabled="product.stock === 0"
              @click="cartStore.addToCart(product)"
            >
              {{ product.stock > 0 ? 'ใส่ตะกร้า' : 'สินค้าหมด' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal แสดงรายละเอียดการ์ดและรูปขนาดใหญ่ -->
    <div 
      v-if="selectedProduct" 
      class="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
      @click="selectedProduct = null"
    >
      <div 
        class="bg-base-100 rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-base-300 relative max-h-[90vh] overflow-y-auto"
        @click.stop
      >
        <button 
          @click="selectedProduct = null" 
          class="btn btn-sm btn-circle btn-ghost absolute right-4 top-4"
        >
          ✕
        </button>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <!-- ฝั่งซ้าย: รูปการ์ดขนาดใหญ่ -->
          <div class="flex justify-center bg-base-200 p-4 rounded-xl">
            <img 
              v-if="selectedProduct.image_url" 
              :src="getImageUrl(selectedProduct.image_url)" 
              :alt="selectedProduct.name" 
              class="max-h-[420px] w-auto object-contain rounded-lg shadow-md"
            />
            <div v-else class="h-80 w-full flex items-center justify-center text-gray-400">
              ไม่มีรูปภาพ
            </div>
          </div>

          <!-- ฝั่งขวา: ข้อมูลรายละเอียดของการ์ด -->
          <div class="flex flex-col h-full justify-between space-y-4">
            <div>
              <div class="flex items-center gap-2 mb-2">
                <span class="badge badge-primary text-white">{{ selectedProduct.rarity }}</span>
                <span class="text-sm text-gray-400">{{ selectedProduct.category_name || selectedProduct.category || 'Cardfight!! Vanguard' }}</span>
              </div>

              <h2 class="text-2xl font-bold mb-3">{{ selectedProduct.name }}</h2>

              <p class="text-3xl font-bold text-primary mb-4">
                ฿{{ Number(selectedProduct.price).toLocaleString() }}
              </p>

              <div class="bg-base-200 p-4 rounded-xl mb-4">
                <h3 class="text-sm font-semibold text-gray-400 mb-1">รายละเอียดการ์ด / ความสามารถ:</h3>
                <p class="text-sm whitespace-pre-line">
                  {{ selectedProduct.description || 'ไม่มีรายละเอียดเพิ่มเติมสำหรับการ์ดใบนี้' }}
                </p>
              </div>

              <p class="text-sm">
                สถานะคลังสินค้า: 
                <span :class="selectedProduct.stock > 0 ? 'text-success font-bold' : 'text-error font-bold'">
                  {{ selectedProduct.stock > 0 ? `มีสินค้าพร้อมส่ง (${selectedProduct.stock} ใบ)` : 'สินค้าหมดชั่วคราว' }}
                </span>
              </p>
            </div>

            <!-- ปุ่มกดด้านล่างในหน้าต่างรายละเอียด -->
            <div class="pt-4 border-t border-base-300 flex justify-end gap-2">
              <button @click="selectedProduct = null" class="btn btn-ghost">ปิดหน้าต่าง</button>

              <button 
                v-if="authStore.isAdmin"
                class="btn btn-info text-white" 
                @click="goToEditProduct(selectedProduct.id)"
              >
                แก้ไขการ์ดใบนี้
              </button>

              <button 
                v-else
                class="btn btn-primary text-white" 
                :disabled="selectedProduct.stock === 0"
                @click="cartStore.addToCart(selectedProduct); selectedProduct = null;"
              >
                {{ selectedProduct.stock > 0 ? 'หยิบใส่ตะกร้า' : 'สินค้าหมด' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>