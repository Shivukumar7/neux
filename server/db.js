const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool(
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

module.exports = pool;
