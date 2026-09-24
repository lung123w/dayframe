# Tasks — ui-modernization-calm-canvas

Delivery rule: **one stage = one branch = one PR = one build card + one `df-tester` verification card**, chained with `parents`. A stage is not Done until its verification card passes — a tester pass **is** the acceptance gate (POL-001), so no card waits for a human. Every card body carries the must-not-regress guard.

Sanity check before any stage: `grep -c "ADR-012" .dev_context/DECISION_LOG.md` must not be 0 (the base is `design/ui-direction` and later the stage stack, never `master`).
Merge order: `master` ← PR #15 → PR #17 → PR #20 (`design/ui-direction`) → `design/ui-modernization` (this change) → `feat/ui-s0-dead-code` → `feat/ui-s1-tokens` → `feat/ui-s2-shell` → `feat/ui-s3-today-habits` → `feat/ui-s4-week-review-finance` → `feat/ui-s5-keyboard` → `docs/ui-modernization-archive`.

## 0. Baseline + dead code

- [x] 0.1 Record the scoped baseline **before** any deletion: `npx vitest run --exclude='**/.worktrees/**'` → 28 files / 331 tests / 1 pre-existing `MiniWeekBar.test.jsx:38-39` failure; `npx eslint src` → 8; `npx vite build` → ok. Also record the trap: unscoped runs collect nested `.worktrees/` copies (111 files / 1,309 tests / 6 failed) and `eslint .` reports 473. Write the numbers into `design.md` §10. (card `t_aa4715eb`, `df-fullstack`, branch `feat/ui-s0-dead-code` from `design/ui-modernization`) **Measured 2026-09-24 in this card's worktree of the tracked source:** scoped `npx vitest run --exclude='**/.worktrees/**'` = 27 files / 326 tests / 1 failed (`MiniWeekBar.test.jsx:38-39`, unchanged by the deletions), `npx eslint src` = 8, `npx vite build` = ok. That is one file / five tests below the 28 / 331 above only because the main working tree also carries the untracked `src/__tests__/wrModeStorage.test.jsx` (POL-003). The trap, re-measured from the repo root: 138 files / 1,635 tests / 5 failed and `eslint .` = 669 — collection artefacts of the nested `.worktrees/` checkouts, not regressions.
- [x] 0.2 Delete the 1,828 dead CSS lines and the four components that own them — `Calendar.jsx`/`.css` (916), `DayPanel.jsx`/`.css` (486), `OutstandingTasks.jsx`/`.css` (353), `DailyShutdown.jsx`/`.css` (73) — and the dangling `vi.mock('../components/DailyShutdown', …)` at `src/__tests__/DailyPlanner.weekNavigation.test.jsx:11`. `package.json` untouched (FullCalendar stays declared). (card `t_aa4715eb`)
- [x] 0.3 Execute the `DailyShutdown` decision as recorded in `design.md` §4 (D8): **deleted, not revived**, with no change to `daily_notes` data or the `/api/daily-notes` route; audit F42 stays an open item. (card `t_aa4715eb`)
- [ ] 0.4 Verify stage 0: dead code has no importer, the pre-change and post-change scoped baselines match, the fence holds. (card `t_90607018`, `df-tester`)

## 1. Token layer

- [x] 1.1 Add `src/styles/tokens.css` with every name frozen in `design.md` §2 (D2), the ADR-012 palette, the measured derived tones (D4), **both** mode sets (D5), the type/space/radius/motion scales and one `prefers-reduced-motion` block; import it first in `src/main.jsx`. (card `t_65d60fc8`, `df-fullstack`, branch `feat/ui-s1-tokens`) **Done 2026-09-25:** `src/styles/tokens.css` is 110 lines / 63 custom-property declarations (50 in `:root`, 13 in the D5 dark set), every D2 name present — 17 colour, the 8-row type ladder + 4 weight and 2 leading companions, 8 space, `--radius-control|surface|pill` + `--border` + `--shadow-overlay`, `--motion-fast|state` + `--ease` + the two focus-ring measures + `--font-stack`. The dark set is live and inert (adding `.dark` to `:root` re-reads `--page` as `#101418`, measured in the browser). `tokens.css` declares custom properties only, per D1 — the one `prefers-reduced-motion` block therefore lives in `src/index.css`, which D6 names as its owner (`design.md` §2 D6 supersedes the looser placement in this bullet).
- [x] 1.2 Rewrite `src/index.css` as the single owner of globals and strip the duplicated globals from `src/App.css`; delete the Google-Fonts `@import` at `src/index.css:1` and use `var(--font-stack)`. Components adopt tokens in their own stage — no component repaint here. (card `t_65d60fc8`) **Done 2026-09-25:** `grep -c "@import url" src/index.css` = 0; `:root` takes font/ground/colour from `--font-stack`/`--page`/`--text-body`, adds the one `:focus-visible` recipe and the one `prefers-reduced-motion` block; `src/App.css` lost its duplicate `body`, `box-sizing` and repeated font-stack rules (335 → 324 lines) and keeps shell classes only, with the shell's grounds/lines/labels moved behind `--page`/`--surface`/`--surface-2`/`--hairline`/`--text-subtle`. **One component file was touched:** `src/components/DailyWorkflow.css` — its two `1px solid var(--border, #E2E8F0)` sites used `--border` as a *colour*, while D2 freezes it as the composite `1px solid var(--hairline)`; declaring the frozen shape made both declarations invalid at computed-value time and blanked the panel border (measured `borderTop: 0px none`), so both now read `border: var(--border)` / `border-bottom: var(--border)` (measured `1px solid #E7E5DF`). No other component stylesheet was edited, and no component was repainted.
- [ ] 1.3 Verify stage 1: token names complete, both mode sets present, contrast re-measured against the three light grounds, no font request, substrate-only visual diff. (card `t_f7c31013`, `df-tester`)

## 2. Shell + cold open

- [x] 2.1 Rail → ~52px top strip: `Sidebar.jsx`/`.css` → `TopStrip.jsx`/`.css`, four text destinations + a Radix "More" overflow (Finance · Projects · Backup · Notifications); every destination reachable at ≤768px (closes F16). (card `t_5d2bcf9d`, `df-fullstack`, branch `feat/ui-s2-shell`) **Done 2026-09-25:** `git mv` kept the history; the strip measures **54px at 1440 and 768** (82px at 420, where it wraps to two rows) with **0 hidden and 0 horizontally clipped** destinations, and all six views were clicked through at **1440 / 768 / 420** in the card's own headless Chrome against the worktree's own API + a `sqlite3 ".backup"` copy of the DB — the old `display: none` dead end (`Sidebar.css:93-98`) is gone. `@radix-ui/react-dropdown-menu` is the only dependency added; Escape closes the menu; 0 console errors.
- [x] 2.2 Today is the cold open (`App.jsx:41`) and one `CaptureLine.jsx` in the shell is present on every view, focused by `/`, inheriting the last-used project/priority from `localStorage['dayframe.captureDefaults']` (D9). (card `t_5d2bcf9d`) **Done 2026-09-25:** `useState('today')`; the line is mounted once by `App.jsx` in `.app-chrome` and `TodayView.jsx` no longer renders one (a unit test asserts its absence there). Live run in the card's headless Chrome on the **Review** view: `/` focused the line and typed nothing (`value === ""`), Enter created task **414** with `dueDate 2026-09-25` (today, HK, computed at run time), `status pending`, no project, `priority medium`, and the row appeared in Today's list with no reload. Choosing project 1 / priority `high` wrote `{"projectId":1,"priority":"high"}` to `localStorage['dayframe.captureDefaults']` (read back) and the next capture created task **415** with `projectId 1, priority high` — both verified by re-reading `/api/tasks`, not assumed.
- [ ] 2.3 Verify stage 2: 1440/768/420 reachability, cold open, capture contract, `/` key both ways, capture defaults read back, no router. (card `t_227baf3f`, `df-tester`)

## 3. Today + habits

- [ ] 3.1 Rows instead of cards on Today, the Week day columns and the backlog; row actions reachable in focus and on touch, never hover-only (F10); keep the touch arrow buttons. (card `t_7fd24929`, `df-fullstack`, branch `feat/ui-s3-today-habits`)
- [ ] 3.2 One-click habit logging with zero minutes through the existing entry path (never a second POST for the same day — ADR-008's 409), duration as an optional in-place refinement, the shared minutes input removed (F22/F23), heat map and streaks kept; Radix popovers replace the hand-rolled ones. (card `t_7fd24929`)
- [ ] 3.3 Verify stage 3: one-click write checked in the DB (one row, `timeSpentSeconds = 0`, no 409), per-row isolation, keyboard/touch reachability, undo, `todayOrder`/`sortOrder` and recurrence integrity. (card `t_02d0e623`, `df-tester`)

## 4. Week / review / finance

- [ ] 4.1 Repaint the Week, Review, Finance, Projects and modal surfaces onto tokens; delete their literal hexes/sizes/radii (Projects' Tailwind-gray ramp is F04). (card `t_63c2607b`, `df-fullstack`, branch `feat/ui-s4-week-review-finance`)
- [ ] 4.2 Make the two weeks unmistakable (F35): the planning week and the reviewed week (`weekStart − 1`, ADR-005) each carry an explicit date label; the habit panel keeps reading W−1. (card `t_63c2607b`)
- [ ] 4.3 Debounced saves with one visible status line (D12) in the review, the objectives panel and the finance review; Radix dialogs replace every `window.confirm/alert/prompt` (0 call sites under `src/`). (card `t_63c2607b`)
- [ ] 4.4 Wire the two dead day-select controls (F20) with view-local state, and reconcile the stale `MiniWeekBar.test.jsx` expectation with the component's real control set. (card `t_63c2607b`)
- [ ] 4.5 Verify stage 4: both weeks visible and W−1 proven, debounce/status line, dialogs with focus return + Escape, finance read-only month and ≤8 MB paste, suite fully green. (card `t_472d4fde`, `df-tester`)

## 5. Keyboard layer + palette

- [ ] 5.1 Visible focus everywhere (the token focus recipe as `:focus-visible`; no `outline: none` without a replacement indicator) and the frozen key map from `design.md` §6 (D10): `/`, `j`/`k`, `x`, `t`, `u`, `g`+view, `Escape`, `Ctrl/⌘+K`. (card `t_4925715f`, `df-fullstack`, branch `feat/ui-s5-keyboard`)
- [ ] 5.2 List navigation + the 5-second undo from stage 3, and the command palette as the last, **droppable** slice (no new router, no new `activeView` key, no new app-level state). (card `t_4925715f`)
- [ ] 5.3 Verify stage 5: the full key map exercised, the not-while-typing rule, focus visibility, palette droppability proven by removal, core-state integrity. (card `t_2193556a`, `df-tester`)

## 6. Close-out

- [ ] 6.1 Tick the stage bullets with their evidence, `openspec validate … --strict`, then `openspec archive ui-modernization-calm-canvas` and check the merged deltas landed in `openspec/specs/`. (card `t_55c01442`, `df-lead`, branch `docs/ui-modernization-archive` from `feat/ui-s5-keyboard`)
- [ ] 6.2 Rule B final sweep (`ARCHITECTURE.md`, `ROUTE_MAP.md`, `DECISION_LOG.md` open items), final green suite/lint/build, and the fan-out reported back on the proposal card. (card `t_55c01442`)

## Rule B — per stage, not at the end

| Stage | Document to update in the same branch |
|---|---|
| 0 | `ARCHITECTURE.md` §2/§7, `ROUTE_MAP.md` §1 — the four components are deleted |
| 1 | `ARCHITECTURE.md` §1 — the token layer as the styling substrate (cite ADR-012, do not restate the palette) |
| 2 | `ARCHITECTURE.md` §2/§3/§4.1, `ROUTE_MAP.md` §1 — the shell, the capture line, the six destinations |
| 3 | `ARCHITECTURE.md` §2/§4.1/§4.2, `ROUTE_MAP.md` §1 — rows, focus actions, one-click habits, Radix popovers |
| 4 | `ARCHITECTURE.md` §2/§3/§4.3/§4.4, `ROUTE_MAP.md` §1/§3 — dialogs, both week labels, the focused day |
| 5 | `ARCHITECTURE.md` (keyboard sub-section), `ROUTE_MAP.md` §1 — the palette |
| 6 | Final sweep + `DECISION_LOG.md` open items |

## Out of scope (do not start these here)

| Item | Why it is not in this change |
|---|---|
| Concept B — Timeline Studio | Deferred behind a **time-model ADR** reconciling `scheduledTime` / `startTime`+`endTime` / `estimatedMinutes` (ADR-012). Its fields must not leak into any stage. |
| Tailwind / shadcn-ui / Framer Motion | Deferred with recorded re-entry triggers (ADR-012). |
| Dark mode | Designed for (both token sets written), not built. |
| Removing the FullCalendar dependency | Its only consumer is deleted in stage 0, but dependency removal is its own decision with lockfile/build risk. New open item. |
| The F42 daily close-out ritual | `DailyShutdown.jsx` is deleted in stage 0; a proper close-out surface belongs to a later change once Today's rows have landed. New open item. |
| Habit **count** tracking (ADR-011) | Needs two `ALTER TABLE`s plus route plumbing, i.e. server + DB work — explicitly outside a presentation-only change. |
| The ~115 dead class names inside live stylesheets (F12) and the `assignedTo` UI gap | Those stylesheets are repainted in stages 3–5; the dead rules are deleted as part of that repaint, not as a separate sweep. |
| A router, or a new `activeView` key | The six views and one state string stay; ADR-012 forbids a framework migration. |
| First-run/empty-state design (F40), print/export (F41), `.dev_context` on `master` | Recorded audit findings and process items outside this change's acceptance. |
