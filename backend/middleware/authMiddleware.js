const jwt = require('jsonwebtoken');

// ตรวจสอบว่าล็อกอินหรือยัง (มี Token ไหม)
exports.verifyToken = (req, res, next) => {
    const token = req.header('Authorization');

    if (!token) {
        return res.status(403).json({ message: 'ปฏิเสธการเข้าถึง: ไม่มี Token' });
    }

    try {
        // ถอดรหัส Token
        const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET || 'my_vanguard_secret_key');
            req.user = decoded; // เก็บข้อมูล user (id, role) ไว้ใช้ใน request ต่อไป
            next();
    } catch (error) {
        res.status(401).json({ message: 'Token ไม่ถูกต้องหรือหมดอายุ' });
    }
};

// ตรวจสอบว่าเป็น Admin หรือไม่ (ต้องเรียกต่อจาก verifyToken)
exports.isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'ปฏิเสธการเข้าถึง: สำหรับผู้ดูแลระบบเท่านั้น' });
    }
};