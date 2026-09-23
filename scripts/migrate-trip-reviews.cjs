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
    await client.query(fs.readFileSync('migrations/20260923_trip_reviews.sql', 'utf8'));
    await client.query(fs.readFileSync('migrations/20260923_trip_review_visibility.sql', 'utf8'));
    const { rows } = await client.query("SELECT relrowsecurity FROM pg_class WHERE oid = 'public.trip_reviews'::regclass");
    console.log('Trip reviews migration applied. RLS enabled:', rows[0].relrowsecurity);
  } finally { await client.end(); }
}
main().catch(error => { console.error('Migration failed:', error.code || '', error.message); process.exitCode = 1; });
