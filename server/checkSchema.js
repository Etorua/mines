const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
});

const checkSchema = async () => {
    try {
        const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users'");
        console.log("Users Table Schema:", res.rows);
        await pool.end();
    } catch (err) {
        console.error("Error checking schema:", err);
        await pool.end();
    }
};

checkSchema();
