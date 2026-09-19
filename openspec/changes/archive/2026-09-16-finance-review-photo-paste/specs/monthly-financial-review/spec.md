# monthly-financial-review Specification (Delta)

## ADDED Requirements

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