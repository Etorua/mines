const pool = require('../config/db');

const updateDB = async () => {
    try {
        // Add is_admin column if it doesn't exist
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;`);
        
        // Promote 'testuser' to admin (or any user you want, e.g., 'admin')
        const promoRes = await pool.query("UPDATE users SET is_admin = TRUE WHERE username = 'testuser' RETURNING username, is_admin");
        
        if (promoRes.rowCount > 0) {
            console.log(`User '${promoRes.rows[0].username}' is now an admin.`);
        } else {
            console.log("User 'testuser' not found to promote, creating an admin user if not exists could be next step but skipping for now.");
        }

        console.log("Database schema updated: is_admin column added.");
        process.exit();
    } catch (err) {
        console.error("Error updating DB:", err);
        process.exit(1);
    }
};

updateDB();
