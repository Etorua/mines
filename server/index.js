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
        first_name VARCHAR(100),
        last_name_paternal VARCHAR(100),
        last_name_maternal VARCHAR(100),
        phone_number VARCHAR(20),
        balance DECIMAL(10, 2) DEFAULT 0.00 CHECK (balance >= 0),
        is_admin BOOLEAN DEFAULT FALSE,
        card_info TEXT, -- JSON string for card details
        kyc_status VARCHAR(20) DEFAULT 'not_submitted' CHECK (kyc_status IN ('not_submitted', 'submitted', 'approved', 'rejected')),
        kyc_document_name TEXT,
        kyc_document_mime TEXT,
        kyc_document_data TEXT,
        kyc_submitted_at TIMESTAMP
      );
    `);
    
    // Migration for existing DBs
    try {
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS card_info TEXT;`);
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);`);
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name_paternal VARCHAR(100);`);
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name_maternal VARCHAR(100);`);
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);`);
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(20) DEFAULT 'not_submitted';`);
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_document_name TEXT;`);
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_document_mime TEXT;`);
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_document_data TEXT;`);
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_submitted_at TIMESTAMP;`);
      await pool.query(`ALTER TABLE users ALTER COLUMN kyc_status SET DEFAULT 'not_submitted';`);
      await pool.query(`UPDATE users SET kyc_status = 'not_submitted' WHERE kyc_status IS NULL;`);
      await pool.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_kyc_status_check;`);
      await pool.query(`ALTER TABLE users ADD CONSTRAINT users_kyc_status_check CHECK (kyc_status IN ('not_submitted', 'submitted', 'approved', 'rejected'));`);
    } catch (e) {
      console.log("Users migration warning:", e.message);
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
