const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

async function migrate() {
    console.log('Running migrations...');
    const client = new Client(
        process.env.DATABASE_URL
            ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
            : {
                  host: process.env.DB_HOST || 'localhost',
                  user: process.env.DB_USER || 'postgres',
                  password: process.env.DB_PASSWORD || '',
                  database: process.env.DB_NAME || 'blog_db',
                  port: process.env.DB_PORT || 5432,
              }
    );

    await client.connect();
    
    const schemaPath = path.join(__dirname, '../schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    try {
        await client.query(schemaSql);
        console.log('Schema executed successfully.');
    } catch (err) {
        console.error('Error executing schema:', err);
    } finally {
        await client.end();
    }
}

migrate();
