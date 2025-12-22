const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

async function setup() {
    console.log('Connecting to MySQL...');
    // Connect without database first to create it
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        multipleStatements: true
    });

    console.log('Connected. Running schema...');
    const schemaPath = path.join(__dirname, '../schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    try {
        await connection.query(schemaSql);
        console.log('Database and Tables created successfully.');
    } catch (err) {
        console.error('Error executing schema:', err);
    } finally {
        await connection.end();
    }
}

setup();
