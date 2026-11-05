const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { verifyToken } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware'); // ใช้ตัวอัปโหลดเดิมได้เลย

// สร้างออเดอร์ใหม่ (ต้องล็อกอิน และรับไฟล์สลิปชื่อ 'slip_image')
router.post('/', verifyToken, upload.single('slip_image'), orderController.createOrder);

// ดึงประวัติคำสั่งซื้อของลูกค้าที่ล็อกอินอยู่
router.get('/my-orders', verifyToken, orderController.getMyOrders);

// สำหรับ Admin จัดการออเดอร์ทั้งหมด, อัปเดตสถานะ และลบออเดอร์
router.get('/', orderController.getAllOrders);
router.put('/:id/status', orderController.updateOrderStatus);
router.delete('/:id', orderController.deleteOrder);

module.exports = router;