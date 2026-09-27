# Tasks: hide-today-timeline

Card ids are recorded in the kanban thread on the proposal card `t_77858d71` (these artifacts
were committed before the cards were created). Order is enforced by the board's `parents`
edges: spec → build → verify → close-out, with the build additionally gated on the
capture-row close-out `t_30eb4ff5` (design.md §1.8 / D1).

## 0. Proposal (df-lead) — artifacts, done

- [x] 0.1 `proposal.md` + `design.md` + this file committed on `feat/hide-today-timeline` (cut from `master` `95b0fa2`), with §1's anchors read out of the code and the 1440px column budget measured (design.md §1.3).
- [x] 0.2 The delta written as **two ADDED requirements** on `ui-presentation-system` (`specs/ui-presentation-system/spec.md`) — the change could not be delta-less: `openspec validate --strict` refuses one, and stating the surface is how the reversal gets recorded. `openspec validate hide-today-timeline --strict` → valid (design.md §5).
- [x] 0.3 Gate baseline measured on `master` `95b0fa2`: **34 files / 468 tests / 0 failed** (33 / 463 without the cross-lane untracked `wrModeStorage.test.jsx`).
- [x] 0.4 Merge order fixed against the in-flight capture-row change (same two source files + the same `ROUTE_MAP.md` cell): this change merges **second** (design.md §1.8 / D1).

## 1. Spec (df-analyst) — read-only verification of this design

- [ ] 1.1 Re-read `design.md` §1 against the code and confirm or correct every anchor by its source text: the single render site in `TodayView.jsx`, the four layout rules in `TodayView.css`, the `.tl-container` 220px slack, and the "nothing else depends on the panel" claim (`grep` of `src/` and `src/__tests__/`).
- [ ] 1.2 Publish the edge-case matrix (what happens at 1440 / 1024 / 768 / 420, with 0 tasks, with only untimed tasks, with timed tasks whose `startTime` is outside 6am–9pm, with a 400-character task title, with the row actions visible).
- [ ] 1.3 Publish the stale-claim list: any comment, doc or `.dev_context` sentence this change falsifies beyond the three files in design.md §4 — in particular anything claiming the Today view has three columns.
- [ ] 1.4 Confirm `TodayView.noTimeline.test.jsx`'s three assertions are the right gates and that no existing test file needs an edit beyond the one inert `vi.mock` line (design.md D6). No files edited; findings as a comment on the build card.

## 2. Build (df-fullstack) — the hide, the reflow, the tests, Rule B

- [ ] 2.1 **First step, before any edit:** `git fetch origin && git merge origin/master` on `feat/hide-today-timeline`, and confirm the capture row (`<CaptureLine variant="row" …>`) is in `TodayView.jsx`. Measure the gate baseline on that merged tree.
- [ ] 2.2 `TodayView.jsx`: remove the `import DailyTimeline from './DailyTimeline';` line and the `.today-timeline-panel` wrapper block. Keep `formatTime`, `.tv-task-time` and every other element (design.md D4).
- [ ] 2.3 `TodayView.css`: delete `.today-timeline-panel` (base rule) and its `@media (max-width: 768px)` sibling; add `.tv-task-content { max-width: 640px }` with the reason in a comment, and `.tv-task-meta { margin-left: auto }` (D2, D3).
- [ ] 2.4 `DailyTimeline.jsx` header comment + one appended sentence in `DailyTimeline.css`'s header block; no declaration changes, no `.tl-*` rule touched (D5).
- [ ] 2.5 `src/__tests__/TodayView.noTimeline.test.jsx` — T1, T2, T3 exactly as design.md §3.
- [ ] 2.6 `src/__tests__/todayQuickCapture.test.jsx` — delete the inert `vi.mock('../components/DailyTimeline', …)` line only (D6).
- [ ] 2.7 `.dev_context` Rule B edits exactly as design.md §4 (ADR-017 in §A, one tail changelog bullet, ARCHITECTURE §1, ROUTE_MAP §1). Never the `Owner:` header (POL-007).
- [ ] 2.8 Gates in the foreground: `npx vitest run --exclude='**/.worktrees/**' --exclude='not relevant/**'` (0 failed), `npx eslint src` (no new problem), `npx vite build` ok, `openspec validate hide-today-timeline --strict` valid, `git diff` contains no literal hex / `font-size` / `border-radius` (D7).
- [ ] 2.9 Push the branch and open the PR to `master` with the REST recipe (no `gh` on this box); do **not** merge — the close-out card merges after the tester passes.

## 3. Verify (df-tester) — the acceptance gate

- [ ] 3.1 Re-run every gate on the PR head and re-measure the numbers independently (design.md §6): panel width at 1440, `.tv-task-content` measure, no horizontal scrollbar, single column ≤768px.
- [ ] 3.2 Screenshots at 1440 / 1024 / 768 / 420px in both token sets, with a populated list **including tasks that carry `startTime`** — the case that proves nothing breaks while the panel is hidden.
- [ ] 3.3 Fail the inversion honestly: against the pre-change tree, confirm T1/T3 fail (the panel's markup is present and `TodayView.jsx` still names `DailyTimeline`).
- [ ] 3.4 Browser checks: a timed task opens `TaskModal` with its `startTime`/`endTime` populated and saves; `j`/`k` still walk rows; no orphan gap behind the row's last element.
- [ ] 3.5 Confirm Rule B on the branch: ADR-017 present and uniquely numbered, tail changelog bullet added, `ARCHITECTURE.md` no longer shows the `Today --> Timeline` edge, `ROUTE_MAP.md` no longer lists `DailyTimeline` for `today`, `DATA_MODEL.md` untouched, `Owner:` line unchanged in all four files.

## 4. Close-out (df-lead) — merge, archive, Rule B on `master`

- [ ] 4.1 Merge the PR after the tester's pass (no force push, no history rewrite — POL-001).
- [ ] 4.2 `openspec archive hide-today-timeline` on a fresh docs branch and merge that.
- [ ] 4.3 Re-check Rule B on merged `master`, re-run the three gates, and report to the owner in plain language on the proposal card `t_77858d71`.
