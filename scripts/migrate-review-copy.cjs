const fs = require('node:fs');
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local', quiet: true });

async function main() {
  // Support the existing local setup without copying its credentials into new files.
  const legacy = fs.existsSync('setup-supabase.js') ? fs.readFileSync('setup-supabase.js', 'utf8').match(/const connectionString = '([^']+)'/)?.[1] : undefined;
  const connectionString = process.env.DATABASE_URL || legacy;
  if (!connectionString) throw new Error('Set DATABASE_URL before running this migration.');
  const connectionUrl = new URL(connectionString);
  if (process.env.REVIEWS_DB_HOST) connectionUrl.hostname = process.env.REVIEWS_DB_HOST;
  const client = new Client({ connectionString: connectionUrl.toString(), ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000, statement_timeout: 15000 });
  try {
    await client.connect();
    await client.query(fs.readFileSync('migrations/20260924_review_copy.sql', 'utf8'));
    console.log('Review copy columns are ready.');
  } finally { await client.end(); }
}
main().catch(error => { console.error('Migration failed:', error.code || '', error.message); process.exitCode = 1; });
