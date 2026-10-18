<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { useAuthStore } from '../stores/auth';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();

const orders = ref([]);
const loading = ref(true);
const errorMessage = ref('');

const API_URL = 'https://card-shop-project.onrender.com';

const fetchMyOrders = async () => {
  loading.value = true;
  errorMessage.value = '';
  try {
    const res = await axios.get(`${API_URL}/api/orders/my-orders`, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    });
    orders.value = res.data;
  } catch (error) {
    errorMessage.value = 'ไม่สามารถโหลดประวัติการสั่งซื้อได้';
    console.error(error);
  } finally {
    loading.value = false;
  }
};

// แปลงเวลาให้ตรงกับเวลาไทย (+8 ชั่วโมง)
const formatThaiTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  date.setHours(date.getHours() + 8);
  return date.toLocaleString('th-TH');
};

// แสดงสีและข้อความของสถานะออเดอร์
const getStatusBadge = (status) => {
  switch (status) {
    case 'pending': return { text: 'รอตรวจสอบ', class: 'badge-warning' };
    case 'paid': return { text: 'ชำระเงินแล้ว (รอจัดส่ง)', class: 'badge-info' };
    case 'shipped': return { text: 'จัดส่งแล้ว', class: 'badge-success text-white' };
    case 'cancelled': return { text: 'ยกเลิกคำสั่งซื้อ', class: 'badge-error text-white' };
    default: return { text: status, class: 'badge-ghost' };
  }
};

onMounted(() => {
  if (!authStore.isLoggedIn) {
    router.push('/login');
    return;
  }
  fetchMyOrders();
});
</script>

<template>
  <div class="p-6 max-w-4xl mx-auto">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold">ประวัติการสั่งซื้อของฉัน</h1>
      <button @click="fetchMyOrders" class="btn btn-outline btn-sm">รีเฟรชข้อมูล</button>
    </div>

    <div v-if="loading" class="text-center py-10">
      <span class="loading loading-spinner loading-lg text-primary"></span>
      <p class="mt-2">กำลังโหลดข้อมูล...</p>
    </div>

    <div v-else-if="errorMessage" class="alert alert-error">
      <span>{{ errorMessage }}</span>
    </div>

    <div v-else-if="orders.length === 0" class="text-center py-12 bg-base-100 rounded-xl border border-base-300">
      <p class="text-gray-400 mb-4">คุณยังไม่มีประวัติการสั่งซื้อสินค้า</p>
      <router-link to="/" class="btn btn-primary btn-sm text-white">ไปเลือกซื้อการ์ดกันเลย</router-link>
    </div>

    <div v-else class="space-y-6">
      <div v-for="order in orders" :key="order.id" class="card bg-base-100 shadow-md border border-base-300">
        <div class="card-body">
          <div class="flex flex-wrap justify-between items-start gap-4 border-b border-base-200 pb-4">
            <div>
              <div class="flex items-center gap-2">
                <h2 class="card-title text-lg">คำสั่งซื้อ #{{ order.id }}</h2>
                <span class="badge" :class="getStatusBadge(order.status).class">
                  {{ getStatusBadge(order.status).text }}
                </span>
              </div>
              <p class="text-xs text-gray-400 mt-1">สั่งซื้อเมื่อ: {{ formatThaiTime(order.created_at) }}</p>
              <p class="text-sm mt-2"><strong>ที่อยู่จัดส่ง:</strong> {{ order.shipping_address }} (โทร: {{ order.phone }})</p>
            </div>

            <div class="text-right">
              <p class="text-2xl font-bold text-primary">฿{{ Number(order.total_amount).toLocaleString() }}</p>
              <span class="badge badge-outline badge-sm mt-1">ชำระแบบ: {{ order.payment_method.toUpperCase() }}</span>
            </div>
          </div>

          <!-- รายการการ์ดในออเดอร์ -->
          <div class="py-3">
            <h3 class="font-semibold text-sm mb-2">รายการสินค้า:</h3>
            <ul class="space-y-1 text-sm bg-base-200 p-3 rounded-lg">
              <li v-for="item in order.items" :key="item.id" class="flex justify-between">
                <span>{{ item.product_name || `รหัสสินค้า #${item.product_id}` }} (x{{ item.quantity }})</span>
                <span class="font-medium">
                  ฿{{ (Number(item.price || item.price_at_purchase || item.unit_price || item.product_price || 0) * Number(item.quantity)).toLocaleString() }}
                </span>
              </li>
            </ul>
          </div>

          <!-- แสดงเลขพัสดุ (Tracking Number) -->
          <div class="pt-3 border-t border-base-200 flex justify-between items-center">
            <span class="text-sm font-semibold">เลขพัสดุ (Tracking Number):</span>
            <span v-if="order.tracking_number" class="badge badge-lg badge-primary text-white font-mono">
              {{ order.tracking_number }}
            </span>
            <span v-else class="text-sm text-gray-400">อยู่ระหว่างเตรียมการจัดส่ง</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>