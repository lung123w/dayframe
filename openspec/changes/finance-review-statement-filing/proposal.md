# Proposal — finance-review-statement-filing

## Why

The Finance Review tab's own checklist opens with *"Download monthly statements for all banks, student aid office, and internet bills; save in the standard folder structure"* (`src/utils/checklistTemplate.js:17`). The download half is automatic. The **classify → rename → move → empty the Box** half is manual every month, and on **2026-09-26** it took three passes to finish:

1. A hand-written script moved six PDFs into the right folders and left the two OneDrive-locked ones behind.
2. The `del` half then failed on the freshly downloaded files with `Device or resource busy` — the working pattern turned out to be *copy now, delete later* (`scripts/box_dedupe_statements.py`, run on a 10-minute schedule in the `default` profile).
3. Measured read-only at 2026-09-26 18:12 HKT: the Box still holds **six statement PDFs that are already filed**, every one of them byte-identical (md5) to its destination copy — `citi_cc_sep26.pdf`, `hsb_cc_sep26.pdf`, `hsbc_cc_red_sep26.pdf`, `hsbc_cc_sign_sep26.pdf`, `fam_hsb_m_power_sep26.pdf`, and a generically named `Sep.pdf` that is identical to `A-Finance/statement/2026/boc_cc_sep26.pdf`.

The owner holds the rule, the naming convention and the delete-later pattern; what is missing is that **the review screen cannot do any of it**. This change adds a final step to the Finance Review tab: it reports what is in the Box and what would happen to each file, and it runs the filing job on one click.

## The routing rule (owner, verbatim — do not reinterpret)

- `C:\Users\user\OneDrive\2. Area\A-Finance\statement\<YEAR>\` ← everything else
- `C:\Users\user\OneDrive\2. Area\A-A & E Family\Statement\<YEAR>\` ← **only** CLP, Towngas and MM Power
- Inbox: `C:\Users\user\OneDrive\0. Box`

## What "trigger the agent" means — the mechanism is decided here

| Option | Why not / why |
|---|---|
| **1. A fixed endpoint in the app's own Express server that runs an allow-listed filing job** | **Recommended and adopted.** The step needs a *preview* ("what will move") before the click and a *result summary* after it; the app's server is already running whenever the tab is, so the round trip is synchronous and needs no second state channel. The job is fixed code — the browser's only input is "run now". |
| 2. A `settings` row written by the tab + a watcher/cron agent that picks it up | Decoupled and works with the tab closed, but it adds up to a full scheduler tick of latency before anything moves, and the result has to be read back out of a second channel. The property it buys (surviving a closed tab) is already covered: the **delete-later half already runs on a 10-minute schedule** (`box_dedupe_statements.py`), which is exactly the part that needs to run unattended. |
| 3. A button that shells out to `hermes chat -q "…"` | Rejected. It puts a shell in the path of a browser click, spawns a nondeterministic LLM per click for a job that is fully deterministic, and cannot produce a stable preview. It is the one option the owner's hard rule explicitly forbids. |

**Hard security rule (binding, §D2 of `design.md`):** the job is fixed and allow-listed; the browser cannot pass a command, a path, a filename or a flag. The endpoints take **no input** — a body carrying any key is rejected with 400. The Box and the two destinations are server-side constants (dev/test-only env overrides), never request data.

## What Changes

- **New job engine** `server/statementFiling.js` — a pure module over an injected config `{ box, destinations }` that produces a *plan* (read-only) and *executes* it. Classification tiers, the four invariants (PDF-only, never overwrite, hash-verified delete, unclassified stays put) and the report shape live here.
- **New series table** `server/statementSeries.js` — the machine rules: series id → filename pattern → destination, plus the content signatures used when the filename says nothing. Grounded in a read-only survey of both destination folders (2026-09-26) and the owner's reference table (`src/utils/abbreviations.js`, unchanged).
- **New router** `server/routes/statementFiling.js` mounted at `/api/statement-filing` — `GET /preview` (no side effects) and `POST /run` (executes), both parameterless.
- **New UI step** `src/components/StatementFiling.jsx` + `.css`, rendered by `MonthlyReview.jsx` as the review's **final step** (after Photos, before the static Reference appendix), with a preview, a run action, a per-file result summary and the month-coverage gaps. `src/api.js` gains `statementFilingService { preview, run }`.
- **A durable run record** in `settings['statementFiling.lastRun']` (the generic key/value store, DATA_MODEL §1) so reopening the tab shows the last run's outcome. No new table, no migration.
- **Reported, never silently fixed:** the two MM Power statements misfiled in A-Finance (`fam_hsb_m_power_jan26.pdf`, `fam_hsb_m_power_mar26.pdf`), the variant name `fam_hsb_m_power_jul_26.pdf`, and the month gaps per series (e.g. `hsbc_cc_sign` has no March, `tsfs`/`bea_cc_wm` have a single month) are **reported to the owner**, not moved or renamed.

## Capabilities

### New Capabilities

- `statement-filing`: the allow-listed local filing job — its no-input contract, its preview, the routing rule, the four safety invariants, the idempotent run journal, the misfile/month-coverage reports, and the rule that an unidentifiable PDF stays put.

### Modified Capabilities

- `monthly-financial-review`: the Finance view gains a **final statement-filing step** (ADDED requirement) — preview, run-now, result summary, read-only months.

## Impact

- **New files**: `server/statementFiling.js`, `server/statementSeries.js`, `server/routes/statementFiling.js`, `src/components/StatementFiling.jsx` + `.css`, `src/__tests__/statementFiling*.test.js(x)`, this change folder.
- **Modified files**: `server/index.js` (one mount), `src/api.js` (`statementFilingService`), `src/components/MonthlyReview.jsx` (one section + import), `src/components/MonthlyReview.css` (step styling), `.dev_context/ROUTE_MAP.md` + `ARCHITECTURE.md` + `DECISION_LOG.md` (Rule B, ADR-014).
- **No new npm package. No DB migration. No new table.** The only persisted artefact is a `settings` row.
- **No external calls, no uploads** — the job reads and writes only the three local folders.
- **Out of scope (explicit):** moving or renaming the owner's historic files (report only); changing `scripts/box_dedupe_statements.py` or the scheduled cleaner (its hardcoded `2026` destination list is a known limitation, recorded as an open item, not fixed here); any scheduled job *inside* the app; per-month history of runs (one `lastRun` row only); changes to `src/utils/abbreviations.js`.
- **Branch**: `feat/finance-statement-filing` off `master` (`23e1b4d`, the merge of PR #23) — this is the branch that carries this change folder, so the build cards merge it in as their base rather than re-typing the contract.
- **Collision hotspot — read this before the UI card starts.** `src/components/MonthlyReview.jsx` / `.css` are also being edited by stage 4 of `ui-modernization-calm-canvas` (card `t_63c2607b`: "Week/review/finance repaint"). The UI card is therefore **parented on that card** and bases its branch on the S4 branch so the repaint lands first; `server/` and the new `StatementFiling.*` files are untouched by the calm-canvas chain (its `design.md` §1 fences `server/`).
- **Merge/archive order**: this change touches none of the specs the calm-canvas change modifies (`today-quick-capture`, `today-item-ordering`, `weekly-review-planning`, `ui-presentation-system`), so the two can be archived in either order; the one ordering that matters is the **code** order above (S4 repaint → this step).
