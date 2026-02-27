const pool = require('../config/db');

module.exports = async (req, res, next) => {
    try {
        const user = await pool.query("SELECT is_admin FROM users WHERE id = $1", [req.user.id]);
        
        if (user.rows.length === 0) {
            return res.status(403).json({ error: "User not found" });
        }

        if (!user.rows[0].is_admin) {
            return res.status(403).json({ error: "Access denied. Admin only." });
        }

        next();
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Server error" });
    }
};
