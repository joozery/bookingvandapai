import { DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const bucket = process.env.R2_BUCKET_NAME;
const publicUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, '');

if (!bucket || !process.env.R2_ENDPOINT || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
  throw new Error('R2 environment variables are not configured');
}

const client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

export async function uploadToR2(key: string, body: Uint8Array | Buffer | string, contentType?: string) {
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
  return publicUrl ? `${publicUrl}/${key.split('/').map(encodeURIComponent).join('/')}` : key;
}

export async function downloadFromR2(key: string) {
  return client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
}

export async function deleteFromR2(key: string) {
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export async function listR2(prefix = '') {
  const result = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix }));
  return result.Contents ?? [];
}

export async function pingR2() {
  await client.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 1 }));
}
