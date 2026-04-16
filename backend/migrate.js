// backend/migrate.js — Lance toutes les migrations SQL
// Usage : node migrate.js
const { Pool } = require('pg');
const fs   = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const MIGRATIONS = [
  'storage_requests.sql',
  'warehouses.sql',
  'warehouse_articles.sql',
  'stock_analyses.sql',
  'urgent_responses.sql',
  'products_auto.sql',
];

async function run() {
  const client = await pool.connect();
  console.log('\n🔗 Connexion PostgreSQL établie\n');

  for (const file of MIGRATIONS) {
    const filePath = path.join(__dirname, 'migrations', file);
    if (!fs.existsSync(filePath)) {
      console.log('⏭️  Fichier manquant (ignoré) :', file);
      continue;
    }
    const sql = fs.readFileSync(filePath, 'utf8');
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
      console.log('✅', file, '— OK');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('❌', file, '— ERREUR :', err.message);
      process.exit(1);
    }
  }

  client.release();
  await pool.end();
  console.log('\n🎉 Toutes les migrations sont terminées.\n');
}

run();
// already handled by MIGRATIONS array
