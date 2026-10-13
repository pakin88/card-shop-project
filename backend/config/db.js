const mysql = require('mysql2');
require('dotenv').config();

// สร้าง Connection Pool เพื่อให้ระบบจัดการการเชื่อมต่อหลายๆ คนพร้อมกันได้ดีขึ้น
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// แปลงเป็น Promise เพื่อให้ใช้ async/await ได้ง่าย
const promisePool = pool.promise();

// ทดสอบการเชื่อมต่อตอนรันเซิร์ฟเวอร์
promisePool.getConnection()
    .then(connection => {
        console.log('เชื่อมต่อฐานข้อมูล card_shop_db สำเร็จ!');
        connection.release();
    })
    .catch(err => {
        console.error('เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล:', err.message);
    });

module.exports = promisePool;