require('dotenv').config({ path: '.env.local' });

const fs = require('fs');
const { MongoClient } = require('mongodb');
const { Client: PgClient } = require('pg');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const tables = ['trips', 'vans', 'bookings', 'profiles', 'admins', 'admin_users', 'trip_reviews'];
const mongo = new MongoClient(process.env.MONGODB_URI);
const setup = fs.readFileSync('setup-supabase.js', 'utf8');
const rawSupabaseDbUrl = process.env.MIGRATION_TARGET_DATABASE_URL || process.env.SUPABASE_DB_URL || setup.match(/const connectionString = '([^']+)'/)?.[1];
const parsedDbUrl = new URL(rawSupabaseDbUrl.replace(/^postgresql:/, 'postgres:'));
const pg = new PgClient({
  user: decodeURIComponent(parsedDbUrl.username),
  password: decodeURIComponent(parsedDbUrl.password),
  host: parsedDbUrl.hostname,
  port: Number(parsedDbUrl.port || 5432),
  database: parsedDbUrl.pathname.slice(1) || 'postgres',
  ssl: { rejectUnauthorized: false },
});
const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
});

async function readAll(table) {
  const { rows } = await pg.query(`SELECT * FROM "${table}"`);
  return rows;
}

async function migrateTable(db, table) {
  const rows = await readAll(table);
  if (!rows.length) return 0;
  const collection = db.collection(table);
  await collection.createIndex({ id: 1 }, { unique: true, sparse: true });
  await collection.bulkWrite(rows.map((row) => ({
    replaceOne: { filter: { id: row.id }, replacement: row, upsert: true },
  })), { ordered: false });
  return rows.length;
}

async function migrateFiles() {
  const { rows } = await pg.query("SELECT name, metadata FROM storage.objects WHERE bucket_id = 'images'");
  let copied = 0;
  for (const file of rows) {
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/${file.name.split('/').map(encodeURIComponent).join('/')}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`storage download ${file.name}: HTTP ${response.status}`);
    await r2.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: file.name,
      Body: Buffer.from(await response.arrayBuffer()),
      ContentType: file.metadata?.mimetype,
    }));
    copied += 1;
    console.log(`R2 ${copied}/${rows.length}: ${file.name}`);
  }
  return copied;
}

async function main() {
  await pg.connect();
  await mongo.connect();
  const db = mongo.db(process.env.MONGODB_DB || 'dapai');
  console.log('Migration is additive: Supabase data is not deleted.');
  for (const table of tables) console.log(`${table}: ${await migrateTable(db, table)} rows`);
  console.log(`Files copied: ${await migrateFiles()}`);
  console.log('Migration complete. Verify counts before switching the application.');
}

main().catch((error) => {
  console.error(`${error.name || 'Error'}: ${error.message}`);
  process.exitCode = 1;
}).finally(async () => {
  await pg.end().catch(() => {});
  await mongo.close();
});
