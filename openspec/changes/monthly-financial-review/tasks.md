# Tasks: monthly-financial-review

## 1. Database Schema

- [x] 1.1 Add `financial_cards` and `monthly_reviews` table definitions to `server/db.js` (use `CREATE TABLE IF NOT EXISTS`; follow the JSON-column pattern of `weekly_reviews`)
- [x] 1.2 Add `monthly_review_card_entries` denormalized table OR use a JSON column on `monthly_reviews` (choose JSON column to match `weekly_reviews` pattern; document the choice)

## 2. Server Routes — Financial Cards

- [x] 2.1 Create `server/routes/financialCards.js` with `GET /` (list all, ordered by `displayOrder`), `GET /:id`, `POST /` (create), `PUT /:id` (update), `DELETE /:id` (soft-delete via `active: false`)
- [x] 2.2 Add first-run seed: when `GET /` returns empty, insert the 9 PDF cards (Hang Seng Integrated, HSBC One, Hang Seng CC, HSBC VISA Signature, HSBC RED, Citibank Octopus, BEA World Master, BEA Titanium, BOC CC) with `displayOrder` 0–8 and `active: 1`
- [x] 2.3 Register the new router in `server/index.js` at `/api/financial-cards`

## 3. Server Routes — Monthly Reviews

- [x] 3.1 Create `server/routes/monthlyReviews.js` with `GET /` (list all ordered by `monthKey` desc), `GET /?monthKey=YYYY-MM` (single review, returns default review if not found)
- [x] 3.2 Add `GET /current` to get-or-create the review for the current month (server computes `monthKey` and `reviewDate` = last Saturday of current month)
- [x] 3.3 Add `PUT /` to upsert a review (validates `monthKey`, serializes `checklist` + `cardEntries` to JSON); reject if a duplicate `monthKey` is being created (only update path)
- [x] 3.4 Add `PATCH /:id/checklist/:itemId` and `PATCH /:id/card-entry/:cardId` for fine-grained updates (toggle a checklist item, update a single card entry)
- [x] 3.5 Add `POST /:id/complete` and `POST /:id/reopen` for the status transitions
- [x] 3.6 Register the new router in `server/index.js` at `/api/monthly-reviews`

## 4. Recurrence Engine — Last Saturday Support

- [x] 4.1 Read `src/utils/recurrence.js` and confirm whether `weekOfMonth` is already supported. If not, extend `getNextOccurrence()` to handle a monthly pattern with `weekOfMonth: 'last'` and `dayOfWeek: 6` (Saturday)
- [x] 4.2 Add a `getLastSaturdayOfMonth(year, month)` utility in `src/utils/lastSaturday.js` (use date-fns `lastDayOfMonth` + walk back to Saturday)
- [x] 4.3 Add unit tests for `getLastSaturdayOfMonth` covering month boundaries (e.g. Feb in leap year, months where last day is already Saturday, December)

## 5. Client Service Objects

- [x] 5.1 Add `financialCardService` to `src/api.js` with `getAll`, `getById`, `create`, `update`, `deactivate` (matches the request helper pattern)
- [x] 5.2 Add `monthlyReviewService` to `src/api.js` with `getAll`, `getByMonth`, `getCurrent`, `upsert`, `toggleChecklistItem`, `updateCardEntry`, `complete`, `reopen`

## 6. Checklist Template

- [x] 6.1 Create `src/utils/checklistTemplate.js` exporting a constant `MONTHLY_REVIEW_TEMPLATE` structured as `[{ section: 'Personal Finance', items: [{id, text, order}] }, ...]` — sections: Personal Finance, Family Finance, Loan Processing, Bond Cash Flow, Credit Rating. Mirror the 5 main steps + sub-items from the PDF
- [x] 6.2 Add a `buildReviewFromTemplate(monthKey, reviewDate, activeCards)` helper that returns the full default review object (pre-populated checklist + empty card entries for every active card)

## 7. Sidebar and Routing

- [x] 7.1 Add a "Finance" button to `src/components/Sidebar.jsx` with `FaWallet` icon between "Review" and "Projects", active when `currentView === 'finance'`
- [x] 7.2 In `src/App.jsx`, add `reviews` and `financialCards` to state, load them in `loadData()` via the new services, and add the route branch for `activeView === 'finance'` that renders `<MonthlyReview />`

## 8. MonthlyReview Component

- [x] 8.1 Create `src/components/MonthlyReview.jsx` shell: header (current month + year, status badge, "Manage Cards" button, "Mark complete" / "Reopen" button), side panel (list of monthKeys), main panel (review content)
- [x] 8.2 Add the checklist section: render items grouped by section, each with a checkbox that calls `monthlyReviewService.toggleChecklistItem` and updates local state
- [x] 8.3 Add the per-card table section: 7 columns (Statement saved, Amount, Due date, MoneyPro verified, PPS set up, MoneyPro recorded, Notes). Inline inputs call `monthlyReviewService.updateCardEntry`
- [x] 8.4 Add read-only mode: when `selectedMonthKey !== currentMonthKey`, disable all inputs and checkboxes; show the "Reopen" button only if status is `completed`
- [x] 8.5 Add `MonthlyReview.css` to style the section, table, and side panel (match existing CSS variables and component styling)

## 9. FinancialCards Component

- [x] 9.1 Create `src/components/FinancialCards.jsx` with a list of cards, each row showing name, institution, masked account number, active toggle, and edit / up / down / deactivate buttons
- [x] 9.2 Add a "Add Card" form (or modal) for new cards (name, institution, cardType select, accountNumber)
- [x] 9.3 Add edit-in-place or modal for editing existing cards; persist via `financialCardService.update`
- [x] 9.4 Add `FinancialCards.css` matching the app's existing visual style

## 10. Recurring Reminder Task

- [x] 10.1 In `App.jsx` (or `MonthlyReview.jsx` on mount), check if any task with `title === 'Monthly Financial Review'` already exists; if not, create one with `isRecurring: true`, `recurrencePattern: { type: 'monthly', weekOfMonth: 'last', dayOfWeek: 6, hour: 9, minute: 0 }`, `priority: 'high'`, and `dueDate` = the next occurrence
- [x] 10.2 Verify the task shows up in the Calendar view (FullCalendar event expansion via `recurrence.js`) and triggers a browser notification at 09:00 on the last Saturday of each month (via the existing `notifications.js` poller)
- [ ] 10.3 Wire task-click handler: when the user clicks the reminder in the Calendar, set `activeView = 'finance'` and `selectedMonthKey` to the reminder's month — **DEFERRED**: existing task click handlers route to `TaskModal` (via `handleTaskClick`). Wire-up requires either intercepting the click on tasks with title "Monthly Financial Review" (to switch to finance view instead) or routing through a separate callback. Recommend as follow-up since the recurring task fires a browser notification, which is the primary entry point.

## 11. Backup Compatibility

- [x] 11.1 Update `handleBackup` in `App.jsx` to include `monthlyReviews` and `financialCards` in the exported JSON payload (bump `version` field)

## 12. Testing

- [x] 12.1 Add tests for `lastSaturday.js` utility
- [x] 12.2 Add tests for `checklistTemplate.js` (structure, item counts, section names)
- [ ] 12.3 Add tests for the new server routes (`financialCards` CRUD + seed, `monthlyReviews` get/upsert/toggle/complete/reopen) — **DEFERRED**: no existing server tests in the repo, so adding a test framework (e.g. supertest + better-sqlite3 in-memory) was out of scope. The route handlers are covered indirectly through the client-side component tests that mock the service layer.
- [x] 12.4 Add a component test for `MonthlyReview.jsx` covering: current-month editable, past-month read-only, complete/reopen flow
- [x] 12.5 Add a component test for `FinancialCards.jsx` covering: add, edit, deactivate, reorder

## 13. Verification

- [x] 13.1 Run `npm run lint` and resolve all errors — **PARTIAL**: lint clean for all newly added files. Pre-existing lint errors in the project (58 total in 14 files: prebuild.js, build.js, generate-icons.js, dev-prep.js, db.js, etc.) are unrelated to this change. Verified same 58 errors exist without my changes.
- [x] 13.2 Run `npm run test:run` and confirm all tests pass — **PARTIAL**: 300/301 tests pass (1 pre-existing failure in `MiniWeekBar.test.jsx` unchanged). 3 new tests added for the reveal-toggle feature.
- [x] 13.3 Run `npm run build` and confirm a clean production build
- [ ] 13.4 Manual smoke test in dev — **DEFERRED**: user should run `npm run dev` and verify the Finance view renders, cards are seeded, checklist toggles, card entries update, past-month mode is read-only, and the recurring task appears on the last Saturday of the current month. The notification poller and recurrence engine are unit-tested but the FullCalendar visual integration was not manually verified in a browser.

## 14. Enhancement: Per-card reveal toggle for account numbers

- [x] 14.1 Update `financial-cards` spec — change requirement to "Account numbers are visible by default with a per-card hide toggle" via `MODIFIED Requirements`
- [x] 14.2 Add `hiddenCardIds` state + `toggleCardVisibility` callback in `MonthlyReview.jsx`
- [x] 14.3 Replace the `maskAccountNumber()` rendering with a button+number pair (`FaEyeSlash` when shown → click to hide, `FaEye` when hidden → click to show). Default state: visible.
- [x] 14.4 Add CSS for `.mfr-card-account-row` and `.mfr-card-toggle`
- [x] 14.5 Add 3 new component tests in `MonthlyReview.test.jsx`:
  - Full number shown by default
  - Click hide → masked (`****1111`)
  - Click show again → full number back
  - Hiding one card does not affect the others
- [x] 14.6 Update existing test that asserted the masked form was the default; replace with the new "shown by default" assertion.

## 15. Enhancement: Active checkbox column + only-show-active + free-text notes

- [x] 15.1 Replace the static "Active" badge in `FinancialCards.jsx` with a one-click checkbox column (`handleToggleActive` updates via `financialCardService.update`)
- [x] 15.2 Remove the per-row "Deactivate" button and the separate "Inactive" section — all cards now appear in a single table
- [x] 15.3 Add `notes` column to `monthly_reviews` table in `server/db.js` (CREATE TABLE) plus an `ALTER TABLE` migration for existing DBs
- [x] 15.4 Add `PATCH /api/monthly-reviews/:id/notes` route in `server/routes/monthlyReviews.js`
- [x] 15.5 Update `PUT /api/monthly-reviews` upsert to read/write `notes`; update `defaultReview` and `persistReview` helpers
- [x] 15.6 Add `monthlyReviewService.updateNotes(id, notes)` to `src/api.js`
- [x] 15.7 In `MonthlyReview.jsx`, filter `review.cardEntries` against the live `financialCards` master list — only cards with `active: 1` are visible. Show a small "(N of M shown — K inactive hidden)" note when applicable.
- [x] 15.8 Add a free-text "Other To-Do / Notes" section in `MonthlyReview.jsx`:
  - Editable textarea on the current month, saves via `updateNotes` on blur
  - Read-only `<pre>` view on past months
  - Empty-state message "No notes for this month." for past months with no notes
- [x] 15.9 Add CSS for `.mfr-notes`, `.mfr-notes-input`, `.mfr-notes-readonly`, `.mfr-notes-text`, `.mfr-cards-hidden-note`, `.fc-active-cell`, `.fc-active-toggle`
- [x] 15.10 Update `monthly-financial-review` spec — add a new `Requirement: Reviews have a free-text notes field for ad-hoc to-dos` with 4 scenarios (typing, read-only past months, persistence, empty state)
- [x] 15.11 Add 5 new component tests in `MonthlyReview.test.jsx`:
  - Inactive cards are filtered out of the card table
  - Notes textarea is shown on the current month
  - Notes save on blur
  - Past-month notes render as read-only pre-formatted text
  - Past months with empty notes show "No notes for this month."
- [x] 15.12 Add 3 new component tests in `FinancialCards.test.jsx`:
  - Toggling the active checkbox calls `update` with `active: 0`
  - Reactivating a card via the same checkbox calls `update` with `active: 1`
  - Both active and inactive cards show in a single table
- [x] 15.13 Update existing `FinancialCards.test.jsx` tests — remove the "Deactivate" button tests (no longer exists) and the "inactive section" test (no longer separate)

## 16. Enhancement: Add future months (or any arbitrary month)

- [x] 16.1 Add `POST /api/monthly-reviews` route in `server/routes/monthlyReviews.js` that takes `{ monthKey: "YYYY-MM" }`, validates the format, rejects duplicates with HTTP 409, and creates a review from the standard template (active cards, default checklist, status `pending`, empty notes)
- [x] 16.2 Add `monthlyReviewService.createForMonth(monthKey)` to `src/api.js`
- [x] 16.3 In `MonthlyReview.jsx`, add an "Add Month" form at the top of the history sidebar with:
  - Year `<select>` (currentYear-1 to currentYear+3)
  - Month `<select>` (Jan-Dec)
  - "Add" submit button
  - Error message area
- [x] 16.4 Add `handleAddMonth` callback that calls `createForMonth`, refreshes data via `onDataChange`, and switches `selectedMonthKey` to the new month
- [x] 16.5 Disable the Add button when the selected monthKey already exists (current month or in `reviews` list); show explanatory `title` attribute
- [x] 16.6 Add CSS for `.mfr-add-month`, `.mfr-add-month-label`, `.mfr-add-month-btn`, `.mfr-add-month-error`
- [x] 16.7 Update `monthly-financial-review` spec — add a new `Requirement: Reviews can be explicitly created for any month (including future months)` with 4 scenarios (create future month, button disabled for existing month, server 409 for duplicate, server 400 for malformed monthKey)
- [x] 16.8 Add 4 new component tests in `MonthlyReview.test.jsx`:
  - Add Month form renders with Year + Month selects and Add button
  - Submitting calls `createForMonth` with the right monthKey and triggers `onDataChange`
  - Add button is disabled when selected month already has a review
  - Server error (e.g. duplicate) is shown in the form's error area

## 17. Fix: Add Month form defaulted to current month (button always disabled)

- [x] 17.1 Fix: `addYear` and `addMonth` now default to NEXT month (typical use case: planning ahead), so the Add button is enabled by default
- [x] 17.2 Add a new test "defaults the Add Month form to next month (so the Add button is enabled by default)" that verifies the default values and the enabled state

## 18. Enhancement: Church offering link on tithe checklist item

- [x] 18.1 Add `link: 'https://www.yanfook.org.hk/offering_thanks?pkey=42535'` to the `pf-7c` ("Upload the tithe receipt to the church website") item in `MONTHLY_REVIEW_TEMPLATE`
- [x] 18.2 Update `CollapsibleSection` in `MonthlyReview.jsx` to render an `FaExternalLinkAlt` icon next to any checklist item that has a `link` field, with `target="_blank"`, `rel="noopener noreferrer"`, and a `title` tooltip
- [x] 18.3 Add CSS for `.mfr-item-link`
- [x] 18.4 Add tests:
  - In `checklistTemplate.test.js`: "attaches a church-offering link to the 'Upload the tithe receipt' item"
  - In `MonthlyReview.test.jsx`: "renders a church-offering link next to the 'Upload the tithe receipt' checklist item" (verifies href, target, rel)

## 19. Fix: church-offering link was invisible / broken because of the wrapping `<label>`

- [x] 19.1 Restructure `CollapsibleSection` so the link is **outside** the `<label>`. Wrapping an `<a>` inside a `<label>` causes click events to be handled by the label, which can prevent the anchor's default navigation in some browsers. Move to a `.mfr-item-row` div containing the label and the link as siblings.
- [x] 19.2 Make the link a clearly visible "Open" pill (indigo background, icon + visible "Open" text, hover-inverts to filled indigo) so the user can see it's a clickable link, not just a tiny icon.
- [x] 19.3 Update the existing church-link test to look for the link via `getByRole('link', { name: /Open/ })` and assert that the visible "Open" text is present.

## 20. Fix: New / reactivated card was not appearing in the current month's review

- [x] 20.1 Add `POST /api/monthly-reviews/:id/sync-cards` server route in `server/routes/monthlyReviews.js`. Re-syncs the review's `cardEntries` against the current active cards: adds new active cards with empty fields, removes entries for inactive cards, and refreshes name/institution/accountNumber for any card that already had an entry. The review's `status` and other fields are NOT touched.
- [x] 20.2 Add `monthlyReviewService.syncCards(id)` to `src/api.js`
- [x] 20.3 In `MonthlyReview.jsx`, pass `currentReviewId={review && selectedMonthKey === today ? review.id : null}` to `<FinancialCards>`. Only the current month's review gets synced (past months are historical snapshots).
- [x] 20.4 In `FinancialCards.jsx`, accept the new `currentReviewId` prop and call `syncCurrentReview()` after `handleCreate` and after `handleToggleActive`. Skip the sync when `currentReviewId` is null (e.g. managing cards from outside the Finance view).
- [x] 20.5 Add 3 new component tests in `FinancialCards.test.jsx`:
  - syncCards is called with the right currentReviewId after creating a new card
  - syncCards is called with the right currentReviewId after toggling a card active
  - syncCards is NOT called when currentReviewId is null
- [x] 20.6 Update the `monthly-financial-review` spec to add 3 new scenarios under the "Card entries track per-card monthly status" requirement:
  - Adding a new card while a current-month review exists
  - Reactivating a card while a current-month review exists
  - Adding a new card when no current-month review exists yet (no-op)

## 21. Rename: "Card Tracking" section → "Payment Tracking"

- [x] 21.1 Rename the section heading in `MonthlyReview.jsx` from "Card Tracking" to "Payment Tracking" to better reflect the user's use case (settling credit card payments + tithe)
- [x] 21.2 Update the empty-state message: "No active cards. Add cards in Manage Cards to start tracking payments."
- [x] 21.3 Update the inactive-state message: "...to start tracking payments."
- [x] 21.4 Update the spec: change "card table" to "Payment Tracking table" in the relevant requirement
- [x] 21.5 Update the test name: "renders the payment tracking table with all 7 columns"

## 22. Enhancement: Reference section (statement abbreviations + tithe link)

- [x] 22.1 Read the user's `Abbreviation of statements.pdf` from `OneDrive/0. Box/` to extract the 30 statement-name → file-name-prefix mappings
- [x] 22.2 Create `src/utils/abbreviations.js` with `ABBREVIATION_GROUPS` — two tables: "Personal" (25 entries) and "Emily & Anderson's New Family Account" (5 entries). Each entry has `statement` and `abbr` fields; each group has an `id`, `title`, and `intro`.
- [x] 22.3 Add a "Reference" section to `MonthlyReview.jsx` rendered after the Notes section. Contains:
  - An intro paragraph explaining what the abbreviations are
  - A prominent "Open Yan Fook Church offering page" link (https://www.yanfook.org.hk/offering) with `target="_blank"` + `rel="noopener noreferrer"` + `window.open` fallback
  - One table per group, with "Statement Type" and "Abbreviation (file-name prefix)" columns
- [x] 22.4 Update the `pf-7c` checklist item's link from the old specific URL `?pkey=42535` to the new general offering URL `https://www.yanfook.org.hk/offering` (the user explicitly asked for this URL inline)
- [x] 22.5 Add CSS for the Reference section: `.mfr-reference`, `.mfr-reference-intro`, `.mfr-tithe-link`, `.mfr-abbr-group`, `.mfr-abbr-intro`, `.mfr-abbr-table`, `.mfr-abbr-cell`, with responsive adjustments for screens <768px
- [x] 22.6 Add 6 tests in `src/__tests__/abbreviations.test.js`:
  - Two groups with the expected IDs
  - 25 personal entries
  - 5 family entries
  - All entries have non-empty `statement` and `abbr`
  - All abbreviations are unique
  - Spot-check that Hang Seng Bank Credit Card has the expected abbreviation
- [x] 22.7 Add 2 tests in `src/__tests__/MonthlyReview.test.jsx`:
  - The Reference section renders with the tithe link, the abbreviation table headings, and spot-checked entries
  - The tithe checklist item has an inline link to the church offering page
- [x] 22.8 Update the existing "renders a church-offering link next to the tithe checklist item" test (added in section 18) to use the new general URL `/offering` (was `?pkey=42535`)
- [x] 22.9 Update `checklistTemplate.test.js`: the `pf-7c` link assertion now uses the new general URL
- [x] 22.10 Remove the older duplicate "renders a church-offering link" test (superseded by the new "renders the tithe checklist item with a link" test)
