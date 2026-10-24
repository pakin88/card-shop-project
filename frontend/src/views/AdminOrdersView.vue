<script setup>
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';
import { useAuthStore } from '../stores/auth';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();

const orders = ref([]);
const loading = ref(true);
const errorMessage = ref('');
const selectedSlip = ref(null);

const activeTab = ref('to_ship');

const API_URL = 'https://card-shop-project.onrender.com';

const formatThaiTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    date.setHours(date.getHours() + 8);
    return date.toLocaleString('th-TH');
};

const fetchOrders = async () => {
    loading.value = true;
    errorMessage.value = '';
    try {
        const res = await axios.get(`${API_URL}/api/orders`, {
            headers: { Authorization: `Bearer ${authStore.token}` }
        });
        orders.value = res.data.map(order => ({
            ...order,
            saved_status: order.status
        }));
    } catch (error) {
        errorMessage.value = 'ไม่สามารถโหลดข้อมูลคำสั่งซื้อได้';
        console.error(error);
    } finally {
        loading.value = false;
    }
};

const tabCounts = computed(() => {
    return {
        to_ship: orders.value.filter(o => o.saved_status === 'pending' || o.saved_status === 'paid').length,
        shipped: orders.value.filter(o => o.saved_status === 'shipped').length,
        cancelled: orders.value.filter(o => o.saved_status === 'cancelled').length,
        all: orders.value.length
    };
});

const filteredOrders = computed(() => {
    if (activeTab.value === 'to_ship') {
        return orders.value.filter(o => o.saved_status === 'pending' || o.saved_status === 'paid');
    }
    if (activeTab.value === 'shipped') {
        return orders.value.filter(o => o.saved_status === 'shipped');
    }
    if (activeTab.value === 'cancelled') {
        return orders.value.filter(o => o.saved_status === 'cancelled');
    }
    return orders.value;
});

const updateOrder = async (order) => {
    try {
        await axios.put(`${API_URL}/api/orders/${order.id}/status`, {
            status: order.status,
            tracking_number: order.tracking_number
        }, {
            headers: { Authorization: `Bearer ${authStore.token}` }
        });
        order.saved_status = order.status;
        alert(`อัปเดตออเดอร์ #${order.id} สำเร็จ!`);
    } catch (error) {
        alert(error.response?.data?.message || 'เกิดข้อผิดพลาดในการอัปเดตออเดอร์');
        console.error(error);
    }
};

const deleteOrder = async (order) => {
    const confirmMsg = order.saved_status === 'shipped'
        ? `ยืนยันการลบออเดอร์ #${order.id} (จัดส่งสำเร็จแล้ว) ออกจากหน้าประวัติใช่หรือไม่?`
        : `ยืนยันการลบออเดอร์ #${order.id} ออกจากระบบใช่หรือไม่?`;

    if (!confirm(confirmMsg)) return;

    try {
        await axios.delete(`${API_URL}/api/orders/${order.id}`, {
            headers: { Authorization: `Bearer ${authStore.token}` }
        });
        orders.value = orders.value.filter(o => o.id !== order.id);
        alert(`ลบออเดอร์ #${order.id} เรียบร้อยแล้ว`);
    } catch (error) {
        alert(error.response?.data?.message || 'เกิดข้อผิดพลาดในการลบออเดอร์');
        console.error(error);
    }
};

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
    <div class="p-3 sm:p-6 max-w-6xl mx-auto">
        <div class="flex flex-wrap justify-between items-center gap-2 mb-4 sm:mb-6">
            <h1 class="text-xl sm:text-3xl font-bold">จัดการคำสั่งซื้อทั้งหมด (Admin)</h1>
            <button @click="fetchOrders" class="btn btn-outline btn-xs sm:btn-sm">รีเฟรชข้อมูล</button>
        </div>

        <!-- แถบเลือกหมวดหมู่สถานะคำสั่งซื้อ (บนมือถือเรียง 2 คอลัมน์กดง่าย) -->
        <div class="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 mb-6 border-b border-base-300 pb-4">
            <button 
                @click="activeTab = 'to_ship'" 
                class="btn btn-xs sm:btn-sm"
                :class="activeTab === 'to_ship' ? 'btn-primary text-white' : 'btn-ghost bg-base-100'"
            >
                ที่ต้องจัดส่ง ({{ tabCounts.to_ship }})
            </button>
            <button 
                @click="activeTab = 'shipped'" 
                class="btn btn-xs sm:btn-sm"
                :class="activeTab === 'shipped' ? 'btn-success text-white' : 'btn-ghost bg-base-100'"
            >
                จัดส่งแล้ว ({{ tabCounts.shipped }})
            </button>
            <button 
                @click="activeTab = 'cancelled'" 
                class="btn btn-xs sm:btn-sm"
                :class="activeTab === 'cancelled' ? 'btn-error text-white' : 'btn-ghost bg-base-100'"
            >
                ยกเลิกแล้ว ({{ tabCounts.cancelled }})
            </button>
            <button 
                @click="activeTab = 'all'" 
                class="btn btn-xs sm:btn-sm"
                :class="activeTab === 'all' ? 'btn-neutral text-white' : 'btn-ghost bg-base-100'"
            >
                ทั้งหมด ({{ tabCounts.all }})
            </button>
        </div>

        <div v-if="loading" class="text-center py-10">
            <span class="loading loading-spinner loading-lg text-primary"></span>
            <p class="mt-2">กำลังโหลดรายการคำสั่งซื้อ...</p>
        </div>

        <div v-else-if="errorMessage" class="alert alert-error">
            <span>{{ errorMessage }}</span>
        </div>

        <div v-else-if="filteredOrders.length === 0" class="text-center py-12 bg-base-100 rounded-xl border border-base-300 text-gray-400 text-sm sm:text-base">
            ไม่มีรายการคำสั่งซื้อในหมวดหมู่นี้
        </div>

        <!-- ตารางแสดงรายการออเดอร์ -->
        <div v-else class="space-y-4 sm:space-y-6">
            <div v-for="order in filteredOrders" :key="order.id" class="card bg-base-100 shadow-md border border-base-300">
                <div class="card-body p-4 sm:p-6">
                    <div class="flex flex-col sm:flex-row justify-between items-start gap-2 sm:gap-4 border-b border-base-200 pb-3 sm:pb-4">
                        <div>
                            <h2 class="card-title text-base sm:text-lg flex-wrap">
                                ออเดอร์ #{{ order.id }}
                                <span class="badge badge-primary badge-sm sm:badge-md">{{ order.payment_method.toUpperCase() }}</span>
                                <span v-if="order.saved_status === 'shipped'" class="badge badge-success badge-sm sm:badge-md text-white">จัดส่งแล้ว</span>
                                <span v-else-if="order.saved_status === 'cancelled'" class="badge badge-error badge-sm sm:badge-md text-white">ยกเลิกแล้ว</span>
                            </h2>
                            <p class="text-xs sm:text-sm text-gray-400 mt-1">
                                ผู้สั่ง: {{ order.username || 'ลูกค้า' }} ({{ order.email || '-' }}) | โทร: {{ order.phone }}
                            </p>
                            <p class="text-xs sm:text-sm mt-1"><strong>ที่อยู่จัดส่ง:</strong> {{ order.shipping_address }}</p>
                        </div>

                        <div class="sm:text-right w-full sm:w-auto flex sm:block justify-between items-center pt-2 sm:pt-0 border-t sm:border-t-0 border-base-200">
                            <p class="text-xl sm:text-2xl font-bold text-primary">
                                ฿{{ Number(order.total_amount).toLocaleString() }}
                            </p>
                            <p class="text-xs text-gray-400">{{ formatThaiTime(order.created_at) }}</p>
                        </div>
                    </div>

                    <!-- รายการสินค้าที่สั่ง และ รูปสลิป -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 py-2 sm:py-3">
                        <div class="md:col-span-2">
                            <h3 class="font-semibold text-xs sm:text-sm mb-2">รายการสินค้าที่สั่งซื้อ:</h3>
                            <ul class="space-y-1.5 text-xs sm:text-sm bg-base-200 p-3 rounded-lg">
                                <li v-for="item in order.items" :key="item.id" class="flex justify-between gap-2">
                                    <span class=" break-words">{{ item.product_name || `รหัสสินค้า #${item.product_id}` }} (x{{ item.quantity }})</span>
                                    <span class="font-medium shrink-0">
                                        ฿{{ (Number(item.price || item.price_at_purchase || item.unit_price || item.product_price || 0) * Number(item.quantity)).toLocaleString() }}
                                    </span>
                                </li>
                            </ul>
                        </div>

                        <!-- ส่วนแสดงสลิปโอนเงิน -->
                        <div class="flex flex-col items-center justify-center bg-base-200 p-3 rounded-lg">
                            <span class="text-xs sm:text-sm font-semibold mb-2">หลักฐานการโอนเงิน</span>
                            <div v-if="order.slip_image">
                                <img 
                                    :src="getSlipUrl(order.slip_image)" 
                                    alt="Slip"
                                    class="h-28 object-cover rounded cursor-pointer border hover:opacity-80 mx-auto"
                                    @click="selectedSlip = getSlipUrl(order.slip_image)" 
                                />
                                <p 
                                    class="text-xs text-center mt-1 text-info cursor-pointer"
                                    @click="selectedSlip = getSlipUrl(order.slip_image)"
                                >
                                    คลิกเพื่อดูรูปใหญ่
                                </p>
                            </div>
                            <span v-else class="text-xs text-gray-400">ไม่มีสลิป (เก็บเงินปลายทาง)</span>
                        </div>
                    </div>

                    <!-- ส่วนปรับสถานะ กรอกเลขพัสดุ และปุ่มลบออเดอร์ -->
                    <div class="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-end gap-3 pt-3 border-t border-base-200">
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
                            <label class="label py-1"><span class="label-text text-xs">เลขพัสดุ (Tracking Number)</span></label>
                            <input 
                                type="text" 
                                v-model="order.tracking_number" 
                                placeholder="เช่น TH123456789"
                                class="input input-bordered input-sm w-full" 
                            />
                        </div>

                        <div class="flex gap-2 w-full sm:w-auto pt-1 sm:pt-0">
                            <button @click="updateOrder(order)" class="btn btn-success btn-sm text-white flex-1 sm:flex-initial">
                                บันทึกการเปลี่ยนแปลง
                            </button>
                            <button @click="deleteOrder(order)" class="btn btn-outline btn-error btn-sm">
                                ลบออเดอร์
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal ดูรูปสลิปขนาดใหญ่ -->
        <div 
            v-if="selectedSlip" 
            class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-3 sm:p-4"
            @click="selectedSlip = null"
        >
            <div class="relative max-w-lg w-full bg-base-100 p-4 rounded-xl" @click.stop>
                <button @click="selectedSlip = null" class="btn btn-sm btn-circle absolute right-2 top-2">✕</button>
                <h3 class="font-bold text-base sm:text-lg mb-3">รูปสลิปโอนเงิน</h3>
                <img :src="selectedSlip" alt="Slip Full" class="w-full max-h-[75vh] object-contain rounded" />
            </div>
        </div>
    </div>
</template>