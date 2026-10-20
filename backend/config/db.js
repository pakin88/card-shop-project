const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'datacardshop-pakinwilamas-8737.l.aivencloud.com',
    port: process.env.DB_PORT || 22852, // <-- เปลี่ยนเลข 12345 เป็น Port ของ Aiven
    user: process.env.DB_USER || 'avnadmin',
    password: process.env.DB_PASSWORD || 'AVNS_QUYt3nMpBF7QH7zzgGh',
    database: process.env.DB_NAME || 'defaultdb',
    ssl: {
        rejectUnauthorized: false // <-- จำเป็นต้องใส่สำหรับ Aiven
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool.promise();