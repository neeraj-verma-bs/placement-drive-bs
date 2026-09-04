"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import GradeSelect from "@/components/grade-select";
import ConfirmDialog from "@/components/confirm-dialog";
import { TrashIcon } from "@/components/icons";
import RowStatusBadge from "@/components/row-status-badge";
import StudentCard from "@/components/student-card";
import {
  loadRows,
  loadSynced,
  rowStatus,
  saveRows,
  saveSynced,
  snapshotOf,
  type SyncedSnapshot,
} from "@/lib/local-sheet";
import { useMediaQuery } from "@/lib/use-media-query";
import {
  CRITERIA,
  QUESTIONS,
  SETS,
  emptyRow,
  type CriterionKey,
  type Grade,
  type SetId,
  type StudentRow,
} from "@/lib/schema";

type SyncOutcome = {
  added: number;
  updated: number;
  unchanged: number;
  skipped: number;
};

const subscribeNever = () => () => {};

/**
 * The sheet lives in localStorage, which the server cannot read. Gate the
 * editor on being mounted so its state can be seeded from storage directly
 * rather than patched in after the first render.
 */
export default function SheetEditor() {
  const mounted = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );

  if (!mounted) {
    return (
      <p className="p-6 text-sm text-zinc-500 dark:text-zinc-400">
        Loading sheet…
      </p>
    );
  }
  return <Sheet />;
}

function Sheet() {
  // The 15-cell table row cannot fit a phone; below `md` each student
  // becomes a card instead. Rendered as a branch, not two hidden copies,
  // so the sheet has only one set of form controls.
  const isWideViewport = useMediaQuery("(min-width: 768px)");
  const [rows, setRows] = useState<StudentRow[]>(loadRows);
  const [synced, setSynced] = useState<SyncedSnapshot>(loadSynced);
  const [syncing, setSyncing] = useState(false);
  const [outcome, setOutcome] = useState<SyncOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<StudentRow | null>(null);

  useEffect(() => {
    saveRows(rows);
  }, [rows]);

  const mutateRow = useCallback(
    (id: string, change: (row: StudentRow) => StudentRow) => {
      setOutcome(null);
      setRows((current) =>
        current.map((row) =>
          row.id === id
            ? { ...change(row), updatedAt: new Date().toISOString() }
            : row,
        ),
      );
    },
    [],
  );

  const setQuestionGrade = useCallback(
    (
      id: string,
      question: number,
      criterion: CriterionKey,
      value: Grade | "",
    ) => {
      mutateRow(id, (row) => ({
        ...row,
        questions: row.questions.map((score, index) =>
          index === question ? { ...score, [criterion]: value } : score,
        ),
      }));
    },
    [mutateRow],
  );

  const setQuestionRemark = useCallback(
    (id: string, question: number, value: string) => {
      mutateRow(id, (row) => ({
        ...row,
        questions: row.questions.map((score, index) =>
          index === question ? { ...score, remark: value } : score,
        ),
      }));
    },
    [mutateRow],
  );

  function addRow() {
    setOutcome(null);
    setRows((current) => [...current, emptyRow(crypto.randomUUID())]);
  }

  function deleteRow(id: string) {
    setOutcome(null);
    setRows((current) => current.filter((row) => row.id !== id));
    setPendingDelete(null);
  }

  const statuses = useMemo(
    () => new Map(rows.map((row) => [row.id, rowStatus(row, synced)])),
    [rows, synced],
  );

  const pending = useMemo(
    () =>
      rows.filter(
        (row) => statuses.get(row.id) !== "synced" && row.name.trim(),
      ),
    [rows, statuses],
  );

  const unnamed = rows.filter((row) => !row.name.trim()).length;

  async function sync() {
    setSyncing(true);
    setError(null);
    setOutcome(null);

    try {
      const response = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.error ?? `Sync failed (${response.status})`);
        return;
      }

      const result = (await response.json()) as SyncOutcome;
      setOutcome(result);

      // Only rows that actually reached the server count as synced.
      const next = snapshotOf(rows.filter((row) => row.name.trim()));
      setSynced(next);
      saveSynced(next);
    } catch {
      setError("Network error — nothing was synced");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <button
          type="button"
          onClick={addRow}
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Add student
        </button>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          {rows.length} row{rows.length === 1 ? "" : "s"} · saved locally
        </span>

        {outcome && (
          <span className="text-sm text-green-700 dark:text-green-400">
            {outcome.added} added, {outcome.updated} updated,{" "}
            {outcome.unchanged} unchanged
            {outcome.skipped > 0 && `, ${outcome.skipped} skipped`}
          </span>
        )}
        {error && (
          <span role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </span>
        )}
        {unnamed > 0 && (
          <span className="text-sm text-amber-700 dark:text-amber-400">
            {unnamed} row{unnamed === 1 ? "" : "s"} without a name won&apos;t
            sync
          </span>
        )}

        <button
          type="button"
          onClick={sync}
          disabled={syncing || pending.length === 0}
          className="ml-auto rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium disabled:opacity-50 dark:border-zinc-700"
        >
          {syncing
            ? "Syncing…"
            : `Sync to combined list${pending.length ? ` (${pending.length})` : ""}`}
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {isWideViewport ? (
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
                    Q{question + 1}
                  </th>
                ))}
                <th
                  rowSpan={2}
                  className="border border-zinc-200 px-2 py-2 font-semibold dark:border-zinc-800"
                >
                  Status
                </th>
                <th
                  rowSpan={2}
                  className="border border-zinc-200 px-2 py-2 font-semibold dark:border-zinc-800"
                >
                  <span className="sr-only">Actions</span>
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
              {rows.map((row) => {
                const status = statuses.get(row.id) ?? "new";
                return (
                  <tr
                    key={row.id}
                    className="even:bg-zinc-50/60 dark:even:bg-zinc-900/40"
                  >
                    <td className="sticky left-0 z-10 border border-zinc-200 bg-white px-2 py-1 dark:border-zinc-800 dark:bg-zinc-950">
                      <input
                        aria-label="Student name"
                        value={row.name}
                        onChange={(event) =>
                          mutateRow(row.id, (current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                        placeholder="Student name"
                        className="w-44 rounded border border-zinc-300 bg-white px-2 py-1 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-300"
                      />
                    </td>
                    <td className="border border-zinc-200 px-2 py-1 dark:border-zinc-800">
                      <select
                        aria-label="Paper set"
                        value={row.set}
                        onChange={(event) =>
                          mutateRow(row.id, (current) => ({
                            ...current,
                            set: event.target.value as SetId | "",
                          }))
                        }
                        className="w-14 rounded border border-zinc-300 bg-white px-1.5 py-1 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-300"
                      >
                        <option value="">–</option>
                        {SETS.map((set) => (
                          <option key={set} value={set}>
                            {set}
                          </option>
                        ))}
                      </select>
                    </td>

                    {QUESTIONS.map((question) => (
                      <Fragment key={question}>
                        {CRITERIA.map(({ key, label }) => (
                          <td
                            key={key}
                            className="border border-zinc-200 px-2 py-1 text-center dark:border-zinc-800"
                          >
                            <GradeSelect
                              label={`Q${question + 1} ${label} for ${row.name || "unnamed student"}`}
                              value={row.questions[question][key]}
                              onChange={(value) =>
                                setQuestionGrade(row.id, question, key, value)
                              }
                            />
                          </td>
                        ))}
                        <td className="border border-zinc-200 px-2 py-1 dark:border-zinc-800">
                          <input
                            aria-label={`Q${question + 1} remark for ${row.name || "unnamed student"}`}
                            value={row.questions[question].remark}
                            onChange={(event) =>
                              setQuestionRemark(
                                row.id,
                                question,
                                event.target.value,
                              )
                            }
                            placeholder="Remark"
                            className="w-40 rounded border border-zinc-300 bg-white px-2 py-1 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-300"
                          />
                        </td>
                      </Fragment>
                    ))}

                    <td className="border border-zinc-200 px-2 py-1 text-center dark:border-zinc-800">
                      <RowStatusBadge status={status} />
                    </td>
                    <td className="border border-zinc-200 px-2 py-1 text-center dark:border-zinc-800">
                      <button
                        type="button"
                        onClick={() => setPendingDelete(row)}
                        aria-label={`Remove ${row.name || "this student"} from the local sheet`}
                        title="Remove this row from the local sheet"
                        className="rounded p-1.5 text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-red-950 dark:hover:text-red-400"
                      >
                        <TrashIcon className="size-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="flex flex-col gap-3 p-3">
            {rows.map((row) => (
              <StudentCard
                key={row.id}
                row={row}
                status={statuses.get(row.id) ?? "new"}
                onNameChange={(value) =>
                  mutateRow(row.id, (current) => ({ ...current, name: value }))
                }
                onSetChange={(value) =>
                  mutateRow(row.id, (current) => ({ ...current, set: value }))
                }
                onGradeChange={(question, criterion, value) =>
                  setQuestionGrade(row.id, question, criterion, value)
                }
                onRemarkChange={(question, value) =>
                  setQuestionRemark(row.id, question, value)
                }
                onRemove={() => setPendingDelete(row)}
              />
            ))}
          </div>
        )}

        {rows.length === 0 && (
          <p className="p-6 text-sm text-zinc-500 dark:text-zinc-400">
            No students yet — add the first one to start evaluating.
          </p>
        )}
      </div>

      {pendingDelete && (
        <ConfirmDialog
          title="Remove this student?"
          description={`${
            pendingDelete.name.trim() || "This unnamed row"
          } will be removed from your local sheet. Anything already synced stays in the combined list.`}
          confirmLabel="Remove"
          onConfirm={() => deleteRow(pendingDelete.id)}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
