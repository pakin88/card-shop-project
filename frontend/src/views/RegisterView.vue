<script setup>
import { ref } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();

const formData = ref({
  username: '',
  email: '',
  password: '',
  full_name: '',
  phone: ''
});

const errorMessage = ref('');
const isSubmitting = ref(false);

const handleRegister = async () => {
  isSubmitting.value = true;
  errorMessage.value = '';

  const result = await authStore.register(formData.value);
  
  if (result.success) {
    alert('สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ');
    router.push('/login'); // พาไปหน้าล็อกอิน
  } else {
    errorMessage.value = result.message;
  }
  isSubmitting.value = false;
};
</script>

<template>
  <div class="flex justify-center items-center mt-10 mb-10">
    <div class="card w-96 bg-base-100 shadow-xl border border-base-200">
      <div class="card-body">
        <h2 class="card-title justify-center text-2xl font-bold mb-4">สมัครสมาชิกใหม่</h2>

        <form @submit.prevent="handleRegister">
          <div class="form-control w-full">
            <label class="label"><span class="label-text">ชื่อผู้ใช้ (Username) *</span></label>
            <input type="text" v-model="formData.username" class="input input-bordered w-full" required />
          </div>

          <div class="form-control w-full mt-2">
            <label class="label"><span class="label-text">อีเมล *</span></label>
            <input type="email" v-model="formData.email" class="input input-bordered w-full" required />
          </div>

          <div class="form-control w-full mt-2">
            <label class="label"><span class="label-text">รหัสผ่าน *</span></label>
            <input type="password" v-model="formData.password" class="input input-bordered w-full" required />
          </div>

          <div class="form-control w-full mt-2">
            <label class="label"><span class="label-text">ชื่อ-นามสกุล</span></label>
            <input type="text" v-model="formData.full_name" class="input input-bordered w-full" />
          </div>

          <div class="form-control w-full mt-2">
            <label class="label"><span class="label-text">เบอร์โทรศัพท์</span></label>
            <input type="text" v-model="formData.phone" class="input input-bordered w-full" />
          </div>

          <div v-if="errorMessage" class="text-error text-sm mt-3 text-center">
            {{ errorMessage }}
          </div>

          <div class="card-actions justify-center mt-6">
            <button type="submit" class="btn btn-primary w-full text-white" :disabled="isSubmitting">
              <span v-if="isSubmitting" class="loading loading-spinner"></span>
              สมัครสมาชิก
            </button>
          </div>
        </form>
        
        <div class="text-center mt-4 text-sm">
          มีบัญชีอยู่แล้ว? <router-link to="/login" class="text-primary hover:underline">เข้าสู่ระบบที่นี่</router-link>
        </div>
      </div>
    </div>
  </div>
</template>