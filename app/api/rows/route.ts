import { rowsCollection } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

/** The combined list, most recently synced first. */
export async function GET() {
  const collection = await rowsCollection();
  const docs = await collection.find({}).sort({ syncedAt: -1 }).toArray();

  return Response.json({
    rows: docs.map((doc) => ({
      id: doc._id,
      name: doc.name,
      rollNo: doc.rollNo,
      set: doc.set,
      questions: doc.questions,
      updatedAt: doc.updatedAt,
      syncedAt: doc.syncedAt.toISOString(),
      createdAt: doc.createdAt?.toISOString() ?? null,
    })),
  });
}
