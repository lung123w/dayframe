# financial-cards Specification

## Purpose
TBD - created by archiving change monthly-financial-review. Update Purpose after archive.

## ADDED Requirements

### Requirement: Cards are stored as master data

The system MUST persist a `FinancialCard` list with fields: `id`, `name` (e.g. "Hang Seng Credit Card"), `institution` (e.g. "Hang Seng Bank"), `cardType` (`"bank"` or `"credit"`), `accountNumber` (string), `displayOrder` (number), and `active` (bool, default `true`). All `FinancialCard` records MUST be stored in a dedicated Dexie store. Cards marked `active: false` MUST be excluded from new reviews and from the card table of existing reviews.

#### Scenario: Creating a new card
- **WHEN** the user adds a new card named "Standard Chartered Visa" with `cardType: "credit"`
- **THEN** the card is persisted with a generated `id`, the provided fields, `displayOrder` at the end of the list, and `active: true`

#### Scenario: Deactivating a card
- **WHEN** the user toggles a card's active state to `false`
- **THEN** the card is saved with `active: false` and no longer appears in new or current reviews

### Requirement: Cards are seeded from the user's PDF on first run

On the first time the app loads with no existing `FinancialCard` records, the system MUST seed the store with the eight cards from the user's PDF: Hang Seng Integrated Account, HSBC One Account, Hang Seng Credit Card, HSBC VISA Signature, HSBC RED, Citibank Octopus, BEA World Master, and BEA Titanium. BOC Credit Card (from the PDF table) MUST also be seeded. The seed MUST run only when the store is empty; subsequent loads MUST NOT re-seed.

#### Scenario: First-run seed populates all 9 cards
- **WHEN** the app loads and the `financialCards` store is empty
- **THEN** the 9 seed records from the PDF are inserted with `displayOrder` in the order listed in the PDF table

#### Scenario: Subsequent loads do not re-seed
- **WHEN** the app loads and the `financialCards` store already contains at least one record
- **THEN** the seed function is a no-op and no duplicate cards are created

### Requirement: Cards are editable in a dedicated view

The system MUST expose a "Manage Cards" view (reachable from the Finance view) where the user can add, edit, reorder, and deactivate cards. Edits MUST persist immediately and the changes MUST be reflected in the current month's review card table on next render.

#### Scenario: Editing a card's name
- **WHEN** the user changes a card's name from "HSBC RED" to "HSBC Red Card"
- **THEN** the card is saved with the new name and the card table in the current review shows the updated label

#### Scenario: Reordering cards
- **WHEN** the user moves a card up or down in the manage view
- **THEN** the affected cards' `displayOrder` values are updated and the card table re-renders in the new order

### Requirement: Account numbers are visible by default with a per-card hide toggle

For privacy-on-demand, the system MUST display `accountNumber` values in **full** in the review view's card table by default, and MUST provide a per-card toggle (eye / eye-slash button) that the user can click to mask or unmask that card's number. The masked form MUST show only the last 4 digits (e.g. `****2973`). The full value MUST be editable in the manage-cards edit form and persisted to the database unencrypted. The toggle state is per-session, per-card, and is not persisted across page reloads.

#### Scenario: Card table shows full account number by default
- **WHEN** the review's card table renders for a card with account number `4548 8920 2973 7963`
- **THEN** the account-number column displays the full `4548 8920 2973 7963` next to a "hide" toggle

#### Scenario: User clicks the toggle to mask one card
- **WHEN** the user clicks the "hide" toggle on a card row that is currently showing the full number
- **THEN** the account-number column for that card switches to `****7963` and the toggle becomes a "show" icon

#### Scenario: User clicks the toggle to unmask one card
- **WHEN** the user clicks the "show" toggle on a card row that is currently masked
- **THEN** the account-number column for that card switches back to the full value and the toggle becomes a "hide" icon

#### Scenario: Toggle is per-card, not global
- **WHEN** the user hides one card's number
- **THEN** the other cards in the table continue to show their full numbers

#### Scenario: Manage-cards form shows full account number
- **WHEN** the user opens the edit form for a card
- **THEN** the input field is pre-populated with the full account number value
