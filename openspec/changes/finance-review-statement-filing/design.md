# Design — finance-review-statement-filing

This document freezes every decision two workers could otherwise make differently: the trigger contract, the folder rule, the classification tiers, the safety invariants, the exact JSON the endpoints exchange, the UI states and the sandbox the tester drives. Build cards cite it and do not re-derive it.

**Rule A sources read before writing this** (2026-09-26): `.dev_context/ROUTE_MAP.md` §1/§2/§3 (Finance tab is `activeView === 'finance'` → `MonthlyReview.jsx`; `/api/settings/:key` is the generic key/value store), `.dev_context/ARCHITECTURE.md` §2, `.dev_context/DATA_MODEL.md` §1 (`settings`), `src/components/MonthlyReview.jsx` (849 lines — section order: checklist → cards → notes → photos → reference), `src/utils/abbreviations.js`, `src/utils/checklistTemplate.js`, `src/api.js`, `server/index.js`, `server/routes/settings.js`, plus a read-only survey of the three real folders and the two working scripts on this machine (`scripts/file_sep_statements.sh`, `scripts/box_dedupe_statements.py`).

## D1 — The trigger is a fixed, parameterless endpoint pair on the app's own server

`GET /api/statement-filing/preview` (read-only, no side effects) and `POST /api/statement-filing/run` (executes the plan). Mounted in `server/index.js` next to the other routers (`app.use('/api/statement-filing', statementFilingRouter)`).

Both endpoints are **parameterless**. `GET` ignores the query string; `POST` requires a body that is either absent or `{}`.

Rejected alternatives and why are in `proposal.md` §"What 'trigger the agent' means". The deciding fact: the delete half is the only part that must survive a closed tab, and it already does — `scripts/box_dedupe_statements.py` runs on a 10-minute schedule in the `default` profile and removes a Box PDF once a byte-identical copy is filed. This change therefore adds **no scheduler, no watcher, no queue and no polling loop** inside the app.

## D2 — The allow-list contract (security rule, binding)

1. The browser passes **no command, no path, no filename, no flag, no destination**. A `POST /run` body carrying any key other than none → **400** `{"error":"statement filing takes no input"}`; a `GET /preview` with any query parameter → **400** `{"error":"statement filing takes no input"}`.
2. The Box and the two destination roots are **server-side constants** in `server/statementSeries.js` (see D4) — never request data. Dev/test override is by environment variable only (D13), set by the operator who starts the process.
3. Every subprocess (the `pdftotext` call of D10) uses `execFile(binary, [argv…])` with an **absolute** binary path and an argv array. No shell string is ever built, and no client value ever reaches an argv element.
4. Every path the job touches is `path.resolve`d and asserted to lie inside the configured Box or one of the two configured destination roots; a path that fails the assertion is reported as `skipped: outside_scope` and left alone.
5. No network call, no upload, no external service. These are the owner's financial documents.

This is recorded as **ADR-014** in `.dev_context/DECISION_LOG.md` (the job card writes it).

## D3 — The engine is a module over an injected config

`server/statementFiling.js` exports:

```js
export function buildPlan(config, now = new Date())   // pure read: no write, no delete, no mkdir
export function runPlan(config, plan, options = {})    // executes exactly the plan it is given
export function resolveConfig(env = process.env)       // constants + D13 overrides → config
```

`config` is `{ box: string, destinations: [{ id: 'finance'|'ae', root: string }], pdftotext: string|null, deleteAttempts: number, deleteRetryDelayMs: number }`.

- `buildPlan` never mutates anything — the preview is provably side-effect-free, which is what makes the "what will move" button safe to press.
- `runPlan` re-verifies each action against the live filesystem before acting (size + md5 at execution time), so a plan built before a file changed cannot delete the wrong bytes.
- The router (`server/routes/statementFiling.js`) is thin: `resolveConfig()` → `buildPlan` / `runPlan` → JSON, plus the 400 contract of D2 and the run record of D9.
- Unit-testable with a temp directory: everything the job needs is a path, so no mocking framework is required.

## D4 — The routing rule and the series table

**Rule (owner, 2026-09-26, verbatim):** `A-A & E Family\Statement\<YEAR>\` receives **only** CLP, Towngas and MM Power; everything else goes to `A-Finance\statement\<YEAR>\`.

Frozen roots (production defaults, no trailing separator):

```
box          C:\Users\user\OneDrive\0. Box
finance.root C:\Users\user\OneDrive\2. Area\A-Finance\statement
ae.root      C:\Users\user\OneDrive\2. Area\A-A & E Family\Statement
```

`<YEAR>` is **the year of the statement month of the file being filed**, not the year the run happens (D5.6). The year directory is created if absent (`fs.mkdirSync(dir, { recursive: true })`).

`server/statementSeries.js` exports the machine rules:

```js
export const DESTINATIONS = { finance: {…root}, ae: {…root} };
export const SERIES = [
  { id:'boc_cc',          destination:'finance', pattern:/^boc_cc_(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)(\d{2})\.pdf$/i,
    label:'BOC credit card',           content:['中銀','MONTHLY STATEMENT'], monthPattern:[…] },
  … one entry per series listed below …
];
export const SERIES_TO_AE = ['fam_clp','towngas','fam_hsb_m_power'];
```

Every `SERIES` entry whose id is in `SERIES_TO_AE` carries `destination:'ae'`; every other entry carries `destination:'finance'`. The two facts are asserted in a unit test, so the rule cannot be split into two contradictory places.

**Series inventory (read-only survey of both year folders, 2026-09-26):**

| Series id | Destination | Present in `<YEAR>` (2026) |
|---|---|---|
| `boc_cc` | finance | jan–sep |
| `citi_cc` | finance | jan–sep |
| `hsb_cc` | finance | jan–sep |
| `hsb_ia` | finance | jan–aug (+ `hsb_ia_22mar26.pdf`, `hsb_ia_aug30.pdf` — non-conforming names) |
| `hsbc_cc_red` | finance | jan–sep |
| `hsbc_cc_sign` | finance | jan, feb, **no mar**, apr–sep |
| `oocl_payslip` | finance | jan–aug |
| `tithe` | finance | jan–aug |
| `tsfs` | finance | sep only |
| `bea_cc_wm` | finance | jun only |
| `fam_clp` | **ae** | jan, mar, may, jul, sep |
| `fam_hsb_m_power` | **ae** | feb, apr–sep (+ `fam_hsb_m_power_jul_26.pdf` — variant name) |
| `towngas` | **ae** | jan, mar, may, jul |
| `fam_hsb_joint` | **ae** | feb |
| `fam_hsb_may` | **ae** | (2026 folder holds `fam_hsb_may26.pdf`) |
| `wsd` | **ae** | jan |

Also inventoried in A-Finance `<YEAR>` and reported, **never moved** (D12): `fam_hsb_m_power_jan26.pdf`, `fam_hsb_m_power_mar26.pdf` (misfiled per the owner's rule), and the earlier `am_hsb…25_1.pdf` in the 2025 folder. `src/utils/abbreviations.js` (the owner's own display table) is **not modified** — it stays the human reference; `SERIES` is the machine rule.

## D5 — Classification: three tiers, first match wins, no guessing

**Tier 0 — shape.** Only files whose name ends `.pdf` (case-insensitive) *and* whose first 1024 bytes contain `%PDF-` are candidates. Anything else is `skipped: not_pdf` (extension) or `skipped: unreadable_pdf` (magic), and is never moved. This is why `UpNote Setup.exe`, `vlc-3.0.23-win32.exe`, `*.gp` and `weekly_biz_proposals_*.html` cannot be touched even if someone later names one `x.pdf`.

**Tier 1 — filename.** If the name matches a `SERIES.pattern`, the file is unambiguous: series → destination, month → `statementMonth`, target name = the canonical `<series>_<mon><yy>.pdf` (already the matched form). `identifiedBy: 'filename'`. No PDF text is read.

**Tier 2 — content, only for a name that identifies nothing.** Run `pdftotext` (D10) and evaluate `SERIES[].content` in table order; the first series whose signatures all match wins. Then read the statement month with that series' `monthPattern` from the same text. Both halves must succeed:
- signature match + month read → action with `identifiedBy: 'content'`, `targetName` = canonical name for that series and month (this is the `Sep.pdf` → `boc_cc_sep26.pdf` case, verified 2026-09-26: the file is a BOC `月結單 / MONTHLY STATEMENT` with `結單日期 / Statement Date 18-SEP-2026`, and it is byte-identical to the filed `boc_cc_sep26.pdf`).
- signature match, month unreadable → `skipped: unclassified`, reason `month_unreadable`.
- no signature match → `skipped: unclassified`, reason `no_series_match`.

**Never** infer a series from the month alone, from the file size, from `mtime`, or from "it is the only unrecognised PDF". An unrecognised PDF — the live example is `Anthropic財務SKILL操作手冊.pdf` in the Box — stays put and is reported. This is the owner's hard constraint 5.

### D5.6 — Year comes from the statement month, not from the clock

`destinationPath = <destination.root>\<YYYY>` where `YYYY` is the year part of `statementMonth`. A December statement downloaded in January files into the previous year's folder. A file whose year cannot be established (Tier 1 name without a year token, Tier 2 without a readable month) is not filed.

## D6 — Duplicate, conflict and name-conformance (the distinction that matters most here)

Before copying, compare with the destination candidate:

| Situation | Action | Reason code |
|---|---|---|
| Target path does not exist | copy → verify md5 → delete source | `file` / `rename_and_file` |
| Target exists, **md5 identical** | **do not touch the destination**; delete the source (hash-verified) | `duplicate_cleanup` |
| Target exists, md5 differs | copy nothing, delete nothing | `skipped: name_conflict` |

The third row is the "never overwrite" rule. The second row is the live situation in the Box on 2026-09-26: six statement PDFs are already filed and byte-identical, so a naive implementation would either overwrite the owner's filed copy or report six skips and leave the Box dirty. Neither is acceptable, and this table is the difference.

**Name conformance is reported, never repaired** (owner's historic files are not renamed by a job): `fam_hsb_m_power_jul_26.pdf` is recognised as the `fam_hsb_m_power` series but does not equal the canonical `<series>_jul26.pdf`, so it appears in `nameVariants` as a report line. A *file being filed* is always written under its canonical name (Tier 1 already is; Tier 2 derives it).

## D7 — The four safety invariants, as executable rules

1. **PDF only** — D5 Tier 0.
2. **Never overwrite** — D6 row 3. The destination is opened for read (md5) and nothing else.
3. **Never delete a source without a byte-identical destination copy** — md5 of the source is computed before any action, and the md5 of the destination is computed **after the copy** and compared. Equal → the source may be `unlink`ed. Not equal → the freshly copied file is removed, the Box source is kept, and the entry is reported `skipped: copy_mismatch`. `md5` is chosen over sha256 deliberately: the existing cleaner and the owner's prior art both use md5, and this is a same-volume byte comparison, not a security boundary.
4. **OneDrive locks are a schedule, not a failure** — `unlink` throwing `EBUSY`, `EPERM`, `EACCES` or `EEXIST` (Windows surfaces these for a file OneDrive is rehydrating) means the copy is verified and only the removal is pending. Retry **at most** `deleteAttempts = 2` times with `deleteRetryDelayMs = 1200` between attempts, then record the entry as `pending_removal` with `reason: 'onedrive_locked'`. The summary line names the scheduled cleaner as the finisher. The words "failed" and "error" are never used for a verified copy. A *copy* that fails (source locked for reading) is `skipped: read_error` with the errno string, and the source is kept.

## D8 — The exact JSON (frozen: the two build lanes code against this, not against prose)

`GET /api/statement-filing/preview` → **200**

```json
{
  "generatedAt": "2026-09-26T18:12:00.000Z",
  "box": "C:\\Users\\user\\OneDrive\\0. Box",
  "destinations": [
    { "id": "finance", "root": "C:\\Users\\user\\OneDrive\\2. Area\\A-Finance\\statement" },
    { "id": "ae",      "root": "C:\\Users\\user\\OneDrive\\2. Area\\A-A & E Family\\Statement" }
  ],
  "actions": [
    {
      "sourceName": "Sep.pdf",
      "sourcePath": "C:\\Users\\user\\OneDrive\\0. Box\\Sep.pdf",
      "sourceBytes": 303956,
      "sourceMd5": "36d00b0675cb6dca1963b4a8f282af73",
      "kind": "rename_and_file",
      "seriesId": "boc_cc",
      "statementMonth": "2026-09",
      "identifiedBy": "content",
      "destinationId": "finance",
      "destinationPath": "C:\\Users\\user\\OneDrive\\2. Area\\A-Finance\\statement\\2026",
      "targetName": "boc_cc_sep26.pdf"
    }
  ],
  "skipped": [
    { "name": "UpNote Setup.exe", "reason": "not_pdf" },
    { "name": "Anthropic財務SKILL操作手冊.pdf", "reason": "unclassified", "note": "no_series_match" },
    { "name": "hsbc_cc_may26.pdf", "reason": "name_conflict", "note": "destination copy differs" }
  ],
  "reported": {
    "misfiled": [
      { "folder": "finance", "name": "fam_hsb_m_power_jan26.pdf", "seriesId": "fam_hsb_m_power", "expectedFolder": "ae" }
    ],
    "nameVariants": [
      { "folder": "ae", "name": "fam_hsb_m_power_jul_26.pdf", "expectedName": "fam_hsb_m_power_jul26.pdf" }
    ],
    "unknownNames": [
      { "folder": "finance", "name": "hsb_ia_22mar26.pdf" }
    ]
  },
  "coverage": {
    "year": 2026,
    "series": [
      { "seriesId": "boc_cc", "destinationId": "finance", "monthsPresent": ["2026-01","…","2026-09"], "monthsMissing": ["2026-10","2026-11","2026-12"] }
    ]
  },
  "counts": { "planned": 1, "skipped": 3, "misfiled": 1, "nameVariants": 1, "unknownNames": 1 }
}
```

- `kind` ∈ `file` | `rename_and_file` | `duplicate_cleanup`.
- `skipped[].reason` ∈ `not_pdf` | `unreadable_pdf` | `unclassified` | `name_conflict` | `needs_text_tool` | `read_error` | `outside_scope`.
- `counts.planned` counts `actions`; `counts.skipped` counts `skipped`.
- The plan is **never persisted**.

`POST /api/statement-filing/run` → **200** `{ "run": <run record>, "plan": <the plan it executed> }`

Run record (also persisted as `settings['statementFiling.lastRun']`, D9):

```json
{
  "ranAt": "2026-09-26T18:20:05.000Z",
  "durationMs": 2411,
  "filed": [ { "sourceName": "fam_clp_sep26.pdf", "targetName": "fam_clp_sep26.pdf", "destinationId": "ae", "md5": "…", "status": "filed" } ],
  "cleaned": [ { "sourceName": "citi_cc_sep26.pdf", "matchedName": "citi_cc_sep26.pdf", "destinationId": "finance", "md5": "…", "status": "already_filed" } ],
  "pendingRemoval": [ { "sourceName": "hsb_cc_sep26.pdf", "destinationId": "finance", "md5": "…", "reason": "onedrive_locked", "attempts": 2 } ],
  "skipped": [ …same objects as the plan… ],
  "counts": { "filed": 1, "cleaned": 1, "pendingRemoval": 1, "skipped": 3 },
  "note": "OneDrive still holds 1 Box copy; the scheduled cleaner removes it when the lock clears."
}
```

`status` ∈ `filed` (copied, verified, source removed) | `already_filed` (source removed, destination untouched). A file is in exactly one of `filed` / `cleaned` / `pendingRemoval` / `skipped`.

## D9 — The run record lives in `settings`, and there is no history

`settings['statementFiling.lastRun']` (generic key/value store, `DATA_MODEL.md` §1) holds the run record of D8. Written by the server after a run, read by the UI with the existing `settingsService.get` (`src/api.js:100`). One row, overwritten each run; no new table, no migration, no per-month history. A missing or unparseable value is treated as "no run yet" — never an error in the UI.

## D10 — `pdftotext` resolution and its degradation path

Resolution order (frozen): `process.env.DAYFRAME_PDFTOTEXT` → `C:\Program Files\Git\mingw64\bin\pdftotext.exe` (**verified present on this box, 2026-09-26**, xpdf-tools 4.00) → `pdftotext` on `PATH`. Invocation: `execFile(bin, ['-enc', 'UTF-8', '-layout', absolutePath, '-'], { timeout: 20000, maxBuffer: 8 * 1024 * 1024, windowsHide: true })`. No shell, ever.

If no binary is found, or the call fails, or the timeout fires: every Tier-2 candidate becomes `skipped: unclassified` with `note: 'needs_text_tool'`, the run continues, and nothing is guessed. Tier-1 files still file normally — the tool is only ever needed for a name that says nothing.

## D11 — The UI step (frozen placement, states and wording)

**Placement.** A new `<section className="mfr-filing">` rendered by `MonthlyReview.jsx` **after the Photos section and before the Reference appendix** — Reference is static documentation, not a step, so the filing step is the review's last actionable one. It renders only when `!isReadOnly`; past months show the step nowhere (a run is an action, not history).

**Component.** `src/components/StatementFiling.jsx` + `StatementFiling.css`, taking `{ review }` and using the module-level `statementFilingService` from `src/api.js`:

```js
export const statementFilingService = {
  preview: () => request('/api/statement-filing/preview'),
  run: () => request('/api/statement-filing/run', { method: 'POST', body: JSON.stringify({}) }),
  lastRun: () => settingsService.get('statementFiling.lastRun'),
};
```

`MonthlyReview.jsx` changes by exactly: one import + one `<StatementFiling />` element (and nothing else).

**States.**
1. *Idle* — heading `File statements`, one explanatory line ("Files the statement PDFs sitting in the Box into the two statement folders. Nothing is moved until you press File them now."), the two destination roots in muted monospace, button **Check the box**.
2. *Scanning* — the button disabled, label `Checking the box…`.
3. *Plan shown* — `Check the box` becomes `Check again`; the dry run is rendered as: **Will be filed** (one row per action: `sourceName → targetName` + destination folder), **Left in the Box** (row per skipped file + a plain-English reason), **Reported** (misfiled / name variants / odd names, each with the sentence that explains why nothing was done), **Month coverage** (per series, a 12-cell J…D strip plus `missing: …`). Then the primary button **File them now** (disabled while a run is in flight).
4. *Running* — `Filing…`, both buttons disabled.
5. *Result* — one summary line, then the same three lists annotated with the outcome: `filed` / `already filed — Box copy removed` / `still in the Box, OneDrive lock — the scheduled cleaner finishes it`. `role="status"` on the summary.
6. *Last run* — on mount the section reads `statementFiling.lastRun` and shows `Last run: <local date/time> — <summary>` above the button, or nothing when there has never been a run.
7. *Error* — a non-200 answer renders an inline message (`role="alert"`) and leaves the previous state visible; the request helpers already throw on non-2xx.

**Wording rule (frozen).** A verified copy is never described as a failure: `pendingRemoval` is always shown as *filed — Box copy still locked by OneDrive; the scheduled cleaner removes it*, and each skipped file says which rule kept it (`not a PDF`, `not identified as a statement`, `destination already has a different file`).

## D12 — Misfile and coverage reporting: report only

- **Misfiled** = a file inside a destination folder whose `seriesId` maps to the *other* destination. Reported with the expected folder; **never moved**. Live examples: `A-Finance\statement\2026\fam_hsb_m_power_jan26.pdf` and `…_mar26.pdf` (the owner's rule says MM Power belongs in A&E) — moving the owner's historic files is a data change, not a job.
- **Name variants** = a file that matches a series but not its canonical `<series>_<mon><yy>.pdf` form (`fam_hsb_m_power_jul_26.pdf`). Reported; **never renamed**.
- **Unknown names** = a PDF in a destination folder matching no series pattern (`hsb_ia_22mar26.pdf`, `hsb_ia_aug30.pdf`). Reported under `reported.unknownNames`.
- **Coverage** = for the **current Hong Kong year** only, for every series with at least one file in that year's destination folder: which of the 12 months are present and which are missing. Series with no file in that year are omitted (no 12-cell noise). Declared-but-empty series never appear.

## D13 — Sandbox / test configuration (this is how the tester exercises it without touching the owner's files)

`resolveConfig(env)` reads four **dev/test-only** overrides, all optional:

| Variable | Effect |
|---|---|
| `DAYFRAME_FILING_BOX` | replaces the Box root |
| `DAYFRAME_FILING_FINANCE_ROOT` | replaces the A-Finance statement root |
| `DAYFRAME_FILING_AE_ROOT` | replaces the A&E Statement root |
| `DAYFRAME_PDFTOTEXT` | replaces the resolved `pdftotext` path |

Unset → the production constants of D4. Every card's body repeats: **no verification run may point the job at the real folder roots.** The tester boots a second server instance (scratch port, `.backup` DB copy in its worktree) with all three folder variables pointed at a sandbox tree, drives `preview`/`run` over HTTP, and hashes the three real roots before and after to prove they were not touched.

## D14 — Verification recipe (what a `df-tester` pass must contain)

1. **Sandbox build.** Copy a handful of real PDFs into a sandbox Box: one Tier-1 canonical name, one generic name that must be content-identified, one non-statement PDF (the manual), one non-PDF (an `.exe` or a `.gp`), one whose canonical target already exists byte-identical, one whose canonical target exists but differs (edit one byte), and one Lock-able case (open a handle, or assert the `pending_removal` branch by making the destination read-only — say which method was used).
2. **Preview is read-only** — `GET /preview` twice, sandbox tree hashes unchanged, response identical apart from `generatedAt`.
3. **Run** — every file lands where D4/D6 say; `md5` of each filed pair matches; the non-PDF and the manual are still in the sandbox Box; the conflicting pair is untouched on both sides.
4. **Idempotency** — a second `run` immediately after the first produces `counts.filed = 0`, `counts.cleaned = 0` and no filesystem change (assert the tree hash).
5. **Lock path** — the `pending_removal` entry appears with `reason: 'onedrive_locked'`, the Box copy still exists, the destination copy is byte-identical, and the wording never says "failed".
6. **No-input contract** — `POST /run` with `{"cmd":"anything"}` → 400; `GET /preview?box=C:\` → 400; and a grep of the diff shows no request value reaching `execFile`/`fs`.
7. **UI** — the step renders only on the current month; preview renders the three lists + coverage; the run summary shows the `pending_removal` wording; the step is absent on a past month; a headless screenshot per POL-004 (`dayframe-dev-repo` §9 recipe for this profile).
8. **Real folders untouched** — hash the three real roots before and after the whole verification and report both numbers.
9. **Suite/lint/build** — scoped `npx vitest run --exclude='**/.worktrees/**'`, `npx eslint src`, `npx vite build`, against the same baselines the calm-canvas stage 4 card quotes (the engine is server-side: `npx eslint server` too).

## D15 — Branches, hotspots and Rule B ownership

- `feat/finance-statement-filing` (this change folder) ← `master` `23e1b4d`.
- The job card branches from it and **merges** it in; the UI card branches from the stage-4 calm-canvas branch and merges it in (`openspec/` only, so conflict-free by construction).
- **Hotspot:** `src/components/MonthlyReview.jsx` / `.css` are also edited by `t_63c2607b` (calm-canvas stage 4). The UI card is parented on that card; if the file still carries that lane's changes, take them as given — do not revert the repaint. Flag it as `hotspot:` on the card if the merge is not clean.
- **Rule B ownership, one writer per file at a time:** the job card writes `ROUTE_MAP.md` §2 (the two mounts + the four env overrides) and `DECISION_LOG.md` (ADR-014); the UI card writes `ROUTE_MAP.md` §1 (the new component + who renders it) and `ARCHITECTURE.md` §2 (the component tree) plus one line in ADR-014's UI note; the close-out card archives the change and sweeps all four documents against the shipped code. Cards are sequential, so these appends never race.

## D16 — Non-goals (a build card that finds itself here is a new card, not a drive-by)

No scheduler, queue, watcher or background loop inside the app. No moving or renaming of the owner's historic files. No change to `scripts/box_dedupe_statements.py`, to the scheduled cleaner cron, or to `src/utils/abbreviations.js`. No per-run history table. No uploads, no network, no cloud API. No OCR (a scanned statement with no text layer is `unclassified` and reported, not guessed). No WebDAV / OneDrive API integration. No change to the monthly checklist template — a new checklist item would appear only on newly created reviews, so the step is a section, not a checkbox.

## F — Classification rulebook (frozen by the `df-analyst` card, fills this section)

The engine's *mechanism* is frozen above; the *tables it is fed* are frozen by the analyst card against the real folders and the real PDF text, and appended here as:

- **F1 — the `SERIES` table**, one row per series: id, destination, canonical-name regex, label. Must include every series in D4's inventory plus the ones the Box can produce.
- **F2 — content signatures per series**, each with the literal string it came from and the file it was read from (e.g. BOC: `月結單` + `MONTHLY STATEMENT` from `0. Box\Sep.pdf`).
- **F3 — the statement-month pattern per series**, with the evidence line it parses.
- **F4 — a truth table** over the concrete Box contents of 2026-09-26 (the six already-filed duplicates, `Sep.pdf`, `Anthropic財務SKILL操作手冊.pdf`, `UpNote Setup.exe`, `vlc-3.0.23-win32.exe`, `*.gp`, `weekly_biz_proposals_*.html`) giving the expected plan outcome per file, plus the misfiled / variant / unknown-name / coverage findings of D12.
- **F5 — rulings** on the ambiguous-but-real names found in both folders (`hsb_ia_22mar26.pdf`, `hsb_ia_aug30.pdf`, `fam_hsb_may26.pdf`, `fam_hsb_m_power_jul_26.pdf`, `am_hsb…25_1.pdf`) — filed-as-is / reported / series-mapped, with the reason.

Nothing in §F may contradict D1–D16; a contradiction is a design defect to raise on the lead's card, not to silently implement.
