const pool = require('../config/db');

const listUsers = async () => {
    try {
        const res = await pool.query("SELECT id, username, balance, is_admin FROM users");
        console.table(res.rows);
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

listUsers();
