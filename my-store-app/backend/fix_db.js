const db = require('./config/db');

async function fixDB() {
    try {
        const [stores] = await db.query('SELECT * FROM stores');
        if (stores.length === 0) {
            console.log("Creating default store...");
            await db.query('INSERT INTO stores (store_code, store_name, address) VALUES (?, ?, ?)', ['CH001', 'Cửa Hàng Mặc Định', 'Hà Nội']);
        }
        
        console.log("Updating users with null store_id...");
        await db.query('UPDATE users SET store_id = 1 WHERE store_id IS NULL OR store_id = 0');
        
        // Cần đảm bảo cột store_id trong categories cho phép NULL (optional), 
        // nhưng tạm thời chúng ta gán store_id = 1 cho các bản ghi cũ.
        
        console.log("Done");
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
fixDB();
