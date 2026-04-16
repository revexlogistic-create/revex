const { Pool } = require('pg');

const poolConfig = process.env.DATABASE_URL ? {
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
} : {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433'),
  database: process.env.DB_NAME || 'revex_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || ''
};

const pool = new Pool(poolConfig);

pool.connect((err, client, release) => {
  if (err) { console.error('❌ DB Error:', err.message); process.exit(1); }
  release();
  console.log('✅ PostgreSQL connecté');
});

const query = async (text, params) => {
  try { return await pool.query(text, params); }
  catch (err) { console.error('❌ Query error:', err.message); throw err; }
};

const withTransaction = async (cb) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await cb(client);
    await client.query('COMMIT');
    return result;
  } catch (err) { await client.query('ROLLBACK'); throw err; }
  finally { client.release(); }
};

module.exports = { pool, query, withTransaction };
