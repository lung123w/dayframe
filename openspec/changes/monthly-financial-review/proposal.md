## Why

The user performs a structured monthly financial review on the last Saturday of every month, covering personal banking, credit cards, family finances, tithing, bond cash flow, and credit rating checks. This multi-step process currently lives in a PDF checklist (`每月財務管理`) and is done manually without tracking which steps have been completed, what credit card payments are due, or which months were fully reviewed. There is no history of past reviews and no reminder system — the user has to remember to do it. This change brings the entire review workflow into the project management tool so each month's review is tracked, completable in-app, and tied to a recurring reminder.

## What Changes

- **New `monthly_reviews` and `financial_cards` SQLite tables** (server-side, via `server/db.js`) with REST endpoints following the existing route pattern (`server/routes/monthlyReviews.js`, `server/routes/financialCards.js`)
- **New client-side service objects** (`monthlyReviewService`, `financialCardService`) in `src/api.js` matching the existing pattern
- **New `MonthlyReview` component** with grouped checklist + per-card table for the current month, plus browseable history
- **New `FinancialCards` component** for managing the master card list
- **New "Finance" view** added to the sidebar navigation between Team and Goals
- **Recurring reminder task** that fires on the last Saturday of every month to open the Finance view
- **New checklist template** sourced from the PDF, defining the standard monthly checklist structure
- **No modifications to existing capabilities** — tasks, projects, team members, calendar, and goals are unchanged

## Capabilities

### New Capabilities
- `monthly-financial-review`: The end-to-end monthly review workflow — creating a review for a given month, rendering its checklist + card table, persisting user progress, completing a review, and browsing past reviews
- `financial-cards`: The master list of bank/credit card accounts used in the review, including CRUD operations and seeding from the PDF
- `monthly-review-reminder`: The recurring task that fires on the last Saturday of each month to prompt the user to start a new review

### Modified Capabilities
- (none — existing tasks, projects, team members, calendar, and goals are unchanged)

## Impact

- **New files**:
  - `server/db.js` — adds two new tables (`monthly_reviews`, `financial_cards`) via `db.exec()`; no migration needed since they're new
  - `server/routes/monthlyReviews.js` — REST endpoints (GET/POST/PUT/PATCH/DELETE) following the same shape as `weeklyReviews.js`
  - `server/routes/financialCards.js` — REST endpoints for the master card list
  - `server/index.js` — registers the two new route modules
  - `src/api.js` — adds `monthlyReviewService` and `financialCardService` objects
  - `src/utils/checklistTemplate.js` — defines the standard monthly checklist structure (sections + items)
  - `src/utils/lastSaturday.js` — utility to compute the last Saturday of a month (uses date-fns)
  - `src/components/MonthlyReview.jsx` + `.css` — the main review UI (grouped checklist + per-card table + history list)
  - `src/components/FinancialCards.jsx` + `.css` — sub-view for managing card master data
  - `openspec/changes/monthly-financial-review/` — this change folder
- **Modified files**:
  - `src/App.jsx` — adds `reviews` and `financialCards` state, loads them on mount via `loadData()`, routes the new `"finance"` view
  - `src/components/Sidebar.jsx` — adds "Finance" navigation item with `FaWallet` icon
  - `src/utils/notifications.js` — no change needed; the recurring reminder is a regular task, picked up by the existing poller
- **Dependencies**: reuses `recurrence.js` for the recurring reminder task, `date-fns` for last-Saturday calculation, `better-sqlite3` (already a dep) for storage, and the existing notification poller. No new npm packages.
- **Storage**: two new SQLite tables with O(1)-O(months) rows. Negligible impact on disk.
