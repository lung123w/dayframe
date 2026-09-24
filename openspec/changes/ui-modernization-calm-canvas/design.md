# Design — Concept A "Calm Canvas"

`ADR-012` in `.dev_context/DECISION_LOG.md` is the frozen source of truth for the direction, the palette, the type scale, the stack and the six-stage path. **This document does not restate it.** It records only the decisions a stage would otherwise have to invent, so that two workers cannot choose differently.

Every stage cites `ADR-012` for the *what* and this document for the *how*.

## 1. Scope of the visual change

Presentation only. No file under `server/`, no database file or migration, no change to `src/api.js`, `src/utils/*` (including `recurrence.js`, `todayOrder.js`, `syncTodayOrder.js`, `habits.js`) and no new router. The six `activeView` values (`today`, `planner`, `habits`, `review`, `finance`, `projects`) are unchanged. A stage that appears to need one of those files is a **new change with its own spec**, not a drive-in.

## 2. The token layer (stage 1) — D1 to D6

**D1 — Location and import order.** `src/styles/tokens.css` (new directory), imported **first** in `src/main.jsx`, before `src/index.css` and `src/App.css` (`src/main.jsx:3`, `src/App.jsx:17`). `tokens.css` declares custom properties only — it contains no selectors that style elements, so importing it first cannot change specificity.

**D2 — Token names are frozen here** so later stages consume, not invent:

```
Colour     --page --surface --surface-2 --text-heading --text-body --text-muted
           --text-subtle --accent --accent-hover --success --success-text
           --warning --warning-text --error --error-text --hairline --focus-ring
Type       --font-display --font-page-title --font-section --font-body-lg
           --font-body --font-row --font-meta --font-label
Space      --space-1 (4) --space-2 (8) --space-3 (12) --space-4 (16) --space-5 (24)
           --space-6 (32) --space-7 (48) --space-8 (64)
Shape      --radius-control (6px) --radius-surface (8px) --radius-pill (999px)
           --border (1px solid var(--hairline)) --shadow-overlay (overlays only)
Motion     --motion-fast (120ms) --motion-state (150ms) --ease
           --focus-ring-width (2px) --focus-ring-offset (2px)
```

**D3 — The font stack is local, with no network request.** `--font-stack: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`. The `@import url('https://fonts.googleapis.com/...')` at `src/index.css:1` is deleted; the `font-family` on `:root` and every repeated copy of it (F13) is replaced by `var(--font-stack)`. Self-hosting a variable face remains an option but is **not** part of this change.

**D4 — The derived text tones are measured, and frozen.** ADR-012 requires `--text-subtle` to be derived (the deck's `#94A3B8` measures 2.46:1 and is banned as text) and success/warning text tones to be derived. These values were measured with the WCAG relative-luminance formula against all three light grounds (`#FAFAF9` page, `#FFFFFF` surface, `#F7F6F3` surface-2):

| Token | Value | page | surface | surface-2 | Verdict |
|---|---|---|---|---|---|
| `--text-subtle` | `#5F6D82` | 5.03 | 5.25 | 4.86 | Derived. Lightest candidate clearing 4.5:1 on all three grounds. |
| `--text-muted` | `#64748B` | 4.56 | 4.76 | **4.40** | Page/surface only — **not** on `--surface-2`. |
| `--accent` | `#635BFF` | 4.50 | 4.70 | **4.35** | Accent text on `--surface-2` uses `--accent-hover`. |
| `--accent-hover` | `#5248E5` | 5.88 | 6.15 | 5.69 | Safe as text on all three. |
| `--success-text` | `#047857` | 5.25 | 5.48 | 5.07 | Derived; `--success` `#10B981` is 2.43:1 — fill/dot/border only. |
| `--warning-text` | `#B45309` | 4.81 | 5.02 | 4.65 | Derived; `--warning` `#F59E0B` is 2.06:1 — fill/dot/border only. |
| `--error-text` | `#B01636` | 6.67 | 6.97 | 6.45 | `--error` `#DF1B41` is text-safe on page/surface (4.60/4.80) but 4.45 on surface-2. |

**Rule:** a text token clears 4.5:1 **on the ground it is used on**. Text on `--surface-2` uses `--text-subtle` or stronger; `--text-muted` and `--accent` are not used as text there.

**D5 — The dark set is written in the same commit and is measured too** (unused at launch; switching mode is a token swap):

`--page #101418` · `--surface #161B22` · `--surface-2 #1C232C` · `--hairline #2A323C` · `--text-heading #F8FAFC` (17.7/16.5/15.1) · `--text-body #E2E8F0` (15.0/14.0/12.9) · `--text-muted #94A3B8` (7.2/6.8/6.2) · `--text-subtle #7E8B9E` (5.35/5.00/4.58) · `--accent #8B84FF` (6.03/5.64/5.16) · `--accent-hover #9C96FF` · `--success #34D399` (9.62) · `--warning #FBBF24` (11.08) · `--error #FB7185` (6.87). Dark is selected by mode (`.dark` on `:root` or `@media (prefers-color-scheme: dark)`) — the mechanism is chosen in the stage that ships dark mode, not here; both sets are only *declared* now.

**D6 — Stage 1's blast radius is the tokens plus the globals, not the components.** Stage 1 adds `src/styles/tokens.css`, rewrites `src/index.css` as the single owner of globals (resets, `body`/`:root` background, `color-scheme`, font family, the one `prefers-reduced-motion` block) and strips the duplicated global rules out of `src/App.css` (F02/F13). Component stylesheets adopt tokens **in their own stage** — a component that stage 2–5 has not yet repainted may keep its literal values for one stage, and the stage that repaints it deletes them. The end state (no literal hexes, sizes or radii in component CSS) is verified at stage 5, not at stage 1.

## 3. Radix adoption (stages 2–4) — D7

Unstyled primitives, adopted **per component as that surface is repainted**, never as a pre-emptive sweep:

| Primitive | Replaces | Stage |
|---|---|---|
| `@radix-ui/react-dialog` | `window.confirm` (`src/App.jsx:138`, `ProjectsView.jsx:7`), `window.alert`/`confirm` (`WeeklyReview.jsx:509,521,537`), the hand-rolled `TaskModal`/`HabitModal`/`ProjectModal` shells, Escape handling | 2 → 4 |
| `@radix-ui/react-popover` | `TimePopover`, `RepsPopover`, `DeferPopover` (unanchored, no viewport clamping), the heat-map popover | 3 |
| `@radix-ui/react-dropdown-menu` | the shell's "More" overflow | 2 |
| `@radix-ui/react-tooltip` | `title=`-only icon buttons (F38), with `aria-label` retained as the accessible name | 3 → 5 |
| `@radix-ui/react-tabs` | the review's three-section switcher **only if** the repaint introduces one — the current three sections may simply stack | 4 |

`window.confirm/alert/prompt` must have **0 call sites under `src/`** when stage 4 is verified. `RichTextEditor.jsx:15`'s `window.prompt` for link insertion is included in that count.

## 4. Stage 0 — dead code and the `DailyShutdown` decision (D8)

Delete, with their stylesheets: `Calendar.jsx`/`Calendar.css` (916 lines), `DayPanel.jsx`/`DayPanel.css` (486), `OutstandingTasks.jsx`/`OutstandingTasks.css` (353), `DailyShutdown.jsx`/`DailyShutdown.css` (73). Verified 0 importers; the one non-importer reference is a `vi.mock('../components/DailyShutdown', …)` at `src/__tests__/DailyPlanner.weekNavigation.test.jsx:11`, which **must be removed in the same commit** or vitest fails to resolve the mocked module.

**Decision — `DailyShutdown.jsx` is deleted, not revived.** Rationale: (a) it is unreachable (0 importers) and predates the current shell; reviving it would mean restyling a dead component inside the stage whose purpose is deleting dead weight; (b) the *data* behind it is untouched — `daily_notes` rows, the `daily_notes` table and `GET/PUT /api/daily-notes` all stay, so nothing is orphaned and no user data is deleted (POL-001 is not triggered: this deletes source, not data); (c) Concept A's Today list is the natural home for a close-out ritual, and the audit's F42 stays an **open item** with a named follow-up rather than being half-solved here. Revisit as a new change once stage 3 has landed, if the ritual is still wanted.

**Not deleted:** the FullCalendar dependency (`package.json:19-23`). Its only consumer was `Calendar.jsx`, but removing a dependency is a separate decision with its own risk (lockfile, build) — open item.

## 5. Capture-line preference (stage 2) — D9

The capture line inherits the last-used project and priority from a **client-only** preference: `localStorage['dayframe.captureDefaults']` = `{"projectId": <number|null>, "priority": "low|medium|high"}`. Written when a capture or an edit sets either value; read on capture. No API, schema or settings-row change; a missing or unparseable value falls back to the documented defaults (no project, `medium`). Keys are namespaced `dayframe.*` because the app already stores `wr.mode`-style preferences client-side.

## 6. Keyboard layer (stage 5) — D10

Frozen key map so the implementation and its verification agree:

| Key | Action |
|---|---|
| `/` | Focus the capture line (any view) |
| `j` / `k` | Move the focused row down / up in the active list |
| `x` | Toggle completion of the focused row |
| `t` | Defer the focused row to tomorrow |
| `u` | Undo the last row action (same 5-second affordance as the existing habit-delete toast) |
| `g` then `t`/`w`/`h`/`r`/`f`/`p` | Switch to today / week / habits / review / finance / projects |
| `Escape` | Close the open overlay |
| `Ctrl/⌘ + K` | Open the command palette |

Rules: a key handler must not fire while a text field, the rich-text editor or an open dialog has focus (except `Escape`); the layer must not consume Tab, must not add a document-level `keydown` that prevents default typing, and must **not** reuse the app's single existing `tabIndex` (`src/components/MonthlyReview.jsx:733`) — each list row gets its own `tabIndex={-1}` for programmatic focus. The command palette is the last slice and is droppable: deleting its component, its mount and its key entry must leave the rest working.

## 7. Undo (D11)

`u` and the row-level undo toast reverse exactly one action: complete / uncomplete, defer, reorder. Reuse the pattern already in `HabitTracker.css:215-242` (5-second toast with an undo action) rather than inventing a second mechanism; the habit-delete undo stays where it is. Destructive deletions still confirm (stage 4's dialog) and are not undoable — that asymmetry is deliberate and matches F28's "the forgiving path is the reversible one".

## 8. Save status (stage 4) — D12

One status line per surface that persists on edit, in a **reserved** position so it never shifts layout: `pending → "Saving…"`, success → `"Saved"` (fades after ~2 s), failure → `"Could not save — retry"` with `role="status"`/`aria-live="polite"`. Debounce is 500 ms after the last keystroke, and a pending write is flushed on blur and on navigation away. Text fields keep their existing "save on blur" behaviour where it already exists (`MonthlyReview.jsx:700` notes field) — debounce replaces per-keystroke writes, it does not reintroduce them.

## 9. Branch, PR and merge stacking (D13)

`.dev_context/` is not on `master`: it arrives via PR #15 (`docs/dev-context-baseline`, head `26e3489`) → PR #17 (`fix/financial-cards-seed-data`, head `7908849`); ADR-012 arrives via PR #20 (`design/ui-direction`, head `54804bc`), which is based on #17. **This change is based on `design/ui-direction`** (`grep -c "ADR-012" .dev_context/DECISION_LOG.md` must be ≥ 1 before any work starts) and every stage branches from the previous stage's branch, so the PR chain is:

```
master ← #15 → #17 → #20 → ui-modernization-calm-canvas (this) → s0 → s1 → s2 → s3 → s4 → s5
```

Each stage opens its PR against its own base — never against `master` while the chain below it is unmerged — and reports the PR number and head SHA in a kanban comment. Nobody rebases, force-pushes or merges another lane's branch; the parked `WORK-toggle Phase 1` stash and `src/__tests__/wrModeStorage.test.jsx` are untouched (POL-003).

## 10. Verification method (every stage) — D14

- **Scoped test run:** `npx vitest run --exclude='**/.worktrees/**'` — the app's own suite is 28 files / 331 tests, with **1 pre-existing failure** (`src/__tests__/MiniWeekBar.test.jsx:38-39` expects 9 buttons, the render yields 10). An unscoped `npm run test:run` from the repo root collects every nested worktree checkout (111 files / 1,309 tests / 6 failed) — that inflation is the trap, not a regression.
- **Lint:** `npx eslint src` (8 pre-existing problems) — `npm run lint` runs `eslint .` and reports 473 because it also lints `.worktrees/` and `not relevant/`.
- **Build:** `npx vite build`.
- **UI evidence:** the tester starts the app itself (dev server + API) and captures headless-browser screenshots of each touched surface, including the 768px-wide shell.
- **Behaviour evidence:** the guard is checked by reading the live `data/app.db` **read-only** (`sqlite3 file:…?mode=ro` or a copy) and by exercising the real UI — reorder a Today task and confirm `settings.todayOrder` + each task's `sortOrder`; open Review and confirm the habit summary reads `weekStart − 1`; open a recurring task and confirm the stored `recurrencePattern` parses as an object; paste an image and confirm a >8 MB paste is refused and a past month stays read-only.
- Pre-existing failures are named as pre-existing in the verification card; anything else fails the stage.

**Measured baseline — stage 0, 2026-09-24** (card `t_aa4715eb`, branch `feat/ui-s0-dead-code`, base `design/ui-modernization` @ `5bdf95a`, run inside that worktree, identical before and after the deletions): scoped `npx vitest run --exclude='**/.worktrees/**'` = **27 files / 326 tests / 1 failed**, `npx eslint src` = **8 problems (8 errors, 0 warnings)**, `npx vite build` = success (`dist/assets/index-*.css` 85.42 kB, `index-*.js` 750.76 kB). The 27 files / 326 tests sit one file and five tests below the 28 / 331 quoted above, and that is the whole difference: the main working tree also carries the untracked `src/__tests__/wrModeStorage.test.jsx` (POL-003 — never touched), which a worktree of the tracked source does not have (27 + 1 = 28, 326 + 5 = 331). **The trap, re-measured from the repo root:** an unscoped `npm run test:run` collected **138 files / 1,635 tests / 5 failed** — one copy of the pre-existing failure per nested checkout parked under the gitignored `.worktrees/` — and `npm run lint` (`eslint .`) reported **669**; both scale with how many checkouts are present and neither is a regression.

## 11. Rule B (every stage)

`ARCHITECTURE.md` §2 (component hierarchy, including the new shell and the deletions) / §3 (state ownership if the shell moves any state) / §4 (flows the stage changes) and `ROUTE_MAP.md` §1 (UI surfaces) are updated **in the same branch as the stage that changes them**, citing ADR-012 rather than restating the tokens. `DECISION_LOG.md` gains a new ADR only if a stage takes a decision this document does not already freeze; the ADR-012 entry itself is not rewritten.

## 12. Accepted degradations and open items created by this change

- **`--text-muted` is not safe on `--surface-2`** (4.40:1). Accepted: the token survives for page/surface use, and `--text-subtle` covers the third ground. A stage that finds it needs muted text on surface-2 uses `--text-subtle`.
- **Dark mode is declared but unreachable** at launch. Accepted (ADR-012).
- **The `#94A3B8` group and 21 `outline: none` sites** are not all fixed by the token layer; the outline sites are fixed in the stage that repaints each component, and stage 5 verifies the count is 0.
- **New open items:** FullCalendar dependency removal; the F42 daily close-out ritual (after stage 3); `.dev_context`'s own `ROUTE_MAP.md`/`ARCHITECTURE.md` refresh per stage (Rule B); `docs/design/*` deck and audit resolve on `master` only once PR #19 merges.
