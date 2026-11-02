import { DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const bucket = process.env.R2_BUCKET_NAME;
const publicUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, '');

// Created on first use, so `next build` (and pages that never touch storage)
// do not require the R2 secrets to be present.
let client: S3Client | undefined;
function r2() {
  if (client) return client;
  if (!bucket || !process.env.R2_ENDPOINT || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
    throw new Error('R2 environment variables are not configured');
  }
  client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
  });
  return client;
}

export async function uploadToR2(key: string, body: Uint8Array | Buffer | string, contentType?: string) {
  await r2().send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
  return publicUrl ? `${publicUrl}/${key.split('/').map(encodeURIComponent).join('/')}` : key;
}

export async function downloadFromR2(key: string) {
  return r2().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
}

export async function deleteFromR2(key: string) {
  await r2().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export async function listR2(prefix = '') {
  const result = await r2().send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix }));
  return result.Contents ?? [];
}

export async function pingR2() {
  await r2().send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 1 }));
}
