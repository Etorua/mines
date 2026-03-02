const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const updateDB = async () => {
    try {
        await pool.query('ALTER TABLE games ADD COLUMN IF NOT EXISTS grid_size INT DEFAULT 5');
        console.log("Column 'grid_size' added successfully.");
        process.exit(0);
    } catch (err) {
        console.error("Error updating database:", err);
        process.exit(1);
    }
};

updateDB();
