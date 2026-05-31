## 1. Remove Standalone Key Events View

- [x] 1.1 Delete `src/components/WeeklyKeyEvents.jsx`
- [x] 1.2 Delete `src/components/WeeklyKeyEvents.css`
- [x] 1.3 Delete `src/__tests__/WeeklyKeyEvents.test.jsx`
- [x] 1.4 Remove the "Key Events" nav item (`FaCalendarWeek` button) from `src/components/Sidebar.jsx` and remove the `FaCalendarWeek` import
- [x] 1.5 Remove the `keyEvents` view case from `App.jsx` (the `{activeView === 'keyEvents' && ...}` block) and remove the `WeeklyKeyEvents` import

## 2. Prop Plumbing — App → DailyPlanner → WeeklyObjectives

- [x] 2.1 In `App.jsx`, keep `keyEvents` state and `handleAddKeyEvent` / `handleUpdateKeyEvent` / `handleDeleteKeyEvent` handlers; add `keyEvents`, `onAddKeyEvent`, `onUpdateKeyEvent`, `onDeleteKeyEvent` as props to the `<DailyPlanner>` usage
- [x] 2.2 In `src/components/DailyPlanner.jsx`, accept the four new props and pass them through to `<WeeklyObjectives>`

## 3. Update WeeklyObjectives Component

- [x] 3.1 In `WeeklyObjectives.jsx`, accept `keyEvents`, `onAddKeyEvent`, `onUpdateKeyEvent`, `onDeleteKeyEvent` as props
- [x] 3.2 Change the panel header text from "Weekly Goals" to "Weekly Goals & Key Events"
- [x] 3.3 Compute the 7-day Mon–Sun window for the current week using the existing `weekStart` value and `date-fns` `addDays`
- [x] 3.4 Filter `keyEvents` prop to only events whose `date` falls within the current Mon–Sun window and group them by date key (`yyyy-MM-dd`)
- [x] 3.5 Render a "Weekly Goals" sub-section label above the existing goals list
- [x] 3.6 Render a "Key Events This Week" sub-section below the goals list with day columns (Mon–Sun), each showing its events
- [x] 3.7 Implement inline "Add event" form per day (title required, date pre-filled, optional description and category) — re-use the same form/card pattern from the deleted `WeeklyKeyEvents.jsx`
- [x] 3.8 Implement inline edit mode for existing key events within the panel
- [x] 3.9 Implement two-step delete (click delete → reveal confirm) for key events within the panel
- [x] 3.10 Implement client-side validation: block save if title is empty, show inline error

## 4. Update CSS

- [x] 4.1 In `WeeklyObjectives.css`, add styles for the two sub-section labels, the key events day columns layout (horizontal scroll or wrap), event cards, inline form, and edit/delete controls — adapted from the deleted `WeeklyKeyEvents.css`

## 5. Tests

- [x] 5.1 Update `src/__tests__/DailyPlanner.weekNavigation.test.jsx` mock for `WeeklyObjectives` if needed (the mock just renders a div, no change expected)
- [x] 5.2 Create/update `src/__tests__/WeeklyObjectives.test.jsx` to cover: panel renders with both sub-sections, add/edit/delete key event, validation, goals section still works
- [x] 5.3 Run `npm run test:run` and fix any failures
- [x] 5.4 Run `npm run lint` and fix any issues introduced by this change
