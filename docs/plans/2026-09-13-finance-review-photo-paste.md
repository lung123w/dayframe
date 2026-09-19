# Finance Review — 貼相 (Paste Photo) Feature — Exploration & Decision Doc

Task: t_7c943b9b (also t_31adc73d — duplicate card, same request) · Repo: C:\git\project_mgmt_tool (DayFrame) · Date: 2026-09-13
Status: exploration only — no code written. Awaiting Anderson's option pick before proposal.

## User request

> 喺 Finance Review 入面要容許貼一張相（clipboard paste / upload）— 例如貼單據、月結單、payment 證明相。

(Allow pasting a photo into the Finance Review — e.g. receipts, monthly statements, payment-proof screenshots.)

## Verified current state (read-only, repo at commit 06421e8)

- **Finance Review = `MonthlyReview.jsx`** ("Monthly Financial Review", merged in commit 460c624, PR #9).
  Sections: checklist (grouped by section), Payment Tracking table (per-card: Stmt / Amount /
  Due / MoneyPro / PPS / Recorded / Notes), Other To-Do / Notes (plain textarea), Reference
  (static content only — abbreviation tables from `src/utils/abbreviations.js` + one tithe link;
  **no per-review 'reference' data field exists in the DB**).
- **Server:** `server/routes/monthlyReviews.js` — GET/POST/PUT + PATCH `/:id/card-entry/:cardId`
  (allowed fields: statementSaved, amount, dueDate, moneyProVerified, ppsSetUp, moneyProRecorded,
  notes) + PATCH `/:id/notes` + complete/reopen + sync-cards.
- **DB schema (server/db.js):** `monthly_reviews` has NO images column. No attachment infra
  anywhere: **no multer, no uploads dir, no file-upload route**; the only static serving is
  `express.static(distPath)` for the built frontend.
- **BUT a proven in-app image-paste pattern already exists** (this is the key finding):
  - `src/components/RichTextEditor.jsx`: `onImagePaste` — intercepts clipboard `image/*` on
    Ctrl+V, converts via FileReader to **base64 data URL**, calls parent handler. (`linkOnPaste: true` also handles URLs.)
  - `TaskModal.jsx`: `descriptionImages` (base64 array) + previews with remove + enlarge modal.
  - `YearlyGoals.jsx` + `server/routes/yearlyGoals.js`: `images` JSON array, same UX (thumbnail,
    remove, enlarge lightbox).
  - Server already tuned: `express.json({ limit: '50mb' })` — "large limit for base64 images".
  - Migration precedent: db.js `ALTER TABLE ... ADD COLUMN` in try/catch (used for
    yearly_goals.images, line ~247).
- **Backup:** daily cron backs up the SQLite DB to
  `OneDrive\3. Resources\Dayframe backup\` (keeps last 30). DB lives in `data/` (gitignored) —
  backup = copying one `app.db` file. Anything stored **inside the DB is automatically covered
  by backup**; anything stored as loose files is not.

## Where should the photo(s) attach? (placement options)

| Placement | Fit for the ask | Notes |
|---|---|---|
| **P1. Review-level gallery** (new `images` column on `monthly_reviews`, paste zone + thumbnails in the main panel) | ★ best MVP fit — 單據/月結單/payment 證明 are all "this month's evidence" | Mirrors YearlyGoals almost 1:1; one PATCH endpoint; read-only months just hide the paste zone |
| P2. Per-card entry (photos array inside each `cardEntries[i]`) | Nice for statement-per-card evidence | More UI work (per-row thumbnails in a table); can be a later refinement — data model compatible (JSON array inside entry) |
| P3. Inside Notes (RichTextEditor replaces textarea) | Mixed text+image notes | Notes is a plain string today; embedding images changes its shape — not recommended for MVP |

Recommendation: **P1 review-level gallery for MVP**, keep P2 as documented follow-up.

## Storage options (per explore scope)

### Option A — Clipboard paste → base64 stored in DB ★ RECOMMENDED
Exactly the existing pattern: paste → FileReader → base64 array → JSON column on
`monthly_reviews` (`images TEXT NOT NULL DEFAULT '[]'`), PATCH `/:id/images`, preview UI copied
from YearlyGoals.

- Pros:
  - Zero new dependencies, zero new infra; third integration of a battle-tested in-app pattern
    (tasks, yearly goals already ship it).
  - Works on the local single-user environment with no server config (no static dir, no Multer,
    no CORS, no file lifecycle).
  - **Backup-safe by construction**: daily SQLite backup already covers photos; no separate
    file-backup story to build.
  - Read-only months naturally preserved (images render from DB).
- Cons:
  - DB grows ~0.5–5 MB per photo (JPEG screenshot of a statement ~1–2 MB as base64). A month
    with 10 card statements ≈ 10–20 MB. SQLite handles hundreds of MB fine; the daily backup
    (OneDrive) grows accordingly. At ~200 MB/yr this is acceptable for years, and the
    `50mb` JSON limit already accommodates multi-photo saves.
  - Mitigations (only if it ever matters): client-side downscale before base64; future Option B
    migration exports DB images to files (path stays recorded in DB).

### Option B — Paste → upload to server static files + URL in DB
Add Multer (or raw body write), an `uploads/` dir, `express.static('/uploads')`, and store
`/uploads/<id>.png` URLs.

- Pros: DB stays small; conventional for web apps.
- Cons:
  - Brand-new infra for a local single-user app: new dependency, upload route, file naming,
    orphan-file cleanup when a photo is removed, plus **backup gap** — the daily DB backup would
    NOT include the files unless the backup script is extended.
  - Rejected by the "keep it simple / local" reality of DayFrame.
- Verdict: only worth it if photos become huge or numerous (> several hundred MB). Migration
  path from A is mechanical.

### Option C — Only allow pasting links (URLs)
- Pros: trivially small.
- Cons: does not satisfy the request (a copied screenshot cannot become a link); external links
  rot; adds hosting questions. Not an option on its own — RichTextEditor already supports
  `linkOnPaste` as a *bonus* for text, but it is not the photo feature.

## Recommendation

**Option A (base64 in DB) + P1 (review-level `images` gallery on monthly_reviews)**, reusing the
RichTextEditor `onImagePaste` + YearlyGoals preview pattern. Smallest diff, no new infra,
backup-safe, and matches how the app already does images in two other places. API shape:
`images` is excluded from the `GET /api/monthly-reviews` list response (history sidebar payload
stays small) and returned only by `/current` and `/by-month`; persistence via PATCH `/:id/images`.
Cap: client-side reject/compress images > ~8 MB with a toast. Keep per-card photos (P2) as a
documented future refinement.

## Effort estimate (if greenlit)

- Server: ~0.5 day — schema ALTER + `images` in deserialize/default + PATCH `/:id/images`
  (mirror `/:id/notes`), extend tests (~5 cases).
- Frontend: ~0.5–1 day — images column + paste zone + thumbnail/remove/enlarge (copy
  YearlyGoals), read-only handling.
- Total ≈ 1–1.5 days including tests; no new dependencies.

## Coordination notes

- **Duplicate cards:** t_7c943b9b and t_31adc73d are the same request; one should be archived
  after this exploration completes.
- **No file conflicts:** uncommitted WORK-toggle changes (t_0e736d8f) touch
  WeeklyReview/WeeklyObjectives files only — MonthlyReview.jsx and monthlyReviews.js are clean.
- **Next step (per pipeline):** human picks an option → `dev` profile writes the OpenSpec
  proposal (this explore does not create one).