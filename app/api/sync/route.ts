import { type AnyBulkWriteOperation } from "mongodb";
import { rowsCollection, type StoredRow } from "@/lib/mongodb";
import { digest } from "@/lib/hash";
import { parseRow, rowContent, type StudentRow } from "@/lib/schema";

export const dynamic = "force-dynamic";

type SyncResult = {
  added: number;
  updated: number;
  unchanged: number;
  skipped: number;
  syncedAt: string;
};

/**
 * Idempotent sync. Rows are keyed by their client-generated id, so re-sending
 * the same sheet is a no-op: an unseen id is inserted, a known id is written
 * only when its content digest differs from what is already stored.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const incoming = (body as { rows?: unknown })?.rows;
  if (!Array.isArray(incoming)) {
    return Response.json({ error: "Expected { rows: [...] }" }, { status: 400 });
  }

  // Drop malformed rows and those without a name — an unnamed row is a blank
  // draft the evaluator has not filled in yet.
  const rows: StudentRow[] = [];
  let skipped = 0;
  for (const candidate of incoming) {
    const row = parseRow(candidate);
    if (row && row.name.trim()) rows.push(row);
    else skipped++;
  }

  // Last occurrence of a duplicated id wins, so the map is unambiguous.
  const byId = new Map(rows.map((row) => [row.id, row]));

  const collection = await rowsCollection();
  const existing = await collection
    .find({ _id: { $in: [...byId.keys()] } }, { projection: { contentHash: 1 } })
    .toArray();
  const existingHashes = new Map(existing.map((doc) => [doc._id, doc.contentHash]));

  const now = new Date();
  const operations: AnyBulkWriteOperation<StoredRow>[] = [];
  const result: SyncResult = {
    added: 0,
    updated: 0,
    unchanged: 0,
    skipped,
    syncedAt: now.toISOString(),
  };

  for (const row of byId.values()) {
    const contentHash = await digest(rowContent(row));
    const stored = existingHashes.get(row.id);

    if (stored === contentHash) {
      result.unchanged++;
      continue;
    }
    if (stored === undefined) result.added++;
    else result.updated++;

    operations.push({
      updateOne: {
        filter: { _id: row.id },
        update: {
          $set: {
            name: row.name.trim(),
            rollNo: row.rollNo.trim(),
            set: row.set,
            questions: row.questions,
            updatedAt: row.updatedAt,
            contentHash,
            syncedAt: now,
          },
          $setOnInsert: { createdAt: now },
        },
        upsert: true,
      },
    });
  }

  if (operations.length > 0) {
    await collection.bulkWrite(operations, { ordered: false });
  }

  return Response.json(result);
}
