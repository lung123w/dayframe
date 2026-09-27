# Tasks — finance-review-statement-filing

Delivery rule: **one card = one deliverable = one branch = one PR**, chained with `parents`; the UI card additionally waits for calm-canvas stage 4 (hotspot on `MonthlyReview.jsx`). A card is not Done until the `df-tester` verification card passes — a tester pass **is** the acceptance gate (no human gate anywhere). Every card body carries the guard below.

**Guard (repeat in every card):** the job never moves a non-PDF, never overwrites a destination, never deletes a source without a byte-identical destination copy, never moves an unidentifiable PDF, never moves or renames one of the owner's historic files, makes no network call, and no verification run may ever be pointed at the real Box or the two real destination roots (`DAYFRAME_FILING_*` overrides, `design.md` D13).

## 1. Spec — the classification rulebook (`df-analyst`, card `t_35e193a0`)

- [ ] 1.1 Fill `design.md` §F from a **read-only** survey of the real folders and the real PDF text: F1 the `SERIES` table (id, destination, canonical-name pattern, label), F2 the content signatures per series **each with the literal string and the file it was read from**, F3 the statement-month pattern per series with its evidence line, F4 the truth table over the concrete Box contents of 2026-09-26, F5 rulings on the non-conforming names (`hsb_ia_22mar26.pdf`, `hsb_ia_aug30.pdf`, `fam_hsb_may26.pdf`, `fam_hsb_m_power_jul_26.pdf`, `am_hsb…25_1.pdf`).
- [ ] 1.2 Prove F4 against the live Box: the six already-filed duplicates must be classified `duplicate_cleanup` (not `name_conflict`), `Sep.pdf` must be content-identified as `boc_cc_sep26`, `Anthropic財務SKILL操作手冊.pdf` must be `unclassified`, and the `.exe`/`.gp`/`.html` files must be `not_pdf`. Quote the commands and the observed output.
- [ ] 1.3 State explicitly, per finding, whether the engine's frozen design (D1–D16) already covers it or whether it is a design defect to raise on the lead's card (`t_c905319a`). Do not silently implement around a defect.
- [ ] 1.4 No file outside the change folder and no file in the three real folders may be modified by this card; the survey is read-only (`md5sum`, `pdftotext`, `ls`, `find`).
- [ ] 1.5 Ship the amended `design.md` on its own branch `feat/finance-statement-filing-spec` with a PR based on `feat/finance-statement-filing` (never `master`), and read the PR back before reporting it.

## 2. Build — the filing engine and its API (`df-fullstack`, card `t_d2e44c21`)

- [ ] 2.1 `server/statementSeries.js`: `DESTINATIONS`, `SERIES`, `SERIES_TO_AE` exactly as `design.md` D4 + §F freeze them, with a unit test asserting that every `SERIES_TO_AE` id maps to the A&E destination and every other id to A-Finance.
- [ ] 2.2 `server/statementFiling.js`: `buildPlan`, `runPlan`, `resolveConfig` with the frozen signatures of D3 and the JSON shapes of D8. `buildPlan` performs no write, no delete and no `mkdir` — assert it in a test by hashing the tree before and after.
- [ ] 2.3 Classification D5: `.pdf` + `%PDF-` gate, Tier 1 filename, Tier 2 content (text extractor) with the two-halves rule, `statementMonth` → year folder (D5.6), and the `unclassified` / `needs_text_tool` / `unreadable_pdf` reasons.
- [ ] 2.4 Invariants D6/D7: duplicate vs conflict table, md5 both sides (source before, destination after), `copy_mismatch` rollback, bounded delete retry (`deleteAttempts = 2`, `deleteRetryDelayMs = 1200`), `pending_removal` with `reason: 'onedrive_locked'` and never the word "failed".
- [ ] 2.5 `pdftotext` resolver of D10 (`DAYFRAME_PDFTOTEXT` → the verified absolute path → `PATH`) invoked via `execFile` with an argv array, 20 s timeout, 8 MB maxBuffer; no shell string anywhere.
- [ ] 2.6 `server/routes/statementFiling.js` + the one-line mount in `server/index.js`: `GET /preview`, `POST /run`, the two 400 no-input contracts of D2, and the `{ run, plan }` response of D8.
- [ ] 2.7 Persist the run record to `settings['statementFiling.lastRun']` (D9) and read it back in the same test; no migration, no new table.
- [ ] 2.8 Reports D12: misfiled, name variants, unknown names, and the current-Hong-Kong-year coverage matrix (present/missing per series); assert against a sandbox that reproduces the real 2026 pattern (a gapped series shows its missing months).
- [ ] 2.9 Tests: `src/__tests__/statementFiling.test.js` (`// @vitest-environment node`) driving a temp sandbox tree — the whole D14 list that the engine can be held to without HTTP — plus the router smoke by `curl` against a scratch-port server with `DAYFRAME_FILING_*` pointed at the sandbox.
- [ ] 2.10 Rule B: `ROUTE_MAP.md` §2 (the two mounts + the four env overrides) and `DECISION_LOG.md` **ADR-014** (the local agent-trigger contract: parameterless endpoints, no client path/command, `execFile` argv, report-only misfiles). Read the file before appending; keep it append-only.
- [ ] 2.11 Report `npx eslint server src` and the scoped suite numbers against the calm-canvas stage-4 baseline, naming which failures are pre-existing.

## 3. Build — the Finance Review step (`df-fullstack`, card `t_9675ab38`; **parented on `t_63c2607b`**)

- [ ] 3.1 Branch from the calm-canvas stage-4 branch (find it: `git branch -a | grep -E 'ui-s4'`), merge `feat/finance-statement-filing` in so the change artifacts are present, then work there. If `MonthlyReview.jsx` still carries that lane's uncommitted or just-merged repaint, keep it — do not revert it, and say so in the card comment.
- [ ] 3.2 `src/api.js`: `statementFilingService { preview, run, lastRun }` with the exact shapes of D11; `POST /run` sends `{}`.
- [ ] 3.3 `src/components/StatementFiling.jsx` + `.css`: the six states of D11 (idle / scanning / plan / running / result / last-run / error), the three plan lists plus the coverage strip, the frozen wording rule (a verified copy is never called a failure), `role="status"` on the summary and `role="alert"` on errors.
- [ ] 3.4 `MonthlyReview.jsx`: one import + one `<StatementFiling />` element between the Photos section and the Reference section, rendered only when the month is not read-only. Nothing else in that file changes.
- [ ] 3.5 Tests: `src/__tests__/StatementFiling.test.jsx` (jsdom) for the states, the wording rule, the read-only-month absence, and the service contract; no test may call the real endpoints — mock `statementFilingService`.
- [ ] 3.6 Rule B: `ROUTE_MAP.md` §1 (the new component and which component renders it) + `ARCHITECTURE.md` §2 (component tree) + one appended UI line in ADR-014. Read both files first, keep the edits additive, and confirm `git diff --stat` shows no EOL churn (`dayframe-dev-repo` §5).
- [ ] 3.7 Ship on its own branch + PR (base = the stage-4 branch; `gh` is not installed — `dayframe-dev-repo` §8), with a headless screenshot of the step per POL-004.

## 4. Verify — the filing job against a sandbox (`df-tester`, card `t_94940816`)

- [ ] 4.1 Execute the whole `design.md` D14 recipe: sandbox tree with the eight named cases, read-only preview (two calls, tree hash unchanged), a full run with md5 verification per pair, the idempotency re-run, the lock/`pending_removal` path (say which method produced the lock), the two 400 no-input contracts, and a diff grep proving no request value reaches `execFile`/`fs`.
- [ ] 4.2 Hash the three **real** roots (`0. Box`, `A-Finance\statement`, `A-A & E Family\Statement`) before and after the entire verification and report both numbers; the sandbox must be driven through a scratch-port server with `DAYFRAME_FILING_*` set — never the real roots.
- [ ] 4.3 UI pass over HTTP + headless browser: the step renders on the current month only, the preview lists the three groups and the coverage strip, the result summary uses the pending-removal wording, the last run survives a reload. Screenshot as evidence.
- [ ] 4.4 POL-004 commands: scoped `npx vitest run --exclude='**/.worktrees/**'`, `npx eslint src server`, `npx vite build` — each against the same baseline as the build cards, with pre-existing failures named separately.
- [ ] 4.5 Attempt to falsify, don't just confirm: try to make the job overwrite a destination, move an unidentifiable PDF, file a non-PDF, double-file on a re-run, or reach a folder outside the config — and report what happened. A pass with no falsification attempt is not a pass.
- [ ] 4.6 Report: what was verified, the exact commands, what could not be verified and why.

## 5. Close out — archive, Rule B sweep, final report (`df-lead`, card `t_8d16d0fc`)

- [ ] 5.1 Tick §1–§4 with the evidence each card named (PR, head SHA, the measured numbers) — never a bare `[x]`, never ticking what did not happen.
- [ ] 5.2 `openspec validate finance-review-statement-filing --strict`, then `openspec archive finance-review-statement-filing`; verify the merged `openspec/specs/statement-filing/spec.md` exists with every requirement and that `openspec/specs/monthly-financial-review/spec.md` gained the new requirement (and that no `## MODIFIED Requirements` header leaked into a base spec).
- [ ] 5.3 Rule B final sweep: `ROUTE_MAP.md` §1/§2/§3, `ARCHITECTURE.md`, `DATA_MODEL.md` §1 (the `statementFiling.lastRun` key) and `DECISION_LOG.md` (ADR-014 + the open item for the cleaner's hardcoded `2026` destination list) must describe the shipped code.
- [ ] 5.4 Confirm the calm-canvas S4 repaint and this step coexist on the merged branch (one commit touching both, or a recorded merge) and that the finance read-only rule (CONV-002) still holds.
- [ ] 5.5 Final report on `t_c905319a`: PR, archive path, specs merged, commands, open items, anything unverified.
