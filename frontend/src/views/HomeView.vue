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

const BANNER_IMAGE = 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?q=80&w=1600&auto=format&fit=crop';

const products = ref([]);
const loading = ref(true);
const error = ref(null);
const selectedProduct = ref(null);

// อัตราแลกเปลี่ยนเงินเยนเป็นเงินบาท (ค่าเริ่มต้น 0.23 บาทต่อ 1 เยน และดึงค่าจริงอัตโนมัติเมื่อเปิดหน้าเว็บ)
const jpyToThbRate = ref(0.23);

const nonSingleTypes = [
  'บ็อกซ์ / ซองเสริม',
  'เซ็ท / เด็คพร้อมเล่น',
  'อุปกรณ์เสริม'
];

const rarityOptions = [
  'RRR', 'RR', 'R', 'C', 'OR', 'SP', 'SEC', 'DSR', 'FFR', 'FR', 'SR', 'PR'
];

// ตัวแปรสำหรับค้นหาและกรองสินค้า
const searchQuery = ref('');
const selectedFormat = ref(route.query.category || '');
const selectedProductType = ref('');
const selectedRarity = ref('');

// ดึงอัตราแลกเปลี่ยนเงินเยนล่าสุดอัตโนมัติ
const fetchExchangeRate = async () => {
  try {
    const res = await axios.get('https://open.er-api.com/v6/latest/JPY');
    if (res.data && res.data.rates && res.data.rates.THB) {
      jpyToThbRate.value = Number(res.data.rates.THB);
    }
  } catch (err) {
    // หากดึง API ค่าเงินไม่สำเร็จ ให้ใช้เรทมาตรฐาน 0.23 บาทต่อเยน
    jpyToThbRate.value = 0.23;
  }
};

// คำนวณราคาเยนเป็นเงินบาทโดยประมาณ
const convertYenToThb = (yen) => {
  if (!yen) return 0;
  return Math.round(Number(yen) * jpyToThbRate.value);
};

// สร้างลิงก์ไปหน้าเว็บ Yuyu-tei (ถ้าไม่ได้วางลิงก์ตรงไว้ จะสร้างลิงก์ค้นหาจากรหัสการ์ดหรือชื่อการ์ดให้อัตโนมัติ)
const getYuyuteiLink = (product) => {
  if (product.yuyutei_url && product.yuyutei_url.trim() !== '') {
    return product.yuyutei_url.trim();
  }
  const keyword = product.card_code ? product.card_code.trim() : product.name.trim();
  return `https://yuyu-tei.jp/sell/vg/s/search?search_word=${encodeURIComponent(keyword)}`;
};

// ตรวจสอบประเภทสินค้า
const getProductType = (product) => {
  if (!product.rarity || product.rarity === '-') return 'อุปกรณ์เสริม';
  if (nonSingleTypes.includes(product.rarity)) return product.rarity;
  return 'การ์ดแยกใบ';
};

// ดึงค่าความแรร์เฉพาะการ์ดแยกใบ
const getProductRarity = (product) => {
  if (getProductType(product) !== 'การ์ดแยกใบ') return null;
  return product.rarity;
};

watch(
  () => route.query.category,
  (newCategory) => {
    selectedFormat.value = newCategory || '';
  }
);

watch(selectedProductType, (newType) => {
  if (newType && newType !== 'การ์ดแยกใบ') {
    selectedRarity.value = '';
  }
});

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
  selectedProductType.value = '';
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

const filteredProducts = computed(() => {
  return products.value.filter((product) => {
    const prodCategory = product.category_name || product.category || '';
    const prodType = getProductType(product);
    const prodRarity = getProductRarity(product);

    const matchCategory = !selectedFormat.value || prodCategory === selectedFormat.value;
    const matchType = !selectedProductType.value || prodType === selectedProductType.value;
    const q = searchQuery.value.toLowerCase();
    const matchSearch = !q || 
      product.name.toLowerCase().includes(q) || 
      (product.card_code && product.card_code.toLowerCase().includes(q));
    const matchRarity = !selectedRarity.value || prodRarity === selectedRarity.value;

    return matchCategory && matchType && matchSearch && matchRarity;
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
  if (!confirm(`คุณต้องการลบสินค้า "${name}" ออกจากหน้าร้านใช่หรือไม่?`)) return;
  try {
    await axios.delete(`${API_URL}/api/products/${id}`, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    });
    alert('ลบสินค้าสำเร็จ!');
    if (selectedProduct.value?.id === id) selectedProduct.value = null;
    fetchProducts();
  } catch (err) {
    alert(err.response?.data?.message || 'ไม่สามารถลบสินค้านี้ได้ (อาจอยู่ในใบสั่งซื้อแล้ว)');
  }
};

const scrollToProducts = () => {
  document.getElementById('latest-products')?.scrollIntoView({ behavior: 'smooth' });
};

onMounted(() => {
  fetchExchangeRate();
  fetchProducts();
});
</script>

<template>
  <div>
    <!-- 1. Hero Banner รองรับหน้าจอมือถือ -->
    <div class="relative bg-base-300 overflow-hidden border-b border-base-300">
      <div 
        class="h-[280px] sm:h-[360px] md:h-[460px] w-full bg-cover bg-top relative flex items-center justify-center"
        :style="`background-image: linear-gradient(to bottom, rgba(15, 23, 42, 0.45), rgba(15, 23, 42, 0.92)), url('${BANNER_IMAGE}');`"
      >
        <div class="text-center px-4 max-w-3xl z-10 mt-2 sm:mt-6">
   
          <h1 class="text-3xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight mb-2 sm:mb-4 drop-shadow-lg">
            CARDFIGHT!! VANGUARD OFFICIAL SHOP
          </h1>
          <p class="text-gray-200 text-xs sm:text-sm md:text-lg mb-4 sm:mb-6 max-w-2xl mx-auto drop-shadow leading-relaxed">
            แหล่งรวมสินค้าแวนการ์ดครบวงจร ทั้งการ์ดแยกใบ บ็อกซ์บูสเตอร์ เด็คพร้อมเล่น และอุปกรณ์เสริม ครบทุก Format พร้อมระบบเทียบราคาการ์ดญี่ปุ่นจาก Yuyu-tei
          </p>
          <div class="flex flex-wrap justify-center gap-2 sm:gap-3">
            <button @click="scrollToProducts" class="btn btn-primary btn-sm sm:btn-md text-white px-5 shadow-lg">
              เลือกดูสินค้าล่าสุด
            </button>
            <button 
              v-if="authStore.isAdmin" 
              @click="goToAddProduct" 
              class="btn btn-warning btn-sm sm:btn-md text-white font-bold shadow-lg"
            >
              + เพิ่มสินค้าลงหน้าร้าน
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. แถบจุดเด่นร้านค้า -->
    <div class="max-w-7xl mx-auto px-3 sm:px-6 -mt-4 sm:-mt-6 relative z-20">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-4 bg-base-100 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl shadow-lg border border-base-300">
        <div class="px-2 sm:px-3 py-0.5 sm:py-1">
          <h3 class="font-bold text-xs sm:text-sm">รับประกันสินค้าแท้ 100%</h3>
          <p class="text-[11px] sm:text-xs text-gray-400">คัดสภาพสินค้าคุณภาพทุกชิ้นก่อนจัดส่ง</p>
        </div>
        <div class="px-2 sm:px-3 py-0.5 sm:py-1 border-t md:border-t-0 md:border-l border-base-200 pt-2 md:pt-1">
          <h3 class="font-bold text-xs sm:text-sm">เทียบราคาตลาดญี่ปุ่น (Yuyu-tei)</h3>
          <p class="text-[11px] sm:text-xs text-gray-400">แสดงเรทราคาการ์ดญี่ปุ่นโปร่งใส ตรวจสอบได้จริง</p>
        </div>
        <div class="px-2 sm:px-3 py-0.5 sm:py-1 border-t md:border-t-0 md:border-l border-base-200 pt-2 md:pt-1">
          <h3 class="font-bold text-xs sm:text-sm">จัดส่งไว เช็คเลขพัสดุได้</h3>
          <p class="text-[11px] sm:text-xs text-gray-400">แจ้งเตือนเลขพัสดุทางอีเมลอัตโนมัติ</p>
        </div>
      </div>
    </div>

    <!-- 3. ส่วนแสดงรายการสินค้าล่าสุด + ตัวค้นหา -->
    <div id="latest-products" class="p-3 sm:p-6 max-w-7xl mx-auto mt-4 sm:mt-6">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 sm:mb-6 border-b border-base-300 pb-3 sm:pb-4">
        <div>
          <h2 class="text-xl sm:text-2xl md:text-3xl font-bold flex flex-wrap items-center gap-2">
            <span>{{ selectedFormat ? `หมวดหมู่: ${selectedFormat}` : 'รายการสินค้าล่าสุด' }}</span>
            <span class="badge badge-neutral text-xs">{{ filteredProducts.length }} รายการ</span>
          </h2>
          <p class="text-xs sm:text-sm text-gray-400 mt-1">คลิกที่รูปสินค้าเพื่อดูภาพขนาดใหญ่ รายละเอียด และเทียบราคาตลาดญี่ปุ่น</p>
        </div>

        <button 
          v-if="authStore.isAdmin" 
          @click="goToAddProduct" 
          class="btn btn-primary btn-sm text-white w-full sm:w-auto"
        >
          + เพิ่มสินค้าใหม่
        </button>
      </div>

      <!-- แถบค้นหาชื่อสินค้า / รหัสการ์ด + ตัวกรอง -->
      <div class="flex flex-col lg:flex-row gap-2.5 sm:gap-3 mb-6 sm:mb-8">
        <input 
          type="text" 
          v-model="searchQuery" 
          placeholder="ค้นหาชื่อสินค้า หรือรหัสการ์ด (เช่น DZ-BT16)..." 
          class="input input-bordered input-sm sm:input-md w-full lg:flex-1"
        />

        <div class="grid grid-cols-2 sm:grid-cols-3 lg:flex gap-2 sm:gap-3">
          <!-- เลือก Format -->
          <select 
            v-model="selectedFormat" 
            @change="handleFormatChange"
            class="select select-bordered select-sm sm:select-md w-full lg:w-48 text-xs sm:text-sm"
          >
            <option value="">ทุกหมวดหมู่ Format</option>
            <option value="แวนการ์ด D ไทย">แวนการ์ด D ไทย</option>
            <option value="แวนการ์ด D JP">แวนการ์ด D JP</option>
            <option value="แวนการ์ด Premium">แวนการ์ด Premium</option>
            <option value="อุปกรณ์เสริมการ์ด">อุปกรณ์เสริม / ทั่วไป</option>
          </select>

          <!-- เลือกประเภทสินค้า -->
          <select 
            v-model="selectedProductType" 
            class="select select-bordered select-sm sm:select-md w-full lg:w-48 text-xs sm:text-sm"
          >
            <option value="">ทุกประเภทสินค้า</option>
            <option value="การ์ดแยกใบ">การ์ดแยกใบ</option>
            <option value="บ็อกซ์ / ซองเสริม">บ็อกซ์ / ซองเสริม</option>
            <option value="เซ็ท / เด็คพร้อมเล่น">เซ็ท / เด็คพร้อมเล่น</option>
            <option value="อุปกรณ์เสริม">อุปกรณ์เสริม</option>
          </select>

          <!-- เลือกระดับความแรร์ -->
          <select 
            v-if="!selectedProductType || selectedProductType === 'การ์ดแยกใบ'"
            v-model="selectedRarity" 
            class="select select-bordered select-sm sm:select-md w-full lg:w-44 text-xs sm:text-sm col-span-2 sm:col-span-1"
          >
            <option value="">ความแรร์ทั้งหมด</option>
            <option v-for="r in rarityOptions" :key="r" :value="r">{{ r }}</option>
          </select>
        </div>

        <button 
          v-if="selectedFormat || selectedProductType || searchQuery || selectedRarity" 
          @click="clearFilters" 
          class="btn btn-ghost btn-sm sm:btn-md"
        >
          ล้างตัวกรอง
        </button>
      </div>

      <div v-if="loading" class="text-center py-10">
        <span class="loading loading-spinner loading-lg text-primary"></span>
        <p class="mt-2 text-base sm:text-lg">กำลังโหลดข้อมูลสินค้า...</p>
      </div>
      <div v-else-if="error" class="text-center text-error text-sm sm:text-base">{{ error }}</div>

      <div v-else-if="filteredProducts.length === 0" class="text-center py-12 sm:py-16 bg-base-100 rounded-2xl border border-base-300 px-4">
        <p class="text-gray-400 text-sm sm:text-lg mb-3">ยังไม่มีสินค้าในหมวดหมู่นี้ หรือไม่พบสินค้าที่ค้นหา</p>
        <button @click="clearFilters" class="btn btn-outline btn-sm">
          ดูสินค้าทั้งหมด
        </button>
      </div>

      <!-- ตารางแสดงสินค้า -->
      <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-6">
        <div 
          v-for="product in filteredProducts" 
          :key="product.id" 
          class="card bg-base-100 shadow-md sm:shadow-xl border border-base-300 hover:border-primary transition-all duration-200"
        >
          <figure 
            class="px-2.5 pt-2.5 sm:px-4 sm:pt-4 cursor-pointer relative group" 
            @click="selectedProduct = product"
          >
            <img 
              v-if="product.image_url" 
              :src="getImageUrl(product.image_url)" 
              :alt="product.name" 
              class="rounded-lg sm:rounded-xl h-36 sm:h-56 object-contain w-full group-hover:scale-105 transition-transform duration-200"
            />
            <div v-else class="rounded-lg sm:rounded-xl h-36 sm:h-56 w-full bg-base-200 flex items-center justify-center text-gray-400 text-xs sm:text-sm">
              ไม่มีรูปภาพ
            </div>
            <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all hidden sm:flex items-center justify-center rounded-xl m-4">
              <span class="badge badge-neutral opacity-0 group-hover:opacity-100 transition-opacity">คลิกดูรายละเอียด</span>
            </div>
          </figure>

          <div class="card-body p-2.5 sm:p-4">
            <div v-if="product.card_code" class="text-[10px] sm:text-xs font-mono text-info truncate">
              {{ product.card_code }}
            </div>

            <h2 
              class="font-bold text-xs sm:text-lg leading-snug h-9 sm:h-14 line-clamp-2 overflow-hidden cursor-pointer hover:text-primary transition-colors"
              @click="selectedProduct = product"
            >
              {{ product.name }}
            </h2>
            
            <div class="flex flex-wrap justify-between items-center gap-1 text-[10px] sm:text-xs text-gray-400 my-1">
              <span class="truncate max-w-[85px] sm:max-w-[140px]">{{ product.category_name || product.category || 'ไม่ระบุ' }}</span>
              <span v-if="getProductRarity(product)" class="badge badge-outline badge-xs sm:badge-sm">
                {{ getProductRarity(product) }}
              </span>
              <span v-else class="badge badge-ghost badge-xs sm:badge-sm truncate max-w-[90px] sm:max-w-none">
                {{ getProductType(product) }}
              </span>
            </div>

            <!-- กล่องแสดงราคาเทียบเว็บญี่ปุ่น Yuyu-tei บนหน้าการ์ดสินค้า -->
            <div 
              v-if="product.yuyutei_price" 
              class="bg-base-200/90 border border-base-300 rounded-lg px-2 py-1.5 my-1 text-[10px] sm:text-xs"
            >
              <div class="flex justify-between items-center">
                <span class="text-gray-400">Yuyu-tei (JP):</span>
                <span class="font-bold text-warning">
                  {{ Number(product.yuyutei_price).toLocaleString() }} 円 (~฿{{ convertYenToThb(product.yuyutei_price).toLocaleString() }})
                </span>
              </div>
            </div>

            <div class="flex flex-col sm:flex-row justify-between sm:items-end gap-2 mt-auto pt-2 border-t border-base-200">
              <div>
                <p class="text-sm sm:text-xl font-bold text-primary">฿{{ Number(product.price).toLocaleString() }}</p>
                <p class="text-[10px] sm:text-xs" :class="product.stock > 0 ? 'text-success' : 'text-error'">
                  คลัง: {{ product.stock }} ชิ้น
                </p>
              </div>
              
              <!-- ปุ่มสำหรับ Admin -->
              <div v-if="authStore.isAdmin" class="flex gap-1 w-full sm:w-auto">
                <button 
                  class="btn btn-info btn-xs text-white flex-1 sm:flex-initial" 
                  @click="goToEditProduct(product.id)"
                >
                  แก้ไข
                </button>
                <button 
                  class="btn btn-error btn-xs text-white flex-1 sm:flex-initial" 
                  @click="deleteProductFromHome(product.id, product.name)"
                >
                  ลบ
                </button>
              </div>

              <!-- ปุ่มสำหรับลูกค้าทั่วไป -->
              <button 
                v-else
                class="btn btn-primary btn-xs sm:btn-sm text-white w-full sm:w-auto" 
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

    <!-- Modal แสดงรายละเอียดสินค้าและตารางเปรียบเทียบราคา Yuyu-tei -->
    <div 
      v-if="selectedProduct" 
      class="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-3 sm:p-4"
      @click="selectedProduct = null"
    >
      <div 
        class="bg-base-100 rounded-2xl max-w-3xl w-full p-4 sm:p-6 shadow-2xl border border-base-300 relative max-h-[90vh] overflow-y-auto"
        @click.stop
      >
        <button 
          @click="selectedProduct = null" 
          class="btn btn-sm btn-circle btn-ghost absolute right-3 top-3 z-10 bg-base-200/80"
        >
          ✕
        </button>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-center">
          <div class="flex justify-center bg-base-200 p-3 sm:p-4 rounded-xl">
            <img 
              v-if="selectedProduct.image_url" 
              :src="getImageUrl(selectedProduct.image_url)" 
              :alt="selectedProduct.name" 
              class="max-h-[240px] sm:max-h-[420px] w-auto object-contain rounded-lg shadow-md"
            />
            <div v-else class="h-52 sm:h-80 w-full flex items-center justify-center text-gray-400">
              ไม่มีรูปภาพ
            </div>
          </div>

          <div class="flex flex-col h-full justify-between space-y-3 sm:space-y-4">
            <div>
              <div class="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2">
                <span class="badge badge-neutral badge-sm sm:badge-md">{{ getProductType(selectedProduct) }}</span>
                <span v-if="getProductRarity(selectedProduct)" class="badge badge-primary badge-sm sm:badge-md text-white">
                  ความแรร์: {{ getProductRarity(selectedProduct) }}
                </span>
                <span v-if="selectedProduct.card_code" class="badge badge-info badge-outline badge-sm sm:badge-md font-mono">
                  {{ selectedProduct.card_code }}
                </span>
                <span class="text-xs sm:text-sm text-gray-400">
                  {{ selectedProduct.category_name || selectedProduct.category || 'Cardfight!! Vanguard' }}
                </span>
              </div>

              <h2 class="text-lg sm:text-2xl font-bold mb-2 sm:mb-3">{{ selectedProduct.name }}</h2>

              <div class="flex items-baseline gap-3 mb-3">
                <p class="text-2xl sm:text-3xl font-bold text-primary">
                  ฿{{ Number(selectedProduct.price).toLocaleString() }}
                </p>
                <span class="text-xs text-gray-400">ราคาจำหน่ายหน้าร้าน</span>
              </div>

              <!-- กล่องเปรียบเทียบราคาตลาดญี่ปุ่น (Yuyu-tei.jp) -->
              <div 
                v-if="selectedProduct.yuyutei_price || selectedProduct.card_code || selectedProduct.yuyutei_url" 
                class="bg-base-200 p-3.5 rounded-xl border border-primary/40 mb-3 sm:mb-4 space-y-2"
              >
                <div class="flex items-center justify-between border-b border-base-300 pb-2">
                  <span class="text-xs sm:text-sm font-bold text-warning">เปรียบเทียบราคาตลาดญี่ปุ่น (Yuyu-tei)</span>
                  <span v-if="selectedProduct.card_code" class="text-xs font-mono text-gray-300">
                    รหัส: {{ selectedProduct.card_code }}
                  </span>
                </div>

                <div v-if="selectedProduct.yuyutei_price" class="grid grid-cols-2 gap-2 text-xs sm:text-sm py-1">
                  <div>
                    <p class="text-gray-400 text-xs">ราคาบนเว็บ Yuyu-tei:</p>
                    <p class="font-bold text-base sm:text-lg text-white">
                      {{ Number(selectedProduct.yuyutei_price).toLocaleString() }} 円
                    </p>
                  </div>
                  <div>
                    <p class="text-gray-400 text-xs">คิดเป็นเงินไทย (เรท {{ jpyToThbRate.toFixed(3) }}):</p>
                    <p class="font-bold text-base sm:text-lg text-warning">
                      ~฿{{ convertYenToThb(selectedProduct.yuyutei_price).toLocaleString() }}
                    </p>
                  </div>
                </div>

                <!-- แสดงส่วนต่างราคา -->
                <div v-if="selectedProduct.yuyutei_price" class="text-xs pt-1">
                  <span 
                    v-if="Number(selectedProduct.price) < convertYenToThb(selectedProduct.yuyutei_price)" 
                    class="badge badge-success badge-sm text-white"
                  >
                    ราคาหน้าร้านถูกกว่าญี่ปุ่นประมาณ ฿{{ (convertYenToThb(selectedProduct.yuyutei_price) - Number(selectedProduct.price)).toLocaleString() }}
                  </span>
                  <span 
                    v-else-if="Number(selectedProduct.price) === convertYenToThb(selectedProduct.yuyutei_price)" 
                    class="badge badge-info badge-sm text-white"
                  >
                    ราคาเท่ากับเรทตลาดญี่ปุ่น
                  </span>
                  <span v-else class="text-gray-400">
                    * ราคาหน้าร้านรวมค่าขนส่งและภาษีนำเข้าจากญี่ปุ่นแล้ว
                  </span>
                </div>

                <div class="pt-1">
                  <a 
                    :href="getYuyuteiLink(selectedProduct)" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    class="btn btn-outline btn-warning btn-xs sm:btn-sm w-full"
                  >
                    เปิดดูราคาการ์ดใบนี้บนเว็บ Yuyu-tei.jp
                  </a>
                </div>
              </div>

              <div class="bg-base-200 p-3 sm:p-4 rounded-xl mb-3 sm:mb-4">
                <h3 class="text-xs sm:text-sm font-semibold text-gray-400 mb-1">รายละเอียดสินค้า:</h3>
                <p class="text-xs sm:text-sm whitespace-pre-line">
                  {{ selectedProduct.description || 'ไม่มีรายละเอียดเพิ่มเติมสำหรับสินค้านี้' }}
                </p>
              </div>

              <p class="text-xs sm:text-sm">
                สถานะคลังสินค้า: 
                <span :class="selectedProduct.stock > 0 ? 'text-success font-bold' : 'text-error font-bold'">
                  {{ selectedProduct.stock > 0 ? `มีสินค้าพร้อมส่ง (${selectedProduct.stock} ชิ้น)` : 'สินค้าหมดชั่วคราว' }}
                </span>
              </p>
            </div>

            <div class="pt-3 sm:pt-4 border-t border-base-300 flex flex-wrap justify-end gap-2">
              <button @click="selectedProduct = null" class="btn btn-ghost btn-sm sm:btn-md">ปิดหน้าต่าง</button>

              <template v-if="authStore.isAdmin">
                <button 
                  class="btn btn-info btn-sm sm:btn-md text-white" 
                  @click="goToEditProduct(selectedProduct.id)"
                >
                  แก้ไขสินค้า
                </button>
                <button 
                  class="btn btn-error btn-sm sm:btn-md text-white" 
                  @click="deleteProductFromHome(selectedProduct.id, selectedProduct.name)"
                >
                  ลบสินค้า
                </button>
              </template>

              <button 
                v-else
                class="btn btn-primary btn-sm sm:btn-md text-white flex-1 sm:flex-initial" 
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