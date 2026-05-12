const fs   = require('fs');
const path = require('path');
const pool = require('./pool');

/**
 * Run all SQL migrations in /migrations in filename order.
 * Applied migrations are tracked in schema_migrations table.
 * Idempotent — safe to call on every server start.
 */
async function runMigrations() {
  // Create tracking table if it doesn't exist
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name       TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  const dir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const { rows } = await pool.query(
      'SELECT 1 FROM schema_migrations WHERE name = $1',
      [file]
    );
    if (rows.length > 0) continue;

    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    console.log(`[migrate] applying ${file}…`);
    try {
      await pool.query('BEGIN');
      await pool.query(sql);
      await pool.query(
        'INSERT INTO schema_migrations (name) VALUES ($1)',
        [file]
      );
      await pool.query('COMMIT');
      console.log(`[migrate] ${file} OK`);
    } catch (err) {
      await pool.query('ROLLBACK');
      console.error(`[migrate] ${file} FAILED:`, err.message);
      throw err;
    }
  }
}

module.exports = runMigrations;
