const db = require('../config/db');
const fs = require('fs');

// 1. สร้างคำสั่งซื้อใหม่ (รับข้อมูลจากหน้า Checkout)
exports.createOrder = async (req, res) => {
    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const { total_amount, payment_method, shipping_address, phone, items } = req.body;
        const user_id = req.user.id;
        
        // รองรับทั้ง memoryStorage (buffer) และ diskStorage (path)
        let slip_image = null;
        if (req.file) {
            const fileData = req.file.buffer ? req.file.buffer : fs.readFileSync(req.file.path);
            const base64Image = fileData.toString('base64');
            slip_image = `data:${req.file.mimetype};base64,${base64Image}`;
        }

        if ((payment_method === 'transfer' || payment_method === 'qr') && !slip_image) {
            throw new Error('กรุณาแนบรูปสลิปโอนเงิน');
        }

        // บันทึกลงตาราง orders
        const [orderResult] = await connection.query(
            `INSERT INTO orders (user_id, total_amount, payment_method, slip_image, shipping_address, phone, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [user_id, total_amount, payment_method, slip_image, shipping_address, phone, payment_method === 'cod' ? 'pending' : 'paid']
        );
        
        const orderId = orderResult.insertId;

        // บันทึกรายการสินค้าลง order_items พร้อมตัดสต็อก
        const parsedItems = typeof items === 'string' ? JSON.parse(items) : items;

        for (let item of parsedItems) {
            const [productCheck] = await connection.query('SELECT stock FROM products WHERE id = ?', [item.id]);
            if (productCheck.length === 0) {
                throw new Error(`ไม่พบสินค้า "${item.name}" ในระบบ กรุณาลบออกจากตะกร้าแล้วเลือกใหม่`);
            }
            if (productCheck[0].stock < item.quantity) {
                throw new Error(`สินค้า "${item.name}" ในคลังมีไม่พอ`);
            }

            await connection.query(
                `INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) VALUES (?, ?, ?, ?)`,
                [orderId, item.id, item.quantity, item.price]
            );

            await connection.query(
                `UPDATE products SET stock = stock - ? WHERE id = ?`,
                [item.quantity, item.id]
            );
        }

        await connection.commit();
        res.status(201).json({ message: 'สั่งซื้อสำเร็จ!', orderId: orderId });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Order Error:', error);
        res.status(400).json({ message: error.message || 'เกิดข้อผิดพลาดในการสั่งซื้อ' });
    } finally {
        if (connection) connection.release();
    }
};

// 2. ดึงคำสั่งซื้อทั้งหมดพร้อมรายการสินค้า (สำหรับ Admin)
exports.getAllOrders = async (req, res) => {
    try {
        const [orders] = await db.query(`
            SELECT o.*, u.username, u.email 
            FROM orders o 
            LEFT JOIN users u ON o.user_id = u.id 
            ORDER BY o.created_at DESC
        `);

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

// 3. อัปเดตสถานะและเลขพัสดุ (สำหรับ Admin) + คืนสต็อกอัตโนมัติถ้าเปลี่ยนเป็นยกเลิก
exports.updateOrderStatus = async (req, res) => {
    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const { id } = req.params;
        const { status, tracking_number } = req.body;

        const [oldOrders] = await connection.query('SELECT status FROM orders WHERE id = ?', [id]);
        if (oldOrders.length === 0) {
            throw new Error('ไม่พบคำสั่งซื้อนี้');
        }
        const oldStatus = oldOrders[0].status;

        // ถ้าเปลี่ยนจากสถานะอื่นมาเป็น 'cancelled' (ยกเลิก) ให้คืนสต็อกสินค้ากลับเข้าคลัง
        if (oldStatus !== 'cancelled' && status === 'cancelled') {
            const [items] = await connection.query('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [id]);
            for (let item of items) {
                if (item.product_id) {
                    await connection.query(
                        'UPDATE products SET stock = stock + ? WHERE id = ?',
                        [item.quantity, item.product_id]
                    );
                }
            }
        }

        await connection.query(
            'UPDATE orders SET status = ?, tracking_number = ? WHERE id = ?',
            [status, tracking_number || null, id]
        );

        await connection.commit();
        res.json({ message: 'อัปเดตสถานะคำสั่งซื้อสำเร็จ!' });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error(error);
        res.status(500).json({ message: error.message || 'เกิดข้อผิดพลาดในการอัปเดตสถานะ' });
    } finally {
        if (connection) connection.release();
    }
};

// 4. ดึงประวัติการสั่งซื้อของลูกค้า
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

// 5. ลบคำสั่งซื้อ (สำหรับ Admin)
exports.deleteOrder = async (req, res) => {
    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const { id } = req.params;

        const [orders] = await connection.query('SELECT status FROM orders WHERE id = ?', [id]);
        if (orders.length === 0) {
            throw new Error('ไม่พบคำสั่งซื้อที่ต้องการลบ');
        }

        const currentStatus = orders[0].status;

        // ถ้าออเดอร์ยังไม่ถูกจัดส่ง (shipped) และยังไม่ได้คืนสต็อกตอนยกเลิก (cancelled) ให้คืนสต็อกก่อนลบ
        if (currentStatus !== 'shipped' && currentStatus !== 'cancelled') {
            const [items] = await connection.query('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [id]);
            for (let item of items) {
                if (item.product_id) {
                    await connection.query(
                        'UPDATE products SET stock = stock + ? WHERE id = ?',
                        [item.quantity, item.product_id]
                    );
                }
            }
        }

        await connection.query('DELETE FROM order_items WHERE order_id = ?', [id]);
        await connection.query('DELETE FROM orders WHERE id = ?', [id]);

        await connection.commit();
        res.json({ message: 'ลบคำสั่งซื้อสำเร็จ!' });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error(error);
        res.status(500).json({ message: error.message || 'เกิดข้อผิดพลาดในการลบคำสั่งซื้อ' });
    } finally {
        if (connection) connection.release();
    }
};