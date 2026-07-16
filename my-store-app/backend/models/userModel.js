const db = require('../config/db');
//kiểm tra user và email đã tồn tại chưa

const getUserByUsername = async (username) => {
    const [rows] = await db.query(
        `SELECT * FROM users WHERE username = ?`,
        [username]
    )
    return rows[0];// Trả về user đầu tiên nếu không tìm thấy trả về undefined
}

// Thêm user mới vào db
const createUser = async (store_id, username, hashed_password, full_name, role) => {
    const [result] = await db.execute(
        `INSERT INTO users (store_id, username, password, full_name, role)
        VALUES (?,?,?,?,?)`,
        [store_id, username, hashed_password, full_name, role]
    );
    return result.insertId;
}

// Lấy user theo ID
const getUserById = async (id) => {
    const [rows] = await db.query(
        `SELECT * FROM users WHERE id = ?`,
        [id]
    );
    return rows[0];
}

module.exports = { getUserByUsername, createUser, getUserById }