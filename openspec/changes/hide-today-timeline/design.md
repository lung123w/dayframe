# Design — hide the Timeline panel in the Today view

Binding contract for the build and verify cards. Where a card body and this file disagree,
**this file wins**. Line numbers are the ones at `master` `95b0fa2` (2026-09-27); after the
capture-row change lands (§1.8) they shift — locate every anchor by its **source text**, not
by its number.

## 1. Code facts (verified against the code, not from memory)

1. `DailyTimeline` has exactly one render site. `grep -rn DailyTimeline src/` →
   `src/components/TodayView.jsx:3` (`import DailyTimeline from './DailyTimeline';`) and
   `src/components/TodayView.jsx:384-390`:
   ```
   <div className="today-timeline-panel">
     <DailyTimeline dateStr={today} tasks={tasks} projects={projects} />
   </div>
   ```
   plus two inert `vi.mock('../components/DailyTimeline', …)` lines in tests
   (`todayQuickCapture.test.jsx:23`, `DailyPlanner.weekNavigation.test.jsx:10`). No other view
   mounts it. The component is display-only: it imports `./DailyTimeline.css` and
   `generateRecurringTasks` from `../utils/recurrence`, computes groups from its props, and
   calls nothing that writes.
2. `TodayView.css` layout mechanism (the thing the reflow must not break):
   - `.today-content` → `display: flex; gap: var(--space-4); padding: var(--space-4)` (line 83)
   - `.today-left-column` → `width: 260px; flex-shrink: 0` (line 91)
   - `.today-tasks-panel` → `flex: 1; min-width: 0; overflow-y: auto` (line 97)
   - `.today-timeline-panel` → `width: 300px; flex-shrink: 0` (line 109) — **the wrapper**, and
     inside it `.tl-container` is `width: 220px` (`DailyTimeline.css:7`), so 80px of the
     column is already slack
   - `@media (max-width: 768px)` (line 394) sets `.today-content { flex-direction: column }`,
     `.today-left-column { width: 100% }` and `.today-timeline-panel { width: 100%; height: 350px }`
     (line 404).
3. Column budget at 1440px (arithmetic from 2): the task panel is
   `1440 − 32 (content padding) − 260 (habits rail) − 32 (two 16px gaps) − 300 (timeline)`
   = **816px** today; with the wrapper gone and one gap left it becomes **1132px**. At ≤768px
   the vertical column rule already governs, so the "collapses to a single column at narrow
   widths" behaviour is that media block — it stays, minus the timeline's own rule.
4. The row already prints its time: `TodayView.jsx:247-252` renders `.tv-task-time` from
   `task.startTime` / `task.endTime`. Nothing about the panel's information disappears from
   Today.
5. Nothing else in the tree depends on the panel: `grep -rn "tl-\|No time set\|today-timeline-panel" src/__tests__/` → no hits. `keyboardLayer.test.jsx` reads `TodayView.css` only
   for `.tv-task:focus` and `.tv-move-btn`; `TodayView.rows.test.jsx` only for `.tv-task` /
   `.tv-move-btn` / the `.tv-row-*` hover gates. Neither touches the rules this change removes.
6. No test covers `startTime` editing: `TaskModal.test.jsx` has no `startTime` case, and
   `DayColumn.test.jsx:356-400` covers the Week view's time badge. The Today-side evidence is
   therefore ours to add (§3 T2).
7. There is **no keep/ignore list** from the S0 dead-code work: that stage (card `t_aa4715eb`)
   deleted its four components outright and left no list —
   `grep -rni "keep-list|ignore list|do not delete" openspec/ .dev_context/` finds nothing that
   enumerates components. So the doc comment is the only keep mechanism this repo has (§2 D5),
   and no worker needs to go looking for a list.
8. **Collision with the in-flight capture-row change (why the order is fixed).** Branch
   `fix/today-inline-capture-row` (PR #42, close-out card `t_30eb4ff5`) touches the same two
   source files: it inserts `import CaptureLine from './CaptureLine';` **immediately above** the
   `import DailyTimeline` line, adds a comment-only block in `TodayView.css:387-395`, and
   rewrites the same `today` row of `ROUTE_MAP.md` §1 that this change must rewrite. Editing
   both in parallel would put a conflict in the import block, in `TodayView.css` and in the one
   ROUTE_MAP cell, and the tested head would not be the merged head. **This change therefore
   merges second** (§2 D1).
9. Measured gate baseline on `master` `95b0fa2` (this card, 2026-09-27 22:52):
   `npx vitest run --exclude='**/.worktrees/**' --exclude='not relevant/**'` →
   **34 files / 468 tests / 0 failed**. Without the cross-lane untracked
   `src/__tests__/wrModeStorage.test.jsx` (exactly 5 tests, POL-003) → **33 files / 463 / 0**.
   Never count that file as ours and never touch it.

## 2. Decisions

**D1 — Branch and merge order.** The work happens on `feat/hide-today-timeline`, created from
`master` @ `95b0fa2` by `df-lead` (`t_77858d71`) and already carrying this change's artifacts.
The build card is gated on the capture-row close-out (`t_30eb4ff5`) and its **first step** is
`git fetch origin && git merge origin/master` — the capture row is then in the tree and
`TodayView.jsx` / `TodayView.css` / `ROUTE_MAP.md` are edited once, on the merged state. No
worker merges into `master`; the close-out card does that after the tester passes.

**D2 — Reflow: the panel takes the space, nothing is left behind.** Delete
`.today-timeline-panel` entirely (the base rule at 109-112 **and** the `@media (max-width:
768px)` sibling at 404-407). Do **not** add a placeholder, a spacer, a fixed gutter, a
`calc()` compensation or a new column — `.today-tasks-panel` keeps `flex: 1; min-width: 0` and
absorbs the 300px (816 → 1132px at 1440). At ≤768px the single-column rule is unchanged.

**D3 — Measure cap (this is the "no absurdly long measure" requirement, made measurable).**
In `TodayView.css`:
- `.tv-task-content { max-width: 640px }` — one added declaration, next to a comment naming
  the reason (the panel is ~1132px at 1440 now the timeline column is gone).
- `.tv-task-meta { margin-left: auto }` — without it the capped content no longer absorbs the
  free space and the metadata/actions would float left of the row's right edge with an orphan
  gap behind them.
Numbers: at 1440 the text column measured ≈420–520px before the change (panel 816 − 32px row
padding − ~20px status button − 2×12px gaps − the row actions ≈110px − the meta block); 640px
therefore **gains** width and still caps the description (12px) near 100 characters instead of
~190. Acceptance at 1440px: rendered `.tv-task-content` **> the pre-change width and ≤ 720px**,
and the row's last element flush to the panel's right content edge (±1px) as it is today.
640px is a width, not one of the three banned literals (hex / `font-size` / `border-radius`),
and the file already carries `260px` / `300px`.

**D4 — Remove only what is genuinely dead.** In `TodayView.jsx`: the `import DailyTimeline`
line and the `.today-timeline-panel` wrapper block (keep `formatTime`, `.tv-task-time`, and
everything else). In `TodayView.css`: the two `.today-timeline-panel` rules. Nothing else.
**Do not touch `.tl-*`** — those rules live in `DailyTimeline.css` and travel with the
component. Do not touch `utils/recurrence.js`, `TaskModal.jsx`, `DayColumn.jsx` or `App.jsx`.

**D5 — The component stays, on purpose, with the reason written down.** §1.7 — there is no
keep list to add to, so the comment is it:
- At the top of `src/components/DailyTimeline.jsx` (which today has no header comment), add:
  *"NOT RENDERED — the Today view deliberately does not mount this panel (owner request
  2026-09-27, ADR-017) and the freed 300px went to the task list. This component is
  **retained, not dead**: re-rendering `<DailyTimeline dateStr={…} tasks={…} projects={…} />`
  from `TodayView.jsx` — optionally behind a toggle in `TopStrip.jsx` — is the intended way
  back. Do not delete it in a dead-code sweep; `src/__tests__/TodayView.noTimeline.test.jsx`
  (T3) asserts both files still exist."*
- Append one sentence to the existing header block of `src/components/DailyTimeline.css`
  ("the panel is retained but not rendered — see the component's header and ADR-017").
No CSS declaration changes in either file.

**D6 — Tests** — one new file (§3). The only existing-test edit is deleting the inert
`vi.mock('../components/DailyTimeline', …)` line at `todayQuickCapture.test.jsx:23`: TodayView
no longer imports that module, so the mock mocks nothing. Leave
`DailyPlanner.weekNavigation.test.jsx:10` alone (also stale — `DailyPlanner` never rendered it
— but out of scope; flag it, do not fix it).

**D7 — Token discipline.** The only CSS this change touches is `TodayView.css`, which is at
0 literal hex / 0 literal `font-size` / 0 literal `border-radius` after the token sweep: add
none. No new token, no new dependency.

**D8 — Rule B (`§4`).** `DECISION_LOG.md` gains **ADR-017** in §A plus one tail
`## Changelog` bullet; `ARCHITECTURE.md` drops the `Today --> Timeline` edge and corrects the
"children of TodayView" note; `ROUTE_MAP.md` §1 drops `DailyTimeline` from the `today` row's
component list. `DATA_MODEL.md` untouched. **Never edit the `Owner:` header line** (POL-007);
append to the tail changelog instead.

## 3. Tests — `src/__tests__/TodayView.noTimeline.test.jsx` (new)

Mock the API services exactly as `src/__tests__/TodayView.rows.test.jsx:8-24` does
(`taskService`, `habitService`, `habitEntryService`, `workflowStepService`,
`workflowCompletionService`) and render `<TodayView tasks projects todayOrder …/>` through the
same prop shape. Two tasks minimum: one with `startTime: '09:00', endTime: '10:30'`, one
without a time.

- **T1 — the Today view renders none of the panel's markup.** With both tasks present (so the
  assertion is not vacuous — pre-change the panel's body is non-empty for this fixture):
  `container.querySelector('.tl-container')` is `null`; `container.querySelector('.tl-header-title')`
  is `null`; `screen.queryByText(/^Timeline$/)` is `null`; `screen.queryByText(/No time set/i)`
  is `null`. Assert on the panel's own markup, never on a reusable class such as a bare grid
  rule.
- **T2 — a timed task is still reachable and editable from Today.** The timed task's row
  renders (title present) and shows its time in `.tv-task-meta` (`9am – 10:30am`); clicking
  the row calls `onTaskClick` with that task — that click is the path into `TaskModal`, where
  `startTime`/`endTime` are edited. Say in the test file's header that the modal's own
  `startTime` editing is covered by `TaskModal.jsx` being untouched and by the tester's
  browser check, and that the Week-view badge is already covered by
  `DayColumn.test.jsx:356-400`.
- **T3 — the reversible-hide guard.** `existsSync('src/components/DailyTimeline.jsx')` and
  `existsSync('src/components/DailyTimeline.css')` are `true`, and the source text of
  `src/components/TodayView.jsx` contains no `DailyTimeline` (no import, no render). Same
  static-check style as `keyboardLayer.test.jsx`'s stylesheet assertions — this is what stops a
  later dead-code pass from sweeping the component.

No other test file may need an edit; if one does, stop and comment on the card.

## 4. Rule B — the exact `.dev_context` edits

1. `DECISION_LOG.md` §A, appended after the last ADR entry and before `## B. Product / UI
   conventions`:

   > **ADR-017 — The Today view does not render the Timeline panel; the component is
   > retained.** *(2026-09-27, owner request; card `t_77858d71`)*
   > *Decision.* `TodayView.jsx` no longer imports or renders `DailyTimeline`, and
   > `.today-timeline-panel` is out of `TodayView.css`, so the 300px the third column held goes
   > to `.today-tasks-panel` (816 → 1132px at 1440), with a 640px reading-measure cap on the
   > row's text column. `DailyTimeline.jsx` / `DailyTimeline.css` stay in the repo with a
   > "not rendered" header comment.
   > *Why.* The panel is display-only — it groups tasks that carry a `startTime` onto a
   > 6am–9pm grid and lists the rest under "No time set"; it sets no time, offers no drag-drop,
   > and every row already prints its own time (`.tv-task-time`). Hiding it removes no
   > capability: `startTime`/`endTime` stay editable in `TaskModal.jsx` and timed tasks stay
   > laid out by `DayColumn.jsx` on the Week view. The owner asked for it gone from the UX on
   > 2026-09-27.
   > *Re-entry trigger.* If time-blocking is wanted again, re-render
   > `<DailyTimeline dateStr tasks projects />` from `TodayView.jsx` — optionally behind a
   > toggle in `TopStrip.jsx`. This is **not** Concept B: *Timeline Studio* (ADR-013) stays
   > deferred behind the time-model ADR; ADR-017 records a deliberate, one-line-reversible hide
   > of the display-only panel.

2. `DECISION_LOG.md` tail `## Changelog`, one new bullet (newest last):

   > `- **2026-09-27** — the Today Timeline panel is hidden (owner request): `TodayView.jsx` no longer imports or renders `DailyTimeline`, `.today-timeline-panel` is out of `TodayView.css`, and the freed 300px went to the task list with a 640px measure cap on `.tv-task-content`; the component and its stylesheet are retained on purpose with a "not rendered" header comment (re-rendering it is the way back) — ADR-017, card `t_77858d71``

3. `ARCHITECTURE.md` §1: remove the graph edge `    Today --> Timeline["DailyTimeline.jsx"]`
   and, in the "Notes verified against the import graph" list, change the note that begins
   ``- `PlannerHabitsPanel`, `DailyTimeline` and `DeferPopover` are children of **TodayView**``
   so it names only `PlannerHabitsPanel` and `DeferPopover` as rendered children and adds:
   "`DailyTimeline.jsx` is **retained but not rendered** by any view (ADR-017 — the Today
   Timeline panel is hidden on purpose; re-rendering it from `TodayView.jsx` is the way back)."
4. `ROUTE_MAP.md` §1: in the `today` row, drop `DailyTimeline` from the component list
   (`(+ PlannerHabitsPanel, DeferPopover, UndoToast)`) and add one clause at the end of that
   cell: "The Timeline panel is **deliberately not rendered** (ADR-017 — the component is kept,
   the panel is not)". Nothing else in the row changes.
5. `DATA_MODEL.md`: no edit (no schema change). The `Owner:` line in all four files: no edit.

## 5. Out of scope / accepted

- **The delta is two ADDED requirements, nothing MODIFIED** (proposal §Capabilities,
  `specs/ui-presentation-system/spec.md`): *The Today view is the habit rail plus one
  full-width task list* (4 scenarios) and *A hidden presentation component is retained with its
  re-entry recorded* (2 scenarios). `openspec validate hide-today-timeline --strict` must pass
  on the branch, and `openspec/specs/ui-presentation-system/spec.md` must be untouched until
  the close-out archives the change — that is where the two requirements land.
  <!-- Two requirements is deliberate: `openspec validate` refuses a change with no delta, and
       a spec that states the surface is how the reversal gets recorded (a future delta). -->
- `DailyPlanner.weekNavigation.test.jsx:10`'s stale mock — flagged, not fixed (§2 D6).
- `startTime`/`endTime` editing, the Week view's time layout, `utils/recurrence.js`, the
  capture row (PR #42) and the app shell are untouched.
- The already-accepted cosmetic in `DECISION_LOG.md` §D (the focused row's ring clipped
  left/right inside the scrollable `.today-tasks-panel`) is unchanged by this work — do not
  file it.

## 6. What the verification must measure (browser, not jsdom)

At 1440 / 1024 / 768 / 420px, light and forced dark (`document.documentElement.classList.add('dark')`
— dark is not wired, the caption must say it is a token-legibility check):

- `.today-timeline-panel` count is 0, `.tl-container` count is 0, no "Timeline" heading, no
  "No time set" text — with a populated list **including tasks that have a `startTime`/**
  `endTime` set.
- The panel's own width at 1440 (`getBoundingClientRect`): ~1132px after vs ~816px before
  (measure the pre-change value from `origin/master`'s checkout, or record it from the earlier
  build's evidence).
- `.tv-task-content` width at 1440: strictly greater than the pre-change value and ≤ 720px;
  the row's last child flush to the panel's right content edge; `.today-tasks-panel` has
  `scrollWidth <= clientWidth` (no horizontal scrollbar).
- ≤768px: still a single column (habits rail above the list), no clipped or overflowing row.
- One timed task: opens `TaskModal` on click with `startTime`/`endTime` populated and saves
  unchanged; `j`/`k` still walk the task rows, not the capture row.
- `grep` gates: `npx eslint src` (baseline 6 problems), `npx vite build` ok,
  `npx vitest run --exclude='**/.worktrees/**' --exclude='not relevant/**'` 0 failed, 0 new
  literal hex / `font-size` / `border-radius` in the diff, `openspec validate … --strict` valid.
