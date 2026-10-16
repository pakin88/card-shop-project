<script setup>
import { ref, computed } from 'vue';
import { useCartStore } from '../stores/cart';
import { useAuthStore } from '../stores/auth';
import { useRouter } from 'vue-router';
import axios from 'axios';

const cartStore = useCartStore();
const authStore = useAuthStore();
const router = useRouter();

// ถ้าตะกร้าว่าง ให้เด้งกลับหน้าแรกทันที
if (cartStore.items.length === 0) {
  router.push('/');
}

// ข้อมูลสำหรับฟอร์ม
const formData = ref({
  phone: authStore.user?.phone || '',
  shipping_address: authStore.user?.address || '',
  payment_method: 'qr',
});

const slipFile = ref(null);
const isSubmitting = ref(false);
const errorMessage = ref('');

// จัดการเมื่อเลือกไฟล์สลิป
const handleFileChange = (e) => {
  slipFile.value = e.target.files[0];
};

// ฟังก์ชันกดสั่งซื้อ
const submitOrder = async () => {
  if (formData.value.payment_method !== 'cod' && !slipFile.value) {
    errorMessage.value = 'กรุณาแนบรูปสลิปโอนเงิน';
    return;
  }

  isSubmitting.value = true;
  errorMessage.value = '';

  try {
    // ต้องใช้ FormData เพราะมีการอัปโหลดไฟล์
    const orderData = new FormData();
    orderData.append('total_amount', cartStore.totalPrice);
    orderData.append('payment_method', formData.value.payment_method);
    orderData.append('shipping_address', formData.value.shipping_address);
    orderData.append('phone', formData.value.phone);
    // แปลงตะกร้าเป็น JSON ก่อนแนบ
    orderData.append('items', JSON.stringify(cartStore.items)); 
    
    if (slipFile.value) {
      orderData.append('slip_image', slipFile.value);
    }

  
const response = await axios.post('https://card-shop-project.onrender.com/api/orders', orderData, {
      headers: {
        'Authorization': `Bearer ${authStore.token}`,
        'Content-Type': 'multipart/form-data'
      }
    });

    if (response.status === 201) {
      alert('สั่งซื้อสำเร็จ! รอ Admin ตรวจสอบ');
      cartStore.clearCart(); // ล้างตะกร้า
      router.push('/'); // พาไปหน้าแรก (เดี๋ยวค่อยแก้ไปหน้าประวัติ)
    }

  } catch (error) {
    errorMessage.value = error.response?.data?.message || 'เกิดข้อผิดพลาดในการสั่งซื้อ';
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <div class="p-6 max-w-4xl mx-auto">
    <h1 class="text-3xl font-bold mb-8 text-center">ยืนยันคำสั่งซื้อ</h1>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      
      <!-- ฝั่งซ้าย: ฟอร์มที่อยู่และการชำระเงิน -->
      <div class="bg-base-100 p-6 rounded-xl shadow-md border border-gray-200">
        <h2 class="text-xl font-bold mb-4">ข้อมูลจัดส่ง</h2>
        
        <form @submit.prevent="submitOrder">
          <div class="form-control w-full mb-3">
            <label class="label"><span class="label-text font-semibold">เบอร์โทรศัพท์ติดต่อ</span></label>
            <input type="text" v-model="formData.phone" class="input input-bordered w-full" required placeholder="08X-XXX-XXXX" />
          </div>

          <div class="form-control w-full mb-6">
            <label class="label"><span class="label-text font-semibold">ที่อยู่จัดส่งแบบละเอียด</span></label>
            <textarea v-model="formData.shipping_address" class="textarea textarea-bordered h-24" required placeholder="บ้านเลขที่ หมู่ ซอย ถนน ตำบล อำเภอ จังหวัด รหัสไปรษณีย์"></textarea>
          </div>

          <h2 class="text-xl font-bold mb-4">วิธีชำระเงิน</h2>
          <div class="flex flex-col space-y-3 mb-6">
            <label class="flex items-center space-x-3 cursor-pointer p-3 border rounded-lg hover:bg-base-200">
              <input type="radio" v-model="formData.payment_method" value="qr" class="radio radio-primary" />
              <span>สแกน QR PromptPay</span>
            </label>
            <label class="flex items-center space-x-3 cursor-pointer p-3 border rounded-lg hover:bg-base-200">
              <input type="radio" v-model="formData.payment_method" value="transfer" class="radio radio-primary" />
              <span>โอนเงินผ่านบัญชีธนาคาร</span>
            </label>
            <label class="flex items-center space-x-3 cursor-pointer p-3 border rounded-lg hover:bg-base-200">
              <input type="radio" v-model="formData.payment_method" value="cod" class="radio radio-primary" />
              <span>เก็บเงินปลายทาง (COD)</span>
            </label>
          </div>

          <!-- ช่องอัปโหลดสลิป (จะซ่อนถ้าเลือกปลายทาง) -->
          <div v-if="formData.payment_method !== 'cod'" class="form-control w-full mb-6 p-4 bg-gray-50 rounded-lg border">
            <p class="text-center font-bold text-lg mb-2">ยอดที่ต้องโอน: <span class="text-primary">฿{{ cartStore.totalPrice.toLocaleString() }}</span></p>
            <p class="text-center text-sm text-gray-500 mb-4">(ตัวอย่าง) โอนเงินเข้าบัญชี: กสิกรไทย 123-4-56789-0 นายทดสอบ แวนการ์ด</p>
            <label class="label"><span class="label-text font-semibold text-error">แนบรูปสลิปโอนเงิน *</span></label>
            <input type="file" @change="handleFileChange" accept="image/*" class="file-input file-input-bordered file-input-primary w-full" required />
          </div>

          <div v-if="errorMessage" class="text-error text-center mb-4">{{ errorMessage }}</div>

          <button type="submit" class="btn btn-primary w-full text-white text-lg" :disabled="isSubmitting">
            <span v-if="isSubmitting" class="loading loading-spinner"></span>
            ยืนยันการสั่งซื้อ
          </button>
        </form>
      </div>

      <!-- ฝั่งขวา: สรุปตะกร้า -->
      <div class="bg-base-50 p-6 rounded-xl border border-gray-200 h-fit">
        <h2 class="text-xl font-bold mb-4 border-b pb-2">รายการการ์ด</h2>
        <div class="space-y-3 mb-4 max-h-96 overflow-y-auto pr-2">
          <div v-for="item in cartStore.items" :key="item.id" class="flex justify-between items-center text-sm">
            <div class="flex items-center space-x-3">
              <span class="badge">{{ item.quantity }}x</span>
              <span class="w-40 truncate">{{ item.name }}</span>
            </div>
            <span class="font-semibold">฿{{ (item.price * item.quantity).toLocaleString() }}</span>
          </div>
        </div>
        <div class="flex justify-between text-xl font-bold border-t pt-4 text-primary">
          <span>ยอดรวมทั้งสิ้น:</span>
          <span>฿{{ cartStore.totalPrice.toLocaleString() }}</span>
        </div>
      </div>

    </div>
  </div>
</template>