<script setup>
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';
import { useAuthStore } from '../stores/auth';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();

const API_URL = 'https://card-shop-project.onrender.com';

const orders = ref([]);
const products = ref([]);
const loading = ref(true);
const errorMessage = ref('');
const timeRange = ref('30'); // '7', '30', 'all'

const fetchDashboardData = async () => {
  loading.value = true;
  errorMessage.value = '';
  try {
    const [ordersRes, productsRes] = await Promise.all([
      axios.get(`${API_URL}/api/orders`, {
        headers: { Authorization: `Bearer ${authStore.token}` }
      }),
      axios.get(`${API_URL}/api/products`)
    ]);

    orders.value = ordersRes.data || [];
    products.value = productsRes.data || [];
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    errorMessage.value = 'ไม่สามารถโหลดข้อมูลสถิติร้านค้าได้';
  } finally {
    loading.value = false;
  }
};

// กรองออเดอร์ตามช่วงเวลา
const filteredOrdersByTime = computed(() => {
  if (timeRange.value === 'all') return orders.value;
  const days = parseInt(timeRange.value, 10);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  cutoff.setHours(0, 0, 0, 0);

  return orders.value.filter(o => {
    if (!o.created_at) return true;
    return new Date(o.created_at) >= cutoff;
  });
});

// ยอดขายรวม (ไม่นับออเดอร์ที่ถูกยกเลิก)
const totalSales = computed(() => {
  return filteredOrdersByTime.value
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
});

// ยอดขายวันนี้
const todaySales = computed(() => {
  const todayStr = new Date().toDateString();
  return orders.value
    .filter(o => o.status !== 'cancelled' && o.created_at && new Date(o.created_at).toDateString() === todayStr)
    .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
});

// จำนวนออเดอร์ทั้งหมด
const totalOrdersCount = computed(() => filteredOrdersByTime.value.length);

// ออเดอร์ที่ต้องจัดส่ง (รอตรวจสอบ + ชำระแล้ว)
const ordersToShipCount = computed(() => {
  return orders.value.filter(o => o.status === 'pending' || o.status === 'paid').length;
});

// จำนวนการ์ด/สินค้าทั้งหมดในคลัง
const totalStockCount = computed(() => {
  return products.value.reduce((sum, p) => sum + Number(p.stock || 0), 0);
});

// สรุปสินค้าขายดี (Top Best Sellers) คำนวณจาก order_items
const bestSellers = computed(() => {
  const itemMap = {};

  orders.value.forEach(order => {
    if (order.status === 'cancelled') return;
    const items = order.items || [];
    items.forEach(item => {
      const pid = item.product_id || item.id;
      const pName = item.product_name || `สินค้า #${pid}`;
      const qty = Number(item.quantity || 0);
      const price = Number(item.price_at_purchase || item.price || item.product_price || 0);

      if (!itemMap[pid]) {
        // หารูปจาก products
        const matchedProd = products.value.find(p => p.id === pid);
        itemMap[pid] = {
          id: pid,
          name: pName,
          image_url: matchedProd?.image_url || '',
          category: matchedProd?.category_name || matchedProd?.category || 'แวนการ์ด',
          rarity: matchedProd?.rarity || '',
          totalSold: 0,
          totalRevenue: 0
        };
      }
      itemMap[pid].totalSold += qty;
      itemMap[pid].totalRevenue += qty * price;
    });
  });

  return Object.values(itemMap)
    .sort((a, b) => b.totalSold - a.totalSold)
    .slice(0, 5);
});

// คำนวณยอดขาย 7 วันย้อนหลังสำหรับกราฟ
const dailyChartData = computed(() => {
  const days = 7;
  const result = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const displayDate = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });

    // คำนวณยอดขายวันนั้น
    const dayOrders = orders.value.filter(o => {
      if (o.status === 'cancelled' || !o.created_at) return false;
      const orderDate = new Date(o.created_at).toISOString().split('T')[0];
      return orderDate === dateStr;
    });

    const dayTotal = dayOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
    const orderCount = dayOrders.length;

    result.push({
      dateStr,
      displayDate,
      total: dayTotal,
      orderCount
    });
  }

  const maxTotal = Math.max(...result.map(r => r.total), 1);
  return result.map(r => ({
    ...r,
    heightPercent: Math.max(Math.round((r.total / maxTotal) * 100), 8)
  }));
});

// 5 ออเดอร์ล่าสุด
const recentOrders = computed(() => {
  return [...orders.value]
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, 5);
});

const formatThaiTime = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  date.setHours(date.getHours() + 8);
  return date.toLocaleString('th-TH', { 
    year: '2-digit', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getStatusBadge = (status) => {
  switch (status) {
    case 'pending': return { text: 'รอตรวจสอบ', class: 'badge-warning text-black' };
    case 'paid': return { text: 'ชำระแล้ว (รอจัดส่ง)', class: 'badge-info text-black' };
    case 'shipped': return { text: 'จัดส่งแล้ว', class: 'badge-success text-white' };
    case 'cancelled': return { text: 'ยกเลิก', class: 'badge-error text-white' };
    default: return { text: status, class: 'badge-ghost' };
  }
};

const getImageUrl = (img) => {
  if (!img) return '';
  if (img.startsWith('data:image') || img.startsWith('http')) return img;
  return `${API_URL}/uploads/${img.replace(/^\/?uploads[\/\\]/, '')}`;
};

onMounted(() => {
  if (!authStore.isAdmin) {
    alert('หน้านี้สำหรับผู้ดูแลระบบ (Admin) เท่านั้น');
    router.push('/');
    return;
  }
  fetchDashboardData();
});
</script>

<template>
  <div class="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-base-100 p-5 rounded-2xl shadow-sm border border-base-300">
      <div>
        <div class="flex items-center gap-2">
          <span class="badge badge-primary text-black font-bold">Admin Portal</span>
          <span class="text-xs text-gray-400">บทบาท: ผู้ดูแลร้านค้า (Admin)</span>
        </div>
        <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
          แดชบอร์ดภาพรวมร้านค้า
        </h1>
        <p class="text-xs sm:text-sm text-gray-500 mt-0.5">
          สรุปรายงานยอดขาย ประสิทธิภาพร้านค้า และรายการสินค้าขายดี
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2 w-full sm:w-auto">
        <!-- ตัวเลือกช่วงเวลา -->
        <select v-model="timeRange" class="select select-bordered select-sm text-xs">
          <option value="7">7 วันล่าสุด</option>
          <option value="30">30 วันล่าสุด</option>
          <option value="all">ข้อมูลทั้งหมด</option>
        </select>

        <button @click="fetchDashboardData" class="btn btn-outline btn-sm gap-1" :disabled="loading">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          รีเฟรช
        </button>

        <router-link to="/admin/orders" class="btn btn-warning btn-sm text-slate-900 font-bold">
          จัดการออเดอร์
        </router-link>
      </div>
    </div>

    <!-- แจ้งเตือนข้อผิดพลาดถ้ามี -->
    <div v-if="errorMessage" class="alert alert-error">
      <span>{{ errorMessage }}</span>
    </div>

    <!-- ตัวโหลดข้อมูล -->
    <div v-if="loading" class="text-center py-16 bg-base-100 rounded-2xl border border-base-300">
      <span class="loading loading-spinner loading-lg text-primary"></span>
      <p class="mt-3 text-sm text-gray-500">กำลังประมวลผลข้อมูลสถิติร้านค้า...</p>
    </div>

    <template v-else>
      <!-- 1. การ์ดสรุปตัวเลขสถิติ 4 ช่อง (KPI Cards) -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        <!-- ยอดขายรวม -->
        <div class="bg-gradient-to-br from-emerald-500 to-teal-700 text-white p-4 sm:p-5 rounded-2xl shadow-md relative overflow-hidden">
          <div class="flex justify-between items-start">
            <div>
              <p class="text-xs uppercase tracking-wider text-emerald-100 font-semibold">ยอดขายรวม</p>
              <h3 class="text-xl sm:text-3xl font-extrabold mt-1">฿{{ totalSales.toLocaleString() }}</h3>
              <p class="text-[11px] text-emerald-100 mt-1">วันนี้: ฿{{ todaySales.toLocaleString() }}</p>
            </div>
            <div class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <!-- จำนวนคำสั่งซื้อ -->
        <div class="bg-gradient-to-br from-blue-500 to-indigo-700 text-white p-4 sm:p-5 rounded-2xl shadow-md relative overflow-hidden">
          <div class="flex justify-between items-start">
            <div>
              <p class="text-xs uppercase tracking-wider text-blue-100 font-semibold">คำสั่งซื้อทั้งหมด</p>
              <h3 class="text-xl sm:text-3xl font-extrabold mt-1">{{ totalOrdersCount }} <span class="text-sm font-normal">รายการ</span></h3>
              <p class="text-[11px] text-blue-100 mt-1">ช่วงเวลาที่เลือก</p>
            </div>
            <div class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
          </div>
        </div>

        <!-- รอจัดส่ง -->
        <div class="bg-gradient-to-br from-amber-500 to-orange-600 text-white p-4 sm:p-5 rounded-2xl shadow-md relative overflow-hidden">
          <div class="flex justify-between items-start">
            <div>
              <p class="text-xs uppercase tracking-wider text-amber-100 font-semibold">ที่ต้องจัดส่ง</p>
              <h3 class="text-xl sm:text-3xl font-extrabold mt-1">{{ ordersToShipCount }} <span class="text-sm font-normal">ออเดอร์</span></h3>
              <router-link to="/admin/orders" class="text-[11px] underline text-amber-100 hover:text-white mt-1 inline-block">
                คลิกไปจัดการ ➔
              </router-link>
            </div>
            <div class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <!-- สินค้าในคลัง -->
        <div class="bg-gradient-to-br from-purple-500 to-violet-700 text-white p-4 sm:p-5 rounded-2xl shadow-md relative overflow-hidden">
          <div class="flex justify-between items-start">
            <div>
              <p class="text-xs uppercase tracking-wider text-purple-100 font-semibold">การ์ดในคลังรวม</p>
              <h3 class="text-xl sm:text-3xl font-extrabold mt-1">{{ totalStockCount }} <span class="text-sm font-normal">ใบ</span></h3>
              <p class="text-[11px] text-purple-100 mt-1">{{ products.length }} รายการสินค้า</p>
            </div>
            <div class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. กราฟยอดขายรายวัน (7 วันย้อนหลัง) & สินค้าขายดี -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <!-- ฝั่งซ้าย (2 cols): กราฟแนวโน้มยอดขาย -->
        <div class="lg:col-span-2 bg-base-100 p-5 rounded-2xl shadow-sm border border-base-300 flex flex-col justify-between">
          <div class="flex justify-between items-center mb-4">
            <div>
              <h2 class="text-lg font-bold text-slate-900">แนวโน้มยอดขายรายวัน (7 วันล่าสุด)</h2>
              <p class="text-xs text-gray-400">เปรียบเทียบยอดขายรวมในแต่ละวัน</p>
            </div>
            <span class="badge badge-outline badge-sm text-xs">รายวัน</span>
          </div>

          <!-- ตัวแสดงกราฟแท่ง (Custom Bar Chart ด้วย CSS/Tailwind สวยงาม เสถียรสูง) -->
          <div class="pt-6 pb-2">
            <div class="h-52 flex items-end justify-between gap-2 sm:gap-4 px-2 border-b border-base-200">
              <div 
                v-for="(day, index) in dailyChartData" 
                :key="index"
                class="flex-1 flex flex-col items-center gap-2 group relative"
              >
                <!-- Tooltip บอกยอดเงินเมื่อ hover -->
                <div class="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap z-10">
                  <p class="font-bold">฿{{ day.total.toLocaleString() }}</p>
                  <p class="text-gray-300">{{ day.orderCount }} ออเดอร์</p>
                </div>

                <!-- แท่งกราฟ -->
                <div class="w-full max-w-[42px] bg-base-200 rounded-t-lg relative flex items-end overflow-hidden" :style="`height: 100%;`">
                  <div 
                    class="w-full bg-gradient-to-t from-emerald-600 to-teal-400 rounded-t-lg transition-all duration-500 group-hover:from-emerald-500 group-hover:to-teal-300"
                    :style="`height: ${day.heightPercent}%;`"
                  ></div>
                </div>

                <!-- ป้ายวันที่ด้านล่าง -->
                <span class="text-[10px] sm:text-xs text-gray-500 truncate w-full text-center">
                  {{ day.displayDate }}
                </span>
              </div>
            </div>
          </div>

          <div class="flex justify-between items-center text-xs text-gray-500 pt-3 border-t border-base-200 mt-2">
            <span>* ยอดขายคำนวณจากคำสั่งซื้อที่อนุมัติหรืออยู่ระหว่างจัดส่ง</span>
            <span class="font-semibold text-emerald-600">รวม 7 วัน: ฿{{ dailyChartData.reduce((s, d) => s + d.total, 0).toLocaleString() }}</span>
          </div>
        </div>

        <!-- ฝั่งขวา (1 col): สินค้าขายดี (Top Best Sellers) -->
        <div class="bg-base-100 p-5 rounded-2xl shadow-sm border border-base-300 flex flex-col">
          <div class="flex justify-between items-center mb-4">
            <div>
              <h2 class="text-lg font-bold text-slate-900">สินค้าขายดี (Top 5)</h2>
              <p class="text-xs text-gray-400">คำนวณจากยอดสั่งซื้อทั้งหมด</p>
            </div>
            <span class="badge badge-warning badge-sm text-black font-semibold">ยอดนิยม</span>
          </div>

          <div v-if="bestSellers.length === 0" class="flex-1 flex items-center justify-center text-center py-8 text-gray-400 text-xs">
            ยังไม่มีข้อมูลสินค้าที่สั่งซื้อในระบบ
          </div>

          <div v-else class="space-y-3 flex-1 overflow-y-auto">
            <div 
              v-for="(item, idx) in bestSellers" 
              :key="item.id" 
              class="flex items-center gap-3 p-2.5 rounded-xl bg-base-200/50 hover:bg-base-200 transition-colors"
            >
              <!-- ลำดับ -->
              <span class="font-black text-sm w-5 text-center" :class="idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-slate-400' : idx === 2 ? 'text-amber-700' : 'text-gray-400'">
                #{{ idx + 1 }}
              </span>

              <!-- รูปสินค้า -->
              <div class="w-11 h-14 bg-base-100 rounded-lg overflow-hidden border border-base-300 shrink-0 flex items-center justify-center">
                <img v-if="item.image_url" :src="getImageUrl(item.image_url)" class="w-full h-full object-contain" />
                <span v-else class="text-[9px] text-gray-400">การ์ด</span>
              </div>

              <!-- รายละเอียด -->
              <div class="flex-1 min-w-0">
                <h4 class="font-bold text-xs text-slate-900 truncate">{{ item.name }}</h4>
                <div class="flex items-center gap-1.5 mt-0.5">
                  <span class="text-[10px] text-gray-500">{{ item.category }}</span>
                  <span v-if="item.rarity && item.rarity !== '-'" class="badge badge-ghost badge-xs text-[9px] px-1">
                    {{ item.rarity }}
                  </span>
                </div>
                <div class="flex justify-between items-center mt-1">
                  <span class="text-[11px] font-bold text-primary">ขายได้ {{ item.totalSold }} ชิ้น</span>
                  <span class="text-[11px] text-gray-500">฿{{ item.totalRevenue.toLocaleString() }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. รายการคำสั่งซื้อล่าสุด (Recent Orders) -->
      <div class="bg-base-100 p-5 rounded-2xl shadow-sm border border-base-300">
        <div class="flex justify-between items-center mb-4">
          <div>
            <h2 class="text-lg font-bold text-slate-900">คำสั่งซื้อล่าสุด (Recent Orders)</h2>
            <p class="text-xs text-gray-400">5 รายการสั่งซื้อล่าสุดที่เข้ามาในระบบ</p>
          </div>
          <router-link to="/admin/orders" class="btn btn-outline btn-sm text-xs">
            ดูทั้งหมด ({{ orders.length }})
          </router-link>
        </div>

        <div v-if="recentOrders.length === 0" class="text-center py-8 text-gray-400 text-sm">
          ยังไม่มีคำสั่งซื้อในระบบ
        </div>

        <div v-else class="overflow-x-auto">
          <table class="table w-full text-xs sm:text-sm">
            <thead>
              <tr class="bg-base-200 text-slate-800">
                <th>ออเดอร์</th>
                <th>ลูกค้า</th>
                <th>วิธีชำระ</th>
                <th>ยอดรวม</th>
                <th>สถานะ</th>
                <th>เวลาสั่งซื้อ</th>
                <th class="text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="order in recentOrders" :key="order.id" class="hover">
                <td class="font-bold text-slate-900">#{{ order.id }}</td>
                <td>
                  <div class="font-medium text-slate-800">{{ order.username || 'ลูกค้าทั่วไป' }}</div>
                  <div class="text-[11px] text-gray-400">{{ order.phone || '-' }}</div>
                </td>
                <td>
                  <span class="badge badge-outline badge-xs sm:badge-sm font-semibold uppercase">
                    {{ order.payment_method }}
                  </span>
                </td>
                <td class="font-bold text-primary">฿{{ Number(order.total_amount).toLocaleString() }}</td>
                <td>
                  <span class="badge badge-sm" :class="getStatusBadge(order.status).class">
                    {{ getStatusBadge(order.status).text }}
                  </span>
                </td>
                <td class="text-gray-500 text-xs">{{ formatThaiTime(order.created_at) }}</td>
                <td class="text-center">
                  <router-link to="/admin/orders" class="btn btn-ghost btn-xs text-info">
                    ตรวจสอบ ➔
                  </router-link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

