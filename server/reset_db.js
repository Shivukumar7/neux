const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

async function reset() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        await connection.query('DROP TABLE IF EXISTS blogs');
        await connection.query('DROP TABLE IF EXISTS users');
        console.log('Tables dropped.');
    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}

reset();
