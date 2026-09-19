# Tasks: remove-plan-my-day

> All changes are deletions. Do NOT touch the uncommitted Weekly Review
> WORK-mode WIP on master (`WeeklyReview*.jsx`, `WeeklyObjectives.jsx`,
> `src/api.js`, `server/*`, `wrModeStorage.test.jsx`).

## 1. src/App.jsx — remove Plan My Day wiring

- [ ] 1.1 Remove `import DailyPlanningModal from './components/DailyPlanningModal';` (L8).
- [ ] 1.2 Remove `FaCalendarCheck` from the react-icons import (L16):
  `import { FaPlus, FaFolder, FaCalendarCheck } from 'react-icons/fa';`
  → only `FaPlus, FaFolder`.
- [ ] 1.3 Remove `const [showPlanningModal, setShowPlanningModal] = useState(false);` (L40).
- [ ] 1.4 Remove `handlePlanningConfirm` incl. its `// ── Daily planning modal ──` comment (L215-220).
- [ ] 1.5 Remove the "Plan My Day" button block (L337-345): the
  `{/* Plan My Day — always visible */}` comment + `<button className="plan-my-day-btn" ...>` … `<FaCalendarCheck /> Plan My Day</button>`. Keep the following blank line + `<main>`.
- [ ] 1.6 Remove the modal render block (L464-472):
  `{showPlanningModal && (<DailyPlanningModal tasks=... onConfirm={handlePlanningConfirm} onClose={...} />)}`.

## 2. Delete dead files

- [ ] 2.1 Delete `src/components/DailyPlanningModal.jsx`.
- [ ] 2.2 Delete `src/components/DailyPlanningModal.css`.
- [ ] 2.3 Delete `src/utils/planningGroups.js` (only consumer was the modal).
- [ ] 2.4 Delete `src/__tests__/DailyPlanningModal.test.js` (tests `groupTasksByUrgency` only).

## 3. src/App.css — remove button styles

- [ ] 3.1 Remove the "Plan My Day button" block (L337-361):
  the `/* ── Plan My Day button ── */` comment, `.plan-my-day-btn {...}` and
  `.plan-my-day-btn:hover {...}`.

## 4. README.md — remove section

- [ ] 4.1 Remove the "### Plan My Day" section (L40-44) incl. its three
  bullets. "### Daily Workflow" (L45) becomes the next section.

## 5. Regression guards — MUST stay untouched

- [ ] 5.1 Confirm `todayOrder` state, `handleTodayOrderChange`,
  `syncTodayOrder` (`src/utils/syncTodayOrder.js`) and
  `src/utils/todayOrder.js` are all still present and unchanged.
- [ ] 5.2 Confirm `TodayView.jsx` and `DailyPlanner.jsx` are untouched —
  their `onTodayOrderChange` flows keep working (drag/arrow reorder +
  planner-today sync).
- [ ] 5.3 Confirm no server file changed (`server/` has zero diff for this
  change; `todayOrder` remains a generic settings key).

## 6. Verification

- [ ] 6.1 `grep -rn "Plan My Day\|planningGroups\|DailyPlanningModal\|plan-my-day-btn\|FaCalendarCheck" src/ README.md` — no matches.
- [ ] 6.2 `npm run test:run` — all remaining tests pass (expect 8 fewer
  cases after deleting DailyPlanningModal.test.js).
- [ ] 6.3 `npm run build` — Vite build clean, no dangling imports.
- [ ] 6.4 Manual smoke (per decision doc):
  1. App loads on the planner view, no "Plan My Day" button anywhere.
  2. Sidebar "Today" nav opens the Today view with quick-capture + Daily
     Workflow intact.
  3. Drag-reorder in Today view and in the Planner's today column still
     persists across reload.
  4. No modal opens; console shows no errors referencing planning.

## 7. Coordination

- [ ] 7.1 The OpenSpec delta (`specs/daily-planning-session/spec.md` in this
  change) was authored in the proposal and MUST NOT be modified by the
  implementer. `openspec archive remove-plan-my-day` runs after human
  sign-off (dev profile) and deletes the now-empty spec dir.
- [ ] 7.2 Do not commit, revert, or rebase the unrelated uncommitted Weekly
  Review WORK-mode WIP on master; this change has zero file overlap with it.