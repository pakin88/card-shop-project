<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { useAuthStore } from '../stores/auth';
import { useRouter, useRoute } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();

const API_URL = 'https://card-shop-project.onrender.com';

const products = ref([]);
const loading = ref(true);
const isSubmitting = ref(false);

const showModal = ref(false);
const isEditMode = ref(false);
const editingId = ref(null);

const formData = ref({
  name: '',
  category: 'แวนการ์ด D ไทย',
  rarity: 'RRR',
  price: '',
  stock: '',
  description: ''
});

const imageFile = ref(null);
const imagePreview = ref('');

// ดึงรายการการ์ดทั้งหมด (แยกไม่ให้เปิด Modal ซ้ำตอนโหลดข้อมูลใหม่)
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
  formData.value = {
    name: '',
    category: 'แวนการ์ด D ไทย',
    rarity: 'RRR',
    price: '',
    stock: '',
    description: ''
  };
  imageFile.value = null;
  imagePreview.value = '';
  showModal.value = true;
};

const openEditModal = (product) => {
  isEditMode.value = true;
  editingId.value = product.id;
  formData.value = {
    name: product.name,
    category: product.category_name || product.category || 'แวนการ์ด D ไทย',
    rarity: product.rarity || 'RRR',
    price: product.price,
    stock: product.stock,
    description: product.description || ''
  };
  imageFile.value = null;
  imagePreview.value = getImageUrl(product.image_url);
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  // ล้าง query บน URL เพื่อไม่ให้เด้งเปิดฟอร์มซ้ำ
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
    data.append('rarity', formData.value.rarity);
    data.append('price', formData.value.price);
    data.append('stock', formData.value.stock);
    data.append('description', formData.value.description);

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
      alert('แก้ไขข้อมูลการ์ดสำเร็จ!');
    } else {
      await axios.post(`${API_URL}/api/products`, data, config);
      alert('เพิ่มการ์ดใบใหม่สำเร็จ!');
    }

    // ปิดหน้าต่างฟอร์มและล้างค่า ?edit บน URL ทันที เพื่อให้กลับมาหน้าคลังการ์ดปกติ
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
  if (!confirm(`คุณต้องการลบการ์ด "${name}" ใช่หรือไม่?`)) return;
  try {
    await axios.delete(`${API_URL}/api/products/${id}`, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    });
    alert('ลบการ์ดสำเร็จ!');
    fetchProducts();
  } catch (error) {
    alert(error.response?.data?.message || 'ไม่สามารถลบการ์ดนี้ได้');
  }
};

onMounted(async () => {
  if (!authStore.isAdmin) {
    alert('สำหรับผู้ดูแลระบบ (Admin) เท่านั้น');
    router.push('/');
    return;
  }
  await fetchProducts();

  // เช็คเฉพาะตอนเปิดหน้าครั้งแรกสุดเท่านั้น แล้วล้าง URL ทันที
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
  <div class="p-6 max-w-6xl mx-auto text-gray-900">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold text-black">จัดการคลังการ์ด (Admin)</h1>
      <button @click="openAddModal" class="btn bg-black text-white hover:bg-gray-800 border-black">
        + เพิ่มการ์ดใบใหม่
      </button>
    </div>

    <div v-if="loading" class="text-center py-10">
      <span class="loading loading-spinner loading-lg text-black"></span>
      <p class="mt-2 text-gray-600">กำลังโหลดคลังการ์ด...</p>
    </div>

    <div v-else class="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-200">
      <table class="table w-full">
        <thead>
          <tr class="bg-gray-100 text-gray-800 text-sm border-b border-gray-200">
            <th>รูปภาพ</th>
            <th>ชื่อการ์ด</th>
            <th>หมวดหมู่ Format</th>
            <th>ความแรร์</th>
            <th>ราคา</th>
            <th>สต็อก</th>
            <th class="text-center">จัดการ</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="product in products" :key="product.id" class="hover:bg-gray-50 border-b border-gray-100">
            <td>
              <div class="w-16 h-20 bg-gray-50 rounded flex items-center justify-center overflow-hidden border border-gray-200">
                <img v-if="product.image_url" :src="getImageUrl(product.image_url)" class="w-full h-full object-contain" />
                <span v-else class="text-xs text-gray-400">ไม่มีรูป</span>
              </div>
            </td>
            <td class="font-bold text-black">{{ product.name }}</td>
            <td class="text-gray-700">{{ product.category_name || product.category }}</td>
            <td><span class="badge badge-outline border-gray-400 text-gray-800">{{ product.rarity }}</span></td>
            <td class="text-black font-extrabold">฿{{ Number(product.price).toLocaleString() }}</td>
            <td>
              <span :class="product.stock > 0 ? 'text-gray-800 font-medium' : 'text-red-600 font-bold'">
                {{ product.stock }} ใบ
              </span>
            </td>
            <td class="text-center space-x-2">
              <button @click="openEditModal(product)" class="btn btn-xs bg-black text-white hover:bg-gray-800 border-black">
                แก้ไข / เพิ่มรูป
              </button>
              <button @click="deleteProduct(product.id, product.name)" class="btn btn-xs btn-outline border-gray-400 text-gray-700 hover:bg-red-600 hover:text-white hover:border-red-600">
                ลบ
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal ฟอร์มเพิ่ม/แก้ไขการ์ด -->
    <div v-if="showModal" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div class="bg-white text-gray-900 p-6 rounded-xl max-w-lg w-full shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto">
        <h2 class="text-2xl font-bold text-black mb-4">
          {{ isEditMode ? 'แก้ไขข้อมูลการ์ด' : 'เพิ่มการ์ดใบใหม่' }}
        </h2>

        <form @submit.prevent="saveProduct" class="space-y-3">
          <div class="form-control">
            <label class="label py-1"><span class="label-text text-gray-800 font-semibold">ชื่อการ์ด *</span></label>
            <input type="text" v-model="formData.name" class="input input-bordered bg-white border-gray-300 text-black w-full" required />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="form-control">
              <label class="label py-1"><span class="label-text text-gray-800 font-semibold">หมวดหมู่ Format *</span></label>
              <select v-model="formData.category" class="select select-bordered bg-white border-gray-300 text-black w-full" required>
                <option value="แวนการ์ด D ไทย">แวนการ์ด D ไทย</option>
                <option value="แวนการ์ด D JP">แวนการ์ด D JP</option>
                <option value="แวนการ์ด Premium">แวนการ์ด Premium</option>
                <option value="อุปกรณ์เสริมการ์ด">อุปกรณ์เสริมการ์ด</option>
              </select>
            </div>
            <div class="form-control">
              <label class="label py-1"><span class="label-text text-gray-800 font-semibold">ระดับความแรร์ (Rarity) *</span></label>
              <input type="text" v-model="formData.rarity" placeholder="เช่น RRR, SP, RR" class="input input-bordered bg-white border-gray-300 text-black w-full" required />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="form-control">
              <label class="label py-1"><span class="label-text text-gray-800 font-semibold">ราคา (บาท) *</span></label>
              <input type="number" step="0.01" v-model="formData.price" class="input input-bordered bg-white border-gray-300 text-black w-full" required />
            </div>
            <div class="form-control">
              <label class="label py-1"><span class="label-text text-gray-800 font-semibold">จำนวนในคลัง (ใบ) *</span></label>
              <input type="number" v-model="formData.stock" class="input input-bordered bg-white border-gray-300 text-black w-full" required />
            </div>
          </div>

          <div class="form-control">
            <label class="label py-1"><span class="label-text text-gray-800 font-semibold">รายละเอียดการ์ด / ความสามารถ</span></label>
            <textarea 
              v-model="formData.description" 
              class="textarea textarea-bordered bg-white border-gray-300 text-black h-20 w-full" 
              placeholder="เช่น เกรด 3 / ทวินไดรฟ์ / ความสามารถ..."
            ></textarea>
          </div>

          <div class="form-control">
            <label class="label py-1"><span class="label-text text-gray-800 font-semibold">รูปภาพการ์ด</span></label>
            <input type="file" @change="handleFileChange" accept="image/*" class="file-input file-input-bordered bg-white border-gray-300 text-black w-full" />
            
            <div v-if="imagePreview" class="mt-3 flex justify-center bg-gray-50 p-2 rounded border border-gray-200">
              <img :src="imagePreview" class="h-40 object-contain rounded" />
            </div>
          </div>

          <div class="flex justify-end space-x-2 pt-4 border-t border-gray-200 mt-4">
            <button type="button" @click="closeModal" class="btn btn-ghost text-gray-700">ยกเลิก</button>
            <button type="submit" class="btn bg-black text-white hover:bg-gray-800 border-black" :disabled="isSubmitting">
              <span v-if="isSubmitting" class="loading loading-spinner"></span>
              บันทึกข้อมูล
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>