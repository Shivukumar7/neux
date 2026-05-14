const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

async function setup() {
    console.log('Connecting to PostgreSQL to create DB...');
    const client = new Client({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        port: process.env.DB_PORT || 5432,
        database: 'postgres' // Connect to default db to create new one
    });

    await client.connect();
    try {
        await client.query(`CREATE DATABASE ${process.env.DB_NAME || 'blog_db'}`);
        console.log('Database created or already exists.');
    } catch (err) {
        if (err.code !== '42P04') { // 42P04 is duplicate_database
            console.error('Error creating database:', err);
        } else {
            console.log('Database already exists.');
        }
    } finally {
        await client.end();
    }

    console.log('Connecting to the new database to run schema...');
    const dbClient = new Client({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'blog_db',
    });
    
    await dbClient.connect();
    const schemaPath = path.join(__dirname, '../schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    try {
        await dbClient.query(schemaSql);
        console.log('Tables created successfully.');
    } catch (err) {
        console.error('Error executing schema:', err);
    } finally {
        await dbClient.end();
    }
}

setup();
