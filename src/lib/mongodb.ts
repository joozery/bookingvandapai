import { MongoClient, type Db } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'dapai';

if (!uri) {
  throw new Error('MONGODB_URI is not configured');
}

declare global {
  // eslint-disable-next-line no-var
  var __dapaiMongoClientPromise: Promise<MongoClient> | undefined;
}

const clientPromise = globalThis.__dapaiMongoClientPromise ?? new MongoClient(uri).connect();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__dapaiMongoClientPromise = clientPromise;
}

export async function getMongoDb(): Promise<Db> {
  return (await clientPromise).db(dbName);
}

export async function pingMongo(): Promise<void> {
  await (await getMongoDb()).command({ ping: 1 });
}
