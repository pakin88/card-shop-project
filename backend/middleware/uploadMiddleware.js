const multer = require('multer');

// เก็บไฟล์ไว้ในหน่วยความจำชั่วคราว (RAM) เพื่อแปลงเป็น Base64 ลงฐานข้อมูลโดยตรง
const storage = multer.memoryStorage();

// กรองให้รับเฉพาะไฟล์รูปภาพ
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('รองรับเฉพาะไฟล์รูปภาพเท่านั้น!'), false);
    }
};



const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: { 
        fileSize: 5 * 1024 * 1024, // จำกัดขนาดไฟล์ไม่เกิน 5MB
        fieldSize: 25 * 1024 * 1024 // ขยายขนาดข้อความฟิลด์ให้รองรับข้อมูลขนาดใหญ่ (25MB)
    }
});

module.exports = upload;