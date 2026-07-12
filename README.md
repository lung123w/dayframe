# DayFrame

A personal productivity app with a daily planner, habit tracker, timeline view, and structured daily workflow. Built with React + Vite on the frontend and Node.js + Express + SQLite on the backend. All data is stored locally — no cloud, no accounts.

## Features

### Today View
- Prioritized list of today's tasks, split into overdue, pending, and completed sections
- Quick-capture input: type a task title and press Enter to add it instantly
- One-click "Pull all overdue to today" to reschedule everything at once
- Drag-and-drop reordering; order persists across sessions
- Defer individual tasks to another date via a date popover
- **Daily Timeline**: visual 6 am–9 pm hourly grid showing tasks as positioned time blocks by start/end time, with a live current-time indicator

### Planner (Week View)
- 7-day column grid for the current week with forward/backward navigation
- Drag tasks between days to reschedule, or within a day to reorder
- Per-task inline time estimate editor
- Task cards show: status, title, scheduled time, time estimate, project colour, subtask progress, and rich description
- **Daily Shutdown** panel per day: shows completed vs. total stats, planned vs. done time, incomplete task list with "rollover to tomorrow" buttons, and a highlights/notes field

### Task Management
- Title, rich-text description (bold, italic, headings, lists, code, links), due date, priority, project, status
- Start time and end time for timeline placement
- Scheduled time badge for a specific time-of-day
- Inline time estimate (minutes)
- Subtasks with completion tracking and progress count
- Paste images directly into descriptions (Ctrl+V) — stored as base64
- Recurring tasks: daily, weekly (specific days of the week), monthly, yearly — with optional end date or occurrence count
- Per-occurrence status overrides for recurring tasks ("this instance only" or "this and all future")

### Habit Tracker
- Track daily habits with colour coding and frequency settings (daily, specific weekdays, or X times per week)
- Mark a habit done with optional time-logging popover
- Streak tracking: current streak and best streak displayed per habit
- Annual heatmap visualization of completions per habit (click to toggle past dates)
- Archive habits to preserve history without cluttering the active list
- Soft-delete with 5-second undo toast

### Plan My Day
- Modal that groups all pending tasks into Overdue / Due Today / Upcoming (next 7 days)
- Select which tasks to focus on; confirms a prioritized order for the Today view
- Pre-selects tasks from the previous session's plan

### Daily Workflow
- Define a reusable checklist of daily steps
- Track completion per day; resets each morning
- Visible in the Today view alongside habits

### Weekly Goals & Key Events
- Weekly objectives list with checkbox completion per week
- Key events (notable things happening during the week) grouped by day, with category tagging
- Integrated into the Planner view

### Yearly Goals
- Annual vision text (rich-text) and a list of yearly goals
- Image paste support (Ctrl+V)
- Auto-saves on blur

### Backlog
- Lists all unscheduled or pending tasks in one place
- Drag tasks from the backlog onto a planner day column to schedule them

### Notifications
- Browser notifications for overdue tasks, 1-hour warnings, and 24-hour reminders
- Background polling every 30 minutes while the app is open
- Permission requested via the bell icon in the sidebar

### Projects
- Create projects with a name and colour
- Assign tasks to projects; project colour is shown on task cards and timeline blocks
- A default "General" project is created automatically on first run

### Backup
- Export all data as a JSON file from the sidebar

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | React 19 |
| Build tool | Vite 8 |
| Rich text editor | Tiptap 3 |
| Date utilities | date-fns 4 |
| Icons | react-icons 5 |
| API server | Node.js + Express 5 |
| Database | SQLite via better-sqlite3 |
| Test runner | Vitest 4 |
| Component testing | React Testing Library + jsdom |

## Getting Started

**Prerequisites:** Node.js 18+

```bash
# Install dependencies
npm install

# Start frontend (port 5173) + API server (port 3001) together
npm run dev
```

Open `http://localhost:5173`

### Production

```bash
npm run build   # Builds React app into dist/
npm start       # Express serves the API + static frontend on port 3001
```

Open `http://localhost:3001`

### Windows Launcher

Run `start-dayframe.bat` to start the app in the background and open the browser automatically. Run `install-shortcuts.bat` to add desktop and startup shortcuts.

## Scripts

```bash
npm run dev        # Start dev server (frontend + backend)
npm run build      # Production build
npm start          # Run production server
npm run test:run   # Run all tests once
npm test           # Run tests in watch mode
npm run test:ui    # Open Vitest browser UI
npm run lint       # Run ESLint
```

## Project Structure

```
dayframe/
├── server/
│   ├── index.js       # Express entry point
│   ├── db.js          # SQLite schema and inline migrations
│   └── routes/        # REST API handlers (tasks, habits, projects, etc.)
├── src/
│   ├── App.jsx        # Root component: state management and view routing
│   ├── api.js         # Fetch-based API service layer
│   ├── components/    # React components (25 components with paired CSS)
│   ├── utils/         # Utility functions (recurrence, habits, notifications, etc.)
│   └── __tests__/     # Vitest test files
├── data/              # SQLite database file (gitignored)
├── public/
├── vite.config.js
└── package.json
```

## Data

All data is stored in a local SQLite file at `data/app.db`. It is excluded from version control. Tables include: `tasks`, `subtasks`, `projects`, `team_members`, `habits`, `habit_entries`, `weekly_objectives`, `daily_notes`, `yearly_goals`, `key_events`, `workflow_steps`, `workflow_completions`, `settings`.

Data survives server restarts and never leaves the machine.

## Troubleshooting

**App not loading data**
- Ensure both frontend and backend are running — `npm run dev` starts both
- Check the browser console and the terminal running the server for errors

**Notifications not working**
- Click the bell icon in the sidebar to request browser permission
- Ensure the browser allows notifications from localhost
