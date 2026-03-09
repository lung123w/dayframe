# DayFrame

A modern, feature-rich project management application built with React that helps you organize and track tasks across multiple projects. Features a beautiful calendar interface similar to Outlook, with support for recurring tasks, team member assignments, and browser notifications.

## Features

### 📅 Calendar Views
- **Multiple View Modes**: Switch between day, week, month, and list views
- **Outlook-like Interface**: Familiar and intuitive calendar layout
- **Drag & Drop**: Easily reschedule tasks by dragging them to different dates
- **Color-Coded Tasks**: Visual distinction by project, priority, and status

### ✅ Task Management
- **Create & Edit Tasks**: Rich task creation with all the details you need
- **Task Properties**:
  - Title and description
  - Due dates
  - Priority levels (Low, Medium, High)
  - Status tracking (To Do, In Progress, Completed)
  - Project assignment
  - Team member assignment
  
### 🔄 Recurring Tasks
- **Flexible Recurrence Patterns**:
  - Daily (every N days)
  - Weekly (specific days of the week)
  - Monthly (every N months)
  - Yearly (every N years)
- **End Conditions**: Set end date or number of occurrences
- **Visual Preview**: See a description of your recurrence pattern

### 🖼️ Image Support
- **Paste Images Directly**: Copy and paste images into task descriptions (Ctrl+V)
- **Multiple Images**: Add multiple images per task
- **Visual Preview**: See images directly in the task modal

### 👥 Team Management
- **Add Team Members**: Build your team directory
- **Assign Tasks**: Assign tasks to specific team members
- **Track Information**: Store names, emails, and roles

### 🔔 Notifications
- **Browser Notifications**: Get notified about upcoming and overdue tasks
- **Smart Timing**:
  - Immediate alerts for overdue tasks
  - 1-hour warnings for tasks due soon
  - 24-hour reminders for tasks due today
- **Background Monitoring**: Checks every 30 minutes while app is open

### 💾 Data Persistence
- **IndexedDB Storage**: All data stored locally in your browser
- **Persistent**: Data survives browser restarts and cache clearing
- **No Server Required**: Completely offline-capable
- **No Login Needed**: Single-user, personal tool

## Installation & Setup

### Prerequisites
- Node.js 16+ installed
- Modern web browser (Edge, Chrome, Firefox, etc.)

### Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Run Development Server**
   ```bash
   npm run dev
   ```
   The app will open at `http://localhost:5173/`

3. **Build for Production**
   ```bash
   npm run build
   ```
   Output will be in the `dist/` folder

4. **Run Tests**
   ```bash
   npm test        # Interactive mode
   npm run test:run  # Run once
   npm run test:ui   # Visual test UI
   ```

## Usage Guide

### Creating Your First Task

1. Click the **"New Task"** button in the toolbar
2. Fill in the task details:
   - Enter a title (required)
   - Add a description
   - Paste images with Ctrl+V
   - Set a due date
   - Choose priority and status
   - Assign to a project or team member
3. Click **"Create Task"**

### Setting Up Recurring Tasks

1. When creating/editing a task, check **"Recurring Task"**
2. Configure the pattern:
   - Select frequency (Daily, Weekly, Monthly, Yearly)
   - Set interval (e.g., every 2 weeks)
   - For weekly tasks, choose specific days
   - Optionally set an end date or number of occurrences
3. The app will automatically generate future instances

### Managing Team Members

1. Click the **"Team"** button in the header
2. Click **"Add Member"**
3. Enter name, email, and role
4. Click **"Add Member"** to save
5. Assign tasks to team members when creating tasks

### Enabling Notifications

1. Click the bell icon (🔔) in the header
2. Allow notifications when prompted by your browser
3. You'll receive notifications for:
   - Overdue tasks
   - Tasks due within 1 hour
   - Tasks due within 24 hours

### Calendar Navigation

- **Month View**: Click any date to create a task
- **Week View**: See your week at a glance
- **Day View**: Focus on today's tasks
- **List View**: See all upcoming tasks in a list
- **Drag & Drop**: Move tasks to different dates by dragging

## Technology Stack

### Core
- **React 19**: Modern UI framework
- **Vite 8**: Fast build tool and dev server
- **IndexedDB (via Dexie)**: Browser database for data persistence

### Calendar & UI
- **FullCalendar**: Professional calendar component
- **React Icons**: Beautiful icon library
- **date-fns**: Modern date utility library

### Testing
- **Vitest**: Fast unit test framework
- **React Testing Library**: Component testing utilities
- **jsdom**: Browser environment simulation

## Project Structure

```
project_mgmt_tool/
├── src/
│   ├── components/          # React components
│   │   ├── Calendar.jsx     # Main calendar view
│   │   ├── TaskModal.jsx    # Task creation/editing
│   │   └── TeamManagement.jsx # Team member management
│   ├── utils/               # Utility functions
│   │   ├── recurrence.js    # Recurring task logic
│   │   └── notifications.js # Browser notifications
│   ├── __tests__/           # Test files
│   ├── db.js                # IndexedDB database layer
│   ├── App.jsx              # Main app component
│   └── main.jsx             # App entry point
├── package.json
├── vite.config.js
└── README.md
```

## Data Storage

All data is stored locally in IndexedDB with the following structure:

- **Tasks**: Task details, recurrence patterns, images
- **Team Members**: Name, email, role information
- **Projects**: Project names and colors

**Note**: Data is tied to your browser profile. If you switch browsers or clear site data, you'll lose your tasks. For production use, consider adding export/import functionality or cloud sync.

## Browser Compatibility

- ✅ Microsoft Edge (recommended)
- ✅ Google Chrome
- ✅ Mozilla Firefox
- ✅ Safari (macOS)
- ⚠️ Requires modern browser with IndexedDB and Notification API support

## Testing

The project includes comprehensive test coverage:

- **Unit Tests**: 13 tests for utility functions (recurrence logic, validation)
- **Component Tests**: 11 tests for UI components
- **Integration Tests**: 4 tests for app-level functionality

All 28 tests passing ✅

Run tests with:
```bash
npm test          # Watch mode
npm run test:run  # Single run
npm run test:ui   # Visual UI
```

## Future Enhancements (Phase 2)

Potential features for future development:

- [ ] Outlook integration for calendar sync
- [ ] Export/import functionality (JSON, CSV)
- [ ] Task filtering and search
- [ ] Subtasks and checklists
- [ ] Time tracking
- [ ] Report generation
- [ ] Dark mode
- [ ] Mobile responsive improvements
- [ ] Cloud backup option

## Troubleshooting

### Data Not Persisting
- Check that you haven't disabled IndexedDB in browser settings
- Ensure you're not in private/incognito mode
- Check browser console for errors

### Notifications Not Working
- Click the bell icon to request permission
- Check browser settings allow notifications for localhost
- Ensure browser is not in Do Not Disturb mode

### Calendar Not Loading
- Check browser console for errors
- Try refreshing the page
- Clear browser cache and reload

## License

This project is open source and available for personal and commercial use.

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the browser console for error messages
3. Ensure you're using a modern, supported browser

---

**Built with ❤️ using React, Vite, and modern web technologies**

