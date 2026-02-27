const { Client } = require('pg');
require('dotenv').config({ path: '../.env' }); // Adjust path if needed

const dbName = process.env.DB_NAME || 'mina';
const user = process.env.DB_USER || 'postgres';
const password = process.env.DB_PASSWORD || 'admin';
const host = process.env.DB_HOST || 'localhost';
const port = process.env.DB_PORT || 5432;

const createDb = async () => {
    const client = new Client({
        user,
        password,
        host,
        port,
        database: 'postgres' // Connect to default DB first
    });

    try {
        await client.connect();
        const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = '${dbName}'`);
        if (res.rowCount === 0) {
            console.log(`Database ${dbName} does not exist. Creating...`);
            await client.query(`CREATE DATABASE "${dbName}"`);
            console.log(`Database ${dbName} created successfully.`);
        } else {
            console.log(`Database ${dbName} already exists.`);
        }
    } catch (err) {
        console.error("Error creating database:", err);
    } finally {
        await client.end();
    }
};

createDb();
