<script setup>
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';
import { useCartStore } from '../stores/cart';
import { useAuthStore } from '../stores/auth';
import { useRouter, useRoute } from 'vue-router';

const cartStore = useCartStore();
const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();

const API_URL = 'https://card-shop-project.onrender.com';

// เปลี่ยนลิงก์รูปแบนเนอร์ปกอนิเมะ/โลโก้ตรงนี้ได้ตามต้องการเลยครับ
const BANNER_IMAGE = 'https://preview.redd.it/cardfight-vanguard-divinez-wallpapers-gdrive-link-for-hq-v0-4dxrl7dpjfgd1.jpg?width=1080&crop=smart&auto=webp&s=015997f07cfb72c827c5227d7deb320935a023ac';

const products = ref([]);
const loading = ref(true);
const error = ref(null);
const selectedProduct = ref(null);

// ตัวแปรสำหรับค้นหาและกรองการ์ด
const searchQuery = ref('');
const selectedRarity = ref('');

const fetchProducts = async () => {
  loading.value = true;
  try {
    const response = await axios.get(`${API_URL}/api/products`);
    products.value = response.data;
  } catch (err) {
    error.value = 'ไม่สามารถโหลดข้อมูลสินค้าได้: ' + err.message;
  } finally {
    loading.value = false;
  }
};

// กรองรายการการ์ดตามหมวดหมู่บน Navbar, ช่องค้นหา และระดับความแรร์
const filteredProducts = computed(() => {
  return products.value.filter((product) => {
    const prodCategory = product.category_name || product.category || '';
    const matchCategory = !route.query.category || prodCategory === route.query.category;
    const matchSearch = !searchQuery.value || product.name.toLowerCase().includes(searchQuery.value.toLowerCase());
    const matchRarity = !selectedRarity.value || product.rarity === selectedRarity.value;
    return matchCategory && matchSearch && matchRarity;
  });
});

const getImageUrl = (img) => {
  if (!img) return '';
  if (img.startsWith('data:image') || img.startsWith('http')) return img;
  return `${API_URL}/uploads/${img.replace(/^\/?uploads[\/\\]/, '')}`;
};

// สำหรับ Admin: กดเพิ่มการ์ดใหม่จากหน้าแรก
const goToAddProduct = () => {
  router.push({ path: '/admin/products', query: { action: 'add' } });
};

// สำหรับ Admin: กดแก้ไขการ์ดจากหน้าแรก
const goToEditProduct = (productId) => {
  router.push({ path: '/admin/products', query: { edit: productId } });
};

// สำหรับ Admin: กดลบการ์ดจากหน้าแรกได้ทันที
const deleteProductFromHome = async (id, name) => {
  if (!confirm(`คุณต้องการลบการ์ด "${name}" ออกจากหน้าร้านใช่หรือไม่?`)) return;
  try {
    await axios.delete(`${API_URL}/api/products/${id}`, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    });
    alert('ลบการ์ดสำเร็จ!');
    if (selectedProduct.value?.id === id) selectedProduct.value = null;
    fetchProducts();
  } catch (err) {
    alert(err.response?.data?.message || 'ไม่สามารถลบการ์ดนี้ได้ (อาจอยู่ในใบสั่งซื้อแล้ว)');
  }
};

const scrollToProducts = () => {
  document.getElementById('latest-products')?.scrollIntoView({ behavior: 'smooth' });
};

onMounted(() => {
  fetchProducts();
});
</script>

<template>
  <div>
    <!-- 1. Hero Banner (รูปปกอนิเมะ / โลโก้ใหญ่ด้านบนสุด) -->
    <div class="relative bg-base-300 overflow-hidden border-b border-base-300">
      <div 
        class="h-[320px] md:h-[400px] w-full bg-cover bg-center relative flex items-center justify-center"
        :style="`background-image: linear-gradient(to bottom, rgba(15, 23, 42, 0.65), rgba(15, 23, 42, 0.92)), url('${BANNER_IMAGE}');`"
      >
        <div class="text-center px-4 max-w-3xl z-10">
          <span class="badge badge-primary badge-outline mb-3 px-4 py-3 font-semibold tracking-wider">
            CARDFIGHT!! VANGUARD OFFICIAL SHOP
          </span>
          <h1 class="text-4xl md:text-6xl font-extrabold text-white tracking-tight mb-4 drop-shadow-lg">
            STAND UP, <span class="text-primary">VANGUARD!</span>
          </h1>
          <p class="text-gray-300 text-sm md:text-lg mb-6 max-w-2xl mx-auto">
            แหล่งรวมการ์ดแวนการ์ดแยกใบระดับ RRR, SP, SEC และของเสริมจัดเด็คครบทุก Format ทั้ง D-Standard ภาษาไทย, ญี่ปุ่น และ Premium
          </p>
          <div class="flex justify-center gap-3">
            <button @click="scrollToProducts" class="btn btn-primary text-white px-6">
              เลือกดูการ์ดล่าสุด ↓
            </button>
            <button 
              v-if="authStore.isAdmin" 
              @click="goToAddProduct" 
              class="btn btn-accent text-black font-bold"
            >
              + เพิ่มการ์ดลงหน้าร้าน
            </button>
          </div>
        </div>
      </div>
    </div>


 

    <!-- 3. ส่วนแสดงรายการสินค้าล่าสุด + ตัวค้นหา -->
    <div id="latest-products" class="p-6 max-w-7xl mx-auto mt-6">
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-base-300 pb-4">
        <div>
          <h2 class="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <span>{{ route.query.category ? `หมวดหมู่: ${route.query.category}` : 'รายการสินค้าการ์ดล่าสุด' }}</span>
            <span class="badge badge-neutral text-xs">{{ filteredProducts.length }} รายการ</span>
          </h2>
          <p class="text-sm text-gray-400 mt-1">คลิกที่รูปการ์ดเพื่อดูภาพขนาดใหญ่และอ่านเอฟเฟกต์ความสามารถ</p>
        </div>

        <!-- ปุ่มลัดให้ Admin เพิ่มการ์ดจากหน้านี้ได้ทันที -->
        <button 
          v-if="authStore.isAdmin" 
          @click="goToAddProduct" 
          class="btn btn-primary btn-sm text-white"
        >
          + เพิ่มการ์ดใบใหม่
        </button>
      </div>

      <!-- แถบค้นหาชื่อการ์ด และกรองระดับความแรร์ -->
      <div class="flex flex-col sm:flex-row gap-3 mb-8">
        <input 
          type="text" 
          v-model="searchQuery" 
          placeholder="ค้นหาชื่อการ์ด..." 
          class="input input-bordered w-full sm:flex-1"
        />
        <select v-model="selectedRarity" class="select select-bordered w-full sm:w-48">
          <option value="">ความแรร์ทั้งหมด</option>
          <option value="RRR">RRR</option>
          <option value="RR">RR</option>
          <option value="R">R</option>
          <option value="Common">Common (C)</option>
          <option value="SP">SP / SEC / DSR</option>
        </select>
        <button 
          v-if="route.query.category || searchQuery || selectedRarity" 
          @click="searchQuery = ''; selectedRarity = ''; router.push('/')" 
          class="btn btn-ghost"
        >
          ล้างตัวกรอง
        </button>
      </div>

      <div v-if="loading" class="text-center py-10">
        <span class="loading loading-spinner loading-lg text-primary"></span>
        <p class="mt-2 text-lg">กำลังโหลดข้อมูลการ์ด...</p>
      </div>
      <div v-else-if="error" class="text-center text-error">{{ error }}</div>

      <div v-else-if="filteredProducts.length === 0" class="text-center py-16 bg-base-100 rounded-2xl border border-base-300">
        <p class="text-gray-400 text-lg mb-3">ยังไม่มีการ์ดในหมวดหมู่นี้ หรือไม่พบการ์ดที่ค้นหา</p>
        <button @click="searchQuery = ''; selectedRarity = ''; router.push('/')" class="btn btn-outline btn-sm">
          ดูการ์ดทั้งหมด
        </button>
      </div>

      <!-- ตารางแสดงการ์ด (Grid System) -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div 
          v-for="product in filteredProducts" 
          :key="product.id" 
          class="card bg-base-100 shadow-xl border border-base-300 hover:border-primary transition-all duration-200"
        >
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
              <span class="badge badge-neutral opacity-0 group-hover:opacity-100 transition-opacity">คลิกดูรูปใหญ่</span>
            </div>
          </figure>

          <div class="card-body p-4">
            <h2 
              class="card-title text-lg h-14 overflow-hidden cursor-pointer hover:text-primary transition-colors"
              @click="selectedProduct = product"
            >
              {{ product.name }}
            </h2>
            
            <div class="flex justify-between items-center text-xs text-gray-400 mb-2">
              <span class="truncate max-w-[150px]">{{ product.category_name || product.category || 'ไม่ระบุ' }}</span>
              <span class="badge badge-outline badge-sm">{{ product.rarity }}</span>
            </div>

            <div class="flex justify-between items-end mt-auto pt-2 border-t border-base-200">
              <div>
                <p class="text-xl font-bold text-primary">฿{{ Number(product.price).toLocaleString() }}</p>
                <p class="text-xs" :class="product.stock > 0 ? 'text-success' : 'text-error'">
                  คลัง: {{ product.stock }} ใบ
                </p>
              </div>
              
              <!-- ปุ่มสำหรับ Admin: แก้ไข และ ลบ ได้จากหน้าแรกทันที -->
              <div v-if="authStore.isAdmin" class="flex gap-1">
                <button 
                  class="btn btn-info btn-xs text-white" 
                  @click="goToEditProduct(product.id)"
                >
                  แก้ไข
                </button>
                <button 
                  class="btn btn-error btn-xs text-white" 
                  @click="deleteProductFromHome(product.id, product.name)"
                >
                  ลบ
                </button>
              </div>

              <!-- ปุ่มสำหรับลูกค้าทั่วไป -->
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

            <div class="pt-4 border-t border-base-300 flex justify-end gap-2">
              <button @click="selectedProduct = null" class="btn btn-ghost">ปิดหน้าต่าง</button>

              <template v-if="authStore.isAdmin">
                <button 
                  class="btn btn-info text-white" 
                  @click="goToEditProduct(selectedProduct.id)"
                >
                  แก้ไขการ์ด
                </button>
                <button 
                  class="btn btn-error text-white" 
                  @click="deleteProductFromHome(selectedProduct.id, selectedProduct.name)"
                >
                  ลบการ์ด
                </button>
              </template>

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