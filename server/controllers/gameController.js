const pool = require('../config/db');

// const BOARD_SIZE = 25; // Removed in favor of dynamic size

const calculateProfit = (bet, minesCount, revealedCount, gridSize = 5) => {
    let multiplier = 1;
    const totalCells = gridSize * gridSize;
    const safeCells = totalCells - minesCount;

    for (let i = 0; i < revealedCount; i++) {
        const remainingCells = totalCells - i;
        const remainingSafe = safeCells - i;
        
        // Probability of picking a safe cell
        const probability = remainingSafe / remainingCells;
        
        // Multiplier for this step is inverse of probability
        multiplier *= (1 / probability);
    }
    
    // House edge (e.g., 3%) - multiply final multiplier by 0.97
    multiplier *= 0.97; 

    // Ensure profit is at least 0 if something weird happens, though usually it's > 0 after 1 step
    const totalValue = bet * multiplier;
    const profit = totalValue - bet;
    
    return Math.max(0, profit);
};

exports.startGame = async (req, res) => {
    const { betAmount, minesCount, gridSize = 5 } = req.body;
    const userId = req.user.id;

    if (!betAmount || betAmount <= 0) return res.status(400).json({ error: "Invalid bet amount" });
    
    const validGridSizes = [3, 4, 5, 6, 7];
    if (!validGridSizes.includes(gridSize)) return res.status(400).json({ error: "Invalid grid size" });

    const totalCells = gridSize * gridSize;
    if (!minesCount || minesCount < 1 || minesCount >= totalCells) return res.status(400).json({ error: `Invalid mines count (1-${totalCells - 1})` });

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Check balance
        const userRes = await client.query("SELECT balance FROM users WHERE id = $1 FOR UPDATE", [userId]);
        const balance = parseFloat(userRes.rows[0].balance);

        if (balance < betAmount) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: "Insufficient balance" });
        }

        // Deduct balance
        await client.query("UPDATE users SET balance = balance - $1 WHERE id = $2", [betAmount, userId]);

        // Create Game
        const uniqueMines = new Set();
        while(uniqueMines.size < minesCount) {
            uniqueMines.add(Math.floor(Math.random() * totalCells));
        }
        const mineLocations = Array.from(uniqueMines);

        const newGame = await client.query(
            `INSERT INTO games (user_id, bet_amount, mines_count, mine_locations, status, grid_size) 
             VALUES ($1, $2, $3, $4, 'active', $5) RETURNING id`,
            [userId, betAmount, minesCount, JSON.stringify(mineLocations), gridSize]
        );

        await client.query("INSERT INTO transactions (user_id, type, amount) VALUES ($1, 'bet', $2)", [userId, betAmount]);

        await client.query('COMMIT');

        res.json({ 
            gameId: newGame.rows[0].id, 
            minesCount, 
            betAmount,
            gridSize,
            balance: balance - betAmount
        });
// ... rest of the file


    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: "Error starting game" });
    } finally {
        client.release();
    }
};

exports.revealCell = async (req, res) => {
    const { gameId, cellIndex } = req.body;
    const userId = req.user.id;

    try {
        const gameResult = await pool.query("SELECT * FROM games WHERE id = $1 AND user_id = $2", [gameId, userId]);
        if (gameResult.rows.length === 0) return res.status(404).json({ error: "Game not found" });

        const game = gameResult.rows[0];

        if (game.status !== 'active') return res.status(400).json({ error: "Game is not active" });

        const revealed = JSON.parse(game.revealed_cells || '[]');
        if (revealed.includes(cellIndex)) return res.status(400).json({ error: "Cell already revealed" });

        const mines = JSON.parse(game.mine_locations);

        if (mines.includes(cellIndex)) {
            // EXPLOSION
            await pool.query("UPDATE games SET status = 'exploded', revealed_cells = $1 WHERE id = $2", [JSON.stringify([...revealed, cellIndex]), gameId]);
            return res.json({ 
                status: 'exploded', 
                mineLocations: mines, 
                profit: 0,
                gridSize: game.grid_size || 5
            });
        } else {
            // SAFE
            const newRevealed = [...revealed, cellIndex];
            const gridSize = game.grid_size || 5;
            const profit = calculateProfit(parseFloat(game.bet_amount), game.mines_count, newRevealed.length, gridSize);
            
            await pool.query(
                "UPDATE games SET revealed_cells = $1, profit = $2 WHERE id = $3",
                [JSON.stringify(newRevealed), profit, gameId]
            );

            res.json({
                status: 'active',
                revealedCells: newRevealed,
                profit: profit.toFixed(2),
                potentialWin: (parseFloat(game.bet_amount) + profit).toFixed(2),
                gridSize
            });
        }

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error revealing cell" });
    }
};

exports.cashout = async (req, res) => {
    const { gameId } = req.body;
    const userId = req.user.id; // Corrected variable usage

    try {
        const gameResult = await pool.query("SELECT * FROM games WHERE id = $1 AND user_id = $2", [gameId, userId]);
        if (gameResult.rows.length === 0) return res.status(404).json({ error: "Game not found" });

        const game = gameResult.rows[0];
        if (game.status !== 'active') return res.status(400).json({ error: "Game is not active" });

        const profit = parseFloat(game.profit);
        const bet = parseFloat(game.bet_amount);
        const totalWin = bet + profit;

        await pool.query("UPDATE games SET status = 'cashed_out' WHERE id = $1", [gameId]);
        
        // Add winnings to balance
        await pool.query("UPDATE users SET balance = balance + $1 WHERE id = $2", [totalWin, userId]);
        
        // Record win transaction
        if (profit > 0) {
             await pool.query("INSERT INTO transactions (user_id, type, amount) VALUES ($1, 'win', $2)", [userId, profit]);
        }

        const userBalance = await pool.query("SELECT balance FROM users WHERE id = $1", [userId]);

        res.json({
            status: 'cashed_out',
            totalWin: totalWin.toFixed(2),
            balance: userBalance.rows[0].balance
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error cashing out" });
    }
};

exports.getActiveGame = async (req, res) => {
     const userId = req.user.id;
     try {
         const gameResult = await pool.query("SELECT * FROM games WHERE user_id = $1 AND status = 'active' ORDER BY created_at DESC LIMIT 1", [userId]);
         if (gameResult.rows.length > 0) {
             const game = gameResult.rows[0];
             const revealed = JSON.parse(game.revealed_cells || '[]');
             // Don't send mines!
             res.json({
                 gameId: game.id,
                 betAmount: game.bet_amount,
                 minesCount: game.mines_count,
                 revealedCells: revealed,
                 profit: game.profit,
                 gridSize: game.grid_size || 5
             });
         } else {
             res.json(null);
         }
     } catch(err) {
         console.error(err);
         res.status(500).json({error: "Error fetching active game"});
     }
}

exports.getRecentGames = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT g.id, u.username, g.bet_amount, g.profit, g.status, g.mines_count 
            FROM games g 
            JOIN users u ON g.user_id = u.id 
            WHERE g.status IN ('cashed_out', 'exploded') 
            ORDER BY g.created_at DESC 
            LIMIT 15
        `);
        
        // Format for frontend
        const games = result.rows.map(game => ({
            id: game.id,
            user: game.username,
            bet: parseFloat(game.bet_amount),
            profit: parseFloat(game.profit),
            multiplier: game.status === 'cashed_out' && parseFloat(game.bet_amount) > 0
                ? ((parseFloat(game.bet_amount) + parseFloat(game.profit)) / parseFloat(game.bet_amount)).toFixed(2) + 'x'
                : '0.00x',
            status: game.status,
            mines: game.mines_count
        }));
        
        res.json(games);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error fetching recent games" });
    }
};
