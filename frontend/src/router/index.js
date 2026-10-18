import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import LoginView from '../views/LoginView.vue';
import CartView from '../views/CartView.vue'; // <-- 1. นำเข้าหน้า CartView
import CheckoutView from '../views/CheckoutView.vue'; // <-- นำเข้า
import RegisterView from '../views/RegisterView.vue';
import AdminOrdersView from '../views/AdminOrdersView.vue';
import MyOrdersView from '../views/MyOrdersView.vue';
import AdminProductsView from '../views/AdminProductsView.vue';
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/login', name: 'login', component: LoginView },
    { path: '/cart', name: 'cart', component: CartView } ,
    { path: '/checkout', name: 'checkout', component: CheckoutView },
    { path: '/register', name: 'register', component: RegisterView },
    { path: '/admin/orders', name: 'admin-orders', component: AdminOrdersView },
    { path: '/my-orders', name: 'my-orders', component: MyOrdersView },
    { path: '/admin/products', name: 'admin-products', component: AdminProductsView }
  ]
});

export default router;