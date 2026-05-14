const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

async function run() {
    const client = new Client({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'root',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'blog_db',
    });
    await client.connect();
    try {
        await client.query('ALTER TABLE groups ALTER COLUMN expires_at DROP NOT NULL');
        console.log('Altered groups table');
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}
run();
