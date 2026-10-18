const db = require('../config/db');
const fs = require('fs');

// ฟังก์ชันช่วยแปลงชื่อหมวดหมู่จากหน้าเว็บ ให้เป็น category_id อัตโนมัติ
async function getCategoryId(category_id, categoryName) {
    if (category_id) return category_id;
    if (!categoryName) return 1;

    try {
        // ค้นหา id จากชื่อหมวดหมู่ในตาราง categories
        const [rows] = await db.query('SELECT id FROM categories WHERE name = ?', [categoryName.trim()]);
        if (rows.length > 0) {
            return rows[0].id;
        }
        // ถ้าพิมพ์ชื่อหมวดหมู่ใหม่ที่ยังไม่มีในระบบ ให้สร้างหมวดหมู่ใหม่ให้อัตโนมัติ
        const [result] = await db.query('INSERT INTO categories (name) VALUES (?)', [categoryName.trim()]);
        return result.insertId;
    } catch (err) {
        return 1; // ค่าเริ่มต้นหากตาราง categories มีปัญหา
    }
}

// 1. ดึงข้อมูลการ์ดทั้งหมด พร้อมดึงชื่อหมวดหมู่จากตาราง categories
exports.getAllProducts = async (req, res) => {
    try {
        const [products] = await db.query(`
            SELECT p.*, c.name AS category, c.name AS category_name 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            ORDER BY p.id DESC
        `);
        res.json(products);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสินค้า: ' + error.message });
    }
};

// 2. เพิ่มการ์ดใบใหม่ (สำหรับ Admin)
exports.createProduct = async (req, res) => {
    try {
        const { name, category, category_id, rarity, price, stock, description } = req.body;
        const resolvedCategoryId = await getCategoryId(category_id, category);
        
        let image_url = null;
        if (req.file) {
            const fileData = fs.readFileSync(req.file.path);
            const base64Image = fileData.toString('base64');
            image_url = `data:${req.file.mimetype};base64,${base64Image}`;
        }

        const [result] = await db.query(
            `INSERT INTO products (category_id, name, description, rarity, price, stock, image_url) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [resolvedCategoryId, name, description || '', rarity, price, stock, image_url]
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
        const { name, category, category_id, rarity, price, stock, description } = req.body;
        const resolvedCategoryId = await getCategoryId(category_id, category);

        if (req.file) {
            const fileData = fs.readFileSync(req.file.path);
            const base64Image = fileData.toString('base64');
            const image_url = `data:${req.file.mimetype};base64,${base64Image}`;

            await db.query(
                `UPDATE products 
                 SET category_id = ?, name = ?, description = ?, rarity = ?, price = ?, stock = ?, image_url = ? 
                 WHERE id = ?`,
                [resolvedCategoryId, name, description || '', rarity, price, stock, image_url, id]
            );
        } else {
            await db.query(
                `UPDATE products 
                 SET category_id = ?, name = ?, description = ?, rarity = ?, price = ?, stock = ? 
                 WHERE id = ?`,
                [resolvedCategoryId, name, description || '', rarity, price, stock, id]
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