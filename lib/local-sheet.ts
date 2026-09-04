"use client";

import { parseRow, rowContent, type StudentRow } from "@/lib/schema";

const ROWS_KEY = "pd.sheet.rows.v1";
const SYNCED_KEY = "pd.sheet.synced.v1";

/** Content digests, per row id, as of the last successful sync. */
export type SyncedSnapshot = Record<string, string>;

export function loadRows(): StudentRow[] {
  try {
    const raw = window.localStorage.getItem(ROWS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(parseRow).filter((row): row is StudentRow => row !== null);
  } catch {
    return [];
  }
}

export function saveRows(rows: StudentRow[]): void {
  try {
    window.localStorage.setItem(ROWS_KEY, JSON.stringify(rows));
  } catch {
    // Quota or private-mode failure; the in-memory sheet still works.
  }
}

export function loadSynced(): SyncedSnapshot {
  try {
    const raw = window.localStorage.getItem(SYNCED_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (typeof parsed !== "object" || parsed === null) return {};
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).filter(
        ([, value]) => typeof value === "string",
      ),
    ) as SyncedSnapshot;
  } catch {
    return {};
  }
}

export function saveSynced(snapshot: SyncedSnapshot): void {
  try {
    window.localStorage.setItem(SYNCED_KEY, JSON.stringify(snapshot));
  } catch {
    // Non-fatal: rows will simply re-sync as "changed" next time.
  }
}

export type RowStatus = "new" | "edited" | "synced";

export function rowStatus(row: StudentRow, snapshot: SyncedSnapshot): RowStatus {
  const synced = snapshot[row.id];
  if (synced === undefined) return "new";
  return synced === rowContent(row) ? "synced" : "edited";
}

export function snapshotOf(rows: StudentRow[]): SyncedSnapshot {
  return Object.fromEntries(rows.map((row) => [row.id, rowContent(row)]));
}
