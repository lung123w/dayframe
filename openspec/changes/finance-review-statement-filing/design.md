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

## F — Classification rulebook (frozen by card `t_35e193a0`, 2026-09-27)

The engine's *mechanism* is frozen by D1–D16; the *tables it is fed* are frozen here, read out of the owner's real PDFs with `pdftotext`. `server/statementSeries.js` is transcribed from F1+F2+F3 verbatim; `t_94940816` (df-tester) turns F4 into sandbox fixtures. **Nothing in F1–F5 re-decides a D-decision**; where a D-decision came out wrong on real data the row is marked `[RULE-CORRECTED]` and the defect is recorded in F6 and raised on `t_c905319a`.

### F0 — provenance, evidence base, and the readings this section had to fix

#### F0.1 — how the tables were read (read-only, 2026-09-27, worktree `.worktrees/t_35e193a0`, branch `feat/finance-statement-filing-spec`)

```bash
ls "C:/Users/user/OneDrive/2. Area/A-Finance/statement/2026"
ls "C:/Users/user/OneDrive/2. Area/A-A & E Family/Statement/2026"
ls "/c/Users/user/OneDrive/0. Box"
"C:/Program Files/Git/mingw64/bin/pdftotext.exe" -enc UTF-8 -layout "<file>.pdf" -   # xpdf 4.00, as frozen in D10
md5sum "<filed copy>.pdf"
```

Corpus read (one or more PDFs per series, extracted with `-enc UTF-8 -layout` to `$LOCALAPPDATA/Temp/df_filing_txt/`, scratch — the exact list is the "read from" column of F2 and F3): every series present in the two `<YEAR>` folders for 2026, plus representative months from 2025/2024, plus every legacy name family in `src/utils/abbreviations.js`. `src/utils/abbreviations.js` was **read, not modified**.

Cross-check performed (the evidence that F2/F3 are safe to transcribe): for **373 PDFs** in the two roots across 2024–2026, the name was parsed (F1) and the text matched blind (F2/F3); **297 came out with exactly the same series *and* month**, 55 belong to series that carry no signature by design (F1 Groups B–D), 15 have no text layer, and **6 disagree** (all pre-2026, listed in F6.7). No 2026 file disagrees.

#### F0.2 — the Box moved under us: the F4 table is a reconstruction with a named provenance chain

At 2026-09-26 18:12 HKT the lead measured the Box and found **six already-filed statement PDFs — five canonically named plus the generically named `Sep.pdf`** — among 12 files. **Today (2026-09-27) the Box holds no statement PDF at all** — those six were removed after that measurement by the then-active 10-minute watcher job `Statement box cleaner (dedupe filed PDFs)` (Hermes cron `d2ee48ebe808`, `%LOCALAPPDATA%\hermes\scripts\box_dedupe_statements.py`). That script deletes a Box PDF **only** when its md5 equals a filed copy's md5 (`if h in filed: os.remove(src)`), and its sibling `dedupe_box_statements.sh` does the same check explicitly (`HASH MISMATCH, NOT deleting`). **The removals therefore prove byte-identity for all six files** — the strongest evidence available once the source bytes are gone. F4.3 lists the chain for each file.

Today's Box (`ls`) is the same 6 non-statement files the 2026-09-26 Box held, minus nothing and plus `upnote-migration-checklist.html` (created 2026-09-27) — that is how the 12-file inventory in F4.1 is reconstructed.

**That watcher no longer exists, and this change must not bring it back.** Re-checked 2026-09-27 18:34: job `d2ee48ebe808` is gone from `cron/jobs.json`, its output directory is removed, `executions.db` holds no further runs, and no job in `jobs.json` references `box_dedupe` or `Statement box`. The prior-art script file `%LOCALAPPDATA%\hermes\scripts\box_dedupe_statements.py` still sits on disk as a reference for the *job body* only. Per the owner's 2026-09-27 manual-trigger-only ruling (R2), neither that script nor an equivalent may ever be registered on a schedule again: the only trigger is the user pressing the button, and a locked removal is resolved by pressing it again.

Consequence for the card chain: the tester's sandbox must **rebuild** the 2026-09-26 Box from F4 (real bytes copied from the filed copies), not from the live Box.

#### F0.3 — four readings D1–D16 left open. They are frozen here (evidence-backed), not re-decided elsewhere

1. **Report scope = the current Hong Kong year only.** `reported.misfiled`, `reported.nameVariants` and `reported.unknownNames` scan `<destination.root>\<current-HK-year>\` only — the same scope D12 already gives `coverage`, and the same scope the D8 example payload shows. Reason: scanning all 12 year folders turns `nameVariants`+`unknownNames` into ~700 lines (the owner's `_1` download-suffix convention alone — `boc_cc_sep25_1.pdf`, `bea_cc_wm_jan25_1_1.pdf`, … — accounts for most of them) and makes `counts` meaningless in the UI.
2. **One reported list per file, priority `misfiled` > `nameVariants` > `unknownNames`.** Otherwise a misfiled file is counted twice and `counts` over-reports.
3. **Destination-side classification reads the file NAME only** — no `pdftotext` over the two destination folders (the text tool is Tier-2/Box-only, D10). A destination file is `unknownName` when its name yields no month token even if its content would (live example: `2025\fam_hsb_m_power_oc25.pdf`, content October 2025, name `oc25`).
4. **`content` is `{ require: [...], exclude: [...] }` and is matched case-sensitively** (plain substring, no regex). `exclude` is an *additive clarification* of D5's "the first series whose signatures all match wins": two live false positives — an HSBC One statement matches `HSBC Red Credit Card` (it lists the card in its portfolio summary) and every Standard Chartered statement matches `月結單截數日` — are only separable this way. Case-sensitivity is required because two HSBC templates differ only in case (`Statement of HSBC …` vs `STATEMENT OF HSBC VISA SIGNATURE CARD ACCOUNT`).

#### F0.4 — raised on `t_c905319a`, **not** decided by this card

| # | Item | This card's reading (applied in F1) |
|---|---|---|
| R1 | The owner's routing rule says A&E receives **only** CLP / Towngas / M Power, but D4's inventory table marks `wsd` and `fam_hsb_joint` as `ae`, and the owner's own A&E folder holds `wsd_*` (2) and `fam_hsb_joint_*` (31) files. | **The rule wins** (it is also what D4's own code block declares: `SERIES_TO_AE = ['fam_clp','towngas','fam_hsb_m_power']`). F1 gives both series `destination: 'finance'`; their historic A&E files surface in `reported.misfiled` and are never moved (D12). If the owner actually wants them in A&E, that is a one-line rule change for the lead, not a worker's call. |
| R2 | The owner's 2026-09-27 ruling ("manual-trigger only, no scheduler/cron/watcher may be reintroduced") contradicts D1's premise, D7.4's and D8's `note` wording, and D11's wording rule, all of which name the **scheduled cleaner** as the finisher of a locked removal. | §F contains no scheduling of any kind. The lead must re-word D1/D7.4/D8/D11 to the ruling's wording: the run reports `still locked — press File them now again in a minute`, and nothing comes back on its own. |
| R3 | D4's inventory invents a series `fam_hsb_may` from one file name. Content proof (`18 MAY 2026`, `MMPOWER WORLD MC`, account `5408 0620 0710 1097`) shows `fam_hsb_may26.pdf` is a **mis-named M Power statement**, not a series. | Series dropped; `fam_hsb_may26.pdf` is a `nameVariant` of `fam_hsb_m_power` (F5). |

### F1 — the `SERIES` table (id, destination, canonical name, recognition, label)

**Canonical name template (one rule for all series, D6):** `<id>_<mon><yy>.pdf` where `<mon>` ∈ `jan feb mar apr may jun jul aug sep oct nov dec` (lower case) and `<yy>` is the two-digit year of the statement month. The canonical *pattern* is `^<id>_<mon><yy>\.pdf$`, matched **case-insensitively**. `destination` is `finance` (`A-Finance\statement\<YEAR>\`) or `ae` (`A-A & E Family\Statement\<YEAR>\`).

`recognise` is the ordered prefix list used by the destination-side report classes (F0.3.3). **Match longest prefix first** — it is what keeps `fam_hsb_joint_*` out of the `fam_hsb_*` alias and `hsbc_cc_red_*` out of `hsbc_cc_*`.

**A&E assertion (the unit test D4 asks for):** `SERIES_TO_AE = ['fam_clp','towngas','fam_hsb_m_power']`; every other row is `finance`. Test: `SERIES.filter(s => s.destination === 'ae').map(s => s.id).sort()` equals `SERIES_TO_AE.sort()`.

**Group A — content-identifiable (signature read from a real PDF; F2/F3 apply)**

| id | dest | label | recognise (longest first) | extra accepted name forms |
|---|---|---|---|---|
| `fam_hsb_m_power` | **ae** | Hang Seng M Power credit card | `fam_hsb_m_power`, `am_hsb_m_power`, `fam_hsb` | `fam_hsb_<mon><yy>.pdf`, `am_hsb_m_power_<mon><yy>[_n].pdf` |
| `fam_clp` | **ae** | CLP electricity bill | `fam_clp` | `fam_clp_f<mon><yy>.pdf` |
| `boc_cc` | finance | BOC credit card | `boc_cc` | — |
| `citi_cc` | finance | Citibank credit card | `citi_cc` | — |
| `hsb_cc` | finance | Hang Seng credit card | `hsb_cc` | — |
| `hsb_ia` | finance | Hang Seng Integrated Account (personal) | `hsb_ia` | — |
| `hsbc_cc_red` | finance | HSBC Red credit card | `hsbc_cc_red` | — |
| `hsbc_cc_sign` | finance | HSBC Visa Signature credit card | `hsbc_cc_sign` | — |
| `hsbc_cc_mile` | finance | HSBC EveryMile credit card | `hsbc_cc_mile` | — |
| `hsbc_ia_one` | finance | HSBC One account | `hsbc_ia_one` | — |
| `fam_hsb_joint` | finance `[RULE-CORRECTED]` | Hang Seng joint account (Emily & Anderson) | `fam_hsb_joint` | — |
| `wsd` | finance `[RULE-CORRECTED]` | Water Supplies Department demand note | `wsd` | — |
| `citic` | finance | CNCBI (CITIC) credit card | `citic` | — |
| `bea_cc_wm` | finance | BEA World MasterCard | `bea_cc_wm` | — |
| `bea_cc_t` | finance | BEA Titanium MasterCard | `bea_cc_t` | — |
| `wewa` | finance | WeWa credit card | `wewa` | — |

**Group B — filename-only: the PDF has no text layer** (`pdftotext` returns 1 byte; content identification is impossible, D5 Tier 1 only)

| id | dest | label | recognise | evidence |
|---|---|---|---|---|
| `towngas` | **ae** | Towngas bill | `towngas` | `AE\2026\towngas_jan26.pdf` and `_mar/_may/_jul` → 1 byte of text |
| `oocl_payslip` | finance | OOCL salary pay slip | `oocl_payslip` | `FIN\2026\oocl_payslip_aug26.pdf` → 1 byte of text |

**Group C — filename-only: the content cannot discriminate the series** (a signature would be a guess, which D5 forbids)

| id | dest | label | recognise | evidence |
|---|---|---|---|---|
| `tithe` | finance | Tithe transfer receipt (Yan Fook) | `tithe` | byte-comparable to `tsfs` — same payee `EVANGELICAL FREE CHURCH OF CHINAYAN FOOK CHURCH LIMITED`, same FPS id `9560632`, same amount `港元 5,427.40`; only the transfer date and reference differ |
| `tsfs` | finance | TSFS transfer receipt (Yan Fook) | `tsfs` | as above |
| `citi_cc_rewards` | finance | Citibank rewards credit card | `citi_cc_rewards`, `citi_cc__rewards` | same Citibank template as `citi_cc`; a generic-named one would be identified as `citi_cc` (accepted: same issuer, same destination) |
| `non_mean` | finance | Non-mean demand note | `non_mean` | `FIN\2025\non_mean_apr25_1.pdf` is dated `01/05/2025` while the name says `apr25` — no trustworthy anchor |

**Group D — dormant legacy rows (no file after 2021; filename-only, canonical name only)**

`hsbc_cc` (plain HSBC card, label glyphs garbled in 2018), `sc_cc`, `sc_cc_sic`, `sc_cc_sm` (Standard Chartered: broken font encoding, text not matchable), `dbs_cc`, `aeon_cc`, `hkbn`, `manulife_mpf`, `oocl_salary`, `iaccess_m`, `sofi` — all `finance`. They cost one regex each and stop a re-activated card from being reported `unclassified`. A series with no file in the year is omitted from `coverage` (D12), so they add no UI noise.

**Row count:** 16 (A) + 2 (B) + 4 (C) + 11 (D) = **33 series**, 3 of them `ae`.

### F2 — content signatures, with the file each was read from

Signatures are **plain case-sensitive substrings** of `pdftotext -enc UTF-8 -layout` output. A row of Group B/C/D has **no signature** and can never be identified from content (D5 Tier 2 skips it). Line pointers below are into the extracted text of that file (raw line order, as `pdftotext` emits it); two rows point at the literal instead because the string is not on the file's first lines.

| id | `require` (all must be present) | `exclude` (none may be present) | read from |
|---|---|---|---|
| `boc_cc` | `月結單`, `MONTHLY STATEMENT`, `中銀` | `CNCBI` | `FIN\2026\boc_cc_sep26.pdf` = the Box `Sep.pdf` (F4.3) |
| `citic` | `CNCBI`, `MONTHLY STATEMENT` | — | `FIN\2025\citic_sep_25.pdf` |
| `citi_cc` | `CITIBANK` | — | `FIN\2026\citi_cc_sep26.pdf` |
| `hsbc_cc_red` | `Statement of HSBC Red Credit Card Account` | — | `FIN\2026\hsbc_cc_red_sep26.pdf`:1 |
| `hsbc_cc_sign` | `HSBC VISA SIGNATURE CARD ACCOUNT` | — | `FIN\2026\hsbc_cc_sign_sep26.pdf`:1 |
| `hsbc_cc_mile` | `EveryMile Credit Card Account` | — | `FIN\2025\hsbc_cc_mile_apr25_1.pdf`:1 |
| `hsbc_ia_one` | `HSBC One Portfolio` | — | `FIN\2025\hsbc_ia_one_apr25_1.pdf` (literal `HSBC One Portfolio`) |
| `hsb_cc` | `HANG SENG BANK`, `CLOSING DATE` | `MMPOWER` | `FIN\2026\hsb_cc_sep26.pdf`:1-3 |
| `hsb_ia` | `CHINESE UNIVERSITY (290)`, `Integrated Account` | — | `FIN\2026\hsb_ia_jul26.pdf`:1-5 |
| `fam_hsb_joint` | `SHATIN (246)`, `Integrated Account` | — | `AE\2026\fam_hsb_joint_feb26.pdf`:1-4 |
| `fam_hsb_m_power` | `MMPOWER WORLD MC`, `HANG SENG BANK`, `CLOSING DATE` | — | `AE\2026\fam_hsb_m_power_sep26.pdf`:1-3 |
| `fam_clp` | `住宅用電`, `發單日期` | — | `AE\2026\fam_clp_sep26.pdf`:7-11 |
| `wsd` | `水務署`, `Water Supplies Department`, `付款通知書` | — | `AE\2026\wsd_jan26.pdf`:1-4 |
| `bea_cc_wm` | `WORLD MASTERCARD` | — | `FIN\2026\bea_cc_wm_jun26.pdf`:1-2 |
| `bea_cc_t` | `TITANIUM MASTERCARD` | — | `FIN\2024\bea_cc_t_dec24.pdf`:1-2 |
| `wewa` | `WEWA DIAMOND CARD` | — | `FIN\2025\wewa_apr25_1.pdf` (literal `WEWA DIAMOND CARD`, next to `新 Balance`) |

`hsb_cc` and `fam_hsb_m_power` share Hang Seng's identical credit-card boilerplate (both contain `HANG SENG BANK` + `CLOSING DATE`); they are separated by `MMPOWER` and by table order (`fam_hsb_m_power` first). `hsb_ia` and `fam_hsb_joint` share Hang Seng's Integrated-Account template; they are separated by the branch line (account numbers, if the branch line ever changes: `290-697630-882` vs `246-769871-888`).

### F3 — statement-month patterns, with the evidence line each parses

Two strategies only: `first-date(<rx>)` = the first match of `<rx>` in the whole text; `anchor(<literal>, <rx>, 400)` = the first match of `<rx>` within 400 characters after the first occurrence of `<literal>`. The matched token is then read as a month (a 3-letter month name, or field 2 of `dd-mm-yy` / `dd/mm/yyyy`).

| id | strategy | parses | evidence line (file:line) |
|---|---|---|---|
| `boc_cc` | `first-date(\d{2}-[A-Z]{3}-\d{4})` | `18-SEP-2026` → 2026-09 | `boc_cc_sep26.pdf`:12 (`18-SEP-2026`) precedes `:13` (`14-OCT-2026`, the due date). **Label-anchoring is impossible here**: `結單日期 / Statement Date` sits at `:22-23`, *below* its own value — hence a positional rule. Month-name rule keeps this safe for `18-APR-2028` (`:47`, a promo date, not first) |
| `citi_cc` | `first-date([A-Z][a-z]+ \d{2}, \d{4})` | `September 05, 2026` → 2026-09 | `citi_cc_sep26.pdf`:1 `Page 1 of 4   September 05, 2026` |
| `hsb_cc` | `anchor(CLOSING DATE, \d{1,2} [A-Z]{3} \d{4})` | `21 SEP 2026` → 2026-09 | `hsb_cc_sep26.pdf`:1 `CLOSING DATE` → `:2` `4548 8920 2973 7963   21 SEP 2026   20 OCT 2026` |
| `fam_hsb_m_power` | `anchor(CLOSING DATE, \d{1,2} [A-Z]{3} \d{4})` | `18 SEP 2026` → 2026-09 | `fam_hsb_m_power_sep26.pdf`:1-2; also `fam_hsb_may26.pdf`:2 `18 MAY 2026`; `fam_hsb_dec25.pdf`:2 `18 DEC 2025` |
| `hsb_ia` | `first-date(\d{1,2} [A-Z][a-z]{2} \d{4})` | `21 Jul 2026` → 2026-07 | `hsb_ia_jul26.pdf`:3 `MR WONG FAI LUNG   Account Number   21 Jul 2026` (the `Statement Date` label is at `:4`, below the value — positional again) |
| `fam_hsb_joint` | `first-date(\d{1,2} [A-Z][a-z]{2} \d{4})` | `25 Feb 2026` → 2026-02 | `fam_hsb_joint_feb26.pdf`:3 `WONG FAI LUNG / CHAU KA WING EMILY   Account Number   25 Feb 2026` |
| `hsbc_ia_one` | `first-date(\d{1,2} [A-Z][a-z]+ \d{4})` | `28 April 2025` → 2025-04 | `hsbc_ia_one_apr25_1.pdf`:4 `2 HANG MING STREET   28 April 2025` |
| `hsbc_cc_red` | `anchor(Statement date, \d{2} [A-Z]{3} \d{4})` | `16 SEP 2026` → 2026-09 | `hsbc_cc_red_sep26.pdf`:13 `Statement date` → `:15` `16 SEP 2026   HKD4,073.75` |
| `hsbc_cc_sign` | `anchor(Statement date, \d{2} [A-Z]{3} \d{4})` | `18 SEP 2026` → 2026-09 | `hsbc_cc_sign_sep26.pdf`:13 → `:15` |
| `hsbc_cc_mile` | `anchor(Statement date, \d{2} [A-Z]{3} \d{4})` | `08 APR 2025` → 2025-04 | `hsbc_cc_mile_apr25_1.pdf`:13 → `:15` |
| `citic` | `first-date(\d{2} [A-Z]{3} \d{4})` | `25 SEP 2025` → 2025-09 | `citic_sep_25.pdf`:8 `5 391 -42 32- 110 6-6 915   25 SEP 2025` |
| `bea_cc_wm` | `first-date(\d{1,2} [A-Z]{3} \d{4})` | `12 JUN 2026` → 2026-06 | `bea_cc_wm_jun26.pdf`:1 `5452-2903-0029-1597   12 JUN 2026` (`:2` `7 JUL 2026` is the due date) |
| `bea_cc_t` | `first-date(\d{1,2} [A-Z]{3} \d{4})` | `12 DEC 2024` → 2024-12 | `bea_cc_t_dec24.pdf`:1 |
| `wewa` | `anchor(月結單截數日, \d{2} [A-Z][a-z]{2} \d{4})` | `03 Apr 2025` → 2025-04 | `wewa_apr25_1.pdf`:9 `Statement Date 月結單截數日 :   03 Apr 2025` |
| `fam_clp` | `anchor(發單日期, \d{2}-\d{2}-\d{2})` | `10-09-26` → 2026-09 (dd-mm-yy) | `fam_clp_sep26.pdf`:9 `發單日期 (日- 月 - 年)` → `:11` `10-09-26` (the billing period `11-07-26 至 10-09-26` at `:7` precedes the label, so anchoring matters) |
| `wsd` | `anchor(發出日期, \d{2}/\d{2}/\d{4}, 60)` | `24/01/2026` → 2026-01 (dd/mm/yyyy) | `wsd_jan26.pdf`:1 `水務署 … 發出日期 : 24/01/2026` (page 2 writes it as `發出日期：24/01/2026` — match the literal only, not the punctuation after it) |
| Groups B/C/D | none — **filename only** | — | a Tier-2 candidate matching only these series is `skipped: unclassified`, `note: month_unreadable` (recognised issuer, no month) or `no_series_match` |

Validation: over 373 real files (2024–2026) the name-derived and content-derived `(series, month)` pairs agree on **297**, the 55 Group B/C/D rows are not applicable by design, 15 files have no text layer, and the **6 disagreements are all pre-2026 owner filing conventions** (F6.7) — none of them can affect a 2026 filing.

### F4 — truth table over the Box of 2026-09-26, and the live Box of 2026-09-27

#### F4.1 — the 2026-09-26 Box (12 files) — the fixture set for `t_94940816`

`F4.0 = 'C:\Users\user\OneDrive\0. Box'`, `FIN26 = 'C:\Users\user\OneDrive\2. Area\A-Finance\statement\2026'`, `AE26 = 'C:\Users\user\OneDrive\2. Area\A-A & E Family\Statement\2026'`.

| # | `sourceName` | tier / how identified | `seriesId` | `statementMonth` | `targetName` | `destinationId` | expected `kind` |
|---|---|---|---|---|---|---|---|
| 1 | `fam_hsb_m_power_sep26.pdf` | 1 — name | `fam_hsb_m_power` | 2026-09 | `fam_hsb_m_power_sep26.pdf` | ae | `duplicate_cleanup` |
| 2 | `citi_cc_sep26.pdf` | 1 — name | `citi_cc` | 2026-09 | `citi_cc_sep26.pdf` | finance | `duplicate_cleanup` |
| 3 | `hsb_cc_sep26.pdf` | 1 — name | `hsb_cc` | 2026-09 | `hsb_cc_sep26.pdf` | finance | `duplicate_cleanup` |
| 4 | `hsbc_cc_red_sep26.pdf` | 1 — name | `hsbc_cc_red` | 2026-09 | `hsbc_cc_red_sep26.pdf` | finance | `duplicate_cleanup` |
| 5 | `hsbc_cc_sign_sep26.pdf` | 1 — name | `hsbc_cc_sign` | 2026-09 | `hsbc_cc_sign_sep26.pdf` | finance | `duplicate_cleanup` |
| 6 | `Sep.pdf` | **2 — content** | `boc_cc` | 2026-09 | `boc_cc_sep26.pdf` | finance | `duplicate_cleanup` |
| 7 | `Anthropic財務SKILL操作手冊.pdf` | 2 — content, no match | — | — | — | — | `skipped`/`unclassified` `no_series_match` |
| 8 | `UpNote Setup.exe` | 0 — extension | — | — | — | — | `skipped`/`not_pdf` |
| 9 | `vlc-3.0.23-win32.exe` | 0 — extension | — | — | — | — | `skipped`/`not_pdf` |
| 10 | `calling[tt].gp` | 0 — extension | — | — | — | — | `skipped`/`not_pdf` |
| 11 | `Real Thing Shakes-07-26-2026.gp` | 0 — extension | — | — | — | — | `skipped`/`not_pdf` |
| 12 | `weekly_biz_proposals_2026-09-23.html` | 0 — extension | — | — | — | — | `skipped`/`not_pdf` |

Expected plan: `counts = { planned: 6, skipped: 6 }`, **zero `file` / `rename_and_file` actions and zero `name_conflict` skips** — every one of the six is `duplicate_cleanup` (D6 row 2), which is the distinction D6 exists for. `reported` is empty for this Box (nothing in it is misfiled, variant or unknown).

`Sep.pdf` is the content tier's only exercise: `pdftotext` gives `月結單` (`:1`) / `MONTHLY STATEMENT` (`:2`) / `中銀` (`:3`) and the F3 month rule gives `18-SEP-2026` (`:12`) → `seriesId: boc_cc`, `statementMonth: 2026-09`, `identifiedBy: 'content'`, `targetName: boc_cc_sep26.pdf`, `sourceBytes: 303956`, `sourceMd5: 36d00b0675cb6dca1963b4a8f282af73`.

#### F4.2 — the live Box of 2026-09-27 (what a run does today)

```bash
ls "/c/Users/user/OneDrive/0. Box"
# Anthropic財務SKILL操作手冊.pdf   calling[tt].gp   Real Thing Shakes-07-26-2026.gp
# UpNote Setup.exe   upnote-migration-checklist.html   vlc-3.0.23-win32.exe
# weekly_biz_proposals_2026-09-23.html          (7 files)
```

`counts = { planned: 0, skipped: 7 }` → 1 × `unclassified` (`no_series_match` — the manual's text contains no series signature) and 6 × `not_pdf`. This is the D-requirement "a second run over an unchanged Box is a no-op" **already true of the owner's disk**; the tester should assert `planned = 0` here as a live-side check, and drive the *filing* behaviour from the F4.1 fixtures.

Note `upnote-migration-checklist.html` did not exist on 2026-09-26 (mtime `2026-09-27 18:15`) — it is a new `not_pdf` in the Box, and the card's inventory predates it.

#### F4.3 — how each row of F4.1 is proven, given the Box copies are gone

| file | proof of the destination copy | proof of byte-identity |
|---|---|---|
| `fam_hsb_m_power_sep26.pdf` | `AE26\fam_hsb_m_power_sep26.pdf` exists, 268394 B, mtime 2026-09-26 17:06 | named in `dedupe_box_statements.sh` pairs; Box copy gone ⇒ the md5 guard (`HASH MISMATCH, NOT deleting`) passed |
| `citi_cc_sep26.pdf` | `FIN26\…` 463246 B, 17:10 | as above |
| `hsb_cc_sep26.pdf` | `FIN26\…` 282176 B, 17:06 | as above |
| `hsbc_cc_red_sep26.pdf` | `FIN26\…` 264014 B, 17:07 | as above |
| `hsbc_cc_sign_sep26.pdf` | `FIN26\…` 262096 B, 17:07 | as above |
| `Sep.pdf` | `FIN26\boc_cc_sep26.pdf` 303956 B, 17:11 | `md5sum` today = `36d00b0675cb6dca1963b4a8f282af73` — **identical to the `sourceMd5`/`sourceBytes` D8 records for `Sep.pdf`**; also `file_sep_statements.sh:31` maps `Sep.pdf → boc_cc_sep26.pdf` and the lead measured the md5 at 18:12 |

The six filed copies' md5s as of today (fixture constants for the tester): `citi_cc_sep26.pdf a20a07fdc29ed1b0ae70b3df967102f2`, `hsb_cc_sep26.pdf 09eed25c1a9bf796936d05cba53d553c`, `hsbc_cc_red_sep26.pdf a9d0830cf21d56d7bae2f8ee5db42463`, `hsbc_cc_sign_sep26.pdf c9b5a3f47c3c9a6307da6e384ea6b367`, `fam_hsb_m_power_sep26.pdf 1d6c688d7f79b93e4d8efa1a309cdbc1`.

#### F4.4 — destination-side report for 2026 (D12), computed with the F1–F3 tables

```
misfiled (4)  finance\fam_hsb_m_power_jan26.pdf   series fam_hsb_m_power  expectedFolder ae
              finance\fam_hsb_m_power_mar26.pdf   series fam_hsb_m_power  expectedFolder ae
              ae\fam_hsb_joint_feb26.pdf          series fam_hsb_joint    expectedFolder finance   [RULE-CORRECTED R1]
              ae\wsd_jan26.pdf                    series wsd              expectedFolder finance   [RULE-CORRECTED R1]
nameVariants (4)
              finance\hsb_ia_22mar26.pdf          expectedName hsb_ia_mar26.pdf
              finance\hsb_ia_aug30.pdf            expectedName hsb_ia_aug26.pdf
              ae\fam_hsb_m_power_jul_26.pdf       expectedName fam_hsb_m_power_jul26.pdf
              ae\fam_hsb_may26.pdf                expectedName fam_hsb_m_power_may26.pdf   [R3: not its own series]
unknownNames (0)
coverage (2026), present / missing:
              fam_hsb_m_power ae       jan feb mar apr may jun jul aug sep / oct nov dec
              fam_clp         ae       jan mar may jul sep            / feb apr jun aug oct nov dec
              towngas         ae       jan mar may jul                / feb apr jun aug sep oct nov dec
              boc_cc          finance  jan…sep                       / oct nov dec
              citi_cc         finance  jan…sep                       / oct nov dec
              hsb_cc          finance  jan…sep                       / oct nov dec
              hsbc_cc_red     finance  jan…sep                       / oct nov dec
              hsbc_cc_sign    finance  jan feb apr…sep               / mar oct nov dec
              hsb_ia          finance  jan…aug                       / sep oct nov dec
              tithe           finance  jan…aug                       / sep oct nov dec
              oocl_payslip    finance  jan feb mar apr jul aug       / may jun sep oct nov dec
              tsfs            finance  sep                           / jan…aug oct nov dec
              bea_cc_wm       finance  jun                           / jan…may jul…dec
              fam_hsb_joint   finance  feb                           / jan mar…dec
              wsd             finance  jan                           / feb…dec
```

Two notes the implementer must honour: `fam_hsb_m_power`'s jan and mar are present **because** of the two misfiled files in `finance\2026` (coverage counts physical presence in either root for `<currentYear>`, and each row carries the series' *rule* destination); and `wsd`/`fam_hsb_joint` appear under `finance` for the same reason (R1).

Example `coverage.entry`: `{ seriesId: 'hsbc_cc_sign', destinationId: 'finance', monthsPresent: ['2026-01','2026-02','2026-04','2026-05','2026-06','2026-07','2026-08','2026-09'], monthsMissing: ['2026-03','2026-10','2026-11','2026-12'] }`.

### F5 — rulings on the non-conforming names that really exist

| file (real name) | ruling | reason |
|---|---|---|
| `FIN\2026\hsb_ia_22mar26.pdf` (name carries a day) | **reported as a name variant**, `expectedName: hsb_ia_mar26.pdf` | prefix `hsb_ia` + month token `mar`; it is the *only* March file, so it must still count as March present. D12's example list calls it an `unknownName`, which contradicts D12's own definition ("a file that matches a series but not its canonical form") — see defect **F-D3** |
| `FIN\2026\hsb_ia_aug30.pdf` | **reported as a name variant**, `expectedName: hsb_ia_aug26.pdf` | `aug` is the month, `30` is the day the owner saved it. Content confirms 2026-08 (`Statement Date 21 Aug 2026`), so the month is right and only the name is wrong; again the only August file, so August must count as present |
| `AE\2026\fam_hsb_may26.pdf` | **series-mapped → `fam_hsb_m_power`**, reported as a name variant, `expectedName: fam_hsb_m_power_may26.pdf` | content proof: `MMPOWER WORLD MC`, account `5408 0620 0710 1097`, `18 MAY 2026`. It is a second, non-identical render of May (md5 `27eb8e7239aefb43ba22187c43d5161c` vs `fam_hsb_m_power_may26.pdf` `a1cc298c7c6714b36308d16f4629230a`) — so it is a variant, **not** a duplicate; nothing is renamed and nothing is moved. D4's invented series `fam_hsb_may` is dropped (**R3**) |
| `AE\2026\fam_hsb_m_power_jul_26.pdf` | **canonical-series, variant name**, reported, `expectedName: fam_hsb_m_power_jul26.pdf` | D12's own live example; no `fam_hsb_m_power_jul26.pdf` exists, so July is present via this file |
| `FIN\2025\am_hsb_m_power_apr25_1.pdf` | **series-mapped → `fam_hsb_m_power`**, `misfiled` (finance → ae), name variant | content proof: `MMPOWER WORLD MC`, `22 APR 2025`. The `am_hsb_m_power` prefix is a third legacy name form (accepted name form in F1) |
| `FIN\2026\fam_hsb_m_power_jan26.pdf`, `…_mar26.pdf` | **misfiled**, report-only | the owner's own misfiles, already named in D4/D12; they are canonically named, so they are misfiled *and* not variants |
| `AE\2025\fam_hsb_dec25.pdf` (and `fam_hsb_nov_23`, `fam_hsb_jun24_1`, `fam_hsb_mar25_1`) | **`fam_hsb` = a legacy name form of `fam_hsb_m_power`**, not a series | content proof for all four: `MMPOWER WORLD MC`, account `5408 0620 0710 1097` (`18 DEC 2025`, `18 NOV 2023`, `18 JUN 2024`, `18 MAR 2025`). `fam_hsb_jun24_1`/`fam_hsb_mar25_1` sit in `A-Finance` → misfiled (2025, outside the current-year report) |
| `FIN\2025\hsbc_ia_one_*`, `FIN\2025\wewa_*`, `FIN\2025\citic_sep_25.pdf`, `FIN\2024\sc_cc_sm_*` | out of report scope (2025/2024) | only the current HK year is reported (F0.3.1); their canonicity is not asserted by the product |

**A note on the real name of row 5.** Some tooling renders it elided or masked (`am_hsb...25_1.pdf`, `«redacted:…»`); the on-disk name is **`am_hsb_m_power_apr25_1.pdf`** — 26 ASCII characters, verified byte-for-byte with `ls | grep am_hsb | od -c`. Spelled out one character at a time, so it survives any output filter: `a m _ h s b _ m _ p o w e r _ a p r 2 5 _ 1 . p d f`. Fixtures must use the full name.

### F6 — findings register (each item marked *covered* or *defect*)

1. **F-D1 — D4's inventory table contradicts the routing rule for `wsd` and `fam_hsb_joint`.** *Defect (needs the lead).* D4's rule sentence and its own `SERIES_TO_AE` say only CLP/Towngas/M Power go to A&E; the table marks both series `ae`, and the owner's A&E folder holds `wsd_*` (2 files) and `fam_hsb_joint_*` (31 files). §F applies the rule (F1 `[RULE-CORRECTED]`); the consequence is 2 extra `misfiled` report lines and future `wsd`/`fam_hsb_joint` statements filing into `A-Finance`. **If the owner wants them in A&E, that is a one-line change to `SERIES_TO_AE` — raised as R1, not decided here.**
2. **F-D2 — D1/D7.4/D8/D11 still name the 10-minute "scheduled cleaner" as the finisher of a locked removal.** *Defect (needs the lead).* The owner's 2026-09-27 ruling forbids any scheduler/watcher, forbids reintroducing an equivalent, and requires the retry to live inside the triggered run. §F adds no scheduling; the wording (`note`, `pendingRemoval`, D11's frozen sentence) must be re-pointed at "press the button again", not at a cron.
3. **F-D3 — D12's `unknownNames` examples contradict D12's definition.** *Defect (minor, resolved in F5).* `hsb_ia_22mar26.pdf` and `hsb_ia_aug30.pdf` are given as `unknownNames` while D12 defines an unknown name as one that "matches no series pattern". Both have a known series prefix and a readable month, so — unlike `unknownNames` — they must count toward `coverage` (otherwise March and August read as missing for `hsb_ia`). They are `nameVariants` here; `unknownNames` is 0 for 2026.
4. **F-D4 — the destination-side report has no year scope in D8/D12.** *Defect (resolved by reading).* Unscoped, `nameVariants` + `unknownNames` run to ~700 lines on the owner's 12 year folders (mostly the `_1` download-suffix names). F0.3.1 fixes the scope to the current HK year, consistent with `coverage`.
5. **F-D5 — D5's "signatures all match" is too weak on real documents.** *Clarification (resolved by reading).* Two live false positives: an HSBC One statement contains `HSBC Red Credit Card` (its portfolio summary) and every Standard Chartered statement contains `月結單截數日` (generic boilerplate). F0.3.4 adds `exclude` and case-sensitivity; the matching mechanism itself is unchanged. **This is the one §F change that touches a D-decision, and it is additive — the implementer must not lower-case either side.**
6. **D6's duplicate-vs-conflict table is *covered* and is exactly right for the live Box**: the six already-filed Box copies are byte-identical (F4.3), so the naive implementations D6 rejects (overwrite, or "six skips") are the real failure modes here.
7. **Six real name-vs-content divergences in the owner's pre-2026 files** (all outside the current-year report, none reachable by Tier 1 or Tier 2): `hsb_cc_mar24_1.pdf` (named `mar`, closing date `23 FEB 2024`), `hsbc_ia_one_nov24_1.pdf` (named `nov`, statement `28 October 2024`), `hsb_ia_jun24_1.pdf` (named `hsb_ia`, content is the **joint** account `SHATIN (246)`), `citi_cc__rewards feb25_1.pdf` (same Citibank template as `citi_cc`), `sc_cc_sm_oct24_1.pdf` (garbled text layer), `fam_hsb_m_power_oc25.pdf` (name `oc25` has no month token; content is October 2025). They are the evidence for D5's rule that **Tier 1 trusts the name and never re-derives it from content**, and for keeping Tier 2's signatures specific.
8. **`pdftotext` coverage** *covered* by D10: two live series cannot be read at all — `towngas` and `oocl_payslip` (`pdftotext -enc UTF-8 -layout` → 1 byte, scanned images). They are filename-only by construction, and a *generic-named* towngas/OOCL PDF becomes `skipped: unclassified` even though the binary works. That is the correct outcome (no guessing), and D16's "no OCR" already forbids the alternative.
9. **The destination root holds non-year material** — `A-Finance\statement\` itself holds `e-service2.pdf`, `oocl_rd568.pdf` and a World Vision receipt, and a `Worship\` folder of `.mp4` files; `A-A & E Family\Statement\` holds `eStatementFile.pdf.crdownload`. *Covered by reading:* the report walks `<root>\<4-digit-year>\` only, so none of these is scanned, reported or touched. The year-folder glob must be exactly four digits (`^\d{4}$`).
10. **`coverage` counts physical presence across both roots** (D12's wording "in that year's destination folder" is singular). *Covered by reading*, noted in F4.4: `fam_hsb_m_power` would otherwise show `jan`/`mar` missing although the Feb-…-Sep run is complete.
11. **The `[RULE-CORRECTED]` rows change what the owner will see.** With R1 applied, the first run on a Box containing `wsd_oct26.pdf` files it into `A-Finance\statement\2026\` while `wsd_jan26.pdf` sits in `A&E` and is reported misfiled. That is the rule working as written, and it is the single most likely "why did it do that?" moment for the owner — flagged to the lead with R1.
