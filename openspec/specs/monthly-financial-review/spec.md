# monthly-financial-review Specification

## Purpose
TBD - created by archiving change monthly-financial-review. Update Purpose after archive.
## Requirements
### Requirement: One review per month

The system MUST allow at most one `MonthlyReview` per calendar month, identified by a `monthKey` in `YYYY-MM` format. When a user requests a review for a month that does not yet exist, the system MUST create one pre-populated with the standard checklist template and an empty card-entry per active `FinancialCard`. Creating a second review for the same `monthKey` MUST be rejected.

#### Scenario: First access in a new month creates a review
- **WHEN** the user opens the Finance view during a month that has no existing review
- **THEN** a new review is created with `monthKey` equal to the current `YYYY-MM`, populated from the checklist template, and a card entry is created for every active card with all fields empty

#### Scenario: Re-accessing the current month returns the existing review
- **WHEN** the user opens the Finance view during a month that already has a review
- **THEN** the existing review is returned unchanged

#### Scenario: Attempting to create a duplicate review
- **WHEN** the service is called to create a review for a `monthKey` that already exists
- **THEN** the call MUST throw and no new review is persisted

### Requirement: Reviews can be explicitly created for any month (including future months)

The system MUST allow the user to explicitly create a `MonthlyReview` for any month — past, current, or future — via a dedicated "Add month" form in the Finance view's history sidebar. The form MUST let the user pick a year and a month and submit. On submit, the system MUST call the create endpoint with the selected `monthKey`. If a review for that month already exists, the form's submit button MUST be disabled and an error message MUST be shown. After a successful creation, the new month MUST appear in the history list and MUST become the selected review.

#### Scenario: User creates a future-month review
- **WHEN** the user selects a year/month in the Add Month form and clicks Add, and no review exists for that month
- **THEN** a new review is created with the selected `monthKey`, the review is added to the history list, and the new month becomes the selected review

#### Scenario: User tries to create a month that already has a review
- **WHEN** the user selects a month for which a review already exists
- **THEN** the Add button is disabled, the form's title attribute explains why, and no request is sent

#### Scenario: Server rejects a duplicate creation
- **WHEN** the server receives a create request for a `monthKey` that already has a review
- **THEN** the server responds with HTTP 409 and no new row is created

#### Scenario: Server rejects a malformed monthKey
- **WHEN** the server receives a create request with a `monthKey` that is not in `YYYY-MM` format
- **THEN** the server responds with HTTP 400 and no new row is created

### Requirement: Checklist items are togglable and timestamped

Each checklist item in a review MUST have a stable `id`, `text`, `section`, `order`, `completed` boolean, and optional `completedAt` ISO timestamp. Toggling an item MUST flip its `completed` state and set/clear `completedAt` accordingly, then persist the change. The checklist MUST be rendered grouped by `section` in the order defined by the template.

#### Scenario: Checking an unchecked item
- **WHEN** the user clicks the checkbox for an item where `completed` is `false`
- **THEN** the item is saved with `completed: true` and `completedAt` set to the current ISO timestamp

#### Scenario: Unchecking a completed item
- **WHEN** the user clicks the checkbox for an item where `completed` is `true`
- **THEN** the item is saved with `completed: false` and `completedAt` is cleared (`null`)

#### Scenario: Checklist renders grouped by section
- **WHEN** the review view loads
- **THEN** items are displayed under section headers (e.g. "Personal Finance", "Family Finance", "Loan Processing", "Bond Cash Flow", "Credit Rating") in the order defined by the template

### Requirement: Card entries track per-card monthly status

Each card in a review MUST have a `cardEntry` with fields: `cardId`, `statementSaved` (bool), `amount` (nullable string), `dueDate` (nullable ISO date), `moneyProVerified` (bool), `ppsSetUp` (bool), `moneyProRecorded` (bool), and `notes` (nullable string). Edits to any field MUST persist immediately. The Payment Tracking table MUST render one row per active card and seven columns corresponding to those fields (with the amount and due-date columns being free-text / date inputs).

#### Scenario: Toggling a card's statement-saved flag
- **WHEN** the user checks "Statement saved" for a card
- **THEN** the card entry is saved with `statementSaved: true`

#### Scenario: Entering a due date and amount
- **WHEN** the user types `496.24` into the amount field and selects `2026-07-16` as the due date for a card
- **THEN** the card entry is saved with `amount: "496.24"` and `dueDate: "2026-07-16"`

#### Scenario: Adding a free-text note
- **WHEN** the user types a note into the notes field of a card row
- **THEN** the card entry is saved with the new `notes` value

#### Scenario: Adding a new card while a current-month review exists
- **WHEN** the user adds a new card via Manage Cards and the current month has an existing review
- **THEN** the new card MUST appear in the current review's Payment Tracking table (via an automatic sync) without requiring a page reload

#### Scenario: Reactivating a card while a current-month review exists
- **WHEN** the user reactivates an inactive card and the current month has an existing review
- **THEN** the reactivated card MUST appear in the current review's Payment Tracking table (via an automatic sync) without requiring a page reload

#### Scenario: Adding a new card when no current-month review exists yet
- **WHEN** the user adds a new card and the current month has no review yet
- **THEN** no sync is performed; the next time the user opens the Finance view, `getCurrent` creates the review and the new card is included in the snapshot

### Requirement: Reviews can be completed and reopened

A review MUST transition between `pending`, `in_progress`, and `completed` statuses. A review MUST be marked `completed` only via an explicit "Mark complete" action, regardless of whether all checklist items are checked. A completed review MUST be reopenable back to `in_progress` via an "Reopen" action. Past reviews MUST remain browsable in read-only mode.

#### Scenario: Marking a review complete
- **WHEN** the user clicks "Mark complete" on an in-progress review
- **THEN** the review status is saved as `completed` with a `completedAt` timestamp

#### Scenario: Reopening a completed review
- **WHEN** the user clicks "Reopen" on a completed review
- **THEN** the review status is saved as `in_progress` and `completedAt` is cleared

#### Scenario: Past reviews are read-only
- **WHEN** the user selects a month earlier than the current month
- **THEN** the review renders with all checkboxes and inputs disabled

### Requirement: Review history is browsable

The Finance view MUST show a list of all reviews (most recent first) and allow the user to select any month to view its contents. Selecting the current month MUST open the editable review view; selecting any other month MUST open the read-only view.

#### Scenario: Viewing the review list
- **WHEN** the user opens the Finance view
- **THEN** a sidebar or dropdown shows all monthKeys that have reviews, with the current month preselected

#### Scenario: Switching to a past month
- **WHEN** the user selects a past month from the list
- **THEN** that month's review is loaded in read-only mode

### Requirement: Reviews have a free-text notes field for ad-hoc to-dos

Each review MUST have a `notes` string field (default empty) that the user can edit on the current month. The notes are intended for free-form capture: ad-hoc to-dos, reminders for next month, anything outside the structured checklist. Notes MUST be editable on the current month via a textarea, and MUST be displayed read-only as pre-formatted text on past months. Notes MUST persist across page reloads (server-side) and be excluded from past-month editing.

#### Scenario: User types into the notes textarea
- **WHEN** the user types "Call accountant about Q2 estimates" into the notes textarea on the current month
- **THEN** the notes are saved to the server on blur and are reflected in the local state

#### Scenario: Past months show notes as read-only
- **WHEN** the user selects a past month
- **THEN** the notes for that month are displayed as pre-formatted text and the textarea is replaced with a read-only view

#### Scenario: Notes persist across page reloads
- **WHEN** the user types notes on the current month, refreshes the page, and returns to the same month
- **THEN** the previously entered notes are still shown

#### Scenario: Empty notes on a past month
- **WHEN** the user views a past month whose notes are empty
- **THEN** the read-only view shows "No notes for this month." instead of an empty box

### Requirement: Review-level photo gallery

The monthly review SHALL support a review-level photo gallery: an `images`
array of base64 data-URL strings persisted per review in a dedicated column
`monthly_reviews.images` (JSON, default `[]`). Photos SHALL be saved via
`PATCH /api/monthly-reviews/:id/images`; the full-review PUT upsert SHALL NOT
modify saved photos. The list endpoint `GET /api/monthly-reviews` SHALL NOT
include `images` in any row; the detail endpoints
`GET /api/monthly-reviews/current` and
`GET /api/monthly-reviews/by-month?monthKey=YYYY-MM` SHALL include it.

#### Scenario: Photos saved with PATCH persist across reloads

- **WHEN** the client sends `PATCH /api/monthly-reviews/:id/images` with
  `{ images: [...] }` containing data-URL strings
- **THEN** the server stores the array; the review returned by `/current` and
  `/by-month` includes `images`; a page reload still shows the photo

#### Scenario: List endpoint excludes images

- **WHEN** the client calls `GET /api/monthly-reviews` to populate the history
  sidebar
- **THEN** each row in the response contains no `images` key, keeping the
  history payload small

#### Scenario: Full upsert preserves photos

- **WHEN** the client PUTs the full review document and does not include
  `images` in the body
- **THEN** the stored `images` array is unchanged after the upsert

#### Scenario: Invalid images payload is rejected

- **WHEN** the client sends `PATCH /:id/images` with a body that is not an
  array of strings (e.g. `{ images: "photo" }` or `{ images: [42] }`)
- **THEN** the server responds with HTTP 400 and the stored `images` array is
  unchanged

### Requirement: Photo paste and management UX

The Finance view SHALL provide a Photos section on the current month with a
paste zone that accepts clipboard images (Ctrl+V), thumbnail previews,
per-photo removal, and a click-to-enlarge lightbox. The client SHALL reject
individual pasted images whose size exceeds approximately 8 MB, SHALL show a
user-visible message for the rejection, and SHALL NOT add the oversized image
to the gallery.

#### Scenario: Pasting an image adds a thumbnail

- **WHEN** the user copies an image and presses Ctrl+V while focused in the
  Photos paste zone on the current month
- **THEN** a thumbnail appears in the gallery and the client persists the
  updated array via `PATCH /:id/images`

#### Scenario: Removing a photo

- **WHEN** the user clicks the remove button on a thumbnail
- **THEN** the thumbnail disappears and the updated array is persisted; after a
  reload the removed photo is no longer in the stored `images`

#### Scenario: Enlarging a photo

- **WHEN** the user clicks a thumbnail
- **THEN** the photo opens in a full-size lightbox overlay and closes on Escape

#### Scenario: Oversized image is rejected

- **WHEN** the user pastes an image whose file size exceeds approximately 8 MB
- **THEN** the client shows a message explaining the image is too large and no
  thumbnail is added

### Requirement: Read-only months display photos without editing

Past months (read-only) SHALL display the review's photos with thumbnails and
lightbox, and SHALL NOT expose the paste zone or remove buttons.

#### Scenario: Past month shows photos read-only

- **WHEN** the user selects a month earlier than the current month on a review
  that has `images`
- **THEN** thumbnails render, clicking one opens the lightbox, and neither the
  paste zone nor remove buttons are shown

#### Scenario: Past month with no photos

- **WHEN** the user selects a read-only month whose `images` array is empty
- **THEN** the Photos section renders a short empty-state line and no
  interactive paste controls

