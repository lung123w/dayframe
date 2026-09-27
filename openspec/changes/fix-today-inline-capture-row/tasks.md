# Tasks: fix-today-inline-capture-row

Spec: `openspec/changes/fix-today-inline-capture-row/specs/today-quick-capture/spec.md`
Design: `openspec/changes/fix-today-inline-capture-row/design.md` (§2 D1-D9 are binding)
Branch: **`fix/today-inline-capture-row`** — one branch for this change; `master` stays
clean (POL-002). PR at the end of card 2; cards 3 and 4 do not open new branches.

Card ids: the placeholders below (`t_<analyst>` / `t_<build>` / `t_<verify>` /
`t_<closeout>`) are resolved in the comment thread of `t_61fb3c21`.

## 1. Spec & edge cases — `df-analyst`, card `t_<analyst>`, parent `t_61fb3c21`

- [ ] 1.1 **Read-only.** Read `openspec/changes/fix-today-inline-capture-row/{proposal,design}.md`,
  the delta spec, `src/components/CaptureLine.{jsx,css}`, `src/components/TodayView.jsx:330-380`,
  `src/components/TodayView.css:97-190` and `src/components/keyboard.js:127-176`.
- [ ] 1.2 Confirm or refute each §1 baseline fact against the code at the branch head, with
  `file:line`. Any mismatch is a **blocker comment**, not a silent fix.
- [ ] 1.3 Produce the **edge-case matrix** the build is held to: focus in/out (input →
  select → outside), Tab order into the revealed controls, `Escape` on Today (clears while
  the row is expanded), the `/` key from another view then navigating to Today, click on
  the row's padding (does it focus the input?), an empty `projects` list, a very long
  project name at 420 px, and the collapsed row with a stored D9 project selected. For
  each: expected behaviour + which assertion (existing test, new test, or manual
  screenshot) covers it.
- [ ] 1.4 List every place in `src/` and `.dev_context/` that asserts or describes the
  stage-2 "capture is a shell element" state and would go stale — grep
  `CaptureLine|quick capture|app-chrome` across `src/**`, `src/__tests__/**` and
  `.dev_context/*.md`. Report as a checklist; do not edit code or docs.
- [ ] 1.5 **No commits, no file edits, no PR.** Deliverable is one `kanban_comment` on your
  own card (matrix + stale-claims list) and one on the build card. Complete with
  `summary` + `metadata`.

## 2. Build — `df-fullstack`, card `t_<build>`, parent `t_<analyst>`

- [ ] 2.1 Start from the branch head of `fix/today-inline-capture-row` (it already carries
  this change's OpenSpec artifacts and the ADR-015 dev-context updates). Create your
  worktree with `git worktree add .worktrees/<your-task-id> fix/today-inline-capture-row`
  from the repo root — do **not** branch off `master` and do **not** touch the parked
  `WORK-toggle Phase 1` stash or the untracked `src/__tests__/wrModeStorage.test.jsx`
  (POL-003).
- [ ] 2.2 `src/components/CaptureLine.jsx` — add `variant = 'shell'`. In the `row` variant
  wrap the existing markup in a row container that (a) sets `expanded` on `onFocus`,
  (b) clears it on `onBlur` **only** when `event.relatedTarget` is outside the wrapper,
  and (c) renders the project/priority block only while `expanded`. Keep the input's
  `aria-label="Quick capture task"`, its `className="capture-line-input"` (the `/` key and
  the palette resolve it by that class) and the whole Enter/Escape/empty/defaults code
  path untouched (design.md D9). Do **not** add `data-kbd-row` (design.md D4).
- [ ] 2.3 `src/components/CaptureLine.css` — add the `.capture-line--row` block: same
  horizontal rhythm, hairline bottom border and `--font-row` type as `.tv-task`
  (`TodayView.css:166-186`), transparent ground, `padding: var(--space-2) var(--space-4)`.
  **Tokens only** — no literal 6-digit hex, no literal `font-size`, no literal
  `border-radius` (ADR-013 / the `refactor/ui-token-sweep` outcome). Keep the control
  cluster **shorter than the input box** so the row height is identical when collapsed and
  expanded at ≥768 px (design.md D5). Scope every rule to `.capture-line--row` so the
  shell variant's chrome is not repainted.
- [ ] 2.4 `src/components/TodayView.jsx` — import `CaptureLine` and render
  `<CaptureLine variant="row" projects={projects} onCaptured={onDataChange} />` as the
  **first child of `.today-tasks-panel`**, above the `OVERDUE` block. No new prop on
  `TodayView`.
- [ ] 2.5 `src/App.jsx` — render the shell `CaptureLine` only when
  `activeView !== 'today'`, with a comment naming the reason (one capture affordance per
  view; Today owns it inside the list — ADR-015).
- [ ] 2.6 Tests.
  - [ ] 2.6.1 `src/__tests__/todayQuickCapture.test.jsx`: **replace** the
    `does not leave a second capture line inside TodayView` test (it encodes the reversed
    stage-2 decision — design.md §3) with (a) DOM order — the capture row is the first
    child of `.today-tasks-panel` and precedes the `OVERDUE` header, with an overdue task
    seeded so the header exists, and (b) the focus-reveal assertions (absent unfocused →
    present on focus → still present with focus on the Project select → absent after
    focusing an element outside the row).
  - [ ] 2.6.2 `src/__tests__/App.test.jsx`: add the "exactly one capture input on Today"
    assertion on the cold open.
  - [ ] 2.6.3 No other test file may need an edit. If one does, stop and comment on your
    card with the diff — `keyboardLayer.test.jsx` passing **unchanged** is the evidence
    that the keyboard layer was not disturbed (design.md D4/§3).
- [ ] 2.7 Gates (all in the **foreground**; a backgrounded `vite build` dies headless):
  `npx vitest run --exclude='**/.worktrees/**' --exclude='not relevant/**'` → expect
  **≥34 files / ≥418 tests / 0 failed** (baseline 32/414/0), `npx eslint src` → no new
  problems (`origin/master` baseline is 6), `npx vite build` → ok.
- [ ] 2.8 Commit (conventional, small — code, tests and the CSS as separate commits if
  convenient), push the branch, and open the PR to `master` via the REST API (`gh` is not
  installed; use a token from `git credential fill`, never echo it). PR body: what
  changed, the three gates' real output, and the one deliberate test inversion.
- [ ] 2.9 `.dev_context/` is **already updated on this branch** — do not rewrite it. Only
  if the implementation differs materially from design.md D1-D5, comment on your card and
  append one changelog bullet; do not restructure the docs.

## 3. Verification (acceptance gate) — `df-tester`, card `t_<verify>`, parent `t_<build>`

- [ ] 3.1 Check out the PR head and re-run every gate yourself — the builder's output is a
  claim, not evidence.
- [ ] 3.2 **Fail the inversion honestly:** against the pre-change code (the merge-base with
  `master`), confirm the new DOM-order test and the focus-reveal test **fail** — a test
  that passes before and after proves nothing.
- [ ] 3.3 Headless browser at **1440 / 1024 / 768 / 420 px**, both token sets (dark is
  forced with `document.documentElement.classList.add('dark')` — design.md D8; the caption
  must say the app ships light-only): collapsed row, focused/expanded row, and a captured
  task landing directly beneath the row. Assert the first task row's top coordinate is
  **unchanged** by focusing the row at ≥768 px; at 420 px assert usability instead (input
  width ≥ 200 px, both controls operable) — design.md D5.
- [ ] 3.4 Confirm the behavioural contract by hand in the browser: Enter creates with
  today's date and no reload, Escape clears while the row is expanded, empty Enter creates
  nothing, the stored D9 project/priority is still inherited, `/` still focuses from
  another view, and the palette entry still focuses the line.
- [ ] 3.5 Confirm **exactly one** capture input in the DOM on Today and on Habits, and that
  the other five views' chrome is unchanged (screenshot the Habits view too).
- [ ] 3.6 Confirm the row carries no `data-kbd-row` and no `.tv-task` class, and that
  `j`/`k` still start on the first task row on Today.
- [ ] 3.7 Check the token discipline in the diff: no literal 6-digit hex, no literal
  `font-size`, no literal `border-radius` in the changed CSS. Check the docs: `Owner:
  `df-lead`` still byte-identical in all four context files (POL-007), ADR-015 present in
  `DECISION_LOG.md`, and the three edited `.dev_context` files' claims match the code.
- [ ] 3.8 Report every failure with its reproduction; do not file the accepted cosmetics
  (the clipped focus ring inside `.today-tasks-panel`, the 420 px wrap) as new defects —
  they are recorded in design.md §5.

## 4. Close-out — `df-lead`, card `t_<closeout>`, parent `t_<verify>`

- [ ] 4.1 Only after the tester's pass: merge the PR to `master` (no history rewrite, no
  force push), then `openspec archive fix-today-inline-capture-row` and confirm the delta
  landed in `openspec/specs/today-quick-capture/spec.md` with the file still structurally
  valid (`## Purpose` + `## Requirements`).
- [ ] 4.2 Re-check Rule B on `master` after the merge (the three context files present the
  new state) and the POL-007 gate check (`grep -h '^Owner:' .dev_context/*.md | sort -u |
  wc -l` → 1).
- [ ] 4.3 Post the one-paragraph outcome (PR number, gates, what the owner sees now) and
  complete.

## Out of scope (do not start here)

| Item | Why not |
|---|---|
| Restyling the shell capture line on the other five views | Requirement 5: their chrome is frozen. |
| Making the capture row a `data-kbd-row` | design.md D4 — it would move the first `j` target. |
| A dark-mode switch | ADR-013: dark is designed for, not built. |
| Any API, schema, `src/api.js` or `server/` change | Capture's payload and route are unchanged. |
