const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// ดึงการ์ดทั้งหมด (ไม่ต้องล็อกอินก็ดูได้)
router.get('/', productController.getAllProducts);

// เพิ่มการ์ดใหม่ (ต้องล็อกอิน + ต้องเป็น Admin + รับไฟล์รูปชื่อ 'image')
router.post('/', verifyToken, isAdmin, upload.single('image'), productController.createProduct);

// ลบการ์ด (ต้องล็อกอิน + ต้องเป็น Admin)
router.delete('/:id', verifyToken, isAdmin, productController.deleteProduct);

module.exports = router;