const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
    const { username, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        // Using 'id' and 'password' as per index.js schema
        const newUserResult = await pool.query(
            "INSERT INTO users (username, password, balance) VALUES ($1, $2, 0) RETURNING *",
            [username, hashedPassword]
        );
        const newUser = newUserResult.rows[0];
        const token = jwt.sign({ id: newUser.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
        res.json({ token, user: { id: newUser.id, username: newUser.username, balance: newUser.balance } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error during registration" });
    }
};

exports.login = async (req, res) => {
    const { username, password } = req.body;
    console.log(`Login attempt for username: ${username}`);
    try {
        const userResult = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
        if (userResult.rows.length === 0) {
            console.log("User not found");
            return res.status(404).json({ error: "User not found" });
        }

        const user = userResult.rows[0];
        console.log("User found:", user.username);
        // Using 'password' column as confirmed by schema check
        if (!user.password) {
             console.error("User record missing password field (database schema mismatch?)");
             return res.status(500).json({ error: "Server configuration error" });
        }
        
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            console.log("Invalid password");
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
        res.json({ token, user: { id: user.id, username: user.username, balance: user.balance, is_admin: user.is_admin } });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ error: "Server error during login" });
    }
};

exports.getProfile = async (req, res) => {
    try {
        // Querying by 'id' not 'user_id'
        const user = await pool.query("SELECT id, username, balance, is_admin FROM users WHERE id = $1", [req.user.id]);
        if (user.rows.length === 0) return res.status(404).json({ error: "User not found" });
        res.json(user.rows[0]);
    } catch (err) {
        console.error("Profile error:", err);
        res.status(500).json({ error: "Server error fetching profile" });
    }
};

exports.deposit = async (req, res) => {
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid amount" });
    
    try {
        // Check if user exists first
        const userCheck = await pool.query("SELECT id FROM users WHERE id = $1", [req.user.id]);
        if (userCheck.rows.length === 0) return res.status(404).json({ error: "User not found" });

        await pool.query("UPDATE users SET balance = balance + $1 WHERE id = $2", [amount, req.user.id]);
        await pool.query("INSERT INTO transactions (user_id, type, amount) VALUES ($1, 'deposit', $2)", [req.user.id, amount]);
        res.json({ message: "Deposit successful" });
    } catch (err) {
        console.error("Deposit error:", err);
        res.status(500).json({ error: "Server error during deposit" });
    }
};

exports.withdraw = async (req, res) => {
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid amount" });

    try {
        const user = await pool.query("SELECT balance FROM users WHERE id = $1", [req.user.id]);
        if (user.rows.length === 0) return res.status(404).json({ error: "User not found" });
        
        if (parseFloat(user.rows[0].balance) < amount) return res.status(400).json({ error: "Insufficient funds" });

        await pool.query("UPDATE users SET balance = balance - $1 WHERE id = $2", [amount, req.user.id]);
        await pool.query("INSERT INTO transactions (user_id, type, amount) VALUES ($1, 'withdrawal', $2)", [req.user.id, amount]);
        res.json({ message: "Withdrawal successful" });
    } catch (err) {
        console.error("Withdraw error:", err);
        res.status(500).json({ error: "Server error during withdrawal" });
    }
};
