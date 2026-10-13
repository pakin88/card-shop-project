const db = require('../config/db');

// ดึงรายการการ์ดทั้งหมด (ลูกค้าและ Admin ใช้)
exports.getAllProducts = async (req, res) => {
    try {
        const [products] = await db.query(`
            SELECT p.*, c.name as category_name 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id
            ORDER BY p.created_at DESC
        `);
        res.json(products);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสินค้า' });
    }
};

// เพิ่มการ์ดใบใหม่ (เฉพาะ Admin)
exports.createProduct = async (req, res) => {
    try {
        const { category_id, name, description, rarity, card_condition, price, stock } = req.body;
        // เช็คว่ามีการอัปโหลดรูปมาไหม ถ้ามีให้เอาชื่อไฟล์มาเก็บ ถ้าไม่มีให้เป็น null
        const image_url = req.file ? req.file.filename : null;

        const [result] = await db.query(
            `INSERT INTO products (category_id, name, description, rarity, card_condition, price, stock, image_url) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [category_id, name, description, rarity, card_condition, price, stock, image_url]
        );

        res.status(201).json({ message: 'เพิ่มการ์ดสำเร็จ', productId: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเพิ่มสินค้า' });
    }
};

// ลบการ์ด (เฉพาะ Admin)
exports.deleteProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        await db.query('DELETE FROM products WHERE id = ?', [productId]);
        res.json({ message: 'ลบการ์ดสำเร็จ' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบสินค้า' });
    }
};