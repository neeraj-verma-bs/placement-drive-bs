# Placement Drive — subjective round evaluation sheet

Evaluators score students on the subjective round: 3 paper sets (**A**, **B**,
**C**), 3 questions per set, one set per student. Q1 carries 6 marks, Q2 and Q3
carry 7 marks each. Each question is graded **A–E** on Logic, Explanation, Time
Complexity and Space Complexity, plus a free-text Remark.

## Screens

| Route       | What it is                                                                                    |
| ----------- | --------------------------------------------------------------------------------------------- |
| `/`         | **My sheet** — the evaluator's own spreadsheet. Lives in `localStorage`, never auto-uploaded.  |
| `/combined` | **Combined list** — everything every evaluator has synced, read from MongoDB. Downloadable as `.xlsx`. |
| `/login`    | The single password gate.                                                                     |

The individual sheet reaches the server *only* when **Sync to combined list** is
pressed. Rows show a status badge — `New`, `Edited` or `Synced` — so it is clear
what a sync will actually push.

## Idempotent sync

Every row carries a client-generated UUID, assigned when the row is added. On
sync the server hashes each row's content (`lib/schema.ts` → `rowContent`) and
compares it against the stored `contentHash`:

- id not in the database → **insert**
- id present, hash differs → **update**
- id present, hash identical → **skipped, not written** (`syncedAt` unchanged)

So re-syncing an unchanged sheet is a no-op, and syncing twice never duplicates a
student. Rows without a name are treated as unfilled drafts and are not synced.
Removing a row locally does not delete it from the combined list — sync only adds
and updates.

The response reports what happened: `{ added, updated, unchanged, skipped }`.

## Auth

One shared password for the whole app, from `APP_PASSWORD` — there are no
individual accounts. A correct password sets an HMAC-signed, `httpOnly` session
cookie (12h) that `proxy.ts` verifies at the edge for every route except the
login page and the login endpoint; unauthenticated API calls get a `401`, page
requests are redirected to `/login`.

## Setup

```bash
cp .env.example .env.local   # then fill in the values
npm install
npm run dev
```

Required environment variables:

| Variable         | Purpose                                                       |
| ---------------- | ------------------------------------------------------------- |
| `APP_PASSWORD`   | The single shared password.                                   |
| `SESSION_SECRET` | Signs the session cookie. `openssl rand -base64 32`.          |
| `MONGODB_URI`    | Connection string.                                            |
| `MONGODB_DB`     | Database name (defaults to `placement_drive`).                |

Synced rows land in the `student_rows` collection, `_id` being the row's UUID.

## Layout

```
app/
  page.tsx              individual sheet (renders components/sheet-editor)
  combined/page.tsx     combined list, read from MongoDB
  login/                the gate
  api/sync/route.ts     idempotent upsert
  api/rows/route.ts     combined list as JSON
  api/rows/export/…     combined list as an .xlsx download
  api/auth/…            login / logout
components/
  sheet-editor.tsx      the localStorage-backed spreadsheet
  grade-select.tsx      A–E picker
  site-header.tsx       nav + sign out
lib/
  schema.ts             grades, sets, criteria, row parsing, content digest
  auth.ts               password check + signed session token
  mongodb.ts            connection, StoredRow shape
  local-sheet.ts        localStorage read/write, row status
proxy.ts                the auth gate
```
