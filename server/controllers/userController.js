const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
    const {
        username,
        password,
        firstName,
        lastNamePaternal,
        lastNameMaternal,
        phoneNumber
    } = req.body;

    try {
        const cleanUsername = (username || '').trim();
        const cleanFirstName = (firstName || '').trim();
        const cleanLastNamePaternal = (lastNamePaternal || '').trim();
        const cleanLastNameMaternal = (lastNameMaternal || '').trim();
        const cleanPhone = (phoneNumber || '').trim();

        if (!cleanUsername || cleanUsername.length < 3 || cleanUsername.length > 20) {
            return res.status(400).json({ error: 'Invalid username. Use 3 to 20 characters.' });
        }

        if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
            return res.status(400).json({ error: 'Username can only contain letters, numbers and underscore.' });
        }

        if (!password || password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
        }

        if (!cleanFirstName || !cleanLastNamePaternal || !cleanLastNameMaternal) {
            return res.status(400).json({ error: 'Full legal name is required.' });
        }

        if (!/^\+?[0-9]{10,15}$/.test(cleanPhone)) {
            return res.status(400).json({ error: 'Invalid phone number format.' });
        }

        const existingUser = await pool.query('SELECT id FROM users WHERE username = $1', [cleanUsername]);
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'Username already exists.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUserResult = await pool.query(
            `INSERT INTO users (
                username,
                password,
                first_name,
                last_name_paternal,
                last_name_maternal,
                phone_number,
                balance,
                is_admin,
                card_info,
                kyc_status
            ) VALUES ($1, $2, $3, $4, $5, $6, 1000, false, $7, 'not_submitted') RETURNING *`,
            [cleanUsername, hashedPassword, cleanFirstName, cleanLastNamePaternal, cleanLastNameMaternal, cleanPhone, JSON.stringify({})]
        );

        const newUser = newUserResult.rows[0];
        const token = jwt.sign({ id: newUser.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });

        res.json({
            token,
            user: {
                id: newUser.id,
                username: newUser.username,
                first_name: newUser.first_name,
                last_name_paternal: newUser.last_name_paternal,
                last_name_maternal: newUser.last_name_maternal,
                phone_number: newUser.phone_number,
                kyc_status: newUser.kyc_status,
                balance: newUser.balance,
                is_admin: newUser.is_admin
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error during registration' });
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
        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                first_name: user.first_name,
                last_name_paternal: user.last_name_paternal,
                last_name_maternal: user.last_name_maternal,
                phone_number: user.phone_number,
                kyc_status: user.kyc_status,
                kyc_document_name: user.kyc_document_name,
                kyc_submitted_at: user.kyc_submitted_at,
                balance: user.balance,
                is_admin: user.is_admin
            }
        });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ error: "Server error during login" });
    }
};

exports.getProfile = async (req, res) => {
    try {
        const user = await pool.query(
            `SELECT
                id,
                username,
                first_name,
                last_name_paternal,
                last_name_maternal,
                phone_number,
                kyc_status,
                kyc_document_name,
                kyc_submitted_at,
                balance,
                is_admin
             FROM users
             WHERE id = $1`,
            [req.user.id]
        );

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
        const userCheck = await pool.query("SELECT id, kyc_status FROM users WHERE id = $1", [req.user.id]);
        if (userCheck.rows.length === 0) return res.status(404).json({ error: "User not found" });

        if (userCheck.rows[0].kyc_status === 'not_submitted') {
            return res.status(403).json({
                error: "Debes subir una identificacion oficial antes de realizar depositos.",
                code: "KYC_REQUIRED"
            });
        }

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

exports.uploadVerificationDocument = async (req, res) => {
    const { documentName, documentMime, documentData } = req.body;

    try {
        if (!documentName || !documentMime || !documentData) {
            return res.status(400).json({ error: 'Documento incompleto. Intenta nuevamente.' });
        }

        if (!documentData.startsWith('data:')) {
            return res.status(400).json({ error: 'Formato de documento invalido.' });
        }

        await pool.query(
            `UPDATE users
             SET kyc_status = 'submitted',
                 kyc_document_name = $1,
                 kyc_document_mime = $2,
                 kyc_document_data = $3,
                 kyc_submitted_at = NOW()
             WHERE id = $4`,
            [documentName, documentMime, documentData, req.user.id]
        );

        res.json({ message: 'Documento recibido correctamente.', kycStatus: 'submitted' });
    } catch (err) {
        console.error('Verification upload error:', err);
        res.status(500).json({ error: 'Server error uploading verification document' });
    }
};
