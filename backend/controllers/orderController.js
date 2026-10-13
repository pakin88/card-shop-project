const db = require('../config/db');

// ฟังก์ชันสร้างคำสั่งซื้อใหม่ (รับข้อมูลจากหน้า Checkout)
exports.createOrder = async (req, res) => {
    // ต้องครอบด้วย Transaction เพราะเราต้อง Insert หลายตาราง ถ้าพังอันใดอันหนึ่งต้องย้อนกลับ (Rollback) หมด
    const connection = await db.getConnection(); 
    await connection.beginTransaction();

    try {
        const { total_amount, payment_method, shipping_address, phone, items } = req.body;
        const user_id = req.user.id; // ได้มาจาก authMiddleware
        const slip_image = req.file ? req.file.filename : null;

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
        // รับ items มาในรูปแบบ JSON String (เพราะแนบไฟล์มากับ form-data ต้องแปลงก่อน)
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