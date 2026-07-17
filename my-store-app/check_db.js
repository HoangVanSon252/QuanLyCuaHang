const db = require('./backend/config/db');

async function check() {
    try {
        const [users] = await db.query('SELECT * FROM users');
        console.log("Users:", users);

        const [categories] = await db.query('SHOW CREATE TABLE categories');
        console.log("Categories Table:", categories[0]['Create Table']);
        
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
check();
