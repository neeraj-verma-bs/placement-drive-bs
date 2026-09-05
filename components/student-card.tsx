"use client";

import { useState } from "react";
import GradeSelect from "@/components/grade-select";
import RowStatusBadge from "@/components/row-status-badge";
import { ChevronIcon, TrashIcon } from "@/components/icons";
import type { RowStatus } from "@/lib/local-sheet";
import {
  CRITERIA,
  QUESTIONS,
  SETS,
  questionLabel,
  type CriterionKey,
  type Grade,
  type QuestionScore,
  type SetId,
  type StudentRow,
} from "@/lib/schema";

type Props = {
  row: StudentRow;
  status: RowStatus;
  onNameChange: (value: string) => void;
  onRollNoChange: (value: string) => void;
  onSetChange: (value: SetId | "") => void;
  onGradeChange: (
    question: number,
    criterion: CriterionKey,
    value: Grade | "",
  ) => void;
  onRemarkChange: (question: number, value: string) => void;
  onRemove: () => void;
};

/** Short "A/B/–/C" digest of a question, shown on a collapsed section. */
function gradeSummary(score: QuestionScore): string {
  return CRITERIA.map(({ key }) => score[key] || "–").join("/");
}

function isStarted(score: QuestionScore): boolean {
  return CRITERIA.some(({ key }) => score[key] !== "") || score.remark !== "";
}

/** How many of the 12 grade cells across all three questions are filled. */
function gradedCount(row: StudentRow): number {
  return row.questions.reduce(
    (total, score) =>
      total + CRITERIA.filter(({ key }) => score[key] !== "").length,
    0,
  );
}

const TOTAL_CELLS = QUESTIONS.length * CRITERIA.length;

/**
 * The phone layout for one student: the 15 grade cells of a table row are far
 * too wide for a small screen, so each question becomes its own section and
 * only one is expanded at a time.
 */
export default function StudentCard({
  row,
  status,
  onNameChange,
  onRollNoChange,
  onSetChange,
  onGradeChange,
  onRemarkChange,
  onRemove,
}: Props) {
  const [open, setOpen] = useState(true);
  const [openQuestion, setOpenQuestion] = useState(0);

  return (
    <article className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <header className="flex items-center gap-2 p-3">
        <button
          type="button"
          aria-expanded={open}
          aria-label={`${open ? "Collapse" : "Expand"} ${row.name || "this student"}`}
          onClick={() => setOpen((current) => !current)}
          className="shrink-0 rounded p-1 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          <ChevronIcon
            className={`size-4 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
        <input
          aria-label="Student name"
          value={row.name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="Student name"
          className="min-w-0 flex-1 rounded border border-zinc-300 bg-white px-2 py-1.5 text-base outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-300"
        />
        <RowStatusBadge status={status} />
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${row.name || "this student"} from the local sheet`}
          className="shrink-0 rounded p-1.5 text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-red-950 dark:hover:text-red-400"
        >
          <TrashIcon className="size-4" />
        </button>
      </header>

      {!open && (
        <p className="border-t border-zinc-200 px-3 py-2 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          {row.rollNo.trim() && `${row.rollNo.trim()} · `}Set{" "}
          {row.set || "–"} · {gradedCount(row)}/{TOTAL_CELLS} graded
        </p>
      )}

      {open && (
        <>
          <div className="flex items-end gap-2 border-t border-zinc-200 px-3 py-2 dark:border-zinc-800">
            <label
              htmlFor={`roll-${row.id}`}
              className="flex flex-1 flex-col gap-1"
            >
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Roll No
              </span>
              <input
                id={`roll-${row.id}`}
                value={row.rollNo}
                onChange={(event) => onRollNoChange(event.target.value)}
                placeholder="Roll no"
                className="w-full rounded border border-zinc-300 bg-white px-2 py-1.5 text-base outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-300"
              />
            </label>
            <label
              htmlFor={`set-${row.id}`}
              className="flex w-24 flex-col gap-1"
            >
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Set
              </span>
              <select
                id={`set-${row.id}`}
                value={row.set}
                onChange={(event) =>
                  onSetChange(event.target.value as SetId | "")
                }
                className="w-full rounded border border-zinc-300 bg-white px-2 py-1.5 text-base outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-300"
              >
                <option value="">–</option>
                {SETS.map((set) => (
                  <option key={set} value={set}>
                    {set}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {QUESTIONS.map((question) => {
            const score = row.questions[question];
            const expanded = openQuestion === question;

            return (
              <section
                key={question}
                className="border-b border-zinc-200 last:border-b-0 dark:border-zinc-800"
              >
                <h3>
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => setOpenQuestion(expanded ? -1 : question)}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-900"
                  >
                    <span>{questionLabel(question)}</span>
                    {!expanded && (
                      <span
                        className={`font-mono text-xs font-normal ${
                          isStarted(score)
                            ? "text-zinc-500 dark:text-zinc-400"
                            : "text-zinc-400 dark:text-zinc-600"
                        }`}
                      >
                        {gradeSummary(score)}
                      </span>
                    )}
                    <ChevronIcon
                      className={`ml-auto size-4 shrink-0 text-zinc-400 transition-transform dark:text-zinc-500 ${
                        expanded ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </h3>

                {expanded && (
                  <div className="px-3 pb-3">
                    <div className="grid grid-cols-2 gap-2">
                      {CRITERIA.map(({ key, label }) => (
                        <label key={key} className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            {label}
                          </span>
                          <GradeSelect
                            className="w-full"
                            label={`Q${question + 1} ${label} for ${row.name || "unnamed student"}`}
                            value={score[key]}
                            onChange={(value) =>
                              onGradeChange(question, key, value)
                            }
                          />
                        </label>
                      ))}
                    </div>

                    <label className="mt-3 flex flex-col gap-1">
                      <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                        Remark
                      </span>
                      <textarea
                        rows={2}
                        value={score.remark}
                        onChange={(event) =>
                          onRemarkChange(question, event.target.value)
                        }
                        placeholder="Remark"
                        className="w-full rounded border border-zinc-300 bg-white px-2 py-1.5 text-base outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-300"
                      />
                    </label>
                  </div>
                )}
              </section>
            );
          })}
        </>
      )}
    </article>
  );
}
