import { Fragment } from "react";
import { rowsCollection } from "@/lib/mongodb";
import {
  CRITERIA,
  QUESTIONS,
  questionLabel,
  type QuestionScore,
} from "@/lib/schema";

export const metadata = { title: "Combined list · Placement Drive" };
export const dynamic = "force-dynamic";

type Loaded =
  | { ok: true; rows: CombinedRow[] }
  | { ok: false; message: string };

type CombinedRow = {
  id: string;
  name: string;
  set: string;
  questions: QuestionScore[];
  syncedAt: string;
};

async function loadRows(): Promise<Loaded> {
  try {
    const collection = await rowsCollection();
    const docs = await collection
      .find({}, { sort: { name: 1 } })
      .toArray();

    return {
      ok: true,
      rows: docs.map((doc) => ({
        id: doc._id,
        name: doc.name,
        set: doc.set,
        questions: doc.questions,
        syncedAt: doc.syncedAt.toISOString(),
      })),
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not reach MongoDB",
    };
  }
}

export default async function CombinedPage() {
  const loaded = await loadRows();

  if (!loaded.ok) {
    return (
      <div className="p-6">
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Could not load the combined list: {loaded.message}
        </p>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Check that <code className="font-mono">MONGODB_URI</code> is set and the
          database is reachable.
        </p>
      </div>
    );
  }

  const { rows } = loaded;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h1 className="text-sm font-semibold">Combined list</h1>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          {rows.length} student{rows.length === 1 ? "" : "s"} synced
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="p-6 text-sm text-zinc-500 dark:text-zinc-400">
          Nothing synced yet. Fill in your sheet and press{" "}
          <span className="font-medium">Sync to combined list</span>.
        </p>
      ) : (
        <div className="flex-1 overflow-auto">
          <table className="border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-zinc-50 dark:bg-zinc-900">
              <tr>
                <th
                  rowSpan={2}
                  className="sticky left-0 z-20 border border-zinc-200 bg-zinc-50 px-3 py-2 text-left font-semibold dark:border-zinc-800 dark:bg-zinc-900"
                >
                  Name
                </th>
                <th
                  rowSpan={2}
                  className="border border-zinc-200 px-2 py-2 font-semibold dark:border-zinc-800"
                >
                  Set
                </th>
                {QUESTIONS.map((question) => (
                  <th
                    key={question}
                    colSpan={CRITERIA.length + 1}
                    className="border border-zinc-200 px-2 py-2 text-center font-semibold dark:border-zinc-800"
                  >
                    {questionLabel(question)}
                  </th>
                ))}
                <th
                  rowSpan={2}
                  className="border border-zinc-200 px-2 py-2 font-semibold dark:border-zinc-800"
                >
                  Last synced
                </th>
              </tr>
              <tr>
                {QUESTIONS.map((question) => (
                  <Fragment key={question}>
                    {CRITERIA.map(({ key, label }) => (
                      <th
                        key={key}
                        className="border border-zinc-200 px-2 py-1.5 text-xs font-medium text-zinc-600 dark:border-zinc-800 dark:text-zinc-400"
                      >
                        {label}
                      </th>
                    ))}
                    <th className="border border-zinc-200 px-2 py-1.5 text-xs font-medium text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
                      Remark
                    </th>
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="even:bg-zinc-50/60 dark:even:bg-zinc-900/40">
                  <td className="sticky left-0 z-10 border border-zinc-200 bg-white px-3 py-1.5 font-medium dark:border-zinc-800 dark:bg-zinc-950">
                    {row.name}
                  </td>
                  <td className="border border-zinc-200 px-2 py-1.5 text-center dark:border-zinc-800">
                    {row.set || "–"}
                  </td>
                  {QUESTIONS.map((question) => (
                    <Fragment key={question}>
                      {CRITERIA.map(({ key }) => (
                        <td
                          key={key}
                          className="border border-zinc-200 px-2 py-1.5 text-center font-mono dark:border-zinc-800"
                        >
                          {row.questions[question]?.[key] || "–"}
                        </td>
                      ))}
                      <td className="max-w-56 border border-zinc-200 px-2 py-1.5 dark:border-zinc-800">
                        {row.questions[question]?.remark || (
                          <span className="text-zinc-400">–</span>
                        )}
                      </td>
                    </Fragment>
                  ))}
                  <td className="whitespace-nowrap border border-zinc-200 px-2 py-1.5 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                    {new Date(row.syncedAt).toLocaleString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
