const db = require('../config/db');
const fs = require('fs');

// ฟังก์ชันสร้างคำสั่งซื้อใหม่ (รับข้อมูลจากหน้า Checkout)
exports.createOrder = async (req, res) => {
    // ต้องครอบด้วย Transaction เพราะเราต้อง Insert หลายตาราง ถ้าพังอันใดอันหนึ่งต้องย้อนกลับ (Rollback) หมด
    const connection = await db.getConnection(); 
    await connection.beginTransaction();

    try {
        const { total_amount, payment_method, shipping_address, phone, items } = req.body;
        const user_id = req.user.id; // ได้มาจาก authMiddleware
        
        // แปลงไฟล์รูปสลิปเป็น Base64 เพื่อเก็บลงฐานข้อมูลโดยตรง (รูปจะไม่หายเมื่อ Render รีสตาร์ท)
        let slip_image = null;
        if (req.file) {
            const fileData = fs.readFileSync(req.file.path);
            const base64Image = fileData.toString('base64');
            slip_image = `data:${req.file.mimetype};base64,${base64Image}`;
        }

        // เช็คว่าถ้าเลือกโอนเงินหรือ QR ต้องมีรูปสลิป
        if ((payment_method === 'transfer' || payment_method === 'qr') && !slip_image) {
            throw new Error('กรุณาแนบรูปสลิปโอนเงิน');
        }

        // 1. บันทึกลงตาราง orders
        const [orderResult] = await connection.query(
            `INSERT INTO orders (user_id, total_amount, payment_method, slip_image, shipping_address, phone, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [user_id, total_amount, payment_method, slip_image, shipping_address, phone, payment_method === 'cod' ? 'pending' : 'paid']
        );
        
        const orderId = orderResult.insertId;

        // 2. บันทึกรายการสินค้าลง order_items พร้อมตัดสต็อก
        const parsedItems = JSON.parse(items);

        for (let item of parsedItems) {
            // เช็คสต็อกอีกรอบเพื่อความชัวร์ก่อนบันทึก
            const [productCheck] = await connection.query('SELECT stock FROM products WHERE id = ?', [item.id]);
            if (productCheck[0].stock < item.quantity) {
                throw new Error(`สินค้า "${item.name}" ในคลังมีไม่พอ`);
            }

            // บันทึกรายการลงบิล
            await connection.query(
                `INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) VALUES (?, ?, ?, ?)`,
                [orderId, item.id, item.quantity, item.price]
            );

            // ตัดสต็อกสินค้า
            await connection.query(
                `UPDATE products SET stock = stock - ? WHERE id = ?`,
                [item.quantity, item.id]
            );
        }

        // ถ้ารอดมาถึงบรรทัดนี้แปลว่าสำเร็จทั้งหมด ให้ยืนยันการเซฟ (Commit)
        await connection.commit();
        res.status(201).json({ message: 'สั่งซื้อสำเร็จ!', orderId: orderId });

    } catch (error) {
        // ถ้ามีตรงไหนพัง ให้ยกเลิกคำสั่งทั้งหมดใน Block นี้ (Rollback)
        await connection.rollback();
        console.error(error);
        res.status(400).json({ message: error.message || 'เกิดข้อผิดพลาดในการสั่งซื้อ' });
    } finally {
        // คืน connection กลับไปให้ระบบ
        connection.release(); 
    }
};

// 1. ดึงคำสั่งซื้อทั้งหมดพร้อมรายการการ์ด (สำหรับ Admin)
exports.getAllOrders = async (req, res) => {
    try {
        const [orders] = await db.query(`
            SELECT o.*, u.username, u.email 
            FROM orders o 
            LEFT JOIN users u ON o.user_id = u.id 
            ORDER BY o.created_at DESC
        `);

        // ดึงรายการการ์ดข้างในของแต่ละออเดอร์
        for (let order of orders) {
            const [items] = await db.query(`
                SELECT oi.*, p.name AS product_name, p.price AS product_price 
                FROM order_items oi 
                LEFT JOIN products p ON oi.product_id = p.id 
                WHERE oi.order_id = ?
            `, [order.id]);
            order.items = items;
        }

        res.json(orders);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลคำสั่งซื้อ' });
    }
};

// 2. อัปเดตสถานะและเลขพัสดุ (สำหรับ Admin)
exports.updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, tracking_number } = req.body;

        await db.query(
            'UPDATE orders SET status = ?, tracking_number = ? WHERE id = ?',
            [status, tracking_number || null, id]
        );

        res.json({ message: 'อัปเดตสถานะคำสั่งซื้อสำเร็จ!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัปเดตสถานะ' });
    }
};
exports.getMyOrders = async (req, res) => {
    try {
        const user_id = req.user.id;
        const [orders] = await db.query(`
            SELECT * FROM orders 
            WHERE user_id = ? 
            ORDER BY created_at DESC
        `, [user_id]);

        for (let order of orders) {
            const [items] = await db.query(`
                SELECT oi.*, p.name AS product_name, p.price AS product_price 
                FROM order_items oi 
                LEFT JOIN products p ON oi.product_id = p.id 
                WHERE oi.order_id = ?
            `, [order.id]);
            order.items = items;
        }

        res.json(orders);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงประวัติการสั่งซื้อ' });
    }
};