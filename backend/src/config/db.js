/**
 * src/config/db.js
 * NeonDB (Serverless PostgreSQL) connection
 */
const { neon } = require('@neondatabase/serverless');
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
}

// Neon serverless SQL tag — great for one-off queries
const sql = neon(process.env.DATABASE_URL);

// pg Pool — for transactions and connection reuse
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 20000, // Increased from 5s to 20s to safely allow NeonDB serverless cold-starts!
});

pool.on('error', (err) => {
    console.error('Unexpected DB pool error:', err.message);
});

/**
 * Execute a query using the pool (supports parameterized queries)
 * @param {string} text  SQL query string
 * @param {Array}  params Bound parameters
 */
const query = async (text, params) => {
    const start = Date.now();
    const res = await pool.query(text, params);
    if (process.env.NODE_ENV === 'development') {
        console.log(`[DB] ${text.substring(0, 60)}... | ${Date.now() - start}ms | rows: ${res.rowCount}`);
    }
    return res;
};

/**
 * Get a dedicated client from pool (for transactions)
 */
const getClient = () => pool.connect();

module.exports = { sql, query, getClient, pool };
