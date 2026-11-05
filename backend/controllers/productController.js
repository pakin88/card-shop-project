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

// 1. ดึงข้อมูลสินค้าทั้งหมด พร้อมดึงชื่อหมวดหมู่จากตาราง categories
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

// 2. เพิ่มสินค้าใหม่ (สำหรับ Admin)
exports.createProduct = async (req, res) => {
    try {
        const { name, category, category_id, rarity, price, stock, description, card_code, yuyutei_price, yuyutei_url } = req.body;
        const resolvedCategoryId = await getCategoryId(category_id, category);
        
        let image_url = null;
        if (req.file) {
            const fileData = req.file.buffer ? req.file.buffer : fs.readFileSync(req.file.path);
            const base64Image = fileData.toString('base64');
            image_url = `data:${req.file.mimetype};base64,${base64Image}`;
        }

        const parsedYuyuteiPrice = yuyutei_price && !isNaN(yuyutei_price) ? Number(yuyutei_price) : null;

        const [result] = await db.query(
            `INSERT INTO products (category_id, name, description, rarity, price, stock, image_url, card_code, yuyutei_price, yuyutei_url) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                resolvedCategoryId, 
                name, 
                description || '', 
                rarity, 
                price, 
                stock, 
                image_url,
                card_code || null,
                parsedYuyuteiPrice,
                yuyutei_url || null
            ]
        );

        res.status(201).json({ message: 'เพิ่มสินค้าสำเร็จ!', productId: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'เพิ่มสินค้าไม่สำเร็จ: ' + error.message });
    }
};

// 3. แก้ไขข้อมูลสินค้า (สำหรับ Admin)
exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, category, category_id, rarity, price, stock, description, card_code, yuyutei_price, yuyutei_url } = req.body;
        const resolvedCategoryId = await getCategoryId(category_id, category);

        const parsedYuyuteiPrice = yuyutei_price && !isNaN(yuyutei_price) ? Number(yuyutei_price) : null;

        if (req.file) {
            const fileData = req.file.buffer ? req.file.buffer : fs.readFileSync(req.file.path);
            const base64Image = fileData.toString('base64');
            const image_url = `data:${req.file.mimetype};base64,${base64Image}`;

            await db.query(
                `UPDATE products 
                 SET category_id = ?, name = ?, description = ?, rarity = ?, price = ?, stock = ?, image_url = ?, card_code = ?, yuyutei_price = ?, yuyutei_url = ? 
                 WHERE id = ?`,
                [
                    resolvedCategoryId, 
                    name, 
                    description || '', 
                    rarity, 
                    price, 
                    stock, 
                    image_url, 
                    card_code || null, 
                    parsedYuyuteiPrice, 
                    yuyutei_url || null, 
                    id
                ]
            );
        } else {
            await db.query(
                `UPDATE products 
                 SET category_id = ?, name = ?, description = ?, rarity = ?, price = ?, stock = ?, card_code = ?, yuyutei_price = ?, yuyutei_url = ? 
                 WHERE id = ?`,
                [
                    resolvedCategoryId, 
                    name, 
                    description || '', 
                    rarity, 
                    price, 
                    stock, 
                    card_code || null, 
                    parsedYuyuteiPrice, 
                    yuyutei_url || null, 
                    id
                ]
            );
        }

        res.json({ message: 'อัปเดตข้อมูลสินค้าสำเร็จ!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'แก้ไขสินค้าไม่สำเร็จ: ' + error.message });
    }
};

// 4. ลบสินค้า (สำหรับ Admin)
exports.deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM products WHERE id = ?', [id]);
        res.json({ message: 'ลบสินค้าออกจากระบบสำเร็จ!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'ไม่สามารถลบได้ (สินค้านี้อาจอยู่ในประวัติใบสั่งซื้อแล้ว)' });
    }
};