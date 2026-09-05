/** Domain model for the subjective-round evaluation sheet. */

export const GRADES = ["A", "B", "C", "D", "E"] as const;
export type Grade = (typeof GRADES)[number];

export const SETS = ["A", "B", "C"] as const;
export type SetId = (typeof SETS)[number];

/** The four graded criteria, in column order, plus the free-text remark. */
export const CRITERIA = [
  { key: "logic", label: "Logic" },
  { key: "explanation", label: "Explanation" },
  { key: "time", label: "Time Complexity" },
  { key: "space", label: "Space Complexity" },
] as const;

export type CriterionKey = (typeof CRITERIA)[number]["key"];

/** Each paper has exactly 3 questions. */
export const QUESTION_COUNT = 3;
export const QUESTIONS = [0, 1, 2] as const;

/** Marks each question carries, by index. */
export const QUESTION_MARKS = [6, 7, 7] as const;

/** e.g. `Q1 (6 marks)` — the heading used everywhere a question is labelled. */
export function questionLabel(question: number): string {
  return `Q${question + 1} (${QUESTION_MARKS[question]} marks)`;
}

export type QuestionScore = Record<CriterionKey, Grade | ""> & {
  remark: string;
};

export type StudentRow = {
  /** Client-generated, stable across syncs — the idempotency key. */
  id: string;
  name: string;
  set: SetId | "";
  questions: QuestionScore[];
  /** ISO timestamp of the last local edit. */
  updatedAt: string;
};

export function emptyQuestionScore(): QuestionScore {
  return { logic: "", explanation: "", time: "", space: "", remark: "" };
}

export function emptyRow(id: string): StudentRow {
  return {
    id,
    name: "",
    set: "",
    questions: Array.from({ length: QUESTION_COUNT }, emptyQuestionScore),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Canonical, order-independent serialisation of a row's *content* (everything
 * but `id` and `updatedAt`). Two rows with the same digest are equal as far as
 * syncing is concerned, so the server can skip writing them.
 */
export function rowContent(row: StudentRow): string {
  return JSON.stringify([
    row.name.trim(),
    row.set,
    row.questions.map((q) => [
      q.logic,
      q.explanation,
      q.time,
      q.space,
      q.remark.trim(),
    ]),
  ]);
}

export function isGrade(value: unknown): value is Grade {
  return typeof value === "string" && (GRADES as readonly string[]).includes(value);
}

export function isSetId(value: unknown): value is SetId {
  return typeof value === "string" && (SETS as readonly string[]).includes(value);
}

/** Narrow untrusted JSON (localStorage or request body) into a StudentRow. */
export function parseRow(input: unknown): StudentRow | null {
  if (typeof input !== "object" || input === null) return null;
  const raw = input as Record<string, unknown>;
  if (typeof raw.id !== "string" || raw.id.length === 0) return null;

  const questionsRaw = Array.isArray(raw.questions) ? raw.questions : [];
  const questions = Array.from({ length: QUESTION_COUNT }, (_, i) => {
    const q = (questionsRaw[i] ?? {}) as Record<string, unknown>;
    const score = emptyQuestionScore();
    for (const { key } of CRITERIA) {
      if (isGrade(q[key])) score[key] = q[key] as Grade;
    }
    if (typeof q.remark === "string") score.remark = q.remark.slice(0, 2000);
    return score;
  });

  return {
    id: raw.id,
    name: typeof raw.name === "string" ? raw.name.slice(0, 200) : "",
    set: isSetId(raw.set) ? raw.set : "",
    questions,
    updatedAt:
      typeof raw.updatedAt === "string" && !Number.isNaN(Date.parse(raw.updatedAt))
        ? raw.updatedAt
        : new Date().toISOString(),
  };
}
