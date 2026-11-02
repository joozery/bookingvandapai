import { MongoClient, type Db } from 'mongodb';

const dbName = process.env.MONGODB_DB || 'dapai';

declare global {
  // eslint-disable-next-line no-var
  var __dapaiMongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient> | undefined = globalThis.__dapaiMongoClientPromise;

/**
 * Connects on first use (not at import), so `next build` does not need the
 * database URL. The connection is reused across requests and dev reloads.
 */
function connect(): Promise<MongoClient> {
  if (clientPromise) return clientPromise;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not configured');
  // Keep a slow/unreachable database from holding the first page request open
  // for the driver's default connection timeout. These limits only affect how
  // quickly a failed connection is reported; they do not change query results.
  const mongoClient = new MongoClient(uri, {
    connectTimeoutMS: 5000,
    serverSelectionTimeoutMS: 5000,
    waitQueueTimeoutMS: 5000,
    // The database is remote, so transfer size dominates large reads (e.g. the
    // admin's full bookings/vans lists). zlib compression roughly halves it.
    compressors: ['zlib'],
  });
  clientPromise = mongoClient.connect().catch(error => {
    // Allow a later request to retry instead of caching the failure forever.
    clientPromise = undefined;
    globalThis.__dapaiMongoClientPromise = undefined;
    throw error;
  });
  if (process.env.NODE_ENV !== 'production') globalThis.__dapaiMongoClientPromise = clientPromise;
  return clientPromise;
}

export async function getMongoDb(): Promise<Db> {
  return (await connect()).db(dbName);
}

export async function pingMongo(): Promise<void> {
  await (await getMongoDb()).command({ ping: 1 });
}
