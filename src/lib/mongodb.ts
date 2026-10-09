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

// Keep a slow/unreachable database from holding the first page request open
// for the driver's default connection timeout. These limits only affect how
// quickly a failed connection is reported; they do not change query results.
const mongoClient = new MongoClient(uri, {
  connectTimeoutMS: 5000,
  serverSelectionTimeoutMS: 5000,
  waitQueueTimeoutMS: 5000,
});
const clientPromise = globalThis.__dapaiMongoClientPromise ?? mongoClient.connect();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__dapaiMongoClientPromise = clientPromise;
}

export async function getMongoDb(): Promise<Db> {
  return (await clientPromise).db(dbName);
}

export async function pingMongo(): Promise<void> {
  await (await getMongoDb()).command({ ping: 1 });
}
