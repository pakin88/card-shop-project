<script setup>
import { ref } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useRouter } from 'vue-router';

const email = ref('');
const password = ref('');
const errorMessage = ref('');
const authStore = useAuthStore();
const router = useRouter();

const handleLogin = async () => {
  errorMessage.value = ''; // เคลียร์ข้อความ error เก่า
  // เรียกฟังก์ชัน login จาก Pinia Store
  const result = await authStore.login(email.value, password.value);
  
  if (result.success) {
    router.push('/'); // ถ้ารหัสถูก ให้เปลี่ยนหน้าไปที่หน้าแรก (Home)
  } else {
    errorMessage.value = result.message; // ถ้ารหัสผิด ให้แสดงข้อความแจ้งเตือน
  }
};
</script>

<template>
  <div class="flex justify-center items-center mt-10">
    <div class="card w-96 bg-base-100 shadow-xl border border-base-200">
      <div class="card-body">
        <h2 class="card-title justify-center text-2xl font-bold mb-4">เข้าสู่ระบบ</h2>

        <form @submit.prevent="handleLogin">
          <!-- ช่องกรอกอีเมล -->
          <div class="form-control w-full">
            <label class="label"><span class="label-text">อีเมล</span></label>
            <input type="email" v-model="email" placeholder="admin@cardshop.com" class="input input-bordered w-full" required />
          </div>

          <!-- ช่องกรอกรหัสผ่าน -->
          <div class="form-control w-full mt-2">
            <label class="label"><span class="label-text">รหัสผ่าน</span></label>
            <input type="password" v-model="password" placeholder="••••••••" class="input input-bordered w-full" required />
          </div>

          <!-- แสดงข้อความ Error (ถ้ามี) -->
          <div v-if="errorMessage" class="text-error text-sm mt-3 text-center">
            {{ errorMessage }}
          </div>

          <!-- ปุ่มกดยืนยัน -->
          <div class="card-actions justify-center mt-6">
            <button type="submit" class="btn btn-primary w-full text-white">เข้าสู่ระบบ</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>