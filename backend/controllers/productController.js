const db = require('../config/db');
const fs = require('fs');

// 1. ดึงข้อมูลการ์ดทั้งหมด
exports.getAllProducts = async (req, res) => {
    try {
        const [products] = await db.query('SELECT * FROM products ORDER BY id DESC');
        res.json(products);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสินค้า: ' + error.message });
    }
};

// 2. เพิ่มการ์ดใบใหม่ (สำหรับ Admin)
exports.createProduct = async (req, res) => {
    try {
        const { name, category, rarity, price, stock } = req.body;
        
        let image_url = null;
        if (req.file) {
            const fileData = fs.readFileSync(req.file.path);
            const base64Image = fileData.toString('base64');
            image_url = `data:${req.file.mimetype};base64,${base64Image}`;
        }

        const [result] = await db.query(
            `INSERT INTO products (name, price, stock, category, rarity, image_url) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [name, price, stock, category, rarity, image_url]
        );

        res.status(201).json({ message: 'เพิ่มการ์ดสำเร็จ!', productId: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'เพิ่มสินค้าไม่สำเร็จ: ' + error.message });
    }
};

// 3. แก้ไขข้อมูลการ์ด (สำหรับ Admin)
exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, category, rarity, price, stock } = req.body;

        if (req.file) {
            const fileData = fs.readFileSync(req.file.path);
            const base64Image = fileData.toString('base64');
            const image_url = `data:${req.file.mimetype};base64,${base64Image}`;

            await db.query(
                `UPDATE products 
                 SET name = ?, price = ?, stock = ?, category = ?, rarity = ?, image_url = ? 
                 WHERE id = ?`,
                [name, price, stock, category, rarity, image_url, id]
            );
        } else {
            await db.query(
                `UPDATE products 
                 SET name = ?, price = ?, stock = ?, category = ?, rarity = ? 
                 WHERE id = ?`,
                [name, price, stock, category, rarity, id]
            );
        }

        res.json({ message: 'อัปเดตข้อมูลการ์ดสำเร็จ!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'แก้ไขสินค้าไม่สำเร็จ: ' + error.message });
    }
};

// 4. ลบการ์ด (สำหรับ Admin)
exports.deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM products WHERE id = ?', [id]);
        res.json({ message: 'ลบการ์ดออกจากระบบสำเร็จ!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'ไม่สามารถลบได้ (การ์ดใบนี้อาจอยู่ในประวัติใบสั่งซื้อแล้ว)' });
    }
};