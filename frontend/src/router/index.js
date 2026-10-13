import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import LoginView from '../views/LoginView.vue';
import CartView from '../views/CartView.vue'; // <-- 1. นำเข้าหน้า CartView
import CheckoutView from '../views/CheckoutView.vue'; // <-- นำเข้า
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/login', name: 'login', component: LoginView },
    { path: '/cart', name: 'cart', component: CartView } ,
    { path: '/checkout', name: 'checkout', component: CheckoutView }
  ]
});

export default router;