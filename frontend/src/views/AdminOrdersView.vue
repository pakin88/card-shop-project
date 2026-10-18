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
const selectedSlip = ref(null); // สำหรับเปิดดูรูปสลิปขนาดใหญ่

const API_URL = 'https://card-shop-project.onrender.com';
// ฟังก์ชันแปลงเวลาให้ตรงกับเวลาประเทศไทย (ชดเชยเวลา Database ที่ช้ากว่า 8 ชม.)
const formatThaiTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    date.setHours(date.getHours() + 8); // บวกชดเชย 8 ชั่วโมง
    return date.toLocaleString('th-TH');
};
// ดึงข้อมูลออเดอร์ทั้งหมด
const fetchOrders = async () => {
    loading.value = true;
    errorMessage.value = '';
    try {
        const res = await axios.get(`${API_URL}/api/orders`, {
            headers: { Authorization: `Bearer ${authStore.token}` }
        });
        orders.value = res.data;
    } catch (error) {
        errorMessage.value = 'ไม่สามารถโหลดข้อมูลคำสั่งซื้อได้';
        console.error(error);
    } finally {
        loading.value = false;
    }
};

// บันทึกการเปลี่ยนสถานะและเลขพัสดุ
const updateOrder = async (order) => {
    try {
        await axios.put(`${API_URL}/api/orders/${order.id}/status`, {
            status: order.status,
            tracking_number: order.tracking_number
        }, {
            headers: { Authorization: `Bearer ${authStore.token}` }
        });
        alert(`อัปเดตออเดอร์ #${order.id} สำเร็จ!`);
    } catch (error) {
        alert('เกิดข้อผิดพลาดในการอัปเดตออเดอร์');
        console.error(error);
    }
};

// แปลงลิงก์รูปสลิปให้แสดงผลถูกต้อง
// แปลงลิงก์รูปสลิปให้แสดงผลถูกต้องเสมอ
const getSlipUrl = (slip) => {
  if (!slip) return '';
  if (slip.startsWith('data:image') || slip.startsWith('http')) return slip;
  const fileName = slip.replace(/^\/?uploads[\/\\]/, '');
  return `${API_URL}/uploads/${fileName}`;
};
onMounted(() => {
    if (!authStore.isAdmin) {
        alert('หน้านี้สำหรับผู้ดูแลระบบ (Admin) เท่านั้น');
        router.push('/');
        return;
    }
    fetchOrders();
});
</script>

<template>
    <div class="p-6 max-w-6xl mx-auto">
        <div class="flex justify-between items-center mb-6">
            <h1 class="text-3xl font-bold">จัดการคำสั่งซื้อทั้งหมด (Admin)</h1>
            <button @click="fetchOrders" class="btn btn-outline btn-sm">รีเฟรชข้อมูล</button>
        </div>

        <div v-if="loading" class="text-center py-10">
            <span class="loading loading-spinner loading-lg text-primary"></span>
            <p class="mt-2">กำลังโหลดรายการคำสั่งซื้อ...</p>
        </div>

        <div v-else-if="errorMessage" class="alert alert-error">
            <span>{{ errorMessage }}</span>
        </div>

        <div v-else-if="orders.length === 0" class="text-center py-10 text-gray-400">
            ยังไม่มีรายการคำสั่งซื้อเข้ามาในระบบ
        </div>

        <!-- ตารางแสดงรายการออเดอร์ -->
        <div v-else class="space-y-6">
            <div v-for="order in orders" :key="order.id" class="card bg-base-100 shadow-md border border-base-300">
                <div class="card-body">
                    <div class="flex flex-wrap justify-between items-start gap-4 border-b border-base-200 pb-4">
                        <div>
                            <h2 class="card-title text-lg">
                                ออเดอร์ #{{ order.id }}
                                <span class="badge badge-primary">{{ order.payment_method.toUpperCase() }}</span>
                            </h2>
                            <p class="text-sm text-gray-400">
                                ผู้สั่ง: {{ order.username || 'ลูกค้า' }} ({{ order.email || '-' }}) | โทร: {{
                                    order.phone }}
                            </p>
                            <p class="text-sm mt-1"><strong>ที่อยู่จัดส่ง:</strong> {{ order.shipping_address }}</p>
                        </div>

                        <div class="text-right">
                            <p class="text-2xl font-bold text-primary">฿{{ Number(order.total_amount).toLocaleString()
                            }}</p>
                            <!-- แก้จาก {{ new Date(order.created_at).toLocaleString('th-TH') }} เป็นบรรทัดนี้ -->
                            <p class="text-xs text-gray-400">{{ formatThaiTime(order.created_at) }}</p>
                        </div>
                    </div>

                    <!-- รายการการ์ดที่สั่ง และ รูปสลิป -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 py-3">
                        <div class="md:col-span-2">
                            <h3 class="font-semibold text-sm mb-2">รายการการ์ดที่สั่งซื้อ:</h3>
                            <ul class="space-y-1 text-sm bg-base-200 p-3 rounded-lg">
                                <li v-for="item in order.items" :key="item.id" class="flex justify-between">
                                    <span>{{ item.product_name || `รหัสสินค้า #${item.product_id}` }} (x{{ item.quantity
                                    }})</span>
                                    <!-- แก้จาก ฿{{ (item.price * item.quantity).toLocaleString() }} เป็นบรรทัดด้านล่างนี้ -->
                                    <span class="font-medium">
                                        ฿{{ (Number(item.price || item.price_at_purchase || item.unit_price ||
                                            item.product_price || 0) * Number(item.quantity)).toLocaleString() }}
                                    </span>
                                </li>
                            </ul>
                        </div>

                        <!-- ส่วนแสดงสลิปโอนเงิน -->
                        <div class="flex flex-col items-center justify-center bg-base-200 p-3 rounded-lg">
                            <span class="text-sm font-semibold mb-2">หลักฐานการโอนเงิน</span>
                            <div v-if="order.slip_image">
                                <img :src="getSlipUrl(order.slip_image)" alt="Slip"
                                    class="h-28 object-cover rounded cursor-pointer border hover:opacity-80"
                                    @click="selectedSlip = getSlipUrl(order.slip_image)" />
                                <p class="text-xs text-center mt-1 text-info cursor-pointer"
                                    @click="selectedSlip = getSlipUrl(order.slip_image)">
                                    คลิกเพื่อดูรูปใหญ่
                                </p>
                            </div>
                            <span v-else class="text-xs text-gray-400">ไม่มีสลิป (เก็บเงินปลายทาง)</span>
                        </div>
                    </div>

                    <!-- ส่วนปรับสถานะและกรอกเลขพัสดุ -->
                    <div class="flex flex-wrap items-end gap-4 pt-3 border-t border-base-200">
                        <div class="form-control w-full sm:w-48">
                            <label class="label py-1"><span class="label-text text-xs">สถานะคำสั่งซื้อ</span></label>
                            <select v-model="order.status" class="select select-bordered select-sm w-full">
                                <option value="pending">รอตรวจสอบ (Pending)</option>
                                <option value="paid">ชำระเงินแล้ว (Paid)</option>
                                <option value="shipped">จัดส่งแล้ว (Shipped)</option>
                                <option value="cancelled">ยกเลิก (Cancelled)</option>
                            </select>
                        </div>

                        <div class="form-control flex-1 min-w-[200px]">
                            <label class="label py-1"><span class="label-text text-xs">เลขพัสดุ (Tracking
                                    Number)</span></label>
                            <input type="text" v-model="order.tracking_number" placeholder="เช่น TH123456789"
                                class="input input-bordered input-sm w-full" />
                        </div>

                        <button @click="updateOrder(order)" class="btn btn-success btn-sm text-white">
                            บันทึกการเปลี่ยนแปลง
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal ดูรูปสลิปขนาดใหญ่ -->
        <div v-if="selectedSlip" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
            @click="selectedSlip = null">
            <div class="relative max-w-lg w-full bg-base-100 p-4 rounded-xl" @click.stop>
                <button @click="selectedSlip = null" class="btn btn-sm btn-circle absolute right-2 top-2">✕</button>
                <h3 class="font-bold text-lg mb-3">รูปสลิปโอนเงิน</h3>
                <img :src="selectedSlip" alt="Slip Full" class="w-full max-h-[75vh] object-contain rounded" />
            </div>
        </div>
    </div>
</template>