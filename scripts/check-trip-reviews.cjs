const fs = require('node:fs');
const assert = require('node:assert/strict');
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local', quiet: true });

async function main() {
  const legacy = fs.existsSync('setup-supabase.js') ? fs.readFileSync('setup-supabase.js', 'utf8').match(/const connectionString = '([^']+)'/)?.[1] : undefined;
  const url = new URL(process.env.DATABASE_URL || legacy);
  if (process.env.REVIEWS_DB_HOST) url.hostname = process.env.REVIEWS_DB_HOST;
  const client = new Client({ connectionString: url.toString(), ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000, statement_timeout: 15000 });
  try {
    await client.connect();
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT id FROM public.trips LIMIT 1');
    if (rows.length) {
      await client.query('SAVEPOINT review_test');
      const values = [rows[0].id, `review-test-${Date.now()}`, 'Temporary transaction test'];
      const insert = 'INSERT INTO public.trip_reviews ("tripId", "lineUserId", "reviewerName", rating) VALUES ($1, $2, $3, 5)';
      await client.query(insert, values);
      const initial = await client.query('SELECT "isHidden" FROM public.trip_reviews WHERE "lineUserId" = $1', [values[1]]);
      assert.equal(initial.rows[0].isHidden, false);
      for (const isHidden of [true, false]) {
        await client.query('UPDATE public.trip_reviews SET "isHidden" = $1 WHERE "lineUserId" = $2', [isHidden, values[1]]);
        const saved = await client.query('SELECT "isHidden", rating FROM public.trip_reviews WHERE "lineUserId" = $1', [values[1]]);
        assert.equal(saved.rows[0].isHidden, isHidden);
        assert.equal(saved.rows[0].rating, 5);
      }
      console.log('Hide and restore persistence, original rating preserved: PASS');
      await assert.rejects(client.query(insert, values), error => error.code === '23505');
      await client.query('ROLLBACK TO SAVEPOINT review_test');
      console.log('Duplicate review constraint: PASS');
      await assert.rejects(client.query('INSERT INTO public.trip_reviews ("tripId", "lineUserId", "reviewerName", rating) VALUES ($1, $2, $3, 6)', values), error => error.code === '23514');
      await client.query('ROLLBACK TO SAVEPOINT review_test');
      console.log('Rating range constraint: PASS');
    }
    const result = await client.query("SELECT has_table_privilege('anon', 'public.trip_reviews', 'SELECT') AS anon_read, has_table_privilege('authenticated', 'public.trip_reviews', 'INSERT') AS direct_write, has_table_privilege('service_role', 'public.trip_reviews', 'INSERT') AS server_write");
    assert.deepEqual(result.rows[0], { anon_read: false, direct_write: false, server_write: true });
    console.log('Database access restrictions: PASS');
  } finally {
    await client.query('ROLLBACK').catch(() => {});
    await client.end();
    console.log('Test inserts rolled back.');
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
