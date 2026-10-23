// 2. อัปเดตสถานะและเลขพัสดุ (สำหรับ Admin) + คืนสต็อกอัตโนมัติถ้าเปลี่ยนเป็นยกเลิก
exports.updateOrderStatus = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const { id } = req.params;
        const { status, tracking_number } = req.body;

        // เช็คสถานะเดิมก่อนอัปเดต
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
        await connection.rollback();
        console.error(error);
        res.status(500).json({ message: error.message || 'เกิดข้อผิดพลาดในการอัปเดตสถานะ' });
    } finally {
        connection.release();
    }
    // 4. ลบคำสั่งซื้อ (สำหรับ Admin)
exports.deleteOrder = async (req, res) => {
    const connection = await db.getConnection();
    try {
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

        // ลบรายการใน order_items และลบออเดอร์หลัก
        await connection.query('DELETE FROM order_items WHERE order_id = ?', [id]);
        await connection.query('DELETE FROM orders WHERE id = ?', [id]);

        await connection.commit();
        res.json({ message: 'ลบคำสั่งซื้อสำเร็จ!' });
    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).json({ message: error.message || 'เกิดข้อผิดพลาดในการลบคำสั่งซื้อ' });
    } finally {
        connection.release();
    }
};
};