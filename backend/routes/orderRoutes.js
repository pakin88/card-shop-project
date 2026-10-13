const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { verifyToken } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware'); // ใช้ตัวอัปโหลดเดิมได้เลย

// สร้างออเดอร์ใหม่ (ต้องล็อกอิน และรับไฟล์สลิปชื่อ 'slip_image')
router.post('/', verifyToken, upload.single('slip_image'), orderController.createOrder);

module.exports = router;