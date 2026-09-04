import type { RowStatus } from "@/lib/local-sheet";

const STYLE: Record<RowStatus, string> = {
  new: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  edited: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  synced: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
};

const LABEL: Record<RowStatus, string> = {
  new: "New",
  edited: "Edited",
  synced: "Synced",
};

export default function RowStatusBadge({ status }: { status: RowStatus }) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap ${STYLE[status]}`}
    >
      {LABEL[status]}
    </span>
  );
}
