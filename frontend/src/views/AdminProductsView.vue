<script setup>
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';
import { useAuthStore } from '../stores/auth';
import { useCardGamesStore } from '../stores/cardGames';
import { useRouter, useRoute } from 'vue-router';

const authStore = useAuthStore();
const cardGamesStore = useCardGamesStore();
const router = useRouter();
const route = useRoute();

const API_URL = 'https://card-shop-project.onrender.com';

const products = ref([]);
const loading = ref(true);
const isSubmitting = ref(false);

const showModal = ref(false);
const isEditMode = ref(false);
const editingId = ref(null);

// Modal จัดการการ์ดเกมและความแรร์
const showGameModal = ref(false);
const editingGameId = ref(null);
const gameForm = ref({
  name: '',
  formats: '',
  rarities: ''
});

const nonSingleTypes = [
  'บ็อกซ์ / ซองเสริม',
  'เซ็ท / เด็คพร้อมเล่น',
  'อุปกรณ์เสริม'
];

const formData = ref({
  name: '',
  product_type: 'การ์ดแยกใบ',
  category: 'แวนการ์ด D ไทย',
  rarity: 'RRR',
  price: '',
  stock: '',
  description: '',
  card_code: '',
  yuyutei_price: '',
  yuyutei_url: ''
});

// ดึงระดับความแรร์ตามหมวดหมู่/การ์ดเกมที่เลือก
const currentRarityOptions = computed(() => {
  return cardGamesStore.getRaritiesForCategory(formData.value.category) || cardGamesStore.vanguardGame.rarities;
});

const onCategoryChange = () => {
  const rarities = cardGamesStore.getRaritiesForCategory(formData.value.category);
  if (rarities && rarities.length > 0) {
    if (!rarities.includes(formData.value.rarity)) {
      formData.value.rarity = rarities[0];
    }
  }
};

const openGameModal = () => {
  editingGameId.value = null;
  gameForm.value = { name: '', formats: '', rarities: '' };
  showGameModal.value = true;
};

const editGame = (game) => {
  editingGameId.value = game.id;
  gameForm.value = {
    name: game.name,
    formats: (game.formats || []).join(', '),
    rarities: (game.rarities || []).join(', ')
  };
};

const cancelEditGame = () => {
  editingGameId.value = null;
  gameForm.value = { name: '', formats: '', rarities: '' };
};

const saveGame = () => {
  if (!gameForm.value.name.trim()) {
    alert('กรุณากรอกชื่อการ์ดเกม');
    return;
  }
  if (editingGameId.value) {
    cardGamesStore.updateGame(editingGameId.value, {
      name: gameForm.value.name,
      formats: gameForm.value.formats,
      rarities: gameForm.value.rarities
    });
    alert('แก้ไขข้อมูลการ์ดเกมสำเร็จ');
  } else {
    cardGamesStore.addGame({
      name: gameForm.value.name,
      formats: gameForm.value.formats,
      rarities: gameForm.value.rarities
    });
    alert('เพิ่มการ์ดเกมและความแรร์ใหม่สำเร็จ');
  }
  cancelEditGame();
};

const removeGame = (game) => {
  if (game.isVanguard) {
    alert('ไม่สามารถลบการ์ดเกมแวนการ์ดได้');
    return;
  }
  if (confirm(`คุณต้องการลบการ์ดเกม "${game.name}" ใช่หรือไม่?`)) {
    cardGamesStore.deleteGame(game.id);
  }
};

const imageFile = ref(null);
const imagePreview = ref('');

// เช็คว่าเป็นสินค้าที่ควรแสดงช่องกรอกเทียบราคาญี่ปุ่นหรือไม่ (เฉพาะการ์ดแยกใบ ในหมวด JP หรือ Premium)
const showYuyuteiFields = computed(() => {
  return formData.value.product_type === 'การ์ดแยกใบ' && 
    (formData.value.category === 'แวนการ์ด D JP' || formData.value.category === 'แวนการ์ด Premium');
});

const getProductType = (product) => {
  if (!product.rarity || product.rarity === '-') return 'สินค้าทั่วไป';
  if (nonSingleTypes.includes(product.rarity)) return product.rarity;
  return 'การ์ดแยกใบ';
};

const getProductRarity = (product) => {
  if (getProductType(product) !== 'การ์ดแยกใบ') return '-';
  return product.rarity || '-';
};

const fetchProducts = async () => {
  loading.value = true;
  try {
    const res = await axios.get(`${API_URL}/api/products`);
    products.value = res.data;
  } catch (error) {
    console.error(error);
    alert('ไม่สามารถโหลดข้อมูลสินค้าได้');
  } finally {
    loading.value = false;
  }
};

const getImageUrl = (img) => {
  if (!img) return '';
  if (img.startsWith('data:image') || img.startsWith('http')) return img;
  const fileName = img.replace(/^\/?uploads[\/\\]/, '');
  return `${API_URL}/uploads/${fileName}`;
};

const openAddModal = () => {
  isEditMode.value = false;
  editingId.value = null;
  const defaultCategory = cardGamesStore.vanguardGame.formats[0] || 'แวนการ์ด D ไทย';
  const defaultRarity = cardGamesStore.getRaritiesForCategory(defaultCategory)[0] || 'RRR';

  formData.value = {
    name: '',
    product_type: 'การ์ดแยกใบ',
    category: defaultCategory,
    rarity: defaultRarity,
    price: '',
    stock: '',
    description: '',
    card_code: '',
    yuyutei_price: '',
    yuyutei_url: ''
  };
  imageFile.value = null;
  imagePreview.value = '';
  showModal.value = true;
};

const openEditModal = (product) => {
  isEditMode.value = true;
  editingId.value = product.id;

  const detectedType = getProductType(product);
  const detectedRarity = detectedType === 'การ์ดแยกใบ' 
    ? (product.rarity === 'Common' ? 'C' : (product.rarity || 'RRR')) 
    : 'RRR';

  formData.value = {
    name: product.name,
    product_type: detectedType === 'สินค้าทั่วไป' ? 'อุปกรณ์เสริม' : detectedType,
    category: product.category_name || product.category || 'แวนการ์ด D ไทย',
    rarity: detectedRarity,
    price: product.price,
    stock: product.stock,
    description: product.description || '',
    card_code: product.card_code || '',
    yuyutei_price: product.yuyutei_price || '',
    yuyutei_url: product.yuyutei_url || ''
  };
  imageFile.value = null;
  imagePreview.value = getImageUrl(product.image_url);
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  if (route.query.edit || route.query.action) {
    router.replace({ path: '/admin/products' });
  }
};

const handleFileChange = (e) => {
  const file = e.target.files[0];
  if (file) {
    imageFile.value = file;
    imagePreview.value = URL.createObjectURL(file);
  }
};

const saveProduct = async () => {
  isSubmitting.value = true;
  try {
    const data = new FormData();
    data.append('name', formData.value.name);
    data.append('category', formData.value.category);
    
    const rarityOrType = formData.value.product_type === 'การ์ดแยกใบ' 
      ? formData.value.rarity 
      : formData.value.product_type;
    data.append('rarity', rarityOrType);

    data.append('price', formData.value.price);
    data.append('stock', formData.value.stock);
    data.append('description', formData.value.description);

    if (showYuyuteiFields.value) {
      data.append('card_code', formData.value.card_code.trim());
      data.append('yuyutei_price', formData.value.yuyutei_price);
      data.append('yuyutei_url', formData.value.yuyutei_url.trim());
    } else {
      data.append('card_code', '');
      data.append('yuyutei_price', '');
      data.append('yuyutei_url', '');
    }

    if (imageFile.value) {
      data.append('image', imageFile.value);
    }

    const config = {
      headers: {
        Authorization: `Bearer ${authStore.token}`,
        'Content-Type': 'multipart/form-data'
      }
    };

    if (isEditMode.value) {
      await axios.put(`${API_URL}/api/products/${editingId.value}`, data, config);
      alert('แก้ไขข้อมูลสินค้าสำเร็จ!');
    } else {
      await axios.post(`${API_URL}/api/products`, data, config);
      alert('เพิ่มสินค้าใหม่สำเร็จ!');
    }

    closeModal();
    await fetchProducts();
  } catch (error) {
    console.error(error);
    alert(error.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
  } finally {
    isSubmitting.value = false;
  }
};

const deleteProduct = async (id, name) => {
  if (!confirm(`คุณต้องการลบสินค้า "${name}" ใช่หรือไม่?`)) return;
  try {
    await axios.delete(`${API_URL}/api/products/${id}`, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    });
    alert('ลบสินค้าสำเร็จ!');
    fetchProducts();
  } catch (error) {
    alert(error.response?.data?.message || 'ไม่สามารถลบสินค้านี้ได้');
  }
};

onMounted(async () => {
  if (!authStore.isAdmin) {
    alert('สำหรับผู้ดูแลระบบ (Admin) เท่านั้น');
    router.push('/');
    return;
  }
  await fetchProducts();

  if (route.query.edit) {
    const targetProduct = products.value.find(p => p.id === Number(route.query.edit));
    if (targetProduct) openEditModal(targetProduct);
    router.replace({ path: '/admin/products' });
  } else if (route.query.action === 'add') {
    openAddModal();
    router.replace({ path: '/admin/products' });
  }
});
</script>

<template>
  <div class="p-3 sm:p-6 max-w-6xl mx-auto">
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
      <h1 class="text-2xl sm:text-3xl font-bold text-slate-900">จัดการคลังสินค้า (Admin)</h1>
      <div class="flex flex-wrap items-center gap-2 w-full sm:w-auto">
        <button @click="openGameModal" class="btn btn-outline btn-sm sm:btn-md font-semibold text-slate-700">
          จัดการการ์ดเกม & ความแรร์
        </button>
        <button @click="openAddModal" class="btn btn-primary btn-sm sm:btn-md text-white font-semibold hover:bg-green-500">
          + เพิ่มสินค้าใหม่
        </button>
      </div>
    </div>

    <div v-if="loading" class="text-center py-10">
      <span class="loading loading-spinner loading-lg text-primary"></span>
      <p class="mt-2 text-slate-600">กำลังโหลดคลังสินค้า...</p>
    </div>

    <div v-else>
      <!-- มุมมองการ์ดสำหรับหน้าจอมือถือ -->
      <div class="grid grid-cols-1 gap-3 md:hidden">
        <div 
          v-for="product in products" 
          :key="product.id" 
          class="bg-base-100 p-3 rounded-xl shadow border border-base-300 flex gap-3 items-center"
        >
          <div class="w-16 h-20 bg-base-200 rounded flex items-center justify-center overflow-hidden border border-base-300 shrink-0">
            <img v-if="product.image_url" :src="getImageUrl(product.image_url)" class="w-full h-full object-contain" />
            <span v-else class="text-[10px] text-slate-500">ไม่มีรูป</span>
          </div>

          <div class="flex-1 min-w-0">
            <h3 class="font-bold text-sm text-slate-900 truncate">{{ product.name }}</h3>
            <p class="text-xs text-slate-600 truncate">
              {{ product.category_name || product.category }}
              <span v-if="product.card_code" class="text-sky-600 font-mono font-semibold ml-1">[{{ product.card_code }}]</span>
            </p>
            <div class="flex flex-wrap gap-1 mt-1">
              <span class="badge badge-ghost badge-xs text-slate-700">{{ getProductType(product) }}</span>
              <span v-if="getProductRarity(product) !== '-'" class="badge badge-outline badge-xs text-slate-800 font-medium">
                {{ getProductRarity(product) }}
              </span>
              <span v-if="product.yuyutei_price" class="badge badge-warning badge-xs text-slate-900 font-semibold">
                Yuyu-tei: {{ Number(product.yuyutei_price).toLocaleString() }} 円
              </span>
            </div>
            <div class="flex justify-between items-center mt-2">
              <span class="text-primary font-bold text-sm">฿{{ Number(product.price).toLocaleString() }}</span>
              <span class="text-xs font-medium" :class="product.stock > 0 ? 'text-emerald-700' : 'text-rose-600 font-bold'">
                คลัง: {{ product.stock }} ชิ้น
              </span>
            </div>
            <div class="flex gap-2 mt-2 pt-2 border-t border-base-200">
              <button @click="openEditModal(product)" class="btn btn-info btn-xs text-slate-900 font-bold shadow-sm flex-1">
                แก้ไข / เพิ่มรูป
              </button>
              <button @click="deleteProduct(product.id, product.name)" class="btn btn-error btn-xs text-white font-bold shadow-sm">
                ลบ
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- มุมมองตารางสำหรับจอคอมพิวเตอร์ -->
      <div class="hidden md:block overflow-x-auto bg-base-100 rounded-xl shadow border border-base-300">
        <table class="table w-full">
          <thead>
            <tr class="bg-base-200 text-sm text-slate-800">
              <th>รูปภาพ</th>
              <th>ชื่อสินค้า / รหัสการ์ด</th>
              <th>ประเภทสินค้า</th>
              <th>หมวดหมู่ Format</th>
              <th>ความแรร์</th>
              <th>ราคาหน้าร้าน</th>
              <th>ราคา Yuyu-tei</th>
              <th>สต็อก</th>
              <th class="text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="product in products" :key="product.id" class="hover text-slate-800">
              <td>
                <div class="w-16 h-20 bg-base-200 rounded flex items-center justify-center overflow-hidden border border-base-300">
                  <img v-if="product.image_url" :src="getImageUrl(product.image_url)" class="w-full h-full object-contain" />
                  <span v-else class="text-xs text-slate-500">ไม่มีรูป</span>
                </div>
              </td>
              <td>
                <div class="font-bold text-slate-900">{{ product.name }}</div>
                <div v-if="product.card_code" class="text-xs text-sky-600 font-mono font-semibold mt-0.5">
                  รหัส: {{ product.card_code }}
                </div>
              </td>
              <td>
                <span class="badge badge-ghost badge-sm text-slate-700">{{ getProductType(product) }}</span>
              </td>
              <td class="font-medium text-slate-700">{{ product.category_name || product.category }}</td>
              <td>
                <span v-if="getProductRarity(product) !== '-'" class="badge badge-outline font-semibold text-slate-800">
                  {{ getProductRarity(product) }}
                </span>
                <span v-else class="text-slate-400">-</span>
              </td>
              <td class="text-primary font-bold text-base">฿{{ Number(product.price).toLocaleString() }}</td>
              <td>
                <span v-if="product.yuyutei_price" class="badge badge-warning text-slate-900 font-bold">
                  {{ Number(product.yuyutei_price).toLocaleString() }} 円
                </span>
                <span v-else class="text-slate-400 text-xs">-</span>
              </td>
              <td>
                <span class="font-semibold" :class="product.stock > 0 ? 'text-emerald-700' : 'text-rose-600 font-bold'">
                  {{ product.stock }} ชิ้น
                </span>
              </td>
              <td class="text-center space-x-2">
                <button @click="openEditModal(product)" class="btn btn-info btn-xs text-slate-900 font-bold shadow-sm">
                  แก้ไข / เพิ่มรูป
                </button>
                <button @click="deleteProduct(product.id, product.name)" class="btn btn-error btn-xs text-white font-bold shadow-sm">
                  ลบ
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal ฟอร์มเพิ่ม/แก้ไขสินค้า -->
    <div v-if="showModal" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-3 sm:p-4">
      <div class="bg-base-100 p-4 sm:p-6 rounded-xl max-w-lg w-full shadow-2xl border border-base-300 max-h-[90vh] overflow-y-auto">
        <h2 class="text-xl sm:text-2xl font-bold mb-4 text-slate-900">
          {{ isEditMode ? 'แก้ไขข้อมูลสินค้า' : 'เพิ่มสินค้าใหม่' }}
        </h2>

        <form @submit.prevent="saveProduct" class="space-y-3">
          <div class="form-control">
            <label class="label py-1"><span class="label-text font-semibold text-slate-700">ชื่อสินค้า *</span></label>
            <input type="text" v-model="formData.name" class="input input-bordered input-sm sm:input-md w-full" required />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="form-control">
              <label class="label py-1"><span class="label-text font-semibold text-slate-700">ประเภทสินค้า *</span></label>
              <select v-model="formData.product_type" class="select select-bordered select-sm sm:select-md w-full" required>
                <option value="การ์ดแยกใบ">การ์ดแยกใบ</option>
                <option value="บ็อกซ์ / ซองเสริม">บ็อกซ์ / ซองเสริม</option>
                <option value="เซ็ท / เด็คพร้อมเล่น">เซ็ท / เด็คพร้อมเล่น</option>
                <option value="อุปกรณ์เสริม">อุปกรณ์เสริม</option>
              </select>
            </div>

            <div class="form-control">
              <label class="label py-1"><span class="label-text font-semibold text-slate-700">หมวดหมู่ Format / การ์ดเกม *</span></label>
              <select v-model="formData.category" @change="onCategoryChange" class="select select-bordered select-sm sm:select-md w-full" required>
                <optgroup v-for="game in cardGamesStore.games" :key="game.id" :label="game.name">
                  <option v-for="fmt in game.formats" :key="fmt" :value="fmt">{{ fmt }}</option>
                </optgroup>
                <optgroup label="สินค้าทั่วไป">
                  <option value="อุปกรณ์เสริมการ์ด">อุปกรณ์เสริม / ทั่วไป</option>
                </optgroup>
              </select>
            </div>
          </div>

          <div v-if="formData.product_type === 'การ์ดแยกใบ'" class="form-control">
            <div class="flex justify-between items-center py-1">
              <label class="label-text font-semibold text-slate-700">ระดับความแรร์ (Rarity) *</label>
              <span class="text-[11px] text-slate-400">อิงตามการ์ดเกมที่เลือก</span>
            </div>
            <select v-model="formData.rarity" class="select select-bordered select-sm sm:select-md w-full" required>
              <option v-for="r in currentRarityOptions" :key="r" :value="r">{{ r }}</option>
            </select>
          </div>

          <!-- ส่วนข้อมูลเทียบราคาเว็บญี่ปุ่น Yuyu-tei -->
          <div v-if="showYuyuteiFields" class="bg-amber-50/70 border border-amber-300 p-3.5 rounded-xl space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs sm:text-sm font-bold text-amber-900">ข้อมูลเทียบราคาตลาดญี่ปุ่น (Yuyu-tei.jp)</span>
              <span class="badge badge-warning badge-xs font-bold text-slate-900">JP Format</span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="form-control">
                <label class="label py-0.5"><span class="label-text text-xs font-semibold text-slate-700">รหัสการ์ด (เช่น DZ-BT16/021)</span></label>
                <input 
                  type="text" 
                  v-model="formData.card_code" 
                  placeholder="เช่น DZ-BT16/021" 
                  class="input input-bordered input-sm w-full bg-white text-slate-900" 
                />
              </div>

              <div class="form-control">
                <label class="label py-0.5"><span class="label-text text-xs font-semibold text-slate-700">ราคาบน Yuyu-tei (หน่วย: เยน 円)</span></label>
                <input 
                  type="number" 
                  v-model="formData.yuyutei_price" 
                  placeholder="เช่น 320" 
                  class="input input-bordered input-sm w-full bg-white text-slate-900" 
                />
              </div>
            </div>

            <div class="form-control">
              <label class="label py-0.5">
                <span class="label-text text-xs font-semibold text-slate-700">ลิงก์หน้าการ์ดบนเว็บ Yuyu-tei (เว้นว่างได้ ระบบจะใช้รหัสการ์ดสร้างลิงก์ให้อัตโนมัติ)</span>
              </label>
              <input 
                type="url" 
                v-model="formData.yuyutei_url" 
                placeholder="https://yuyu-tei.jp/..." 
                class="input input-bordered input-sm w-full bg-white text-slate-900" 
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="form-control">
              <label class="label py-1"><span class="label-text font-semibold text-slate-700">ราคาหน้าร้าน (บาท) *</span></label>
              <input type="number" step="0.01" v-model="formData.price" class="input input-bordered input-sm sm:input-md w-full" required />
            </div>
            <div class="form-control">
              <label class="label py-1"><span class="label-text font-semibold text-slate-700">จำนวนในคลัง (ชิ้น) *</span></label>
              <input type="number" v-model="formData.stock" class="input input-bordered input-sm sm:input-md w-full" required />
            </div>
          </div>

          <div class="form-control">
            <label class="label py-1"><span class="label-text font-semibold text-slate-700">รายละเอียดสินค้า (แสดงเมื่อคลิกดูสินค้า)</span></label>
            <textarea 
              v-model="formData.description" 
              class="textarea textarea-bordered h-20 w-full text-sm" 
              placeholder="กรอกรายละเอียดสินค้า เอฟเฟกต์การ์ด หรือข้อมูลชุดสินค้า..."
            ></textarea>
          </div>

          <div class="form-control">
            <label class="label py-1"><span class="label-text font-semibold text-slate-700">รูปภาพสินค้า</span></label>
            <input type="file" @change="handleFileChange" accept=".png, .jpg, .jpeg" class="file-input file-input-bordered file-input-sm sm:file-input-md w-full" />
            
            <div v-if="imagePreview" class="mt-3 flex justify-center">
              <img :src="imagePreview" class="h-36 sm:h-40 object-contain rounded border border-base-300 p-1" />
            </div>
          </div>

          <div class="flex justify-end space-x-2 pt-4 border-t border-base-200 mt-4">
            <button type="button" @click="closeModal" class="btn btn-ghost btn-sm sm:btn-md text-slate-600">ยกเลิก</button>
            <button type="submit" class="btn btn-primary btn-sm sm:btn-md text-white font-semibold" :disabled="isSubmitting">
              <span v-if="isSubmitting" class="loading loading-spinner"></span>
              บันทึกข้อมูล
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal จัดการการ์ดเกมและระดับความแรร์ -->
    <div v-if="showGameModal" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-3 sm:p-4">
      <div class="bg-base-100 p-4 sm:p-6 rounded-2xl max-w-2xl w-full shadow-2xl border border-base-300 max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center pb-3 border-b border-base-200">
          <h2 class="text-xl font-bold text-slate-900">จัดการการ์ดเกมและระดับความแรร์</h2>
          <button @click="showGameModal = false" class="btn btn-sm btn-circle btn-ghost">✕</button>
        </div>

        <!-- รายการการ์ดเกมที่มีอยู่ -->
        <div class="mt-4 space-y-3">
          <h3 class="text-sm font-bold text-slate-700">รายการการ์ดเกมในระบบ ({{ cardGamesStore.games.length }})</h3>
          
          <div class="space-y-2 max-h-60 overflow-y-auto pr-1">
            <div 
              v-for="game in cardGamesStore.games" 
              :key="game.id" 
              class="p-3 rounded-xl border border-base-300 bg-base-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="font-bold text-sm text-slate-900">{{ game.name }}</span>
                  <span v-if="game.isVanguard" class="badge badge-primary badge-xs text-white font-semibold">ค่าเริ่มต้น</span>
                </div>
                <div class="text-xs text-slate-500 mt-1">
                  <span class="font-semibold text-slate-600">หมวดหมู่/Format:</span> {{ (game.formats || []).join(', ') || '-' }}
                </div>
                <div class="text-xs text-slate-500 mt-0.5">
                  <span class="font-semibold text-slate-600">ระดับความแรร์:</span>
                  <span class="font-mono ml-1">{{ (game.rarities || []).join(', ') || '-' }}</span>
                </div>
              </div>

              <div class="flex items-center gap-1.5 shrink-0">
                <button @click="editGame(game)" class="btn btn-xs btn-outline font-semibold">
                  แก้ไข
                </button>
                <button 
                  v-if="!game.isVanguard" 
                  @click="removeGame(game)" 
                  class="btn btn-xs btn-error btn-outline font-semibold"
                >
                  ลบ
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- ฟอร์มเพิ่ม / แก้ไขการ์ดเกม -->
        <div class="mt-5 pt-4 border-t border-base-200">
          <h3 class="text-sm font-bold text-slate-900 mb-2">
            {{ editingGameId ? 'แก้ไขข้อมูลการ์ดเกม' : 'เพิ่มการ์ดเกมใหม่' }}
          </h3>

          <form @submit.prevent="saveGame" class="space-y-3">
            <div class="form-control">
              <label class="label py-1">
                <span class="label-text font-semibold text-slate-700 text-xs">ชื่อการ์ดเกม * (เช่น Pokemon, One Piece, Yu-Gi-Oh)</span>
              </label>
              <input 
                type="text" 
                v-model="gameForm.name" 
                placeholder="ระบุชื่อการ์ดเกม" 
                class="input input-bordered input-sm w-full" 
                required 
              />
            </div>

            <div class="form-control">
              <label class="label py-1">
                <span class="label-text font-semibold text-slate-700 text-xs">หมวดหมู่หรือ Format ย่อย (คั่นด้วยเครื่องหมายจุลภาค , เช่น วันพีซไทย, วันพีซญี่ปุ่น)</span>
              </label>
              <input 
                type="text" 
                v-model="gameForm.formats" 
                placeholder="เช่น One Piece การ์ดแยกใบ, One Piece บ็อกซ์/ซอง" 
                class="input input-bordered input-sm w-full" 
              />
              <span class="text-[11px] text-slate-400 mt-0.5">หากเว้นว่าง ระบบจะใช้ชื่อการ์ดเกมเป็นหมวดหมู่หลัก</span>
            </div>

            <div class="form-control">
              <label class="label py-1">
                <span class="label-text font-semibold text-slate-700 text-xs">ระดับความแรร์ของการ์ดเกมนี้ (คั่นด้วยเครื่องหมายจุลภาค , เช่น SEC, SR, R, UC, C) *</span>
              </label>
              <textarea 
                v-model="gameForm.rarities" 
                placeholder="เช่น SEC, SR, R, UC, C, L, SP" 
                class="textarea textarea-bordered h-16 w-full text-xs font-mono" 
                required
              ></textarea>
              <span class="text-[11px] text-slate-400 mt-0.5">พิมพ์ระดับความแรร์คั่นด้วยเครื่องหมายจุลภาค ระบบจะนำไปเป็นตัวเลือกตอนลงสินค้า</span>
            </div>

            <div class="flex justify-end gap-2 pt-2">
              <button 
                v-if="editingGameId" 
                type="button" 
                @click="cancelEditGame" 
                class="btn btn-ghost btn-sm"
              >
                ยกเลิกแก้ไข
              </button>
              <button type="submit" class="btn btn-primary btn-sm text-white font-semibold">
                {{ editingGameId ? 'บันทึกการแก้ไข' : 'เพิ่มการ์ดเกม' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>