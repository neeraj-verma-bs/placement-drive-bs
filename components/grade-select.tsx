"use client";

import { GRADES, type Grade } from "@/lib/schema";

type Props = {
  value: Grade | "";
  onChange: (value: Grade | "") => void;
  label: string;
};

/** A-E grade picker; blank means "not yet graded". */
export default function GradeSelect({ value, onChange, label }: Props) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value as Grade | "")}
      className={`w-14 rounded border px-1.5 py-1 text-sm tabular-nums outline-none focus:border-zinc-900 dark:focus:border-zinc-300 ${
        value
          ? "border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-950"
          : "border-dashed border-zinc-300 bg-zinc-50 text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900"
      }`}
    >
      <option value="">–</option>
      {GRADES.map((grade) => (
        <option key={grade} value={grade}>
          {grade}
        </option>
      ))}
    </select>
  );
}
