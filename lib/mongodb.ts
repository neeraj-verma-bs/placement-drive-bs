import { MongoClient, type Collection, type Db } from "mongodb";
import type { StudentRow } from "@/lib/schema";

/** A synced row as stored in MongoDB. `_id` is the client-generated row id. */
export type StoredRow = Omit<StudentRow, "id"> & {
  _id: string;
  /** Digest of the row content at the time it was last written. */
  contentHash: string;
  syncedAt: Date;
  createdAt: Date;
};

const COLLECTION = "student_rows";

declare global {
  // Reuse one client across dev hot-reloads instead of leaking connections.
  var _pdMongoClient: Promise<MongoClient> | undefined;
}

function clientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Missing required environment variable MONGODB_URI");

  if (!global._pdMongoClient) {
    global._pdMongoClient = new MongoClient(uri).connect();
  }
  return global._pdMongoClient;
}

export async function getDb(): Promise<Db> {
  const client = await clientPromise();
  return client.db(process.env.MONGODB_DB || "placement_drive");
}

export async function rowsCollection(): Promise<Collection<StoredRow>> {
  const db = await getDb();
  return db.collection<StoredRow>(COLLECTION);
}
