<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { useAuthStore } from '../stores/auth';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();

const API_URL = 'https://card-shop-project.onrender.com';

const products = ref([]);
const loading = ref(true);
const isSubmitting = ref(false);

// สำหรับเปิด/ปิด Modal เพิ่มหรือแก้ไขสินค้า
const showModal = ref(false);
const isEditMode = ref(false);
const editingId = ref(null);

const formData = ref({
  name: '',
  category: 'Cardfight!! Vanguard',
  rarity: 'RRR',
  price: '',
  stock: '',
  description: ''
});

const imageFile = ref(null);
const imagePreview = ref('');

// ดึงรายการการ์ดทั้งหมด
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

// แปลงลิงก์รูปภาพให้แสดงผลได้ทั้ง Base64 และไฟล์ทั่วไป
const getImageUrl = (img) => {
  if (!img) return '';
  if (img.startsWith('data:image') || img.startsWith('http')) return img;
  const fileName = img.replace(/^\/?uploads[\/\\]/, '');
  return `${API_URL}/uploads/${fileName}`;
};

// เปิดหน้าต่างเพิ่มการ์ดใหม่
const openAddModal = () => {
  isEditMode.value = false;
  editingId.value = null;
  formData.value = {
    name: '',
    category: 'Cardfight!! Vanguard',
    rarity: 'RRR',
    price: '',
    stock: '',
    description: ''
  };
  imageFile.value = null;
  imagePreview.value = '';
  showModal.value = true;
};

// เปิดหน้าต่างแก้ไขการ์ด
const openEditModal = (product) => {
  isEditMode.value = true;
  editingId.value = product.id;
  formData.value = {
    name: product.name,
    category: product.category || 'Cardfight!! Vanguard',
    rarity: product.rarity || 'RRR',
    price: product.price,
    stock: product.stock,
    description: product.description || ''
  };
  imageFile.value = null;
  imagePreview.value = getImageUrl(product.image_url);
  showModal.value = true;
};

// เมื่อเลือกไฟล์รูปภาพ ให้แสดง Preview ทันที
const handleFileChange = (e) => {
  const file = e.target.files[0];
  if (file) {
    imageFile.value = file;
    imagePreview.value = URL.createObjectURL(file);
  }
};

// บันทึกข้อมูล (เพิ่มใหม่ หรือ แก้ไข)
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

    showModal.value = false;
    fetchProducts();
  } catch (error) {
    console.error(error);
    alert(error.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
  } finally {
    isSubmitting.value = false;
  }
};

// ลบการ์ด
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

onMounted(() => {
  if (!authStore.isAdmin) {
    alert('สำหรับผู้ดูแลระบบ (Admin) เท่านั้น');
    router.push('/');
    return;
  }
  fetchProducts();
});
</script>

<template>
  <div class="p-6 max-w-6xl mx-auto">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold">จัดการคลังการ์ด (Admin)</h1>
      <button @click="openAddModal" class="btn btn-primary text-white">+ เพิ่มการ์ดใบใหม่</button>
    </div>

    <div v-if="loading" class="text-center py-10">
      <span class="loading loading-spinner loading-lg text-primary"></span>
      <p class="mt-2">กำลังโหลดคลังการ์ด...</p>
    </div>

    <div v-else class="overflow-x-auto bg-base-100 rounded-xl shadow border border-base-300">
      <table class="table w-full">
        <thead>
          <tr class="bg-base-200 text-sm">
            <th>รูปภาพ</th>
            <th>ชื่อการ์ด</th>
            <th>หมวดหมู่</th>
            <th>ความแรร์</th>
            <th>ราคา</th>
            <th>สต็อก</th>
            <th class="text-center">จัดการ</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="product in products" :key="product.id" class="hover">
            <td>
              <div class="w-16 h-20 bg-base-200 rounded flex items-center justify-center overflow-hidden border">
                <img v-if="product.image_url" :src="getImageUrl(product.image_url)" class="w-full h-full object-cover" />
                <span v-else class="text-xs text-gray-400">ไม่มีรูป</span>
              </div>
            </td>
            <td class="font-bold">{{ product.name }}</td>
            <td>{{ product.category }}</td>
            <td><span class="badge badge-outline">{{ product.rarity }}</span></td>
            <td class="text-primary font-bold">฿{{ Number(product.price).toLocaleString() }}</td>
            <td>
              <span :class="product.stock > 0 ? 'text-success' : 'text-error font-bold'">
                {{ product.stock }} ใบ
              </span>
            </td>
            <td class="text-center space-x-2">
              <button @click="openEditModal(product)" class="btn btn-info btn-xs text-white">แก้ไข / เพิ่มรูป</button>
              <button @click="deleteProduct(product.id, product.name)" class="btn btn-error btn-xs text-white">ลบ</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal ฟอร์มเพิ่ม/แก้ไขการ์ด -->
    <div v-if="showModal" class="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div class="bg-base-100 p-6 rounded-xl max-w-lg w-full shadow-xl border border-base-300 max-h-[90vh] overflow-y-auto">
        <h2 class="text-2xl font-bold mb-4">
          {{ isEditMode ? 'แก้ไขข้อมูลการ์ด' : 'เพิ่มการ์ดใบใหม่' }}
        </h2>

        <form @submit.prevent="saveProduct" class="space-y-3">
          <div class="form-control">
            <label class="label py-1"><span class="label-text">ชื่อการ์ด *</span></label>
            <input type="text" v-model="formData.name" class="input input-bordered w-full" required />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="form-control">
              <label class="label py-1"><span class="label-text">หมวดหมู่ *</span></label>
              <input type="text" v-model="formData.category" class="input input-bordered w-full" required />
            </div>
            <div class="form-control">
              <label class="label py-1"><span class="label-text">ระดับความแรร์ (Rarity) *</span></label>
              <input type="text" v-model="formData.rarity" placeholder="เช่น RRR, SP, RR" class="input input-bordered w-full" required />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="form-control">
              <label class="label py-1"><span class="label-text">ราคา (บาท) *</span></label>
              <input type="number" step="0.01" v-model="formData.price" class="input input-bordered w-full" required />
            </div>
            <div class="form-control">
              <label class="label py-1"><span class="label-text">จำนวนในคลัง (ใบ) *</span></label>
              <input type="number" v-model="formData.stock" class="input input-bordered w-full" required />
            </div>
          </div>

          <div class="form-control">
            <label class="label py-1"><span class="label-text">รูปภาพการ์ด</span></label>
            <input type="file" @change="handleFileChange" accept="image/*" class="file-input file-input-bordered w-full" />
            
            <!-- แสดงรูปตัวอย่าง -->
            <div v-if="imagePreview" class="mt-3 flex justify-center">
              <img :src="imagePreview" class="h-40 object-contain rounded border p-1" />
            </div>
          </div>

          <div class="flex justify-end space-x-2 pt-4 border-t border-base-200 mt-4">
            <button type="button" @click="showModal = false" class="btn btn-ghost">ยกเลิก</button>
            <button type="submit" class="btn btn-primary text-white" :disabled="isSubmitting">
              <span v-if="isSubmitting" class="loading loading-spinner"></span>
              บันทึกข้อมูล
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>