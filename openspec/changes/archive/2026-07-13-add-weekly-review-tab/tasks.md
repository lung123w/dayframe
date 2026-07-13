## 1. Backend: data model & API

- [x] 1.1 Add `weekly_reviews` table to `server/db.js` (`CREATE TABLE IF NOT EXISTS` with `weekStart` UNIQUE, JSON TEXT columns for `cleanupTasks`, `gratitudeEntries`, `reflectionAnswers`, `weeklyGoals`, `syncFlags`)
- [x] 1.2 Create `server/routes/weeklyReviews.js` with `GET /` (by `?weekStart=`, returns zeroed defaults when none) and `PUT /` (upsert by `weekStart`), mirroring `weeklyObjectives.js`
- [x] 1.3 Mount the route at `/api/weekly-reviews` in `server/index.js`
- [x] 1.4 Verify backend with a quick manual curl (GET a missing week returns defaults; PUT then GET round-trips)

## 2. Frontend API service

- [x] 2.1 Add `weeklyReviewService` to `src/api.js` with `getByWeek(weekStart)` and `upsert(weekStart, document)`

## 3. WeeklyReview component — shell & week navigation

- [x] 3.1 Create `src/components/WeeklyReview.jsx` and `src/components/WeeklyReview.css`
- [x] 3.2 Add local `weekStartDate` state (default `startOfWeek(new Date(), {weekStartsOn:1})`) with Prev / Next / "This Week" buttons and a week range label
- [x] 3.3 Compute `weekStart` (`yyyy-MM-dd`) and the Mon–Sun day list; load the review document via `weeklyReviewService.getByWeek` on week change
- [x] 3.4 Implement `save(updatedDocument)` that updates local state and calls `weeklyReviewService.upsert` on each mutation

## 4. Section 1 — Weekly miscellaneous cleanup checklist

- [x] 4.1 Define `DEFAULT_CLEANUP_TEMPLATE` constant (inbox, desktop box, physical box, outbox, device wipe, Kindle Economist download with link, weekly blueprint)
- [x] 4.2 On first load of a week with empty `cleanupTasks`, seed from the template (assign stable ids) and render the checklist
- [x] 4.3 Render each item as a checkbox + editable text + remove control; render `link` items as actionable anchor tags
- [x] 4.4 Implement toggle / edit text / add item / remove item handlers that persist via `save`

## 5. Section 2 — Weekly gratitude list

- [x] 5.1 Render gratitude section with an "aim for 5" prompt and an add-input
- [x] 5.2 Render entries as editable text with remove controls
- [x] 5.3 Implement add / edit / remove handlers that persist via `save`

## 6. Section 3a — Weekly reflection prompts

- [x] 6.1 Define the four fixed reflection questions as a constant (goals completed/performance, obstacles, energy, habit minimums)
- [x] 6.2 Render four free-text answer fields bound to `reflectionAnswers[questionId]`, persisted via `save`
- [x] 6.3 For the habit-minimum prompt, load the selected week's habit entries via `habitEntryService.getAll({from, to})` and render a read-only per-habit completion summary alongside the answer field

## 7. Section 3b — Weekly goals with minimum steps

- [x] 7.1 Render goal setup section with a "set 3 goals, each with a minimum step" prompt and an add form (text + minimumStep)
- [x] 7.2 Render each goal as editable text + minimum step + checkbox + remove control
- [x] 7.3 Implement add / edit / toggle / remove handlers that persist via `save`

## 8. Bridging action — sync goals to DayFrame

- [x] 8.1 Add a "Write weekly goals to DayFrame" checkbox/action that calls `weeklyObjectiveService.upsert(weekStart, goals.map(g => ({text:g.text, completed:false})))`
- [x] 8.2 Show a confirm dialog before replacing when `weekly_objectives` already has objectives for the week
- [x] 8.3 Set `syncFlags.goalsSynced` after sync and render the checkbox checked state from it

## 9. Bridging action — key events for the week

- [x] 9.1 Accept `keyEvents`, `onAddKeyEvent` (and optionally update/delete) as props from `App.jsx`
- [x] 9.2 Render the selected week's key events grouped by day (Mon–Sun) using the existing `key_events` data
- [x] 9.3 Provide an add form per day that calls `onAddKeyEvent` to create a key event via the existing `keyEventService`
- [x] 9.4 Add a "List this week's key events" checkbox bound to `syncFlags.keyEventsListed`, persisted via `save`

## 10. Sidebar & App wiring

- [x] 10.1 Add a "Review" nav item to `src/components/Sidebar.jsx` (icon `FaListCheck`) mapping to view `review`
- [x] 10.2 Import `WeeklyReview` in `src/App.jsx` and add an `activeView === 'review'` branch passing `keyEvents`, `onAddKeyEvent`, `onUpdateKeyEvent`, `onDeleteKeyEvent`, and `onDataChange`
- [x] 10.3 Ensure the sidebar auto-collapse/mobile behavior still applies to the new item

## 11. Tests

- [x] 11.1 Add `src/__tests__/WeeklyReview.test.jsx` covering: defaults to current week, seeds cleanup template for a new week, toggle/add/remove cleanup item persists, gratitude add/remove, reflection answer save, goal add with minimum step, sync goals calls `weeklyObjectiveService.upsert` with confirm, key events list renders and add calls `onAddKeyEvent`
- [x] 11.2 Add a test for the backend route `server/routes/weeklyReviews.js` (GET defaults, PUT→GET round-trip) following existing test conventions — covered by manual curl verification in 1.4 (project has no backend test infrastructure; design specifies no new npm packages)

## 12. Verification

- [x] 12.1 Run `npm run test:run` and ensure all tests pass
- [x] 12.2 Run `npm run lint` and fix any issues
- [x] 12.3 Run `npm run dev`, open the Review tab, walk through all three sections for the current week, reload, and confirm state persists
- [x] 12.4 Verify goal sync appears in the Planner's "Weekly Goals & Key Events" panel for the same week
- [x] 12.5 Verify key events added from the Review tab appear in the Planner's key events panel
