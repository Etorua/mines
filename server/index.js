const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

// Routes
const userRoutes = require('./routes/userRoutes');
const gameRoutes = require('./routes/gameRoutes');
const adminRoutes = require('./routes/adminRoutes');

app.use('/api/users', userRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/admin', adminRoutes);

// Initialize DB Tables
const initializeDB = async () => {
  try {
    await pool.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        balance DECIMAL(10, 2) DEFAULT 0.00 CHECK (balance >= 0),
        is_admin BOOLEAN DEFAULT FALSE,
        card_info TEXT -- JSON string for card details
      );
    `);
    
    // Attempt to add card_info column if it doesn't exist (migration for existing DBs)
    try {
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS card_info TEXT;`);
    } catch (e) {
      console.log("Column card_info might already exist or error adding it:", e.message);
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS games (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id),
        bet_amount DECIMAL(10, 2) NOT NULL,
        mines_count INT NOT NULL,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'cashed_out', 'exploded')),
        mine_locations TEXT NOT NULL, -- JSON string
        revealed_cells TEXT DEFAULT '[]', -- JSON string
        profit DECIMAL(10, 2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id),
        type VARCHAR(20) NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'bet', 'win')),
        amount DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS casino_withdrawals (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        amount DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('Database tables initialized');
  } catch (err) {
    console.error('Error initializing database:', err);
  }
};

initializeDB();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
