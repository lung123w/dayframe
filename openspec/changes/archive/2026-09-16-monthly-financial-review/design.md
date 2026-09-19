## Context

The app is currently a single-user project management tool (DayFrame) with calendar, task, project, habit, weekly review, and yearly goals views. Storage is **SQLite via `better-sqlite3`** (`server/db.js`) with **Express REST endpoints** (`server/routes/*.js`) consumed by **client service objects** (`src/api.js`). This contradicts the project's CLAUDE.md, which describes a Dexie/IndexedDB architecture that no longer matches the code. The recurring-task system (`src/utils/recurrence.js`) supports daily/weekly/monthly/yearly patterns and powers calendar event expansion. Browser notifications (`src/utils/notifications.js`) poll every 30 minutes and surface overdue, 1-hour, and 24-hour warnings for tasks.

The user performs a structured monthly financial review on the last Saturday of every month, currently tracked in a Traditional-Chinese PDF (`每月財務管理`). The process covers personal banking, credit cards (8+ accounts), family finances, tithing, bond cash flow (Interactive Brokers), and credit rating — with a checklist plus a per-card tracking table (statement saved, amount, due date, verified with MoneyPro, PPS set up, recorded in MoneyPro, notes). Today the user has no in-app tool for any of this, no reminders, and no history.

## Goals / Non-Goals

**Goals:**
- Bring the PDF's monthly review checklist into the app as a persistent, per-month record
- Pre-populate each new month from a single template so the user does not retype the checklist
- Track per-card status (statement downloaded, amount, due date, MoneyPro verified, PPS set up, MoneyPro recorded, notes) per month
- Provide a recurring reminder on the last Saturday of every month at 09:00 that links directly to the review
- Show history of past months (read-only) so the user can look back

**Non-Goals:**
- Real bank/integration sync (MoneyPro, IB, PPS) — the user keeps doing that work manually
- Storing actual PDF statement files (the user keeps them in OneDrive)
- Multi-currency, multi-user, or shared views
- Customizable templates per user (v1 uses a single fixed template matching the PDF)
- Storing actual account numbers in cleartext beyond what the user already types (we mask them in the UI but persist as-typed — see Risks)

## Decisions

### D1: Server-side SQLite + REST, matching existing architecture

**Choice:** Add two new tables (`monthly_reviews`, `financial_cards`) to `server/db.js` and expose them through `server/routes/monthlyReviews.js` and `server/routes/financialCards.js`, mirroring the pattern of `weeklyReviews.js`.

**Rationale:** The CLAUDE.md describes Dexie/IndexedDB, but the actual app is a SQLite + Express + REST stack. Following the existing pattern minimizes new code and integrates with the current `loadData()` flow in `App.jsx`. Mixing client-side storage for this feature would create a data island inconsistent with the rest of the app.

**Alternatives considered:**
- *Client-side IndexedDB (as in CLAUDE.md)* — rejected: doesn't match real architecture; would force two storage systems to coexist.
- *Single combined endpoint `/api/monthly-review?monthKey=...`* — rejected: harder to test, breaks the per-entity service pattern used everywhere else.

### D2: One row per month in `monthly_reviews`, with embedded JSON for checklist + card entries

**Choice:** Schema is `(id, monthKey UNIQUE, year, month, reviewDate, status, checklistJson, cardEntriesJson, completedAt, createdAt, updatedAt)`. The checklist items and per-card entries live as JSON inside the single row, not as separate tables.

**Rationale:** A monthly review is a single self-contained document — exactly the shape of `weekly_reviews` (`weekStart UNIQUE, cleanupTasks, gratitudeEntries, reflectionAnswers, weeklyGoals` as JSON columns). Splitting into child tables would force joins on every read for no real-world benefit (months per user ≤ lifetime).

**Alternatives considered:**
- *Separate `monthly_review_items` and `monthly_review_card_entries` tables* — rejected: more boilerplate, no win since each month's data is read/written as a unit.

### D3: `FinancialCard` is master data, not per-month

**Choice:** Cards live in a separate `financial_cards` table (`id, name, institution, cardType, accountNumber, displayOrder, active`). Each `monthly_review` row holds a `cardEntriesJson` array of `{cardId, statementSaved, amount, dueDate, moneyProVerified, ppsSetUp, moneyProRecorded, notes}` snapshots for the cards that existed at the time the review was created.

**Rationale:** The user wants to add/edit/deactivate cards once and reuse across months. A card deactivated in month N should still appear in month N's review (since it was active then), but not in month N+1's review. Snapshotting `cardEntries` at review-creation time handles this correctly without cascading delete semantics.

**Alternatives considered:**
- *Reference cards live, no snapshot* — rejected: deleting a card would orphan `cardId` references in past reviews.
- *Snapshot full card detail (name, account, etc.) into each review row* — rejected: bloats JSON; storing `cardId` plus a `displayName` for resilience is enough.

### D4: First-run seed of cards from the PDF

**Choice:** When `GET /api/financial-cards` returns an empty list, the server (or a one-time client bootstrapper) seeds the 9 cards from the PDF: Hang Seng Integrated Account, HSBC One Account, Hang Seng Credit Card, HSBC VISA Signature, HSBC RED, Citibank Octopus, BEA World Master, BEA Titanium, BOC Credit Card.

**Rationale:** Matches the user's existing data so they don't have to enter it manually. The seed is idempotent (only runs when the table is empty).

**Alternatives considered:**
- *CSV import UI* — rejected: over-engineering for 9 known records.
- *Manual entry only* — rejected: extra friction on first run, contradicts the user's expectation that the tool matches their current workflow.

### D5: Recurring reminder is a regular `tasks` row with monthly pattern, not a new entity

**Choice:** On first Finance-view access, insert a `tasks` row with `title='Monthly Financial Review'`, `isRecurring=1`, `recurrencePattern={type:'monthly', weekOfMonth:'last', dayOfWeek:6, hour:9, minute:0}`, `priority='high'`, `dueDate` set to the next last-Saturday at 09:00. The existing `recurrence.js` expansion in `Calendar.jsx` already turns this into one calendar event per month, and the existing `notifications.js` poller already fires for it.

**Rationale:** Zero new infrastructure needed — reuses task + recurrence + notification paths that already work. The reminder shows up in the calendar, the backlog, and notifications without any code changes outside Finance.

**Alternatives considered:**
- *A separate `recurring_events` table* — rejected: duplicates the existing recurrence system for no benefit.
- *OS-level calendar sync* — rejected: not in scope; the user already gets a browser notification via the existing poller.

### D6: `recurrence.js` already supports "last Saturday of month" via existing monthly pattern

**Choice:** Investigate during implementation whether the existing `recurrence.js` supports `weekOfMonth='last'` natively. If yes, use it. If not, add it as a small extension to `getNextOccurrence()` and `getNextWeeklyOccurrence()`.

**Rationale:** Avoids writing a new recurrence engine. The change to `recurrence.js` is purely additive (new optional field on the pattern), so no existing recurring task is affected.

**Alternatives considered:**
- *Bypass recurrence and pre-create 12 monthly tasks each January* — rejected: drift over time, manual maintenance.
- *Hand-roll a "last Saturday" generator and use daily recurrence with date filters* — rejected: ugly.

### D7: `MonthlyReview.jsx` is one component with three modes (current-month edit, past-month read-only, history list)

**Choice:** Single component, with `viewMode` derived from `selectedMonthKey` vs `currentMonthKey`. Past months disable all inputs but render the same JSX. A side panel lists all monthKeys.

**Rationale:** Keeps the visual + state model consistent — same checklist, same table, same sections — just read-only in past mode. Avoids code duplication between an "editor" and a "viewer".

**Alternatives considered:**
- *Separate `<MonthlyReviewReadOnly>` and `<MonthlyReviewEditor>` components* — rejected: doubles the components and CSS for no behavior gain.

### D8: `FinancialCards.jsx` is a sub-view reachable from a button in the Finance view

**Choice:** A "Manage Cards" button in the Finance view header opens a modal or sub-route with the card list. Cards can be added, edited, reordered (up/down arrows or drag handle), and deactivated (toggle, not delete).

**Rationale:** Card management is infrequent and not the primary workflow. Keeping it in a sub-view avoids cluttering the main review UI.

**Alternatives considered:**
- *Inline editing in the card table* — rejected: makes the review table noisy and complicates the data flow.
- *Full delete (vs soft-delete via `active` flag)* — rejected: soft-delete preserves past-month snapshots.

### D9: Account numbers masked in the UI except the edit form

**Choice:** The card table shows `****7963` (last 4 digits only). The manage-cards edit form shows the full value. Persisted value is whatever the user typed.

**Rationale:** Matches the user's reasonable privacy expectation for shoulder-surfing protection, while keeping the full value available when they need to copy it.

**Alternatives considered:**
- *Encrypt at rest* — rejected: overkill for a single-user local app; the user has local file access anyway.

## Risks / Trade-offs

- **[Risk] `recurrence.js` does not support "last Saturday of month" out of the box** → Mitigation: confirm during task 4.1; if missing, add `weekOfMonth='last'` as an additive field, no breaking changes.
- **[Risk] Browser notification timing depends on the app being open** → Mitigation: this is the same limitation every existing task notification has; the reminder also shows on the calendar, so the user sees it when they next open the app.
- **[Risk] Card snapshot in `cardEntries` could drift from the master card list** → Mitigation: when rendering a past review, fall back to the current master card's `name` for display, but use the snapshot's `cardId` as the key. Reactivating a card restores the link.
- **[Risk] Account numbers stored in cleartext in SQLite** → Mitigation: acceptable for a single-user local-first app where the user already has file system access; masked in UI.
- **[Risk] Schema version bump risk on existing users** → Mitigation: new tables use `CREATE TABLE IF NOT EXISTS`; no migration of existing data needed.
- **[Trade-off] Checklist template is hard-coded, not user-editable** → Accepted in v1; if the user wants to customize later, we can add a `checklist_templates` table without breaking existing reviews (each review stores its own snapshot of the template at creation time).

## Migration Plan

1. **Schema addition**: two `CREATE TABLE IF NOT EXISTS` lines in `server/db.js` for `monthly_reviews` and `financial_cards`. No data migration of existing tables needed.
2. **First-run seed**: when `GET /api/financial-cards` returns `[]`, insert the 9 PDF cards. Idempotent — only runs when the table is empty.
3. **Recurring task creation**: when the user first opens the Finance view, insert the "Monthly Financial Review" recurring task if no task with that exact title exists. Idempotent.
4. **Rollback**: drop the two new tables; the recurring task can be deleted manually. No existing data is affected.

## Open Questions

- **Resolved during brainstorming**: confirmed with user — checklist resets each month, card sub-table per month, last-Saturday reminder.
- **To confirm during implementation (D6)**: does `recurrence.js` already support "last Saturday" via `weekOfMonth='last'`, or do we need to add it? (Likely needs to be added based on the current code I read.)
- **To confirm during implementation**: the PDF's "credit rating" step (step 5) — should this just be a checklist item, or do we want to record the actual score over time? Defaulting to checklist-only in v1.
