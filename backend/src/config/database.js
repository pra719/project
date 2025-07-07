const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'secure_app',
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD || 'secure_password_2024',
    max: 20, // maximum number of clients in the pool
    idleTimeoutMillis: 30000, // how long a client is allowed to remain idle
    connectionTimeoutMillis: 2000, // how long to wait for a connection
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Error handling for the pool
pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
});

// Test the connection
pool.connect((err, client, release) => {
    if (err) {
        return console.error('Error acquiring client', err.stack);
    }
    console.log('Database connected successfully');
    release();
});

module.exports = pool;