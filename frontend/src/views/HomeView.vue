<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import axios from 'axios';
import { useCartStore } from '../stores/cart';
import { useAuthStore } from '../stores/auth';
import { useRouter, useRoute } from 'vue-router';

const cartStore = useCartStore();
const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();

const API_URL = 'https://card-shop-project.onrender.com';

// ลิงก์รูปแบนเนอร์ด้านบน
const BANNER_IMAGE = 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?q=80&w=1600&auto=format&fit=crop';

const products = ref([]);
const loading = ref(true);
const error = ref(null);
const selectedProduct = ref(null);

// ตัวแปรสำหรับค้นหา, กรอง Format และกรองความแรร์
const searchQuery = ref('');
const selectedFormat = ref(route.query.category || '');
const selectedRarity = ref('');

// ซิงค์ค่าเมื่อผู้ใช้กดเปลี่ยนหมวดหมู่จากแถบ Navbar ด้านบน
watch(
  () => route.query.category,
  (newCategory) => {
    selectedFormat.value = newCategory || '';
  }
);

// เมื่อเปลี่ยน Format จากช่องข้าง Search ให้เปลี่ยน URL ให้ตรงกัน
const handleFormatChange = () => {
  if (selectedFormat.value) {
    router.push({ path: '/', query: { category: selectedFormat.value } });
  } else {
    router.push({ path: '/' });
  }
};

const clearFilters = () => {
  searchQuery.value = '';
  selectedFormat.value = '';
  selectedRarity.value = '';
  router.push({ path: '/' });
};

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

// กรองรายการการ์ดตาม Format, ชื่อการ์ด และความแรร์
const filteredProducts = computed(() => {
  return products.value.filter((product) => {
    const prodCategory = product.category_name || product.category || '';
    const matchCategory = !selectedFormat.value || prodCategory === selectedFormat.value;
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

const goToAddProduct = () => {
  router.push({ path: '/admin/products', query: { action: 'add' } });
};

const goToEditProduct = (productId) => {
  router.push({ path: '/admin/products', query: { edit: productId } });
};

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
    <!-- 1. Hero Banner -->
    <div class="relative bg-black overflow-hidden border-b border-gray-200">
      <div 
        class="h-[340px] md:h-[440px] w-full bg-cover bg-top relative flex items-center justify-center"
        :style="`background-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.85)), url('${BANNER_IMAGE}');`"
      >
        <div class="text-center px-4 max-w-3xl z-10 mt-4">
          <span class="inline-block border border-white/60 text-white text-xs bg-black/50 backdrop-blur-sm mb-3 px-4 py-1.5 rounded-full font-semibold tracking-widest uppercase">
            Cardfight!! Vanguard Official Shop
          </span>
          <h1 class="text-4xl md:text-6xl font-extrabold text-white tracking-tight mb-4 drop-shadow-lg">
            STAND UP, VANGUARD!
          </h1>
          <p class="text-gray-200 text-sm md:text-lg mb-6 max-w-2xl mx-auto">
            แหล่งรวมการ์ดแวนการ์ดแยกใบระดับ RRR, SP, SEC และของเสริมจัดเด็คครบทุก Format ทั้ง D-Standard ภาษาไทย, ญี่ปุ่น และ Premium
          </p>
          <div class="flex justify-center gap-3">
            <button @click="scrollToProducts" class="btn bg-white text-black hover:bg-gray-200 border-none px-6 font-bold">
              เลือกดูการ์ดล่าสุด
            </button>
            <button 
              v-if="authStore.isAdmin" 
              @click="goToAddProduct" 
              class="btn btn-outline border-white text-white hover:bg-white hover:text-black font-bold"
            >
              + เพิ่มการ์ดลงหน้าร้าน
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. แถบจุดเด่นร้านค้า โทนขาว-ดำ -->
    <div class="max-w-7xl mx-auto px-6 -mt-6 relative z-20">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-5 rounded-xl shadow-md border border-gray-200">
        <div class="px-3 py-1">
          <h3 class="font-bold text-sm text-black">รับประกันการ์ดแท้ 100%</h3>
          <p class="text-xs text-gray-500 mt-0.5">คัดสภาพ Mint / Near Mint ทุกใบก่อนจัดส่ง</p>
        </div>
        <div class="px-3 py-1 border-t md:border-t-0 md:border-l border-gray-200 pt-2 md:pt-1">
          <h3 class="font-bold text-sm text-black">แพ็คดามการ์ดกันงออย่างดี</h3>
          <p class="text-xs text-gray-500 mt-0.5">ใส่ซองใส ดามเฟรม และห่อบับเบิ้ลกันกระแทก</p>
        </div>
        <div class="px-3 py-1 border-t md:border-t-0 md:border-l border-gray-200 pt-2 md:pt-1">
          <h3 class="font-bold text-sm text-black">จัดส่งไว เช็คเลขพัสดุได้</h3>
          <p class="text-xs text-gray-500 mt-0.5">รองรับสแกน QR, โอนบัญชี และเก็บเงินปลายทาง</p>
        </div>
      </div>
    </div>

    <!-- 3. ส่วนแสดงรายการสินค้าล่าสุด + ตัวค้นหา -->
    <div id="latest-products" class="p-6 max-w-7xl mx-auto mt-6">
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-gray-200 pb-4">
        <div>
          <h2 class="text-2xl md:text-3xl font-bold text-black flex items-center gap-3">
            <span>{{ selectedFormat ? `หมวดหมู่: ${selectedFormat}` : 'รายการสินค้าการ์ดล่าสุด' }}</span>
            <span class="badge bg-black text-white border-black text-xs px-3 py-2">{{ filteredProducts.length }} รายการ</span>
          </h2>
          <p class="text-sm text-gray-500 mt-1">คลิกที่รูปการ์ดเพื่อดูภาพขนาดใหญ่และอ่านรายละเอียดความสามารถ</p>
        </div>

        <button 
          v-if="authStore.isAdmin" 
          @click="goToAddProduct" 
          class="btn bg-black text-white hover:bg-gray-800 btn-sm border-black"
        >
          + เพิ่มการ์ดใบใหม่
        </button>
      </div>

      <!-- แถบค้นหาชื่อการ์ด + เลือก Format + เลือกระดับความแรร์ -->
      <div class="flex flex-col md:flex-row gap-3 mb-8 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <input 
          type="text" 
          v-model="searchQuery" 
          placeholder="ค้นหาชื่อการ์ด..." 
          class="input input-bordered bg-white border-gray-300 text-black w-full md:flex-1 focus:border-black"
        />

        <!-- ตัวเลือก Format ข้างช่อง Search -->
        <select 
          v-model="selectedFormat" 
          @change="handleFormatChange"
          class="select select-bordered bg-white border-gray-300 text-black w-full md:w-52 focus:border-black"
        >
          <option value="">ทุกหมวดหมู่ (All Formats)</option>
          <option value="แวนการ์ด D ไทย">แวนการ์ด D ไทย</option>
          <option value="แวนการ์ด D JP">แวนการ์ด D JP</option>
          <option value="แวนการ์ด Premium">แวนการ์ด Premium</option>
          <option value="อุปกรณ์เสริมการ์ด">อุปกรณ์เสริมการ์ด</option>
        </select>

        <!-- ตัวเลือกระดับความแรร์ -->
        <select 
          v-model="selectedRarity" 
          class="select select-bordered bg-white border-gray-300 text-black w-full md:w-48 focus:border-black"
        >
          <option value="">ความแรร์ทั้งหมด</option>
          <option value="RRR">RRR</option>
          <option value="RR">RR</option>
          <option value="R">R</option>
          <option value="Common">Common (C)</option>
          <option value="SP">SP / SEC / DSR</option>
        </select>

        <button 
          v-if="selectedFormat || searchQuery || selectedRarity" 
          @click="clearFilters" 
          class="btn btn-outline border-gray-300 text-gray-700 hover:bg-black hover:text-white hover:border-black"
        >
          ล้างตัวกรอง
        </button>
      </div>

      <div v-if="loading" class="text-center py-12">
        <span class="loading loading-spinner loading-lg text-black"></span>
        <p class="mt-2 text-gray-600">กำลังโหลดข้อมูลการ์ด...</p>
      </div>
      <div v-else-if="error" class="text-center text-red-600">{{ error }}</div>

      <div v-else-if="filteredProducts.length === 0" class="text-center py-16 bg-white rounded-2xl border border-gray-200">
        <p class="text-gray-500 text-lg mb-3">ไม่พบการ์ดในหมวดหมู่นี้ หรือไม่มีการ์ดที่ตรงกับการค้นหา</p>
        <button @click="clearFilters" class="btn btn-outline border-black text-black hover:bg-black hover:text-white btn-sm">
          ดูการ์ดทั้งหมด
        </button>
      </div>

      <!-- ตารางแสดงการ์ด (Grid System โทนขาว-ดำ) -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div 
          v-for="product in filteredProducts" 
          :key="product.id" 
          class="card bg-white shadow-sm hover:shadow-md border border-gray-200 hover:border-black transition-all duration-200"
        >
          <figure 
            class="px-4 pt-4 cursor-pointer relative group" 
            @click="selectedProduct = product"
          >
            <img 
              v-if="product.image_url" 
              :src="getImageUrl(product.image_url)" 
              :alt="product.name" 
              class="rounded-lg h-56 object-contain w-full bg-gray-50 p-2 group-hover:scale-105 transition-transform duration-200"
            />
            <div v-else class="rounded-lg h-56 w-full bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
              ไม่มีรูปภาพ
            </div>
            <div class="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-all flex items-center justify-center rounded-lg m-4">
              <span class="badge bg-black text-white border-black opacity-0 group-hover:opacity-100 transition-opacity">
                คลิกดูรูปใหญ่
              </span>
            </div>
          </figure>

          <div class="card-body p-4 text-gray-900">
            <h2 
              class="card-title text-base font-bold h-12 overflow-hidden cursor-pointer hover:underline"
              @click="selectedProduct = product"
            >
              {{ product.name }}
            </h2>
            
            <div class="flex justify-between items-center text-xs text-gray-500 mb-2">
              <span class="truncate max-w-[150px]">{{ product.category_name || product.category || 'ไม่ระบุ' }}</span>
              <span class="badge badge-outline border-gray-400 text-gray-800 badge-sm font-semibold">{{ product.rarity }}</span>
            </div>

            <div class="flex justify-between items-end mt-auto pt-3 border-t border-gray-100">
              <div>
                <p class="text-xl font-extrabold text-black">฿{{ Number(product.price).toLocaleString() }}</p>
                <p class="text-xs font-medium" :class="product.stock > 0 ? 'text-gray-600' : 'text-red-600'">
                  คลัง: {{ product.stock }} ใบ
                </p>
              </div>
              
              <!-- ปุ่มสำหรับ Admin -->
              <div v-if="authStore.isAdmin" class="flex gap-1.5">
                <button 
                  class="btn btn-xs bg-black text-white hover:bg-gray-800 border-black" 
                  @click="goToEditProduct(product.id)"
                >
                  แก้ไข
                </button>
                <button 
                  class="btn btn-xs btn-outline border-gray-400 text-gray-700 hover:bg-red-600 hover:text-white hover:border-red-600" 
                  @click="deleteProductFromHome(product.id, product.name)"
                >
                  ลบ
                </button>
              </div>

              <!-- ปุ่มสำหรับลูกค้าทั่วไป -->
              <button 
                v-else
                class="btn btn-sm bg-black text-white hover:bg-gray-800 border-black disabled:bg-gray-200 disabled:text-gray-400" 
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
      class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      @click="selectedProduct = null"
    >
      <div 
        class="bg-white text-gray-900 rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-gray-200 relative max-h-[90vh] overflow-y-auto"
        @click.stop
      >
        <button 
          @click="selectedProduct = null" 
          class="btn btn-sm btn-circle btn-ghost text-black absolute right-4 top-4"
        >
          ✕
        </button>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div class="flex justify-center bg-gray-50 p-4 rounded-xl border border-gray-200">
            <img 
              v-if="selectedProduct.image_url" 
              :src="getImageUrl(selectedProduct.image_url)" 
              :alt="selectedProduct.name" 
              class="max-h-[420px] w-auto object-contain rounded-lg"
            />
            <div v-else class="h-80 w-full flex items-center justify-center text-gray-400">
              ไม่มีรูปภาพ
            </div>
          </div>

          <div class="flex flex-col h-full justify-between space-y-4">
            <div>
              <div class="flex items-center gap-2 mb-2">
                <span class="badge bg-black text-white border-black">{{ selectedProduct.rarity }}</span>
                <span class="text-sm text-gray-500">{{ selectedProduct.category_name || selectedProduct.category || 'Cardfight!! Vanguard' }}</span>
              </div>

              <h2 class="text-2xl font-bold text-black mb-3">{{ selectedProduct.name }}</h2>

              <p class="text-3xl font-extrabold text-black mb-4">
                ฿{{ Number(selectedProduct.price).toLocaleString() }}
              </p>

              <div class="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-4">
                <h3 class="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">รายละเอียดการ์ด / ความสามารถ:</h3>
                <p class="text-sm text-gray-800 whitespace-pre-line">
                  {{ selectedProduct.description || 'ไม่มีรายละเอียดเพิ่มเติมสำหรับการ์ดใบนี้' }}
                </p>
              </div>

              <p class="text-sm text-gray-700">
                สถานะคลังสินค้า: 
                <span :class="selectedProduct.stock > 0 ? 'text-black font-bold' : 'text-red-600 font-bold'">
                  {{ selectedProduct.stock > 0 ? `มีสินค้าพร้อมส่ง (${selectedProduct.stock} ใบ)` : 'สินค้าหมดชั่วคราว' }}
                </span>
              </p>
            </div>

            <div class="pt-4 border-t border-gray-200 flex justify-end gap-2">
              <button @click="selectedProduct = null" class="btn btn-ghost text-gray-700">ปิดหน้าต่าง</button>

              <template v-if="authStore.isAdmin">
                <button 
                  class="btn bg-black text-white hover:bg-gray-800 border-black" 
                  @click="goToEditProduct(selectedProduct.id)"
                >
                  แก้ไขการ์ด
                </button>
                <button 
                  class="btn btn-outline border-red-600 text-red-600 hover:bg-red-600 hover:text-white" 
                  @click="deleteProductFromHome(selectedProduct.id, selectedProduct.name)"
                >
                  ลบการ์ด
                </button>
              </template>

              <button 
                v-else
                class="btn bg-black text-white hover:bg-gray-800 border-black" 
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