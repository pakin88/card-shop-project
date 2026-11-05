import { defineStore } from 'pinia';

export const useCartStore = defineStore('cart', {
  state: () => ({
    // โหลดข้อมูลเก่าจาก localStorage ถ้าไม่มีให้เริ่มเป็น Array ว่าง
    items: JSON.parse(localStorage.getItem('cart')) || [],
  }),
  getters: {
    // นับจำนวนการ์ดรวมทั้งหมดในตะกร้า
    totalItems: (state) => state.items.reduce((total, item) => total + item.quantity, 0),
    // คำนวณราคารวมทั้งหมด
    totalPrice: (state) => state.items.reduce((total, item) => total + (item.price * item.quantity), 0),
  },
  actions: {
    // ฟังก์ชันเพิ่มลงตะกร้า
    addToCart(product) {
      // เช็คว่ามีการ์ดใบนี้ในตะกร้าหรือยัง
      const existingItem = this.items.find(item => item.id === product.id);
      
      if (existingItem) {
        // ถ้ามีแล้ว ให้เช็คว่าจำนวนที่หยิบเกินสต็อกไหม
        if (existingItem.quantity < product.stock) {
          existingItem.quantity++;
        } else {
          alert('ไม่สามารถเพิ่มได้ สินค้าในคลังมีไม่พอ');
        }
      } else {
        // ถ้ายังไม่มี ให้เพิ่มเข้าไปใหม่โดยเริ่มที่จำนวน 1
        this.items.push({
          id: product.id,
          name: product.name,
          price: product.price,
          image_url: product.image_url,
          stock: product.stock,
          quantity: 1
        });
      }
      this.saveCart();
    },
    // ฟังก์ชันลบออกจากตะกร้า
    removeFromCart(productId) {
      this.items = this.items.filter(item => item.id !== productId);
      this.saveCart();
    },
    // ฟังก์ชันปรับลดจำนวน
    decreaseQuantity(productId) {
      const item = this.items.find(item => item.id === productId);
      if (item && item.quantity > 1) {
        item.quantity--;
      } else {
        this.removeFromCart(productId);
      }
      this.saveCart();
    },
    // ฟังก์ชันปรับเพิ่มจำนวน
    increaseQuantity(productId) {
      const item = this.items.find(item => item.id === productId);
      if (item && item.quantity < item.stock) {
        item.quantity++;
      }
      this.saveCart();
    },
    // ฟังก์ชันล้างตะกร้า (ใช้ตอนสั่งซื้อเสร็จ)
    clearCart() {
      this.items = [];
      this.saveCart();
    },
    // เซฟลง localStorage
    saveCart() {
      localStorage.setItem('cart', JSON.stringify(this.items));
    }
  }
});