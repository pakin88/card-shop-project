<script setup>
import { ref, computed } from 'vue';
import { useCartStore } from '../stores/cart';
import { useAuthStore } from '../stores/auth';
import { useRouter } from 'vue-router';
import axios from 'axios';

const cartStore = useCartStore();
const authStore = useAuthStore();
const router = useRouter();

const API_URL = 'https://card-shop-project.onrender.com';

// สเต็ปปัจจุบัน: 1: ตะกร้า, 2: จัดส่ง & วิธีชำระ, 3: ตรวจสอบ & แนบสลิป, 4: เสร็จสิ้น
const currentStep = ref(1);
const createdOrderId = ref(null);

// ข้อมูลสำหรับฟอร์ม
const formData = ref({
  phone: authStore.user?.phone || '',
  shipping_address: '',
  payment_method: 'qr', // 'qr', 'transfer', 'cod'
  note: ''
});

// คูปองส่วนลด
const couponCode = ref('');
const appliedDiscount = ref(0);
const couponMessage = ref('');
const couponError = ref('');

const applyCoupon = () => {
  couponError.value = '';
  couponMessage.value = '';
  const code = couponCode.value.trim().toUpperCase();

  if (code === 'VG10' || code === 'VANGUARD10') {
    appliedDiscount.value = Math.round(cartStore.totalPrice * 0.1);
    couponMessage.value = 'ใช้โค้ดลด 10% สำเร็จ!';
  } else if (code === 'FREESHIP') {
    appliedDiscount.value = shippingCost.value;
    couponMessage.value = 'ใช้โค้ดส่งฟรีสำเร็จ!';
  } else if (code === 'FBTOY50') {
    appliedDiscount.value = Math.min(50, cartStore.totalPrice);
    couponMessage.value = 'ใช้ส่วนลด ฿50 สำเร็จ!';
  } else {
    couponError.value = 'โค้ดส่วนลดไม่ถูกต้องหรือหมดอายุ';
    appliedDiscount.value = 0;
  }
};

// ค่าจัดส่ง (฿40 หรือฟรีเมื่อยอดเกิน ฿1,000)
const shippingCost = computed(() => {
  if (cartStore.totalPrice >= 1000) return 0;
  return 40;
});

// ยอดรวมสุทธิหลังหักส่วนลดและรวมค่าส่ง
const finalTotal = computed(() => {
  const total = cartStore.totalPrice + shippingCost.value - appliedDiscount.value;
  return Math.max(total, 0);
});

// การจัดการไฟล์สลิป
const slipFile = ref(null);
const slipPreview = ref('');
const isSubmitting = ref(false);
const errorMessage = ref('');

const handleFileChange = (e) => {
  const file = e.target.files[0];
  if (file) {
    slipFile.value = file;
    slipPreview.value = URL.createObjectURL(file);
    errorMessage.value = '';
  }
};

const copyAccountNumber = (accNo) => {
  navigator.clipboard.writeText(accNo);
  alert(`คัดลอกเลขบัญชี ${accNo} เรียบร้อยแล้ว`);
};

// ข้อมูลพร้อมเพย์
const promptPayNumber = ref(localStorage.getItem('card_shop_promptpay') || '0947153616');

// ฟังก์ชันคำนวณ CRC16 Checksum สำหรับ EMVCo
const crc16 = (data) => {
  let crc = 0xFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
};

// ฟังก์ชันสร้าง EMVCo Payload สำหรับ PromptPay QR Code
const generatePromptPayPayload = (target, amount) => {
  const sanitized = target.replace(/[^0-9]/g, '');
  let targetTag = '';
  if (sanitized.length === 10) {
    const formatted = '0066' + sanitized.substring(1);
    targetTag = '01' + formatted.length.toString().padStart(2, '0') + formatted;
  } else if (sanitized.length === 13) {
    targetTag = '02' + sanitized.length.toString().padStart(2, '0') + sanitized;
  } else {
    targetTag = '01' + sanitized.length.toString().padStart(2, '0') + sanitized;
  }

  const aid = '0016A000000677010111';
  const tag29Value = aid + targetTag;
  const tag29 = '29' + tag29Value.length.toString().padStart(2, '0') + tag29Value;

  let payload = '000201' + (amount ? '010212' : '010211') + tag29 + '5802TH' + '5303764';
  if (amount && Number(amount) > 0) {
    const amtStr = Number(amount).toFixed(2);
    payload += '54' + amtStr.length.toString().padStart(2, '0') + amtStr;
  }
  payload += '6304';
  payload += crc16(payload);
  return payload;
};

const promptPayQrUrl = computed(() => {
  const payload = generatePromptPayPayload(promptPayNumber.value, finalTotal.value);
  return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(payload)}`;
});

const copyPromptPayNumber = (phone) => {
  navigator.clipboard.writeText(phone);
  alert(`คัดลอกเบอร์พร้อมเพย์ ${phone} เรียบร้อยแล้ว`);
};

// URL รูปภาพ
const getImageUrl = (img) => {
  if (!img) return '';
  if (img.startsWith('data:image') || img.startsWith('http')) return img;
  return `${API_URL}/uploads/${img.replace(/^\/?uploads[\/\\]/, '')}`;
};

// ไปสเต็ปถัดไปพร้อม Validation
const goToStep = (step) => {
  if (step === 2) {
    if (cartStore.items.length === 0) {
      alert('ไม่มีสินค้าในตะกร้า');
      return;
    }
  } else if (step === 3) {
    if (!formData.value.phone.trim()) {
      alert('กรุณากรอกเบอร์โทรศัพท์ติดต่อ');
      return;
    }
    if (!formData.value.shipping_address.trim()) {
      alert('กรุณากรอกที่อยู่จัดส่งให้ละเอียด');
      return;
    }
  }
  currentStep.value = step;
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ยืนยันคำสั่งซื้อ
const submitOrder = async () => {
  if (formData.value.payment_method !== 'cod' && !slipFile.value) {
    errorMessage.value = 'กรุณาแนบรูปภาพสลิปโอนเงินเพื่อยืนยันคำสั่งซื้อ';
    return;
  }

  isSubmitting.value = true;
  errorMessage.value = '';

  try {
    const orderData = new FormData();
    orderData.append('total_amount', finalTotal.value);
    orderData.append('payment_method', formData.value.payment_method);
    orderData.append('shipping_address', formData.value.shipping_address);
    orderData.append('phone', formData.value.phone);

    const minimalItems = cartStore.items.map(item => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      price: item.price
    }));
    orderData.append('items', JSON.stringify(minimalItems));

    if (slipFile.value) {
      orderData.append('slip_image', slipFile.value);
    }

    const response = await axios.post(`${API_URL}/api/orders`, orderData, {
      headers: {
        'Authorization': `Bearer ${authStore.token}`,
        'Content-Type': 'multipart/form-data'
      }
    });

    if (response.status === 201) {
      createdOrderId.value = response.data.orderId || Math.floor(100000 + Math.random() * 900000);
      cartStore.clearCart();
      currentStep.value = 4; // สเต็ป 4 เสร็จสิ้น
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  } catch (error) {
    errorMessage.value = error.response?.data?.message || 'เกิดข้อผิดพลาดในการสั่งซื้อ กรุณาลองใหม่อีกครั้ง';
    console.error('Order error:', error);
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <div class="p-3 sm:p-6 max-w-5xl mx-auto">
    <!-- Stepper 4 ขั้นตอนตามในภาพ -->
    <div class="mb-8 bg-base-100 p-4 sm:p-6 rounded-2xl shadow-sm border border-base-300">
      <div class="flex items-center justify-between max-w-2xl mx-auto">
        <!-- Step 1 -->
        <div class="flex flex-col items-center">
          <div 
            class="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-all shadow"
            :class="currentStep >= 1 ? 'bg-primary text-white' : 'bg-base-300 text-gray-500'"
          >
            1
          </div>
          <span class="text-[11px] sm:text-xs font-semibold mt-1" :class="currentStep >= 1 ? 'text-slate-900 font-bold' : 'text-gray-400'">
            ตะกร้า
          </span>
        </div>

        <div class="flex-1 h-0.5 mx-2 sm:mx-4 transition-all" :class="currentStep >= 2 ? 'bg-primary' : 'bg-base-300'"></div>

        <!-- Step 2 -->
        <div class="flex flex-col items-center">
          <div 
            class="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-all shadow"
            :class="currentStep >= 2 ? 'bg-primary text-white' : 'bg-base-300 text-gray-500'"
          >
            2
          </div>
          <span class="text-[11px] sm:text-xs font-semibold mt-1" :class="currentStep >= 2 ? 'text-slate-900 font-bold' : 'text-gray-400'">
            ชำระเงิน
          </span>
        </div>

        <div class="flex-1 h-0.5 mx-2 sm:mx-4 transition-all" :class="currentStep >= 3 ? 'bg-primary' : 'bg-base-300'"></div>

        <!-- Step 3 -->
        <div class="flex flex-col items-center">
          <div 
            class="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-all shadow"
            :class="currentStep >= 3 ? 'bg-primary text-white' : 'bg-base-300 text-gray-500'"
          >
            3
          </div>
          <span class="text-[11px] sm:text-xs font-semibold mt-1" :class="currentStep >= 3 ? 'text-slate-900 font-bold' : 'text-gray-400'">
            ตรวจสอบ
          </span>
        </div>

        <div class="flex-1 h-0.5 mx-2 sm:mx-4 transition-all" :class="currentStep >= 4 ? 'bg-primary' : 'bg-base-300'"></div>

        <!-- Step 4 -->
        <div class="flex flex-col items-center">
          <div 
            class="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-all shadow"
            :class="currentStep >= 4 ? 'bg-success text-white' : 'bg-base-300 text-gray-500'"
          >
            ✓
          </div>
          <span class="text-[11px] sm:text-xs font-semibold mt-1" :class="currentStep >= 4 ? 'text-success font-bold' : 'text-gray-400'">
            เสร็จสิ้น
          </span>
        </div>
      </div>
    </div>

    <!-- กรณีไม่มีสินค้า และยังไม่ได้เสร็จสิ้น -->
    <div v-if="cartStore.items.length === 0 && currentStep !== 4" class="text-center py-16 bg-base-100 rounded-2xl border border-base-300">
      <div class="w-16 h-16 mx-auto mb-3 bg-base-200 rounded-full flex items-center justify-center text-slate-400">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </div>
      <h2 class="text-xl font-bold text-slate-800 mb-2">ไม่มีสินค้าในตะกร้า</h2>
      <p class="text-sm text-gray-500 mb-4">คุณยังไม่ได้เลือกการ์ดหรือสินค้าใดๆ</p>
      <router-link to="/" class="btn btn-primary btn-sm text-white font-semibold">
        กลับไปเลือกซื้อสินค้า
      </router-link>
    </div>

    <!-- โครงร่างหลัก Step 1 - 3 -->
    <div v-else-if="currentStep < 4" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      <!-- ฝั่งซ้าย (2 cols): เนื้อหาตามแต่ละ Step -->
      <div class="lg:col-span-2 space-y-4">
        
        <!-- =================== STEP 1: ตะกร้าสินค้า =================== -->
        <div v-if="currentStep === 1" class="bg-base-100 p-4 sm:p-6 rounded-2xl shadow-sm border border-base-300 space-y-4">
          <div class="flex justify-between items-center border-b border-base-200 pb-3">
            <h2 class="text-lg font-bold text-slate-900">รายการสินค้าในตะกร้า ({{ cartStore.totalItems }} ชิ้น)</h2>
            <router-link to="/" class="text-xs text-primary hover:underline font-semibold">
              + เลือกสินค้าเพิ่ม
            </router-link>
          </div>

          <div class="space-y-3">
            <div 
              v-for="item in cartStore.items" 
              :key="item.id" 
              class="flex items-center gap-3 sm:gap-4 p-3 rounded-xl bg-base-200/40 border border-base-200"
            >
              <!-- รูปสินค้า -->
              <div class="w-16 h-20 bg-base-100 rounded-lg overflow-hidden border border-base-300 shrink-0 flex items-center justify-center">
                <img v-if="item.image_url" :src="getImageUrl(item.image_url)" class="w-full h-full object-contain" />
                <span v-else class="text-[10px] text-gray-400">การ์ด</span>
              </div>

              <!-- รายละเอียดการ์ด -->
              <div class="flex-1 min-w-0">
                <h3 class="font-bold text-sm text-slate-900 truncate">{{ item.name }}</h3>
                <p class="text-xs text-primary font-bold mt-0.5">฿{{ Number(item.price).toLocaleString() }}</p>
                <p class="text-[10px] text-gray-400">คลังคงเหลือ: {{ item.stock }} ชิ้น</p>
              </div>

              <!-- ปรับจำนวน -->
              <div class="flex items-center gap-1.5">
                <button @click="cartStore.decreaseQuantity(item.id)" class="btn btn-xs btn-square btn-outline">-</button>
                <span class="w-7 text-center font-bold text-xs">{{ item.quantity }}</span>
                <button 
                  @click="cartStore.increaseQuantity(item.id)" 
                  class="btn btn-xs btn-square btn-outline"
                  :disabled="item.quantity >= item.stock"
                >+</button>
              </div>

              <!-- รวมต่อชิ้น -->
              <div class="text-right min-w-[70px]">
                <p class="text-sm font-bold text-slate-900">฿{{ (item.price * item.quantity).toLocaleString() }}</p>
              </div>

              <!-- ปุ่มลบ -->
              <button @click="cartStore.removeFromCart(item.id)" class="btn btn-ghost btn-xs btn-circle text-error">
                ✕
              </button>
            </div>
          </div>

          <div class="pt-4 border-t border-base-200 flex justify-end">
            <button @click="goToStep(2)" class="btn btn-primary text-white font-bold w-full sm:w-auto px-8">
              ดำเนินการชำระเงิน ➔
            </button>
          </div>
        </div>


        <!-- =================== STEP 2: ข้อมูลจัดส่ง & เลือกวิธีชำระเงิน =================== -->
        <div v-else-if="currentStep === 2" class="bg-base-100 p-4 sm:p-6 rounded-2xl shadow-sm border border-base-300 space-y-5">
          <div class="flex justify-between items-center border-b border-base-200 pb-3">
            <h2 class="text-lg font-bold text-slate-900">ข้อมูลการจัดส่งและวิธีชำระเงิน</h2>
            <button @click="currentStep = 1" class="text-xs text-gray-500 hover:text-slate-900">
              ❮ ย้อนกลับ
            </button>
          </div>

          <!-- ข้อมูลที่อยู่ -->
          <div class="space-y-3">
            <div class="form-control">
              <label class="label py-1"><span class="label-text font-semibold text-slate-700">เบอร์โทรศัพท์ติดต่อ *</span></label>
              <input 
                type="text" 
                v-model="formData.phone" 
                class="input input-bordered input-sm sm:input-md w-full" 
                placeholder="เช่น 081-234-5678" 
                required 
              />
            </div>

            <div class="form-control">
              <label class="label py-1"><span class="label-text font-semibold text-slate-700">ที่อยู่จัดส่งแบบละเอียด *</span></label>
              <textarea 
                v-model="formData.shipping_address" 
                class="textarea textarea-bordered h-24 w-full text-sm" 
                placeholder="บ้านเลขที่, หมู่, อาคาร/หมู่บ้าน, ซอย, ถนน, ตำบล/แขวง, อำเภอ/เขต, จังหวัด, รหัสไปรษณีย์" 
                required
              ></textarea>
            </div>
          </div>

          <!-- เลือกวิธีชำระเงิน -->
          <div>
            <h3 class="font-bold text-sm text-slate-800 mb-2.5">เลือกวิธีการชำระเงิน:</h3>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <!-- สแกน QR -->
              <label 
                class="flex flex-col items-center justify-center p-3.5 rounded-xl border-2 cursor-pointer transition-all text-center"
                :class="formData.payment_method === 'qr' ? 'border-primary bg-primary/10 shadow-sm' : 'border-base-200 hover:border-base-300'"
              >
                <input type="radio" v-model="formData.payment_method" value="qr" class="hidden" />
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mb-1 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                <span class="font-bold text-xs sm:text-sm text-slate-900">QR PromptPay</span>
                <span class="text-[10px] text-gray-500 mt-0.5">สแกนจ่ายทันใจ ไม่มีค่าธรรมเนียม</span>
              </label>

              <!-- โอนบัญชีธนาคาร -->
              <label 
                class="flex flex-col items-center justify-center p-3.5 rounded-xl border-2 cursor-pointer transition-all text-center"
                :class="formData.payment_method === 'transfer' ? 'border-primary bg-primary/10 shadow-sm' : 'border-base-200 hover:border-base-300'"
              >
                <input type="radio" v-model="formData.payment_method" value="transfer" class="hidden" />
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mb-1 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <span class="font-bold text-xs sm:text-sm text-slate-900">โอนผ่านธนาคาร</span>
                <span class="text-[10px] text-gray-500 mt-0.5">กสิกรไทย / ไทยพาณิชย์</span>
              </label>

              <!-- ปลายทาง -->
              <label 
                class="flex flex-col items-center justify-center p-3.5 rounded-xl border-2 cursor-pointer transition-all text-center"
                :class="formData.payment_method === 'cod' ? 'border-primary bg-primary/10 shadow-sm' : 'border-base-200 hover:border-base-300'"
              >
                <input type="radio" v-model="formData.payment_method" value="cod" class="hidden" />
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mb-1 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <span class="font-bold text-xs sm:text-sm text-slate-900">เก็บเงินปลายทาง</span>
                <span class="text-[10px] text-gray-500 mt-0.5">ชำระเงินเมื่อรับพัสดุ (COD)</span>
              </label>
            </div>
          </div>

          <div class="pt-4 border-t border-base-200 flex justify-between items-center">
            <button @click="currentStep = 1" class="btn btn-ghost btn-sm text-gray-600">
              ❮ กลับไปตะกร้า
            </button>
            <button @click="goToStep(3)" class="btn btn-primary text-white font-bold px-6">
              ต่อไป: ชำระเงินและแนบสลิป ➔
            </button>
          </div>
        </div>


        <!-- =================== STEP 3: ชำระเงิน & แนบสลิป & ตรวจสอบ =================== -->
        <div v-else-if="currentStep === 3" class="bg-base-100 p-4 sm:p-6 rounded-2xl shadow-sm border border-base-300 space-y-5">
          <div class="flex justify-between items-center border-b border-base-200 pb-3">
            <h2 class="text-lg font-bold text-slate-900">ชำระเงินและแนบหลักฐาน</h2>
            <button @click="currentStep = 2" class="text-xs text-gray-500 hover:text-slate-900">
              ❮ แก้ไขข้อมูลจัดส่ง
            </button>
          </div>

          <!-- กล่องรายละเอียดการชำระเงิน -->
          <div v-if="formData.payment_method === 'qr'" class="bg-blue-50/70 border border-blue-200 p-4 rounded-xl text-center">
            <span class="badge badge-primary text-white font-bold text-xs mb-2">PromptPay QR Code</span>
            <h3 class="font-bold text-sm text-slate-900">สแกนชำระเงินผ่านแอปธนาคารทุกแห่ง</h3>
            <p class="text-xs text-slate-700 mt-1">
              เบอร์พร้อมเพย์: <span class="font-bold font-mono text-blue-900 text-sm">094-715-3616</span>
            </p>
            
            <!-- PromptPay QR Code มาตรฐาน EMVCo พร้อมยอดเงินอัตโนมัติ -->
            <div class="my-4 flex flex-col items-center">
              <div class="bg-white p-3.5 rounded-2xl shadow-sm border border-blue-200 inline-block">
                <img 
                  :src="promptPayQrUrl" 
                  alt="PromptPay QR Code"
                  class="w-48 h-48 object-contain rounded-lg"
                />
              </div>
              <p class="text-lg font-extrabold text-blue-900 mt-2.5">ยอดชำระ: ฿{{ finalTotal.toLocaleString() }}</p>
              <div class="flex items-center gap-2 mt-1">
                <span class="text-xs text-slate-600 font-mono">094-715-3616</span>
                <button 
                  type="button" 
                  @click="copyPromptPayNumber('0947153616')" 
                  class="btn btn-outline btn-xs font-semibold"
                >
                  คัดลอกเบอร์
                </button>
              </div>
              <p class="text-[11px] text-gray-500 mt-2">* เมื่อสแกนผ่านแอปธนาคาร ยอดเงิน ฿{{ finalTotal.toLocaleString() }} จะถูกระบุให้อัตโนมัติ</p>
            </div>
          </div>

          <div v-else-if="formData.payment_method === 'transfer'" class="bg-emerald-50/70 border border-emerald-200 p-4 rounded-xl space-y-3">
            <span class="badge badge-success text-white font-bold text-xs mb-1">โอนเงินผ่านบัญชีธนาคาร</span>
            
            <div class="bg-white p-3.5 rounded-xl border border-emerald-200 flex justify-between items-center">
              <div>
                <p class="text-xs text-gray-500 font-medium">ธนาคารกสิกรไทย (KBANK)</p>
                <p class="font-extrabold text-base text-slate-900 tracking-wider">123-4-56789-0</p>
                <p class="text-xs text-slate-600">ชื่อบัญชี: บจก. แวนการ์ด ช็อป ไทยแลนด์</p>
              </div>
              <button @click="copyAccountNumber('1234567890')" class="btn btn-outline btn-xs btn-primary font-semibold">
                คัดลอกเลขบัญชี
              </button>
            </div>

            <div class="bg-white p-3.5 rounded-xl border border-emerald-200 flex justify-between items-center">
              <div>
                <p class="text-xs text-gray-500 font-medium">ธนาคารไทยพาณิชย์ (SCB)</p>
                <p class="font-extrabold text-base text-slate-900 tracking-wider">987-6-54321-0</p>
                <p class="text-xs text-slate-600">ชื่อบัญชี: บจก. แวนการ์ด ช็อป ไทยแลนด์</p>
              </div>
              <button @click="copyAccountNumber('9876543210')" class="btn btn-outline btn-xs btn-primary font-semibold">
                คัดลอกเลขบัญชี
              </button>
            </div>

            <p class="text-center text-sm font-bold text-emerald-800 pt-1">
              ยอดเงินที่ต้องโอน: <span class="text-lg">฿{{ finalTotal.toLocaleString() }}</span>
            </p>
          </div>

          <div v-else class="bg-amber-50/70 border border-amber-200 p-4 rounded-xl text-center">
            <h3 class="font-bold text-sm text-slate-900 mt-1">เก็บเงินปลายทาง (COD)</h3>
            <p class="text-xs text-slate-600 mt-1">
              เตรียมเงินสดจำนวน <span class="font-bold text-primary">฿{{ finalTotal.toLocaleString() }}</span> ให้พนักงานส่งพัสดุในวันจัดส่ง
            </p>
          </div>

          <!-- อัปโหลดสลิป (เฉพาะ QR หรือ Transfer) -->
          <div v-if="formData.payment_method !== 'cod'" class="space-y-3 pt-2">
            <label class="label py-0"><span class="label-text font-bold text-slate-800">แนบรูปภาพสลิปโอนเงิน *</span></label>
            <input 
              type="file" 
              @change="handleFileChange" 
              accept=".png, .jpg, .jpeg" 
              class="file-input file-input-bordered file-input-primary w-full text-xs sm:text-sm"
              required 
            />

            <!-- Preview สลิป -->
            <div v-if="slipPreview" class="bg-base-200 p-3 rounded-xl flex items-center gap-4">
              <img :src="slipPreview" alt="Slip Preview" class="h-24 w-auto object-contain rounded border border-base-300" />
              <div>
                <p class="text-xs font-bold text-emerald-700">✓ เลือกรูปสลิปเรียบร้อยแล้ว</p>
                <p class="text-[11px] text-gray-500">กรุณาตรวจสอบยอดเงินและวันเวลาให้ถูกต้อง</p>
              </div>
            </div>
          </div>

          <!-- ข้อผิดพลาดถ้ามี -->
          <div v-if="errorMessage" class="alert alert-error text-xs">
            <span>{{ errorMessage }}</span>
          </div>

          <!-- สรุปข้อมูลจัดส่งย่อ -->
          <div class="bg-base-200/60 p-3.5 rounded-xl text-xs space-y-1 text-slate-700">
            <p><strong>ผู้รับ / โทร:</strong> {{ authStore.user?.username }} ({{ formData.phone }})</p>
            <p><strong>ที่อยู่จัดส่ง:</strong> {{ formData.shipping_address }}</p>
          </div>

          <div class="pt-4 border-t border-base-200 flex justify-between items-center">
            <button @click="currentStep = 2" class="btn btn-ghost btn-sm text-gray-600">
              ❮ ย้อนกลับ
            </button>
            <button 
              @click="submitOrder" 
              class="btn btn-success text-slate-950 font-extrabold px-8 shadow-md"
              :disabled="isSubmitting"
            >
              <span v-if="isSubmitting" class="loading loading-spinner"></span>
              ยืนยันการสั่งซื้อ (฿{{ finalTotal.toLocaleString() }})
            </button>
          </div>
        </div>

      </div>

      <!-- ฝั่งขวา (1 col): สรุปคำสั่งซื้อ & คูปองส่วนลด -->
      <div class="space-y-4">
        <div class="bg-base-100 p-5 rounded-2xl shadow-sm border border-base-300 space-y-4">
          <h2 class="text-base font-bold text-slate-900 border-b border-base-200 pb-2.5">
            สรุปรายการสั่งซื้อ
          </h2>

          <!-- รายการการ์ดย่อ -->
          <div class="space-y-2.5 max-h-60 overflow-y-auto pr-1">
            <div v-for="item in cartStore.items" :key="item.id" class="flex justify-between items-center text-xs">
              <div class="flex items-center gap-2 min-w-0 pr-2">
                <span class="badge badge-neutral badge-xs font-mono">{{ item.quantity }}x</span>
                <span class="truncate font-medium text-slate-800">{{ item.name }}</span>
              </div>
              <span class="font-bold text-slate-900 shrink-0">฿{{ (item.price * item.quantity).toLocaleString() }}</span>
            </div>
          </div>

          <!-- ช่องใส่คูปองส่วนลดตามในภาพ -->
          <div class="pt-3 border-t border-base-200">
            <label class="label py-1"><span class="label-text text-xs font-semibold text-slate-700">ใช้คูปองส่วนลด</span></label>
            <div class="flex gap-2">
              <input 
                type="text" 
                v-model="couponCode" 
                placeholder="กรอกโค้ด เช่น VG10" 
                class="input input-bordered input-sm flex-1 text-xs uppercase"
              />
              <button @click="applyCoupon" class="btn btn-sm btn-primary text-white font-semibold">
                ใช้
              </button>
            </div>
            <p v-if="couponMessage" class="text-[11px] text-emerald-600 mt-1 font-semibold">{{ couponMessage }}</p>
            <p v-if="couponError" class="text-[11px] text-rose-500 mt-1">{{ couponError }}</p>
          </div>

          <!-- ตารางสรุปราคา -->
          <div class="space-y-2 pt-3 border-t border-base-200 text-xs sm:text-sm">
            <div class="flex justify-between text-slate-600">
              <span>ยอดสินค้า ({{ cartStore.totalItems }} ชิ้น):</span>
              <span class="font-semibold text-slate-800">฿{{ cartStore.totalPrice.toLocaleString() }}</span>
            </div>

            <div class="flex justify-between text-slate-600">
              <span>ค่าจัดส่ง:</span>
              <span v-if="shippingCost === 0" class="badge badge-success badge-sm text-white font-bold">ส่งฟรี</span>
              <span v-else class="font-semibold text-slate-800">฿{{ shippingCost }}</span>
            </div>

            <div v-if="appliedDiscount > 0" class="flex justify-between text-emerald-600 font-semibold">
              <span>ส่วนลดคูปอง:</span>
              <span>-฿{{ appliedDiscount.toLocaleString() }}</span>
            </div>

            <div class="flex justify-between text-base sm:text-lg font-extrabold text-primary pt-2 border-t border-base-200">
              <span>ยอดรวมสุทธิ:</span>
              <span>฿{{ finalTotal.toLocaleString() }}</span>
            </div>
          </div>

          <!-- ปุ่ม Action -->
          <button 
            v-if="currentStep === 1" 
            @click="goToStep(2)" 
            class="btn btn-primary w-full text-white font-bold text-sm shadow"
          >
            ดำเนินการชำระเงิน ➔
          </button>
          <button 
            v-else-if="currentStep === 2" 
            @click="goToStep(3)" 
            class="btn btn-primary w-full text-white font-bold text-sm shadow"
          >
            ต่อไป: ชำระเงินและแนบสลิป ➔
          </button>
        </div>

        <div class="bg-base-100 p-4 rounded-xl border border-base-200 text-xs text-gray-500 space-y-1">
          <p>ระบบชำระเงินปลอดภัย ได้มาตรฐาน</p>
          <p>จัดส่งสินค้าภายใน 1-3 วันทำการหลังยืนยันการชำระเงิน</p>
        </div>
      </div>

    </div>

    <!-- =================== STEP 4: ชำระเงินเสร็จสิ้น (Success Screen) =================== -->
    <div v-else class="max-w-xl mx-auto bg-base-100 p-6 sm:p-8 rounded-2xl shadow-lg border border-base-300 text-center space-y-5">
      <div class="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl sm:text-4xl mx-auto shadow-inner">
        ✓
      </div>

      <div>
        <span class="badge badge-success text-white font-semibold text-xs mb-1">สั่งซื้อสำเร็จ</span>
        <h2 class="text-2xl sm:text-3xl font-extrabold text-slate-900">ขอบคุณสำหรับคำสั่งซื้อ!</h2>
        <p class="text-sm text-gray-500 mt-1">
          คำสั่งซื้อหมายเลข <span class="font-bold text-primary font-mono text-base">#{{ createdOrderId }}</span> ถูกบันทึกเรียบร้อยแล้ว
        </p>
      </div>

      <div class="bg-base-200/70 p-4 rounded-xl text-left text-xs sm:text-sm space-y-2 border border-base-200">
        <div class="flex justify-between">
          <span class="text-gray-500">วิธีการชำระ:</span>
          <span class="font-bold text-slate-800 uppercase">{{ formData.payment_method }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500">ยอดชำระทั้งสิ้น:</span>
          <span class="font-bold text-emerald-600 text-base">฿{{ finalTotal.toLocaleString() }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500">สถานะคำสั่งซื้อ:</span>
          <span class="badge badge-warning text-black badge-sm font-semibold">รอตรวจสอบการชำระเงิน</span>
        </div>
      </div>

      <div class="flex flex-col sm:flex-row gap-2.5 pt-2">
        <router-link to="/my-orders" class="btn btn-primary text-white font-bold flex-1 shadow">
          ติดตามคำสั่งซื้อของฉัน ➔
        </router-link>
        <router-link to="/" class="btn btn-outline flex-1">
          กลับสู่หน้าแรก
        </router-link>
      </div>
    </div>

  </div>
</template>
