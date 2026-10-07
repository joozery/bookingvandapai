require('dotenv').config({ path: '.env.local' });

async function main() {
  const { MongoClient } = require('mongodb');
  const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');

  const mongo = new MongoClient(process.env.MONGODB_URI);
  await mongo.connect();
  await mongo.db(process.env.MONGODB_DB || 'dapai').command({ ping: 1 });
  console.log('MongoDB: OK');
  await mongo.close();

  const r2 = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
  });
  await r2.send(new ListObjectsV2Command({ Bucket: process.env.R2_BUCKET_NAME, MaxKeys: 1 }));
  console.log('Cloudflare R2: OK');
}

main().catch((error) => {
  console.error(`${error.name || 'Error'}: ${error.message}`);
  process.exitCode = 1;
});
