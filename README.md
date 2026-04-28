# DayFrame

A personal task management app with a daily planner, today view, habit tracker, and workflow tools. Built with React (frontend) and Node.js + SQLite (backend).

## Features

### 📋 Today View
- See all tasks due today in a prioritized list
- Drag to reorder tasks; order is persisted across sessions
- Quick-capture new tasks inline (press Enter to create, Escape to clear)
- Edit any task directly from the today view
- Mark tasks complete with a single click

### 🗓️ Daily Planner (Week View)
- 7-day week grid with drag-and-drop scheduling
- Move tasks between days or reorder within a day
- Reordering today's tasks in the planner syncs with the Today view order
- Per-task time estimates editable inline
- Navigate forward/backward by week
- Yearly goals and weekly objectives panels integrated

### ✅ Task Management
- Create and edit tasks with title, description, due date, priority, status, and project
- Recurring tasks: daily, weekly, monthly, yearly with end date or occurrence count
- Subtasks with completion tracking
- Paste images directly into task descriptions (Ctrl+V)
- Assign tasks to team members

### 🔄 Daily Workflow
- Define reusable daily workflow steps
- Track step completion per day
- Visual checklist in the Today view

### 📈 Habit Tracker
- Create daily habits and track streaks
- Check off habits each day

### 🗂️ Backlog Sidebar
- Collapsible sidebar listing all pending (unscheduled) tasks
- Drag tasks from backlog onto the planner to schedule them

### 🔔 Notifications
- Browser notifications for overdue, 1-hour, and 24-hour warnings
- Background polling every 30 minutes while the app is open

### 👥 Team Management
- Add team members with name, email, and role
- Assign tasks to team members

## Data Persistence

All data is stored in a **SQLite database** via a Node.js/Express backend (`server/`). There is no cloud sync — data is local to the machine running the server.

- **Tables**: tasks, projects, team_members, subtasks, habits, habit_completions, workflow_steps, workflow_completions, settings
- Data survives server restarts

## Tech Stack

### Frontend
- **React 19** — UI framework
- **Vite 8** — build tool and dev server
- **FullCalendar** — calendar components
- **date-fns** — date utilities
- **React Icons** — icon library

### Backend
- **Node.js + Express** — REST API server
- **better-sqlite3** — SQLite database driver

### Testing
- **Vitest** — test runner
- **React Testing Library** — component testing
- **jsdom** — browser environment simulation

## Installation & Setup

### Prerequisites
- Node.js 18+

### Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start the app** (frontend + backend together)
   ```bash
   npm run dev
   ```
   - Frontend: `http://localhost:5173`
   - API server: `http://localhost:3001`

3. **Build for production**
   ```bash
   npm run build
   ```

4. **Run tests**
   ```bash
   npm run test:run   # single run
   npm test           # watch mode
   npm run test:ui    # visual UI
   ```

5. **Lint**
   ```bash
   npm run lint
   ```

## Project Structure

```
dayframe/
├── server/
│   ├── db.js          # SQLite schema and migrations
│   ├── index.js       # Express app entry point
│   └── routes/        # API route handlers
├── src/
│   ├── components/    # React components
│   ├── utils/         # Utility functions
│   ├── __tests__/     # Test files
│   ├── api.js         # Frontend API service layer
│   ├── App.jsx        # Main app component and state
│   └── main.jsx       # App entry point
├── package.json
├── vite.config.js
└── README.md
```

## Troubleshooting

### App not loading data
- Make sure both frontend and backend are running (`npm run dev` starts both)
- Check the browser console and server terminal for errors

### Notifications not working
- Click the bell icon to request permission
- Ensure the browser allows notifications for localhost

## License

Open source — available for personal and commercial use.
