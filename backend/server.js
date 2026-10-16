const express = require('express');
const cors = require('cors');
const path = require('path'); 
require('dotenv').config();
const app = express();
const port = process.env.PORT || 3000;
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');

// Middleware
app.use(cors()); // อนุญาตให้ Frontend (Vue) ข้ามโดเมนมาดึงข้อมูลได้
app.use(express.json()); // ให้ API รับข้อมูลที่ส่งมาเป็น JSON ได้
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
// นำเข้าไฟล์ฐานข้อมูล (เพื่อให้มันทำงานและ log ข้อความตอนเริ่มเซิร์ฟเวอร์)
require('./config/db.js');

// === 1. เปิดให้ดึงรูปภาพจากโฟลเดอร์ uploads ผ่าน URL ได้ ===
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// =========================================================

// Route พื้นฐานเอาไว้ทดสอบ
app.get('/', (req, res) => {
    res.send('Card Shop API is running...');
});

// เริ่มรันเซิร์ฟเวอร์
app.listen(port, () => {
    console.log(`Server กำลังรันอยู่ที่ http://localhost:${port}`);
});