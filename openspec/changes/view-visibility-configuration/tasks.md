# Tasks: view-visibility-configuration

One branch, one PR: `feat/view-visibility-configuration`. Cards chain in order
(`df-analyst` → `df-fullstack` → `df-tester` → `df-lead` close-out); a card is
released only when its parent is `done`. Nothing waits for Anderson (POL-001):
the `df-tester` PASS is the acceptance gate.

## 0. Prerequisite (test-only) — df-fullstack, first commit on the branch

- [ ] 0.1 `src/setupTests.js`: restore the jsdom `localStorage` global when
  `globalThis.localStorage === 'undefined'` (exact shape in design D15). Root
  cause: Node v26.7.0 defines its own `localStorage` accessor, so vitest's
  jsdom environment no longer installs it and 7 test files throw on
  `localStorage.clear()`. Measured: 8 files / 114 failing tests → 2 files / 3.
- [ ] 0.2 `src/__tests__/habits.test.js` — make `handles weekly streaks by
  timesPerWeek` weekday-independent (freeze the clock for that test, or build
  the fixture from `startOfWeek(now, { weekStartsOn: 1 })`).
- [ ] 0.3 `src/__tests__/WeeklyReview.test.jsx` — the two key-event tests must
  seed their event in the week the review opens on
  (`startOfWeek(subDays(new Date(), 1), { weekStartsOn: 1 })`), not
  `thisWeekStart()`.
- [ ] 0.4 No production file may change in §0. Evidence: the standard command
  reports **0 failed**; `git diff master --stat` shows only the three test
  files (plus the openspec artifacts). Report both vitest counts (with and
  without the cross-lane untracked file) and note that the two Monday
  fixtures fail on `master` before the repair.
- [ ] 0.5 Do **not** touch `calculateWeeklyStreak` or the review's
  default-week rule: the Monday behaviour they expose (a 2×/week habit reads
  0 early in the week until the week's target is met) is an owner-facing
  observation for the close-out, not a fix in this change.

## 1. Spec — df-analyst (read-only on code, may edit this change's artifacts)

- [x] 1.1 Read `.dev_context/ROUTE_MAP.md` §1 + §2, `.dev_context/ARCHITECTURE.md`
  §1/§2/§4.6 and `DECISION_LOG.md` §A/§D (Rule A) before anything else.
- [x] 1.2 Audit `design.md` D2 against the code byte-for-byte: the six
  `VIEW_ORDER` ids, `VIEW_META.label`, `.goto`, `.command`, `.placement`,
  `.ariaLabel` vs `TopStrip.jsx` (`DESTINATIONS`, `VIEW_TITLES`, the More menu
  items), `CommandPalette.jsx` (`VIEW_COMMANDS`) and `keyboard.js`
  (`GOTO_VIEWS`, `SHORTCUTS`). Report any mismatch as a delta/design edit,
  not as prose in the card. (Result: full parity — no correction needed;
  D2 carries the evidence table.)
- [x] 1.3 Freeze the edge-case matrix on the card: D4's table row by row,
  D5's `null`-gate semantics, D7's refusal wording, D8's write-failure revert,
  D9's unreachable-runtime-path statement, D11's `buildShortcuts(ALL_VIEWS)
  === SHORTCUTS` identity. Name the exact strings the build must emit.
  (Result: 10 scenarios added, 25 → 35; D4 +2 rows (2 amended); D9 corrected — see 1.6.)
- [x] 1.4 Confirm the existing suite's assumptions hold: `App.test.jsx`'s
  More-menu test (all six visible is the default), `keyboardLayer.test.jsx`'s
  palette-options length 7 and the `SHORTCUTS`-footer loop, and that no
  `render(<App/>)` in those files makes a synchronous first assertion (D5's
  gate). If one does, name the file, line and the minimal additive edit.
  (Result: none does; both files await their first assertion — no edit needed.)
- [x] 1.5 Confirm the collision surface is empty: no in-flight change edits
  `App.jsx`, `TopStrip.jsx`, `CommandPalette.jsx`, `keyboard.js`,
  `useKeyboardLayer.js`; `.dev_context`'s next free ADR number is **018**
  (label census, not a heading grep). (Result: empty; the only sibling
  worktrees are on `docs/ui-modernization-pitch` (docs only); ADR-018/019 free.)
- [x] 1.6 If §1.2–§1.5 change anything, edit this change's artifacts on
  `feat/view-visibility-configuration`, re-run
  `node "$APPDATA/npm/node_modules/@fission-ai/openspec/bin/openspec.js" validate view-visibility-configuration --strict`
  (the CLI must be called by absolute path — `npx openspec` fails on this box)
  and push; comment the resulting head SHA. Read-only otherwise.

## 2. Build — df-fullstack (code, tests, Rule B)

- [ ] 2.1 `git fetch && git checkout feat/view-visibility-configuration &&
  git merge --ff-only origin/feat/view-visibility-configuration` first; never
  work from a stale branch and never commit to `master`.
- [ ] 2.2 `src/components/viewVisibility.js` per design D2/D4 (the only owner
  of the catalogue, the key, the canonical order and the normalizer).
- [ ] 2.3 `src/components/SettingsView.jsx` + `SettingsView.css` per D7/D8/D10
  (six rows, `role="switch"`, the two status lines, the refusal line, the
  write-failure revert, the fixed-order caption, tokens only).
- [ ] 2.4 `src/App.jsx` per D5/D9/D10: the `visibleViews` state + boot read +
  `if (visibleViews === null) return null;` gate, the active-view invariant,
  `activeView === 'settings'` → `SettingsView`, capture line off on `settings`,
  and `visibleViews` passed to `TopStrip`, `CommandPalette` and
  `useKeyboardLayer`.
- [ ] 2.5 `src/components/TopStrip.jsx` per D1/D6: filter the strip
  destinations and the More menu's Finance/Projects by visibility; always
  render the Settings item (gear icon, above Backup), Backup, Notifications.
- [ ] 2.6 `src/components/CommandPalette.jsx` + `keyboard.js` +
  `useKeyboardLayer.js` per D11 (`buildShortcuts`, the chord guard, the
  filtered command list, `SHORTCUTS` kept identical when nothing is hidden).
- [ ] 2.7 Tests per D12 — the three new files and the acceptance map. Any edit
  to an existing test file must be additive and named in the handoff.
- [ ] 2.8 Rule B (D13): `ROUTE_MAP.md`, `ARCHITECTURE.md`, `DECISION_LOG.md`
  (ADR-018 + ADR-019 + one tail changelog bullet each; header line untouched —
  POL-007).
- [ ] 2.9 Gates: `npx vitest run --exclude='**/.worktrees/**'
  --exclude='not relevant/**'` (**0 failed** — §0 must already be green
  before this card), `npx eslint src` (no new problems; the current count is
  the one to hold), `vite build` foregound via
  `node node_modules/vite/bin/vite.js build`. Report both vitest counts (with
  and without the cross-lane untracked `src/__tests__/wrModeStorage.test.jsx`).
- [ ] 2.10 Push the branch and open/refresh the PR to `master`; comment the
  head SHA and the PR number.

## 3. Verify — df-tester (the acceptance gate)

- [ ] 3.1 The five acceptance groups from the request: nav shows only visible
  tabs; hiding persists across a reload (asserted through the settings key);
  the last-visible-view guard refuses; hiding the active view falls back to the
  first visible; malformed/missing settings ⇒ all six; keyboard/palette offers
  no hidden view; the More menu drops `finance`/`projects` when hidden.
- [ ] 3.2 Headless screenshots, both themes, at 1440 / 1024 / 768 / 420 px:
  the Settings page; the nav with two views hidden; the More menu with Finance
  hidden; the fallback after hiding the active view (i.e. the cold open with
  Today hidden).
- [ ] 3.3 Gates on the PR head: `npx vitest run`, `npx eslint src`,
  `node node_modules/vite/bin/vite.js build`; PR head SHA == the tested SHA.
- [ ] 3.4 Rule B re-read of the three `.dev_context` files; token discipline
  in `SettingsView.css` (0 literal 6-digit hex / `font-size` / `border-radius`);
  no new dependency in `package.json`.
- [ ] 3.5 PASS ⇒ complete; FAIL ⇒ create the fix card for `df-fullstack` with
  the reproduction, never fix code in the tester card.

## 4. Close out — df-lead

- [ ] 4.1 Merge the PR to `master` (no squash unless the branch is a single
  logical commit set), re-run the gates on the merged result.
- [ ] 4.2 `openspec archive view-visibility-configuration` on the archive
  branch; verify the capability slug validates (`openspec validate
  view-visibility --strict`) and `openspec validate --specs --strict`'s
  pass/fail set is unchanged.
- [ ] 4.3 Rule B re-check on `master`; post the owner-facing one-paragraph
  note on the close-out card.

## Out of scope (recorded, not built)

| Item | Why / where |
|---|---|
| Reordering the navigation | design D14 — the page says the order is fixed; a follow-up would start honouring the stored array's order |
| A "Show all" / "Reset" action | design D14 |
| Per-view configuration beyond visibility | design D14 |
| Persisting the active view | design D14 |
