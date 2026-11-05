<script setup>
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';
import { useAuthStore } from '../stores/auth';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();

const API_URL = 'https://card-shop-project.onrender.com';

const orders = ref([]);
const loading = ref(true);
const errorMessage = ref('');
const selectedOrder = ref(null);
const selectedSlipModal = ref(null);

const fetchMyOrders = async () => {
  loading.value = true;
  errorMessage.value = '';
  try {
    const res = await axios.get(`${API_URL}/api/orders/my-orders`, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    });
    orders.value = res.data || [];
    // หากมีออเดอร์ ให้ตั้ง selectedOrder เป็นออเดอร์ล่าสุดอัตโนมัติ
    if (orders.value.length > 0 && !selectedOrder.value) {
      selectedOrder.value = orders.value[0];
    } else if (selectedOrder.value) {
      // อัปเดตข้อมูลของ selectedOrder ปัจจุบัน
      const updated = orders.value.find(o => o.id === selectedOrder.value.id);
      if (updated) selectedOrder.value = updated;
    }
  } catch (error) {
    errorMessage.value = 'ไม่สามารถโหลดประวัติการสั่งซื้อได้';
    console.error(error);
  } finally {
    loading.value = false;
  }
};

// แปลงเวลาให้ตรงกับเวลาไทย (+8 ชม.)
const formatThaiTime = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  date.setHours(date.getHours() + 8);
  return date.toLocaleString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// วันที่คาดว่าจะได้รับสินค้า (+2-3 วันจากวันสั่ง)
const getEstimatedDeliveryDate = (dateString) => {
  if (!dateString) return 'คาดว่าจะได้รับใน 2-3 วัน';
  const date = new Date(dateString);
  date.setDate(date.getDate() + 3);
  return `คาดว่าได้รับ ${date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}`;
};

// ระดับขั้นตอนของสถานะออเดอร์ (1 ถึง 4)
const getOrderStatusStep = (status) => {
  switch (status) {
    case 'pending': return 1; // ชำระเงินแล้ว / รอตรวจสอบ
    case 'paid': return 2;    // กำลังจัดเตรียมสินค้า
    case 'shipped': return 3; // จัดส่งแล้ว
    case 'delivered': 
    case 'completed': return 4; // สำเร็จ
    case 'cancelled': return 0; // ยกเลิก
    default: return 1;
  }
};

// แสดงสีและข้อความของสถานะออเดอร์
const getStatusBadge = (status) => {
  switch (status) {
    case 'pending': return { text: 'รอตรวจสอบ', class: 'badge-warning text-black' };
    case 'paid': return { text: 'กำลังจัดเตรียมสินค้า', class: 'badge-info text-black' };
    case 'shipped': return { text: 'จัดส่งแล้ว', class: 'badge-success text-white' };
    case 'cancelled': return { text: 'ยกเลิกคำสั่งซื้อ', class: 'badge-error text-white' };
    default: return { text: status, class: 'badge-ghost' };
  }
};

// URL รูปภาพ
const getImageUrl = (img) => {
  if (!img) return '';
  if (img.startsWith('data:image') || img.startsWith('http')) return img;
  return `${API_URL}/uploads/${img.replace(/^\/?uploads[\/\\]/, '')}`;
};

// ลิงก์ตรวจสอบสถานะพัสดุ
const openTrackingUrl = (trackingNumber) => {
  if (!trackingNumber) {
    alert('ยังไม่มีเลขพัสดุสำหรับคำสั่งซื้อนี้');
    return;
  }
  // ถ้าขึ้นต้นด้วย TH ให้เปิด Flash Express หรือเปิดหน้าเช็คพัสดุรวม
  const track = trackingNumber.trim();
  if (track.toUpperCase().startsWith('TH') || track.length === 12) {
    window.open(`https://www.flashexpress.co.th/tracking/?se=${encodeURIComponent(track)}`, '_blank');
  } else if (track.toUpperCase().startsWith('KERRY') || track.toUpperCase().startsWith('SHP')) {
    window.open(`https://th.kerryexpress.com/th/track/?track=${encodeURIComponent(track)}`, '_blank');
  } else {
    window.open(`https://track.thailandpost.co.th/?trackNumber=${encodeURIComponent(track)}`, '_blank');
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
  <div class="p-3 sm:p-6 max-w-6xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-base-100 p-4 sm:p-5 rounded-2xl shadow-sm border border-base-300">
      <div>
        <h1 class="text-xl sm:text-2xl font-extrabold text-slate-900">
          ติดตามคำสั่งซื้อ (ลูกค้า)
        </h1>
        <p class="text-xs sm:text-sm text-gray-500 mt-0.5">
          ตรวจสอบรายละเอียดคำสั่งซื้อ แถบสถานะการจัดส่ง และหมายเลขพัสดุของคุณ
        </p>
      </div>

      <div class="flex items-center gap-2">
        <button @click="fetchMyOrders" class="btn btn-outline btn-sm gap-1" :disabled="loading">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          รีเฟรชข้อมูล
        </button>
        <router-link to="/" class="btn btn-primary btn-sm text-black font-semibold">
          ช้อปการ์ดเพิ่ม
        </router-link>
      </div>
    </div>

    <!-- ตัวโหลดข้อมูล -->
    <div v-if="loading" class="text-center py-16 bg-base-100 rounded-2xl border border-base-300">
      <span class="loading loading-spinner loading-lg text-primary"></span>
      <p class="mt-3 text-sm text-gray-500">กำลังโหลดข้อมูลคำสั่งซื้อ...</p>
    </div>

    <!-- ข้อผิดพลาด -->
    <div v-else-if="errorMessage" class="alert alert-error">
      <span>{{ errorMessage }}</span>
    </div>

    <!-- ไม่มีประวัติคำสั่งซื้อ -->
    <div v-else-if="orders.length === 0" class="text-center py-16 bg-base-100 rounded-2xl border border-base-300">
      <div class="w-16 h-16 mx-auto mb-3 bg-base-200 rounded-full flex items-center justify-center text-3xl">
        📦
      </div>
      <h3 class="text-lg font-bold text-slate-800">ยังไม่มีประวัติคำสั่งซื้อ</h3>
      <p class="text-sm text-gray-500 mb-4 mt-1">คุณยังไม่ได้สั่งซื้อการ์ดหรือสินค้าในระบบ</p>
      <router-link to="/" class="btn btn-primary btn-sm text-black font-semibold">
        เลือกดูการ์ดแวนการ์ดเลย
      </router-link>
    </div>

    <!-- กรณีมีคำสั่งซื้อ: แสดงรายละเอียดคำสั่งซื้อแบบในภาพ -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      <!-- ฝั่งซ้าย (4 cols): รายการคำสั่งซื้อทั้งหมดของ User ให้คลิกเลือกดูได้ -->
      <div class="lg:col-span-4 space-y-3">
        <h3 class="font-bold text-sm text-slate-800 px-1">
          คำสั่งซื้อของคุณ ({{ orders.length }})
        </h3>

        <div class="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
          <div 
            v-for="order in orders" 
            :key="order.id"
            @click="selectedOrder = order"
            class="p-3.5 rounded-xl border transition-all cursor-pointer relative"
            :class="selectedOrder?.id === order.id ? 'bg-primary/10 border-primary shadow-sm' : 'bg-base-100 border-base-300 hover:border-base-400'"
          >
            <div class="flex justify-between items-start">
              <div>
                <p class="font-bold text-sm text-slate-900">#FBT{{ order.id.toString().padStart(6, '0') }}</p>
                <p class="text-[11px] text-gray-400 mt-0.5">{{ formatThaiTime(order.created_at) }}</p>
              </div>
              <span class="badge badge-sm" :class="getStatusBadge(order.status).class">
                {{ getStatusBadge(order.status).text }}
              </span>
            </div>

            <div class="flex justify-between items-center mt-3 pt-2 border-t border-base-200 text-xs">
              <span class="text-gray-500">{{ order.items?.length || 0 }} รายการ</span>
              <span class="font-extrabold text-primary text-sm">฿{{ Number(order.total_amount).toLocaleString() }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ฝั่งขวา (8 cols): การ์ดแสดง "รายละเอียดคำสั่งซื้อ" แบบในภาพตัวอย่าง 100% -->
      <div v-if="selectedOrder" class="lg:col-span-8 space-y-5">
        
        <!-- กล่องหัวรายละเอียดคำสั่งซื้อ -->
        <div class="bg-base-100 p-5 sm:p-6 rounded-2xl shadow-sm border border-base-300 space-y-6">
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-base-200 pb-4">
            <div>
              <span class="badge badge-ghost badge-sm text-slate-600 font-semibold mb-1">คำสั่งซื้อของฉัน</span>
              <h2 class="text-xl sm:text-2xl font-extrabold text-slate-900">
                รายละเอียดคำสั่งซื้อ #FBT{{ selectedOrder.id.toString().padStart(6, '0') }}
              </h2>
              <p class="text-xs text-gray-400 mt-0.5">
                สั่งซื้อเมื่อ: {{ formatThaiTime(selectedOrder.created_at) }}
              </p>
            </div>

            <span class="badge badge-lg" :class="getStatusBadge(selectedOrder.status).class">
              {{ getStatusBadge(selectedOrder.status).text }}
            </span>
          </div>

          <!-- 1. แถบสถานะการจัดส่ง (Step Timeline แนวนอนตามในภาพ) -->
          <div class="bg-base-200/50 p-4 sm:p-6 rounded-xl border border-base-200">
            <div class="flex items-center justify-between max-w-xl mx-auto relative">
              
              <!-- จุดที่ 1: ชำระเงินสำเร็จ -->
              <div class="flex flex-col items-center text-center z-10 w-24">
                <div 
                  class="w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs font-bold shadow transition-all"
                  :class="getOrderStatusStep(selectedOrder.status) >= 1 ? 'bg-success text-white ring-4 ring-success/20' : 'bg-base-300 text-gray-400'"
                >
                  ✓
                </div>
                <span class="text-[11px] sm:text-xs font-bold text-slate-900 mt-2">ชำระเงินแล้ว</span>
                <span class="text-[9px] sm:text-[10px] text-gray-400 leading-tight mt-0.5">
                  {{ formatThaiTime(selectedOrder.created_at) }}
                </span>
              </div>

              <!-- เส้นคั่น 1 -> 2 -->
              <div class="flex-1 h-1 mx-1 sm:mx-2 -mt-7 transition-all" :class="getOrderStatusStep(selectedOrder.status) >= 2 ? 'bg-success' : 'bg-base-300'"></div>

              <!-- จุดที่ 2: กำลังจัดเตรียมสินค้า -->
              <div class="flex flex-col items-center text-center z-10 w-24">
                <div 
                  class="w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs font-bold shadow transition-all"
                  :class="getOrderStatusStep(selectedOrder.status) >= 2 ? 'bg-success text-white ring-4 ring-success/20' : 'bg-base-300 text-gray-400'"
                >
                  2
                </div>
                <span class="text-[11px] sm:text-xs font-bold text-slate-900 mt-2">เตรียมสินค้า</span>
                <span class="text-[9px] sm:text-[10px] text-gray-400 leading-tight mt-0.5">แพ็คกันกระแทก</span>
              </div>

              <!-- เส้นคั่น 2 -> 3 -->
              <div class="flex-1 h-1 mx-1 sm:mx-2 -mt-7 transition-all" :class="getOrderStatusStep(selectedOrder.status) >= 3 ? 'bg-success' : 'bg-base-300'"></div>

              <!-- จุดที่ 3: จัดส่งแล้ว -->
              <div class="flex flex-col items-center text-center z-10 w-24">
                <div 
                  class="w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs font-bold shadow transition-all"
                  :class="getOrderStatusStep(selectedOrder.status) >= 3 ? 'bg-success text-white ring-4 ring-success/20' : 'bg-base-300 text-gray-400'"
                >
                  3
                </div>
                <span class="text-[11px] sm:text-xs font-bold text-slate-900 mt-2">จัดส่งแล้ว</span>
                <span class="text-[9px] sm:text-[10px] text-emerald-600 font-semibold leading-tight mt-0.5">
                  {{ selectedOrder.tracking_number ? 'ขนส่งรับแล้ว' : 'รอเลขพัสดุ' }}
                </span>
              </div>

              <!-- เส้นคั่น 3 -> 4 -->
              <div class="flex-1 h-1 mx-1 sm:mx-2 -mt-7 transition-all" :class="getOrderStatusStep(selectedOrder.status) >= 4 ? 'bg-success' : 'bg-base-300'"></div>

              <!-- จุดที่ 4: สำเร็จ -->
              <div class="flex flex-col items-center text-center z-10 w-24">
                <div 
                  class="w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs font-bold shadow transition-all"
                  :class="getOrderStatusStep(selectedOrder.status) >= 4 ? 'bg-success text-white ring-4 ring-success/20' : 'bg-base-300 text-gray-400'"
                >
                  4
                </div>
                <span class="text-[11px] sm:text-xs font-bold text-slate-900 mt-2">สำเร็จ</span>
                <span class="text-[9px] sm:text-[10px] text-gray-400 leading-tight mt-0.5">
                  {{ getEstimatedDeliveryDate(selectedOrder.created_at) }}
                </span>
              </div>

            </div>
          </div>

          <!-- 2. ข้อมูลการจัดส่ง (ตามในภาพ) -->
          <div class="space-y-2">
            <h3 class="font-bold text-sm text-slate-900">ข้อมูลการจัดส่ง</h3>
            
            <div class="bg-base-100 p-4 rounded-xl border border-base-300 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div class="flex items-center gap-3">
                <!-- แบรนด์ขนส่ง (Flash Express ตามภาพ) -->
                <div class="bg-amber-400 text-slate-950 font-black text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow-sm">
                  <span>⚡ FLASH</span>
                  <span class="text-[10px] font-bold">Express</span>
                </div>

                <div>
                  <p class="font-mono font-extrabold text-sm sm:text-base text-slate-900">
                    {{ selectedOrder.tracking_number || 'TH1234567890 (ตัวอย่าง/อยู่ระหว่างเตรียม)' }}
                  </p>
                  <p class="text-[11px] text-gray-500">
                    จัดส่งไปที่: {{ selectedOrder.shipping_address }} (โทร: {{ selectedOrder.phone }})
                  </p>
                </div>
              </div>

              <!-- ปุ่มตรวจสอบสถานะ -->
              <button 
                @click="openTrackingUrl(selectedOrder.tracking_number || 'TH1234567890')" 
                class="btn btn-outline btn-sm btn-primary font-bold text-xs w-full sm:w-auto"
              >
                ตรวจสอบสถานะ ➔
              </button>
            </div>
          </div>

          <!-- 3. รายการสินค้า (ตามในภาพ) -->
          <div class="space-y-2">
            <h3 class="font-bold text-sm text-slate-900">รายการสินค้า ({{ selectedOrder.items?.length || 0 }} รายการ)</h3>

            <div class="space-y-2">
              <div 
                v-for="item in selectedOrder.items" 
                :key="item.id"
                class="flex items-center gap-3 sm:gap-4 p-3 bg-base-200/50 rounded-xl border border-base-200"
              >
                <!-- รูปการ์ด -->
                <div class="w-14 h-18 bg-base-100 rounded-lg overflow-hidden border border-base-300 shrink-0 flex items-center justify-center">
                  <img v-if="item.image_url" :src="getImageUrl(item.image_url)" class="w-full h-full object-contain" />
                  <span v-else class="text-[10px] text-gray-400">การ์ด</span>
                </div>

                <!-- ข้อมูลสินค้า -->
                <div class="flex-1 min-w-0">
                  <h4 class="font-bold text-sm text-slate-900 truncate">
                    {{ item.product_name || `การ์ดแวนการ์ด #${item.product_id}` }}
                  </h4>
                  <div class="flex items-center gap-2 mt-1 text-xs text-gray-500">
                    <span class="badge badge-ghost badge-xs font-mono">จำนวน: x{{ item.quantity }}</span>
                    <span>ราคาต่อใบ: ฿{{ Number(item.price || item.price_at_purchase || item.unit_price || item.product_price || 0).toLocaleString() }}</span>
                  </div>
                </div>

                <!-- ราคารวมของรายการนี้ -->
                <div class="text-right shrink-0">
                  <p class="font-bold text-sm text-slate-900">
                    ฿{{ (Number(item.price || item.price_at_purchase || item.unit_price || item.product_price || 0) * Number(item.quantity)).toLocaleString() }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- 4. ข้อมูลการชำระเงิน & รูปสลิป -->
          <div class="pt-4 border-t border-base-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <!-- วิธีชำระเงิน & สลิป -->
            <div class="bg-base-200/40 p-4 rounded-xl border border-base-200 space-y-2">
              <span class="text-xs font-semibold text-gray-500">วิธีการชำระเงิน:</span>
              <div class="flex items-center justify-between">
                <span class="badge badge-primary text-black font-bold uppercase text-xs">
                  {{ selectedOrder.payment_method }}
                </span>
                
                <button 
                  v-if="selectedOrder.slip_image" 
                  @click="selectedSlipModal = selectedOrder.slip_image" 
                  class="btn btn-xs btn-outline font-semibold"
                >
                  🔍 ดูรูปสลิปโอนเงิน
                </button>
                <span v-else class="text-[11px] text-gray-400">ไม่มีสลิป (COD)</span>
              </div>
            </div>

            <!-- สรุปยอดเงิน -->
            <div class="bg-base-200/40 p-4 rounded-xl border border-base-200 space-y-1.5 text-xs sm:text-sm">
              <div class="flex justify-between text-gray-600">
                <span>ยอดรวมสินค้า:</span>
                <span class="font-semibold text-slate-800">฿{{ Number(selectedOrder.total_amount).toLocaleString() }}</span>
              </div>
              <div class="flex justify-between text-gray-600">
                <span>การจัดส่ง:</span>
                <span class="text-emerald-600 font-semibold">จัดส่งมาตรฐาน</span>
              </div>
              <div class="flex justify-between font-extrabold text-base sm:text-lg text-primary pt-2 border-t border-base-300">
                <span>ยอดรวมสุทธิ:</span>
                <span>฿{{ Number(selectedOrder.total_amount).toLocaleString() }}</span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>

    <!-- Modal แสดงรูปสลิปโอนเงินขนาดใหญ่ -->
    <div 
      v-if="selectedSlipModal" 
      class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      @click="selectedSlipModal = null"
    >
      <div class="bg-base-100 p-4 rounded-2xl max-w-md w-full relative shadow-2xl" @click.stop>
        <button @click="selectedSlipModal = null" class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">
          ✕
        </button>
        <h3 class="font-bold text-base mb-3 text-slate-900">หลักฐานการโอนเงิน (สลิป)</h3>
        <img :src="getImageUrl(selectedSlipModal)" alt="Slip" class="w-full max-h-[70vh] object-contain rounded-lg border border-base-200" />
      </div>
    </div>

  </div>
</template>
