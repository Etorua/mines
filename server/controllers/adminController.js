const pool = require('../config/db');

// Get all users
exports.getAllUsers = async (req, res) => {
    try {
        const users = await pool.query("SELECT id, username, balance, is_admin FROM users ORDER BY id ASC");
        res.json(users.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Server error" });
    }
};

// Update user balance
exports.updateUserBalance = async (req, res) => {
    try {
        const { id } = req.params;
        const { balance } = req.body;

        const updateUser = await pool.query(
            "UPDATE users SET balance = $1 WHERE id = $2 RETURNING id, username, balance",
            [balance, id]
        );

        if (updateUser.rows.length === 0) {
            return res.json({ error: "User not found" });
        }

        res.json({ message: "Balance updated", user: updateUser.rows[0] });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Server error" });
    }
};

// Get stats
exports.getStats = async (req, res) => {
    try {
        const totalUsers = await pool.query("SELECT COUNT(*) FROM users");
        const totalBalance = await pool.query("SELECT SUM(balance) FROM users");
        
        // Transaction stats
        const deposit = await pool.query("SELECT SUM(amount) FROM transactions WHERE type = 'deposit'");
        const withdrawal = await pool.query("SELECT SUM(amount) FROM transactions WHERE type = 'withdrawal'");
        const bet = await pool.query("SELECT SUM(amount) FROM transactions WHERE type = 'bet'");
        const win = await pool.query("SELECT SUM(amount) FROM transactions WHERE type = 'win'");
        
        // Casino stats
        const casinoWithdrawals = await pool.query("SELECT SUM(amount) FROM casino_withdrawals");
        const totalCasinoWithdrawn = parseFloat(casinoWithdrawals.rows[0].sum || 0);

        const totalBets = parseFloat(bet.rows[0].sum || 0);
        const totalWins = parseFloat(win.rows[0].sum || 0);
        const netProfit = totalBets - totalWins;
        const availableCasinoFunds = netProfit - totalCasinoWithdrawn;

        res.json({
            totalUsers: totalUsers.rows[0].count,
            totalUserBalance: totalBalance.rows[0].sum || 0,
            totalDeposits: deposit.rows[0].sum || 0,
            totalWithdrawals: withdrawal.rows[0].sum || 0,
            totalBets: totalBets,
            totalWins: totalWins,
            netProfit: netProfit,
            availableCasinoFunds: availableCasinoFunds,
            totalCasinoWithdrawn: totalCasinoWithdrawn
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Server error" });
    }
};

// Withdraw Casino Funds
exports.withdrawCasinoFunds = async (req, res) => {
    try {
        const { amount } = req.body;
        
        if (!amount || amount <= 0) {
            return res.status(400).json({ error: "Invalid amount" });
        }

        // Check available funds first
        const bet = await pool.query("SELECT SUM(amount) FROM transactions WHERE type = 'bet'");
        const win = await pool.query("SELECT SUM(amount) FROM transactions WHERE type = 'win'");
        const casinoWithdrawals = await pool.query("SELECT SUM(amount) FROM casino_withdrawals");
        
        const totalBets = parseFloat(bet.rows[0].sum || 0);
        const totalWins = parseFloat(win.rows[0].sum || 0);
        const totalWithdrawn = parseFloat(casinoWithdrawals.rows[0].sum || 0);
        
        const available = (totalBets - totalWins) - totalWithdrawn;
        
        if (amount > available) {
            return res.status(400).json({ error: "Insufficient casino funds" });
        }

        await pool.query("INSERT INTO casino_withdrawals (amount) VALUES ($1)", [amount]);
        
        res.json({ message: "Withdrawal successful", newBalance: available - amount });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Server error" });
    }
};
