const pool = require('./config/db');

async function checkAdmin() {
    try {
        const res = await pool.query("SELECT username, is_admin FROM users WHERE username = 'testuser'");
        console.log(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

checkAdmin();
