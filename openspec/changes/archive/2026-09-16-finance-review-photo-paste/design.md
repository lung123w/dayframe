# Design — Finance Review 貼相 (Photo Paste)

## 1. Change boundary: new change, not an extension of monthly-financial-review

`openspec/changes/monthly-financial-review` is 96/99 tasks complete — the
feature shipped and only verification clean-up remains, but it is not archived
yet (human gate). Two options for where photo-paste lives:

- **(a) Extend that change.** Add tasks + a spec delta to the existing folder.
  Mixes an almost-ready-to-archive change with new scope: the archive review
  would have to separate the two concerns, and the change's 96/99-done state
  becomes misleading.
- **(b) New standalone change `finance-review-photo-paste`** (this one). One
  feature, one scope, one review cycle — matching how
  `weekly-review-personal-work-mode` was created as a fresh change even though
  `weekly-review-planning` specs already existed. The spec delta still targets
  the existing `monthly-financial-review` capability (ADDED requirements), so
  the canonical spec stays in one place.

**Choice: (b)**, with a coordination note that `monthly-financial-review`
should be archived before (or alongside) this change.

## 2. Storage: base64 in a JSON column, not files

The exploration doc already ruled out Option B (Multer + `uploads/` +
`express.static`) and Option C (links only). The chosen shape is exactly the
`YearlyGoals` precedent:

```sql
ALTER TABLE monthly_reviews ADD COLUMN images TEXT NOT NULL DEFAULT '[]';
```

- `images` stores a JSON array of base64 data-URL strings. It is written only
  by `PATCH /:id/images`; `PUT /` and `persistReview()` leave the column
  untouched, so a full document save can never silently drop saved photos.
- Backup: the daily cron copies the single `app.db` file to OneDrive; anything
  inside the DB is covered, so photos get backup for free. No new backup story.
- Size reality: a JPEG screenshot ≈ 1–2 MB as base64; a busy month with 10
  statement photos ≈ 10–20 MB. SQLite and the existing `50mb` Express JSON
  limit (server/index.js:25) comfortably accommodate this. If the DB ever
  grows problematically, client-side downscale (canvas) is the documented
  mitigation — deferred until it is actually needed.

## 3. API shape: additive, list stays light

- `PATCH /:id/images` mirrors `PATCH /:id/notes`: accepts
  `{ images: [...] }`, validates it is an array of strings (HTTP 400
  otherwise), persists `JSON.stringify(images)`, and bumps
  `pending` → `in_progress` when non-empty (so adding evidence marks the month
  as actively reviewed).
- `GET /api/monthly-reviews` (list/history sidebar) must NOT include `images`:
  the sidebar renders dozens of months and only needs monthKey/status; pasting
  even 5 photos per month × 24 months would push the payload into megabytes
  for zero UI benefit.
- `GET /api/monthly-reviews/current` and `/by-month` include `images`
  (single-doc paths) — that is where the gallery is rendered.
- Full upsert (`PUT /`) stays as-is. This is deliberate: the client's edit
  paths are all granular (checklist toggle, card-entry patch, notes patch,
  images patch), so PUT is not the save path for photos.

## 4. Paste-zone implementation: reuse the pattern, keep the diff small

The approved scope says "paste zone (重用 RichTextEditor handlePaste /
YearlyGoals pattern)". Two readings:

- **(a) Drop a hidden `RichTextEditor`** and piggyback on its `onImagePaste`.
  Zero new paste code, but it mounts a full TipTap editor we do not need (DOM
  weight, toolbar, focus handling) just to catch one event.
- **(b) Inline the same clipboard flow in the Photos section** — mirror
  `RichTextEditor.jsx` `handlePaste` (~12 lines: iterate
  `event.clipboardData.items`, `item.type.startsWith('image/')` →
  `preventDefault` → `FileReader.readAsDataURL` → callback). Smallest diff, no
  behavior change to the editor, and it is exactly the battle-tested flow the
  decision doc points at.

**Choice: (b).** If a third consumer of clipboard-image-paste ever appears,
extract the flow to `src/utils/imagePaste.js` as cleanup — explicitly out of
scope now (touch only what the task needs).

The thumbnail grid, remove button, and lightbox are direct copies of
`YearlyGoals.jsx` (`handleImagePaste` → append + save, `removeImage` → filter +
save, `setLightboxSrc` + Escape-to-close) — the same UX the user already knows.

## 5. Size cap: client-side only, no downscaling in Phase 1

Each pasted `File` is checked before conversion: `file.size > 8 MiB` →
reject with a user-visible message and no state change. This keeps the paste
zone from ever shipping a multi-hundred-MB base64 string into the 50mb JSON
limit, and the rejection is instant (no FileReader round-trip). No downscale
canvas in Phase 1 — the exploration doc reserves that as a mitigation only if
DB growth ever matters.

## 6. Read-only months

The component already computes `isReadOnly` for months before the current one
and uses it to disable checklist/notes. The Photos section follows the same
rule: paste zone and remove buttons render only when editable; thumbnails and
lightbox render always. An empty read-only gallery shows a short empty-state
line instead of interactive controls.

## 7. Migration safety

The `ALTER TABLE` is wrapped in the same `try/catch` ignored-error block used
for `yearly_goals.images` (db.js ~line 246), so re-runs are no-ops. Fresh DBs
get the column directly from the `CREATE TABLE IF NOT EXISTS` statement, and
new rows always write `images` (default `'[]'`). No table rebuild, no
transaction dance — this is a pure additive column.

## 8. Phase 2 — per-card photos (deferred, documented only)

Per-card statement photos (`images` array inside each `cardEntries[i]`) would
be the natural next refinement, and the card-entry JSON shape already permits
it. It is explicitly OUT of scope here (approved scope), because it needs
per-row thumbnail UI in the Payment Tracking table — a heavier lift with a
different review surface. This proposal only records the intent so the next
proposal does not re-litigate storage; the storage decision (base64-in-DB) is
identical.

## 9. Testing strategy

- Client tests in `src/__tests__/MonthlyReview.test.jsx` (vitest +
  Testing Library): paste adds thumbnail + fires `updateImages`; remove fires
  `updateImages` with the remaining array; oversized paste rejected with
  message; read-only month hides controls but renders thumbnails; past-month
  gallery renders; `updateImages` issues the right PATCH.
- The repo has no server test infra (routes are not unit-tested —
  `server/` has no test setup), so the server side gets a manual curl smoke
  (tasks.md §7.3): list has no `images` key, `/current` + `/by-month` carry it,
  PATCH round-trips, bad payloads → 400.
- Gates: `npm run lint` clean of new errors, `npm run test:run` green.