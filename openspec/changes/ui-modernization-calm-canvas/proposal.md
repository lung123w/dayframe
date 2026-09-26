## Why

DayFrame scores **12/30** on the UI pillars measured in `docs/design/2026-09-ui-ux-audit.md` (commit `c80e8b8`): 71 hex values across 28 stylesheets, 13 hard-coded font sizes with 194 declarations in the 9–12px band, 173 `:hover` rules against 31 `:focus`, **0** `:focus-visible`, **0** `prefers-reduced-motion`, exactly **1** `tabIndex` in the whole app, hover-only reorder on the Today row, a 3–4-interaction habit ritual, per-keystroke unconfirmed saves, a review screen that shows two different weeks distinguished by an 11px parenthetical, and navigation that is `display: none` below 768px. The app is the owner's daily tool, so it must change **while staying usable at every step**.

The direction is chosen and frozen in `.dev_context/DECISION_LOG.md` **ADR-012 — Concept A "Calm Canvas"** (commit `54804bc`, kanban `t_7783a00e`): light-first paper surfaces, hairline rows instead of cards, one recessive accent reserved for state, the **token layer first**, Radix primitives second, no framework migration, and the keyboard layer as Concept A's own additive stage 5. This change turns that ADR into the specs and the ordered build chain. It does not re-open the choice, and it re-derives no value ADR-012 already records.

## What Changes

- **A token layer** (`src/styles/tokens.css`): colour, type, space, radius and motion as CSS custom properties, both mode sets written from the first commit, plus the derived text tones ADR-012 requires (see `design.md` §2 — every text tone is measured against its ground). The Google-Fonts `@import` at `src/index.css:1` is removed in favour of the local system stack.
- **One shared shell**: the 220px rail becomes a ~52px top strip with four text destinations (Today · Week · Habits · Review) and a "More" overflow (Finance · Projects · Backup · Notifications), so all six views stay reachable at 768px and below (F16/F37).
- **Today becomes the cold open** (`src/App.jsx:41`), and the capture line moves into the shell so it is present on every view, focused by `/`, inheriting the last-used project and priority.
- **Rows instead of cards, and actions in focus instead of hover-only** (F10): move and defer become two text actions reachable by keyboard focus and touch on the Today list, the week's day columns and the backlog.
- **Habit logging becomes one click** (F22/F23): a single activation logs the day with zero minutes, the duration becomes an optional refinement, and the shared minutes input is removed.
- **Debounced, visible saves** (F25/F26): one status line reports pending / saved / not-saved, replacing the per-keystroke write.
- **The review names both weeks** (F35): the planning week and the reviewed week (`weekStart − 1`, ADR-005) each carry their own explicit date label.
- **In-app dialogs replace `window.confirm/alert/prompt`** (F27) via Radix primitives with focus trap, Escape and focus return.
- **A documented keyboard layer** (F08): a visible focus indicator everywhere, list navigation plus undo, then the command palette as the last, droppable slice.
- **Stage 0 deletes dead weight**: 1,828 CSS lines with 0 importers (`Calendar.css`, `DayPanel.css`, `OutstandingTasks.css`, `DailyShutdown.css`) and the four components that own them. `DailyShutdown.jsx` is an explicit product decision in `design.md` §4, not housekeeping.
- **The guard is specified, not hoped for**: `specs/ui-presentation-system/spec.md` carries a requirement that a restyle preserves `todayOrder`/`sortOrder`, the Monday-start and reviewed-week windows, `recurrencePattern` as a JSON object plus status overrides, `descriptionImages` and the finance gallery (including the ≤8 MB paste path and read-only past months), the WORK-toggle area, and the live `data/app.db`.

## Capabilities

### New Capabilities
- `ui-presentation-system`: the token layer, the shared shell and cold open, row and focus conventions, one-click habit logging, debounced and visible saves, in-app dialogs, the documented keyboard layer, and the guard that a presentation change preserves task, habit, period and image behaviour.

### Modified Capabilities
- `today-quick-capture`: the capture line moves from the Today list into the shared shell (present on every view, focused by `/`, inheriting the last-used project and priority); the existing create-on-Enter contract is unchanged.
- `today-item-ordering`: reorder and defer become reachable without a pointer hover, on rows rather than cards; the `todayOrder` + `sortOrder` sync contract is restated unchanged.
- `weekly-review-planning`: the Review destination moves from the sidebar rail into the shared shell, and the view must name both the planning week and the reviewed week explicitly.

## Impact

**Frontend presentation only.** No change to `server/`, the database, `src/api.js` or `src/utils/*`; no new router; the six `activeView` keys are unchanged.

| Area | Files |
|---|---|
| New | `src/styles/tokens.css` (or `src/tokens.css` — one file, one import) |
| Global | `src/index.css`, `src/App.css` |
| Shell (stage 2) | `src/components/Sidebar.jsx`/`.css` → top strip, `src/App.jsx` (view container, `activeView` default, capture line) |
| Today + habits (stage 3) | `src/components/TodayView.*`, `PlannerHabitsPanel.*`, `HabitTracker.*`, `HabitHeatmap.*`, `DailyTimeline.*`, `DeferPopover.*`, `TimePopover.*`, `RepsPopover.*` |
| Week / review / finance (stage 4) | `src/components/DailyPlanner.*`, `MiniWeekBar.*`, `DayColumn.*`, `BacklogSidebar.*`, `WeeklyReview.*`, `MonthlyReview.*`, `ProjectsView.*`, `TaskModal.*` (dialogs) |
| Keyboard (stage 5) | a new key layer + palette component, plus focus rules in the token layer |
| Deleted (stage 0) | `Calendar.jsx`/`.css`, `DayPanel.jsx`/`.css`, `OutstandingTasks.jsx`/`.css`, `DailyShutdown.jsx`/`.css`; one `vi.mock` line in `src/__tests__/DailyPlanner.weekNavigation.test.jsx:11` |
| Dependencies | `@radix-ui/react-dialog`, `-popover`, `-dropdown-menu`, `-tooltip`, `-tabs` added (~5 small packages, unstyled). `react-icons` kept. FullCalendar stays declared but unused (its only consumer is deleted) — removing the dependency is a separate card, not this change. |

**Delivery:** six stages, each its own branch and PR, each independently shippable, in the ADR-012 order — baseline + dead code → tokens → shell + cold open → Today + habits → week/review/finance → keyboard layer. Each stage is verified by a `df-tester` card before it is Done (a tester pass *is* the acceptance gate, POL-001).

## Non-goals

- **Concept B — Timeline Studio** stays deferred behind a time-model ADR reconciling `scheduledTime` / `startTime`+`endTime` / `estimatedMinutes` (ADR-012). Its fields must not leak into any stage here.
- **No Tailwind, no shadcn/ui, no Framer Motion** (ADR-012 records the re-entry triggers); **no new icon package**; **no new router**.
- **No data-model, route or server work** — including the two ADR-011 habit-count migrations and the FullCalendar dependency removal.
- **Dark mode is not built** — it is designed for, by writing both token sets.
- **Concept A's row surfaces only**: `WeeklyObjectives`, `YearlyGoals`, `FinancialCards`, `HabitModal`, `ProjectModal`, `RichTextEditor` and `DailyWorkflow` inherit the token layer and need at most a pass at the end; they are not rebuilt.
