# Don't Break the Chain — Habit Tracker Design

## Overview

Add a "Don't Break the Chain" (Seinfeld Strategy) habit tracker to ProjectFlow. Users can define multiple habits with flexible frequency, track daily completions, log time spent (via timer or manual entry), and visualize streaks with a GitHub-style heatmap.

## Architecture

Two new database tables (`habits` + `habit_entries`) with REST API endpoints following the existing Express + better-sqlite3 pattern. A new "Habits" nav tab renders the HabitTracker view with per-habit cards, heatmap visualization, and inline timer.

## Data Model

### `habits` table

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK AUTOINCREMENT | |
| name | TEXT NOT NULL | Habit name |
| description | TEXT DEFAULT '' | Optional description |
| color | TEXT DEFAULT '#10B981' | Heatmap color |
| frequency | TEXT NOT NULL | JSON: see below |
| isArchived | INTEGER DEFAULT 0 | Soft-delete flag |
| sortOrder | INTEGER DEFAULT 0 | User ordering |
| createdAt | TEXT | datetime('now') |

### `habit_entries` table

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK AUTOINCREMENT | |
| habitId | INTEGER FK | References habits(id) ON DELETE CASCADE |
| date | TEXT NOT NULL | YYYY-MM-DD |
| timeSpentSeconds | INTEGER DEFAULT 0 | Seconds spent |
| createdAt | TEXT | datetime('now') |
| UNIQUE(habitId, date) | | One entry per habit per day |

### Frequency JSON formats

- `{"type": "daily"}` — every day
- `{"type": "weekdays", "days": [1, 2, 3, 4, 5]}` — specific days (1=Mon, 7=Sun)
- `{"type": "weekly", "timesPerWeek": 3}` — X times per week

## Backend API

### Habits routes (`/api/habits`)

- GET `/api/habits` — list all (exclude archived; `?includeArchived=1` to include)
- GET `/api/habits/:id` — get one
- POST `/api/habits` — create
- PUT `/api/habits/:id` — update
- DELETE `/api/habits/:id` — hard delete + cascade

### Habit entries routes (`/api/habit-entries`)

- GET `/api/habit-entries?habitId=X&from=YYYY-MM-DD&to=YYYY-MM-DD` — range query
- GET `/api/habit-entries/by-habit/:habitId` — all entries for a habit
- POST `/api/habit-entries` — create (complete a day)
- PUT `/api/habit-entries/:id` — update (edit time)
- DELETE `/api/habit-entries/:id` — delete
- DELETE `/api/habit-entries/by-date?habitId=X&date=YYYY-MM-DD` — toggle off

## Frontend Components

### HabitTracker.jsx — Main view

- Lists all active habits as expandable cards
- Each card shows: name, current streak, today's status
- Expanded card shows: heatmap, stats, timer, manual time entry
- "New Habit" button opens HabitModal

### HabitModal.jsx — Create/edit form

- Fields: name, description, color picker, frequency config
- Frequency UI: radio buttons (daily/weekdays/weekly) with conditional inputs
- Archive/delete for editing

### HabitHeatmap.jsx — GitHub-style heatmap

- Presentational component
- ~16 weeks (112 days) grid, columns=weeks, rows=days
- Color intensity: empty (not expected), light (missed), full (completed)
- Day labels (Mon, Wed, Fri), month labels on top
- Tooltip on hover: date + time spent

### Timer — Inline in HabitTracker

- Start/stop button with MM:SS display
- On stop: auto-creates habit_entry with elapsed time
- Manual "log time" input (minutes) as alternative

### Streak Calculation (src/utils/habits.js)

- **Daily**: consecutive days backward from today with entries
- **Weekdays**: consecutive applicable days backward (skip non-applicable)
- **Weekly**: consecutive weeks where entries >= timesPerWeek
- **Longest streak**: scan all entries for maximum

## Stats per habit

- Current streak count
- Longest streak ever
- Total completions
- Total time spent (sum of timeSpentSeconds, formatted)

## Styling

- New CSS files following the existing Slate/Orange design system
- Card-based layout matching stat-card pattern
- Heatmap: 12px squares, 2px gap, rounded corners
- Green (#10B981) for completions, Orange (#F97316) for streaks/CTAs

## Backup Integration

Add `habits` and `habitEntries` to the existing JSON backup export in App.jsx.

## Files

| Action | File |
|--------|------|
| Create | server/routes/habits.js |
| Create | server/routes/habitEntries.js |
| Modify | server/db.js |
| Modify | server/index.js |
| Modify | src/api.js |
| Create | src/components/HabitTracker.jsx |
| Create | src/components/HabitTracker.css |
| Create | src/components/HabitModal.jsx |
| Create | src/components/HabitModal.css |
| Create | src/components/HabitHeatmap.jsx |
| Create | src/components/HabitHeatmap.css |
| Create | src/utils/habits.js |
| Modify | src/App.jsx |
| Create | src/__tests__/habits.test.js |
| Create | src/__tests__/HabitTracker.test.jsx |
