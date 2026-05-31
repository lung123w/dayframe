## 1. Database Layer

- [x] 1.1 Add `KeyEvent` model class to `src/db.js` with fields: `id`, `title`, `date` (ISO string), `description` (optional), `category` (optional), `createdAt`, `updatedAt`
- [x] 1.2 Increment Dexie schema version and add `keyEvents` table with index on `date`
- [x] 1.3 Add `keyEventService` to `src/db.js` with `getAll()`, `getByDateRange()`, `create()`, `update()`, `delete()` methods

## 2. App State

- [x] 2.1 Add `keyEvents` state array to `App.jsx`
- [x] 2.2 Load key events from IndexedDB in the `loadData()` function in `App.jsx`
- [x] 2.3 Add `handleAddKeyEvent`, `handleUpdateKeyEvent`, `handleDeleteKeyEvent` handlers in `App.jsx` that call `keyEventService` and reload data

## 3. WeeklyKeyEvents Component

- [x] 3.1 Create `src/components/WeeklyKeyEvents.jsx` with a 7-day rolling window (today through today+6) using `date-fns` `startOfDay` and `addDays`
- [x] 3.2 Render day columns, each showing the date header and a list of key events for that day
- [x] 3.3 Implement inline "Add event" form per day column (title required, date pre-filled, optional description and category)
- [x] 3.4 Implement client-side validation: block save if title is empty, show inline error message
- [x] 3.5 Implement inline edit mode for existing events (click to edit title, description, category; date picker for date)
- [x] 3.6 Implement delete action with a confirm step (e.g., confirm button reveal on first click)
- [x] 3.7 Show empty state message for days with no events and an "Add" affordance

## 4. Sidebar Navigation

- [x] 4.1 Add a Weekly Key Events icon entry to `src/components/Sidebar.jsx` (use appropriate icon from react-icons, e.g., `FaCalendarWeek`)
- [x] 4.2 Wire sidebar nav to set `currentView` to `'keyEvents'` in `App.jsx`

## 5. App View Routing

- [x] 5.1 Add `keyEvents` case to the view-routing logic in `App.jsx` to render `<WeeklyKeyEvents />` with key events data and handlers as props

## 6. Styling

- [x] 6.1 Add CSS for the weekly key events panel: day columns layout, event cards, inline form, empty state, edit/delete controls

## 7. Testing

- [x] 7.1 Write unit tests for `keyEventService` CRUD operations in `src/__tests__/`
- [x] 7.2 Write component tests for `WeeklyKeyEvents.jsx` covering: render, add, edit, delete, validation
- [x] 7.3 Run `npm run test:run` and ensure all tests pass
- [x] 7.4 Run `npm run lint` and fix any linting issues
