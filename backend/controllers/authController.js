const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ฟังก์ชันสมัครสมาชิก
exports.register = async (req, res) => {
    try {
        const { username, email, password, full_name, phone } = req.body;

        // เช็คว่ามี email หรือ username นี้ในระบบหรือยัง
        const [existingUsers] = await db.query(
            'SELECT * FROM users WHERE email = ? OR username = ?', 
            [email, username]
        );
        
        if (existingUsers.length > 0) {
            return res.status(400).json({ message: 'อีเมลหรือชื่อผู้ใช้นี้ถูกใช้งานแล้ว' });
        }

        // เข้ารหัสผ่านก่อนบันทึกลงฐานข้อมูล
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // บันทึกข้อมูลลง Database
        const [result] = await db.query(
            'INSERT INTO users (username, email, password, full_name, phone, role) VALUES (?, ?, ?, ?, ?, ?)',
            [username, email, hashedPassword, full_name, phone, 'user'] // ค่าเริ่มต้นให้เป็น 'user'
        );

        res.status(201).json({ message: 'สมัครสมาชิกสำเร็จ!', userId: result.insertId });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์' });
    }
};

// ฟังก์ชันเข้าสู่ระบบ
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // ค้นหา user จากอีเมล
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        
        if (users.length === 0) {
            return res.status(401).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
        }

        const user = users[0];

        // ตรวจสอบรหัสผ่าน
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
        }

        // สร้าง JWT Token (แนบ id และ role ไปด้วย)
        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' } // Token มีอายุ 1 วัน
        );

        res.json({
            message: 'เข้าสู่ระบบสำเร็จ',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์' });
    }
};