import { MongoClient, type Db } from "mongodb";
import { config } from "./config";

type MongoGlobal = typeof globalThis & {
  __stillpointMongo?: Promise<MongoClient>;
  __stillpointIndexes?: Promise<void>;
};

const globalForMongo = globalThis as MongoGlobal;

export function hasMongo(): boolean {
  return config.mongodbUri.length > 0;
}

/** Shared client promise — also used by the Auth.js MongoDB adapter. */
export function getMongoClientPromise(): Promise<MongoClient> {
  if (!hasMongo()) {
    return Promise.reject(new Error("MONGODB_URI is not configured"));
  }
  if (!globalForMongo.__stillpointMongo) {
    const client = new MongoClient(config.mongodbUri, {
      appName: "stillpoint",
      maxPoolSize: 10,
      retryWrites: true,
      serverSelectionTimeoutMS: 8000,
    });
    globalForMongo.__stillpointMongo = client.connect().catch((error: unknown) => {
      globalForMongo.__stillpointMongo = undefined;
      throw error;
    });
  }
  return globalForMongo.__stillpointMongo;
}

async function ensureIndexes(db: Db): Promise<void> {
  if (!globalForMongo.__stillpointIndexes) {
    globalForMongo.__stillpointIndexes = (async () => {
      await Promise.all([
        db.collection("users").createIndex({ email: 1 }, { unique: true, sparse: true }),
        db.collection("ai_sessions").createIndex({ userId: 1, createdAt: -1 }),
        db.collection("ai_sessions").createIndex({ userId: 1, kind: 1, createdAt: -1 }),
        db.collection("mood_logs").createIndex({ userId: 1, createdAt: -1 }),
        db.collection("journal_entries").createIndex({ userId: 1, createdAt: -1 }),
        db.collection("subscriptions").createIndex({ userId: 1 }, { unique: true }),
        db.collection("subscriptions").createIndex({ stripeSubscriptionId: 1 }, { sparse: true }),
        db.collection("spend_ledger").createIndex({ day: 1, scope: 1 }, { unique: true }),
      ]);
    })().catch((error: unknown) => {
      globalForMongo.__stillpointIndexes = undefined;
      throw error;
    });
  }
  await globalForMongo.__stillpointIndexes;
}

export async function getDb(): Promise<Db> {
  const client = await getMongoClientPromise();
  const db = client.db(config.mongodbDb);
  await ensureIndexes(db);
  return db;
}